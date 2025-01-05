import { 
    BufferBase, 
    Camera, 
    CameraControls, 
    Float, 
    FontLoader, 
    InstancedGeometry, 
    Material, 
    MouseVectors, 
    PlaneGeometry, 
    Renderable, 
    Renderer, 
    Sampler, 
    Scene, 
    Vector3, 
    Vector4 } from "kansei";
import { TextGeometryCustom } from "../utils/TextGeometryCustom";
import { FontInfo } from "kansei/dist/sdf/text/FontLoader";

// Get reference to the container where our WebGPU canvas will be mounted
const canvasContainer: HTMLElement | null = document.getElementById('canvas-container');

// Initialize camera with perspective projection
// Parameters: FOV (degrees), near plane, far plane, aspect ratio
const camera: Camera = new Camera(45, 0.1, 10000, window.innerWidth / window.innerHeight);

const cameraControls = new CameraControls(camera, new Vector3(0, 0, -1), canvasContainer!, 2.5);

// Create WebGPU renderer with configuration
const renderer: Renderer = new Renderer({
    width: window.innerWidth,
    height: window.innerHeight,
    antialias: true,                               // Enable antialiasing for smoother edges
    devicePixelRatio: devicePixelRatio,            // Respect device's pixel density
    sampleCount: 4,                                // MSAA sample count for antialiasing
});

// Initialize mouse tracking for interaction
// This will track mouse position and movement
const mouseVectors: MouseVectors = new MouseVectors(canvasContainer!);
mouseVectors.speed = 1;
const mouseStrength = new Float(mouseVectors.mouseStrength);

// Create main scene to hold our 3D objects
const scene: Scene = new Scene();

// Configure texture sampling for the video texture
const sampler = new Sampler('linear', 'linear', 'repeat');

// Create a float uniform for time-based animations
const time = new Float(0);

const shaderCode = /* wgsl */`
#include <fbm>
struct VertexOut {
    @builtin(position) position : vec4<f32>,
    @location(1) normal : vec3<f32>,
    @location(2) uv : vec2<f32>,
    @location(3) viewPosition : vec4<f32>,
    @location(4) real_uv: vec2<f32>
};

@group(0) @binding(0) var map : texture_2d<f32>;
@group(0) @binding(1) var samp: sampler;
@group(0) @binding(2) var<uniform> mousePosition: vec2<f32>;
@group(0) @binding(3) var<uniform> mouseStrength: f32;
@group(0) @binding(4) var<uniform> time: f32;

@group(1) @binding(0) var<uniform> normalMatrix:mat4x4<f32>;
@group(1) @binding(1) var<uniform> worldMatrix:mat4x4<f32>;

@group(2) @binding(0) var<uniform> viewMatrix:mat4x4<f32>;
@group(2) @binding(1) var<uniform> projectionMatrix:mat4x4<f32>;

@vertex
fn vertex_main(
    @location(0) position: vec4<f32>,
    @location(1) normal : vec3<f32>,
    @location(2) uv : vec2<f32>,
    @location(3) a_particlePos : vec4<f32>,
    @location(4) a_imageBounds : vec4<f32>,
    @location(5) a_planeBounds : vec4<f32>,
    @location(6) a_color : vec4<f32>
) -> VertexOut
{
    var output : VertexOut;
    
    let boundedPosition = vec3<f32>(
        mix(a_planeBounds.x, a_planeBounds.z, uv.x),
        mix(a_planeBounds.y, a_planeBounds.w, uv.y),
        position.z
    );
    var offsetVertex: vec4<f32> = vec4<f32>(boundedPosition.xyz + a_particlePos.xyz, 1.0);

    var projected = projectionMatrix * viewMatrix * worldMatrix * offsetVertex;
    var ndc = projected.xyz / projected.w; 
    var ndcMouse = mousePosition;
    ndcMouse.y *= -1.0;
    
    var distanceToMouse = distance(ndcMouse, ndc.xy);
    var zoom = 0.5;
    var timeScale = 0.5;
    let _fbm = (fbm(vec2<f32>(offsetVertex.x + time * timeScale + offsetVertex.y + offsetVertex.z * -100000.0, offsetVertex.y + offsetVertex.z * -100000.0 + time * timeScale) * zoom) - 0.5) * 2.0;
    offsetVertex.z -= _fbm * 0.4;
    offsetVertex.y += _fbm * 0.2;
    output.position = projectionMatrix * viewMatrix * worldMatrix * offsetVertex;
    output.normal = (worldMatrix * vec4<f32>(normal, 1.0)).xyz;
    output.real_uv = uv;
    output.uv = vec2<f32>(
        mapValue(uv.x, 0.0, 1.0, a_imageBounds.x, a_imageBounds.z), 
        mapValue(uv.y, 0.0, 1.0, a_imageBounds.y, a_imageBounds.w)
    );
    output.viewPosition = worldMatrix * position;
    return output;
} 

fn mapValue(x: f32, in_min: f32, in_max: f32, out_min: f32, out_max: f32) -> f32
{
    return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

@fragment
fn fragment_main(fragData: VertexOut) -> @location(0) vec4<f32>
{
    var uv: vec2<f32> = fragData.uv;
    var mapColor: vec4<f32> = textureSample(map, samp, uv);
    var sd: f32 = median(mapColor.r, mapColor.g, mapColor.b);
    let screenPxDistance: f32 = screenPxRange(uv) * (sd - 0.5);
    let opacity: f32 = clamp(screenPxDistance + 0.5, 0.0, 1.0);

    let c = 0.1 - abs(fragData.viewPosition.z) / 5.0;
    var glyphColor: vec4<f32> = vec4<f32>(c, c, c, 1.0);
    
    var bgColor: vec4<f32> = vec4<f32>(glyphColor.rgb, 0.0);
    var fgColor: vec4<f32> = vec4<f32>(glyphColor.rgb, opacity);
    var color: vec4<f32> = mix(bgColor, fgColor, opacity);
    
    return color;
} 

fn median(r: f32, g: f32, b: f32) -> f32 {
    return max(min(r, g), min(max(r, g), b));
}

fn screenPxRange(uv: vec2f) -> f32 {
    let textureDimensions = vec2<f32>(textureDimensions(map));
    let pxRange = vec2<f32>(2.0, 2.0);
    let unitRange = vec2<f32>(pxRange) / textureDimensions;
    let screenTexSize = vec2<f32>(1.0) / fwidth(uv);
    return max(0.5 * dot(unitRange, screenTexSize), 1.0);
}
`;
// Initialize the application
const init = async () => {
    // Setup WebGPU context
    await renderer.initialize();
    canvasContainer?.appendChild(renderer.canvas);

    // Handle window resizing
    window.addEventListener('resize', resize);

    const fontLoader = new FontLoader();
    const fontInfo = await fontLoader.load('./font.arfont');

    const geometry = new TextGeometryCustom({
        text: "BLACK",
        fontInfo: fontInfo as unknown as FontInfo,
        width: 40,
        height: 100,
        fontSize: 25,
        color: new Vector4(1, 1, 1, 1)
      });
      const sampler = new Sampler('linear', 'linear');
      const material = new Material(shaderCode, {
        bindings: [
          {
            binding: 0,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            value: fontInfo.sdfTexture
          },
          {
            binding: 1,
            visibility: GPUShaderStage.FRAGMENT,
            value: sampler
          },
          {
            binding: 2,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            value: mouseVectors.mousePosition
          },
          {
            binding: 3,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            value: mouseStrength
          },
          {
            binding: 4,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            value: time
          }
        ],
        transparent: true
      });

      for (let i = 0; i < 100; i++) {
        const mesh = new Renderable(geometry, material);
        mesh.position.z = i * -0.005;
        scene.add(mesh);
      }

    // Start animation loop
    animate();
}

let lastTime = performance.now();

// Main animation/render loop
const animate = () => {
    requestAnimationFrame(animate);
    
    // Calculate delta time for smooth animations
    const currentTime = performance.now();
    const deltaTime = (currentTime - lastTime) * 0.001; // Convert to seconds
    lastTime = currentTime;
    time.value += deltaTime;

    // Update interaction systems
    cameraControls.update(deltaTime);
    mouseVectors.update(deltaTime);
    mouseStrength.value = mouseVectors.mouseStrength;
    renderer.render(scene, camera);
}

// Handle window resize events
const resize = () => {
    // Update renderer dimensions
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Update camera aspect ratio
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
}

// Start the application
init();
import { 
  BoxGeometry,
  Camera, 
  CameraControls, 
  Float,
  InstancedGeometry,
  Material, 
  MouseVectors,
  PlaneGeometry,
  Renderable, 
  Renderer,
  Sampler,
  Scene, 
  Texture, 
  TextureLoader, 
  Vector3,
  Vector4
 } from "kansei";

// Get reference to the container where our WebGPU canvas will be mounted
const canvasContainer: HTMLElement | null = document.getElementById('canvas-container');

// Initialize camera with perspective projection
// Parameters: FOV (degrees), near plane, far plane, aspect ratio
const camera: Camera = new Camera(70, 1, 3000, window.innerWidth / window.innerHeight);
const cameraTarget = new Vector3(0, 90, 0);
const cameraControls = new CameraControls(camera, cameraTarget, canvasContainer!, 250.5);
const textureLoader = new TextureLoader();
const bgColor = new Vector4(0.8, 0.6, 0.2, 1.0);

// Create WebGPU renderer with configuration
const renderer: Renderer = new Renderer({
    width: window.innerWidth,
    height: window.innerHeight,
    antialias: true,                               // Enable antialiasing for smoother edges
    devicePixelRatio: devicePixelRatio,            // Respect device's pixel density
    sampleCount: 4,                                // MSAA sample count for antialiasing
    clearColor: bgColor
});

// Initialize mouse tracking for interaction
// This will track mouse position and movement
const mouseVectors: MouseVectors = new MouseVectors(canvasContainer!);
const mouseStrength = new Float(mouseVectors.mouseStrength);

// Create main scene to hold our 3D objects
const scene: Scene = new Scene();

// Create a float uniform for time-based animations
const time = new Float(0);
const numRows = "1024.0";
const shaderCode = /* wgsl */`
#include <fbm>
struct VertexOut {
    @builtin(position) position : vec4<f32>,
    @location(1) normal : vec3<f32>,
    @location(2) uv : vec2<f32>,
    @location(3) viewPosition : vec4<f32>,
    @location(4) worldPosition : vec4<f32>,
    @location(5) fakeAO : f32,
    @location(6) distanceToTarget : f32,
    @location(7) whiteRand : f32
};

@group(0) @binding(0) var<uniform> mousePosition: vec2<f32>;
@group(0) @binding(1) var<uniform> mouseStrength: f32;
@group(0) @binding(2) var<uniform> mouseDirection: vec2<f32>;
@group(0) @binding(3) var<uniform> time: f32;
@group(0) @binding(4) var<uniform> cameraTarget: vec3<f32>;
@group(0) @binding(5) var<uniform> inverseViewMatrix: mat4x4<f32>;
@group(0) @binding(6) var palette: texture_2d<f32>;
@group(0) @binding(7) var paletteSampler: sampler;
@group(0) @binding(8) var<uniform> fogColor: vec4<f32>;

@group(1) @binding(0) var<uniform> normalMatrix:mat4x4<f32>;
@group(1) @binding(1) var<uniform> worldMatrix:mat4x4<f32>;

@group(2) @binding(0) var<uniform> viewMatrix:mat4x4<f32>;
@group(2) @binding(1) var<uniform> projectionMatrix:mat4x4<f32>;

@vertex
fn vertex_main(
    @builtin(instance_index) instanceID: u32,
    @location(0) position: vec4<f32>,
    @location(1) normal : vec3<f32>,
    @location(2) uv : vec2<f32>
) -> VertexOut
{
    var output : VertexOut;
    
    let worldPosition = worldMatrix * position;
    let rows = ${numRows};
    let instance = f32(instanceID);
    var posGridX = (instance % rows) - rows * 0.5;
    var posGridY = (instance / rows) - rows * 0.5;
    let offsetsGrid = floor(cameraTarget.z / 128.0);
    var positionBox = vec4<f32>(posGridX, 0.0, posGridY + offsetsGrid * 128.0, 0.0);

    let noiseZoom = vec2<f32>(0.005);
    var noise = fbm((vec2<f32>(positionBox.x, positionBox.z) + vec2<f32>(1024.0 + 2.0)) * noiseZoom);

    let whiteRand = rand(vec2<f32>(positionBox.xz));
    var pos = position;
    
    pos.x *= 1.2 - uv.y;
    pos.x += (sin(0.3 * time + positionBox.z * 10.0) * 3.0) * smoothstep(0.3, 1.0, uv.y);

    pos.y *= (1.0 + whiteRand) * 20.0;
    pos.y += whiteRand + noise * 200.0;

    var offsetVertex: vec4<f32> = pos + positionBox;

    output.whiteRand = 1.0 - whiteRand;
    output.viewPosition = viewMatrix * worldMatrix * offsetVertex;
    output.worldPosition = worldMatrix * offsetVertex;
    output.position = projectionMatrix * viewMatrix * worldMatrix * offsetVertex;
    output.normal = (worldMatrix * vec4<f32>(normal, 1.0)).xyz;
    output.uv = uv;
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
    let paletteColor = textureSample(palette, paletteSampler, vec2<f32>(fragData.whiteRand, 0.0));

    let fogFactor = smoothstep(0.4, 0.9,mapValue(
      min(-fragData.viewPosition.z / 512.0, 1.8),
      0.0, 1.8,
      0.0, 1.0
    ));
    let fakeAO = mapValue(smoothstep(0.7, 1.0, fragData.uv.y), 0.0, 1.0, 0.3, 1.0);
    let light = normalize(vec3<f32>(100.0, 100.0, 10.0));
    var lightDir = (dot(fragData.normal, light) + 1.3) * 0.5;
    lightDir *= fakeAO;
   
    var color: vec4<f32> = vec4<f32>(paletteColor);
    color *= vec4<f32>(lightDir, lightDir, lightDir, 1.0);
    color = mix(color, fogColor, fogFactor);
   
    return color;
} 
`;
// Initialize the application
const init = async () => {
    // Setup WebGPU context
    await renderer.initialize();
    canvasContainer?.appendChild(renderer.canvas);

    const paletteImage = await textureLoader.load('/palette_grass.png');
    const palette = new Texture(paletteImage, false);
    const paletteSampler = new Sampler('nearest', 'nearest', 'repeat');

    // Handle window resizing
    window.addEventListener('resize', resize);
    const geometry = new InstancedGeometry(new PlaneGeometry(1, 1, 1, 5), parseInt(numRows) * parseInt(numRows));

    const material = new Material(shaderCode, {
      bindings: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          value: mouseVectors.mousePosition
        },
        {
          binding: 1,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          value: mouseStrength
        },
        {
          binding: 2,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          value: mouseVectors.mouseDirection
        },
        {
          binding: 3,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          value: time
        },
        {
          binding: 4,
          visibility: GPUShaderStage.VERTEX,
          value: cameraTarget
        },
        {
          binding: 5,
          visibility: GPUShaderStage.VERTEX,
          value: camera.inverseViewMatrix
        },
        {
          binding: 6,
          visibility: GPUShaderStage.FRAGMENT,
          value: palette
        },
        {
          binding: 7,
          visibility: GPUShaderStage.FRAGMENT,
          value: paletteSampler
        },
        {
          binding: 8,
          visibility: GPUShaderStage.FRAGMENT,
          value: bgColor
        }
      ],
      cullMode: 'none'
    });

    const mesh = new Renderable(geometry, material);
    scene.add(mesh);

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

    // cameraTarget.z -= 70.0 * deltaTime;
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
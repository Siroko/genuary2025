import { 
  BoxGeometry,
  Camera, 
  CameraControls, 
  Float,
  InstancedGeometry,
  Material, 
  MouseVectors,
  Renderable, 
  Renderer,
  Scene, 
  Vector3 } from "kansei";

// Get reference to the container where our WebGPU canvas will be mounted
const canvasContainer: HTMLElement | null = document.getElementById('canvas-container');

// Initialize camera with perspective projection
// Parameters: FOV (degrees), near plane, far plane, aspect ratio
const camera: Camera = new Camera(70, 1, 3000, window.innerWidth / window.innerHeight);
const cameraTarget = new Vector3(0, 90, 0);
const cameraControls = new CameraControls(camera, cameraTarget, canvasContainer!, 250.5);

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
    @location(6) distanceToTarget : f32
};

@group(0) @binding(0) var<uniform> mousePosition: vec2<f32>;
@group(0) @binding(1) var<uniform> mouseStrength: f32;
@group(0) @binding(2) var<uniform> time: f32;
@group(0) @binding(3) var<uniform> cameraTarget: vec3<f32>;
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
    let posGridX = (instance % rows) - rows * 0.5;
    let posGridY = (instance / rows) - rows * 0.5;
    let offsetsGrid = floor(cameraTarget.z / 128.0);
    var positionBox = vec4<f32>(posGridX, 0.0, posGridY + offsetsGrid * 128.0, 0.0);

    let noiseZoom = vec2<f32>(0.005);
    var noise = fbm((vec2<f32>(positionBox.x, positionBox.z) + vec2<f32>(1024.0 + 2.0)) * noiseZoom);
    // let noise2 = fbm((vec2<f32>(positionBox.x, positionBox.z) + vec2<f32>(1024.0 + 2.0)) * noiseZoom * 0.1);
    // noise *= noise2;
    if(position.y > 0.0) {
      output.fakeAO = 1.0;
    } else {
      output.fakeAO = -2.0;
    }
    var pos = position;
    pos.y *= 10.0;
    pos.y += noise * 200.0;

    
   
    
    var offsetVertex: vec4<f32> = pos + positionBox;

    let distanceToTarget = distance(offsetVertex.xyz, cameraTarget.xyz);
    output.distanceToTarget = distanceToTarget;

    output.viewPosition = viewMatrix * worldMatrix * offsetVertex;
    output.worldPosition = worldMatrix * offsetVertex;
    output.position = projectionMatrix * viewMatrix * worldMatrix * offsetVertex;
    output.normal = (worldMatrix * vec4<f32>(normal, 1.0)).xyz;
    output.uv = uv;
    return output;
} 

@fragment
fn fragment_main(fragData: VertexOut) -> @location(0) vec4<f32>
{
    var uv: vec2<f32> = fragData.uv;

    let fakeAO = fragData.fakeAO;
    let light = normalize(vec3<f32>(100.0, 100.0, 10.0));
    var lightDir = (dot(fragData.normal, light) + 1.3) * 0.5;
    lightDir *= fakeAO;
    let fog = 1.0 - clamp(fragData.distanceToTarget / 512.0, 0.0, 1.0);
    lightDir *= fog;
    var color: vec4<f32> = vec4<f32>(1.0 * lightDir, 1.0 * lightDir, 1.0 * lightDir, 1.0);
   
    return color;
} 
`;
// Initialize the application
const init = async () => {
    // Setup WebGPU context
    await renderer.initialize();
    canvasContainer?.appendChild(renderer.canvas);

    // Handle window resizing
    window.addEventListener('resize', resize);
    const geometry = new InstancedGeometry(new BoxGeometry(1, 1, 1, 1, 1, 1), parseInt(numRows) * parseInt(numRows));

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
          value: time
        },
        {
          binding: 3,
          visibility: GPUShaderStage.VERTEX,
          value: cameraTarget
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

    cameraTarget.z -= 1.0;
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
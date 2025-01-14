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
 import Delaunator from 'delaunator';
import { DelaunayGeometry } from "../utils/DelaunayGeometry";

// Get reference to the container where our WebGPU canvas will be mounted
const canvasContainer: HTMLElement | null = document.getElementById('canvas-container');

// Initialize camera with perspective projection
// Parameters: FOV (degrees), near plane, far plane, aspect ratio
const camera: Camera = new Camera(70, 1, 3000, window.innerWidth / window.innerHeight);
const cameraTarget = new Vector3(0, 0, 0);
const cameraControls = new CameraControls(camera, cameraTarget, canvasContainer!, 250.5);
const textureLoader = new TextureLoader();
const bgColor = new Vector4(0.0, 0.0, 0.0, 1.0);


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
struct VertexOut {
    @builtin(position) position : vec4<f32>,
    @location(1) normal : vec3<f32>,
    @location(2) uv : vec2<f32>
};

@group(0) @binding(0) var<uniform> mousePosition: vec2<f32>;
@group(0) @binding(1) var<uniform> mouseStrength: f32;
@group(0) @binding(2) var<uniform> mouseDirection: vec2<f32>;
@group(0) @binding(3) var<uniform> time: f32;

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
    var pos = position;
    pos.z = sin(pos.x * 3.5 + time * 2.0) * 60.0;
    output.position = projectionMatrix * viewMatrix * worldMatrix * pos;
    output.normal = (worldMatrix * vec4<f32>(normal, 1.0)).xyz;
    output.uv = uv;
    return output;
} 

@fragment
fn fragment_main(fragData: VertexOut) -> @location(0) vec4<f32>
{
    var uv: vec2<f32> = fragData.uv;
   
    return vec4<f32>(uv, 0.0, 1.0);
} 
`;
// Initialize the application
const init = async () => {
    // Setup WebGPU context
    await renderer.initialize();
    canvasContainer?.appendChild(renderer.canvas);

    // Handle window resizing
    window.addEventListener('resize', resize);
    const points  = new Float32Array(100);
    for(let i = 0; i < points.length; i += 2) {
      points[i] = (Math.random() - 0.5) * 300;
      points[i + 1] = (Math.random() - 0.5) * 100;
    }
    const geometry = new DelaunayGeometry(points, 'lines');

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
        }
      ],
      cullMode: 'none',
      topology: 'line-list'
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
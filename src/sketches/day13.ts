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
  Vector3,
  Vector4
 } from "kansei";
 import Delaunator from 'delaunator';
import { DelaunayGeometry } from "../utils/DelaunayGeometry";
import CanvasText from "../utils/CanvasText";
import { TextureUpdateable } from "../utils/TextureUpdateable";
import { CustomMaterial } from "../utils/CustomMaterial";
// Get reference to the container where our WebGPU canvas will be mounted
const canvasContainer: HTMLElement | null = document.getElementById('canvas-container');

// Initialize camera with perspective projection
// Parameters: FOV (degrees), near plane, far plane, aspect ratio
const camera: Camera = new Camera(70, 1, 3000, window.innerWidth / window.innerHeight);
const cameraTarget = new Vector3(0, 0, 0);
const cameraControls = new CameraControls(camera, cameraTarget, canvasContainer!, 250.5);
const bgColor = new Vector4(0.0, 0.0, 0.0, 1.0);
const text = new CanvasText('KANSEI\nGRAPHICS       ', 400, 'L10Bold');
document.body.appendChild(text.canvas);

// Create WebGPU renderer with configuration
const renderer: Renderer = new Renderer({
    width: window.innerWidth,
    height: window.innerHeight,
    antialias: false,                               // Enable antialiasing for smoother edges
    devicePixelRatio: devicePixelRatio,            // Respect device's pixel density
    sampleCount: 1,                                // MSAA sample count for antialiasing
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
const shaderCode = (isLines: boolean) => { return /* wgsl */`
struct VertexOut {
    @builtin(position) position : vec4<f32>,
    @location(0) worldPos : vec3<f32>,
    @location(1) uv : vec2<f32>
};

@group(0) @binding(0) var<uniform> mousePosition: vec2<f32>;
@group(0) @binding(1) var<uniform> mouseStrength: f32;
@group(0) @binding(2) var<uniform> mouseDirection: vec2<f32>;
@group(0) @binding(3) var<uniform> time: f32;
@group(0) @binding(4) var texture: texture_2d<f32>;
@group(0) @binding(5) var textureSampler: sampler;

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
    pos.z = sin(pos.x * 3.5 + time * 2.0) * cos(pos.y * 1.5 + time * 1.0) * 15.0;
    
    let worldPos = (worldMatrix * pos).xyz;
    output.worldPos = worldPos;
    output.position = projectionMatrix * viewMatrix * vec4<f32>(worldPos, 1.0);
    output.uv = uv;
    return output;
} 

@fragment
fn fragment_main(fragData: VertexOut) -> @location(0) vec4<f32>
{
    if (${isLines}) {
        return vec4<f32>(0.0, 0.0, 0.0, 1.0);
    }

    // Calculate face normal using derivatives
    let dpdx = dpdx(fragData.worldPos);
    let dpdy = dpdy(fragData.worldPos);
    let normal = normalize(cross(dpdx, dpdy));

    // Directional light parameters
    let lightDir = normalize(vec3<f32>(0.5, -1.0, -0.8));
    let lightColor = vec3<f32>(1.0, 1.0, 1.0);
    let ambientStrength = 0.2;

    // Calculate lighting
    let diff = max(dot(normal, lightDir), 0.0);
    let diffuse = diff * lightColor;
    let ambient = lightColor * ambientStrength;
    
    // Sample texture
    var uv: vec2<f32> = fragData.uv;
    uv.y = 1.0 - uv.y;
    var texColor = textureSample(texture, textureSampler, uv);
    if(texColor.r < 0.9) {
      discard;
    }
    
    // Combine lighting with texture
    let finalColor = texColor.rgb * (ambient + diffuse);
    return vec4<f32>(finalColor, texColor.a);
} 
`};

// Initialize the application
const init = async () => {
    // Setup WebGPU context
    await renderer.initialize();
    canvasContainer?.appendChild(renderer.canvas);

    let texture = new TextureUpdateable(text.canvas, false);
    const textureSampler = new Sampler('linear', 'linear', 'repeat');

    const points  = new Float32Array(100);
    for(let i = 0; i < points.length; i += 2) {
      points[i] = (Math.random() - 0.5) * 300;
      points[i + 1] = (Math.random() - 0.5) * 150;
    }
    const geometry = new DelaunayGeometry(points, 'triangles');
    const geometryLines = new DelaunayGeometry(points, 'lines');

    const onKeyDown = (event: KeyboardEvent) => {  
      if(event.key === 'Enter') {
        text.text += '\n';
      } else if(event.key === 'Backspace') {
        text.text = text.text.slice(0, -1);
      } else if(event.key.length === 1 && /^[a-zA-Z0-9\s\p{P}]$/u.test(event.key)) {
        text.text += event.key;
      }

      text.update();
      texture.needsUpdate = true;
      setTimeout(() => {
        material.bindableGroup.bindGroup = undefined;
        materialLines.bindableGroup.bindGroup = undefined;
      }, 100);
      
      // materialLines.bindableGroup.initialized = false;

      const points  = new Float32Array(100);
      for(let i = 0; i < points.length; i += 2) {
        points[i] = (Math.random() - 0.5) * 300;
        points[i + 1] = (Math.random() - 0.5) * 150;
      }
      geometry.update(points, 'triangles', 'all');
      geometryLines.update(points, 'lines', 'all');
      
      console.log(event.key);
      console.log(text.text);
      
    }

    // Handle window resizing
    window.addEventListener('resize', resize);
    window.addEventListener('keydown', onKeyDown);

    const material = new CustomMaterial(shaderCode(false), {
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
          visibility: GPUShaderStage.FRAGMENT,
          value: texture
        },
        {
          binding: 5,
          visibility: GPUShaderStage.FRAGMENT,
          value: textureSampler
        }
      ],
      cullMode: 'none',
      topology: 'triangle-list'
    });

    const materialLines = new CustomMaterial(shaderCode(true), {
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
          visibility: GPUShaderStage.FRAGMENT,
          value: texture
        },
        {
          binding: 5,
          visibility: GPUShaderStage.FRAGMENT,
          value: textureSampler
        }
      ],
      cullMode: 'none',
      topology: 'line-list'
    });

    const mesh = new Renderable(geometry, (material as unknown as Material));
    scene.add(mesh);

    const meshLines = new Renderable(geometryLines, (materialLines as unknown as Material));
    meshLines.position.set(0, 0, 0.3);
    scene.add(meshLines);

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
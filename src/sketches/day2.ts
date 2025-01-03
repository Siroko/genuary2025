import { 
    BufferBase, 
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
    VideoTexture } from "kansei";
import { initializeFramesPropagationPipeline } from "../utils";
import { FramesTexture } from "../utils/FramesTexture";

// Get reference to the container where our WebGPU canvas will be mounted
const canvasContainer: HTMLElement | null = document.getElementById('canvas-container');

// Initialize camera with perspective projection
// Parameters: FOV (degrees), near plane, far plane, aspect ratio
const camera: Camera = new Camera(45, 0.1, 10000, window.innerWidth / window.innerHeight);

// Create WebGPU renderer with configuration
const renderer: Renderer = new Renderer({
    width: window.innerWidth,
    height: window.innerHeight,
    antialias: true,                               // Enable antialiasing for smoother edges
    devicePixelRatio: devicePixelRatio,            // Respect device's pixel density
    sampleCount: 4,                                // MSAA sample count for antialiasing
});

// Define number of layers for the 3D depth effect
const layerCount = 64;

// Create a float uniform for time-based animations
const time = new Float(0);

// Initialize mouse tracking for interaction
// This will track mouse position and movement
const mouseVectors: MouseVectors = new MouseVectors(canvasContainer!);

// Setup orbital camera controls
// Allows user to rotate and zoom around a center point
const cameraControls: CameraControls = new CameraControls(camera, new Vector3(0, 0, 0), canvasContainer!);

// Create main scene to hold our 3D objects
const scene: Scene = new Scene();

// Configure texture sampling for the video texture
const sampler = new Sampler('linear', 'linear', 'repeat');

// Create and configure video element for webcam input
const video = document.createElement('video');
video.autoplay = true;
video.muted = true;
video.playsInline = true;
let videoInitialized = false;

// Click handler to initialize webcam
// We need user interaction before requesting camera access
const buttonWebcam: HTMLElement | null = document.querySelector('.button-webcam');
const clickHandler = () => {
    buttonWebcam!.removeEventListener('click', clickHandler);
    // Request webcam access with HD resolution preferences
    navigator.mediaDevices.getUserMedia({ 
        video: {
            width: 1920,      // Request FullHD video if available
            height: 1080,
        },
        audio: true
    })
    .then(stream => {
        video.srcObject = stream;
        // Wait for video to be ready to play
        video.oncanplay = () => {
            videoInitialized = true;
            video.play();
            buttonWebcam!.style.display = 'none';
        }    
    })
    .catch(err => {
        console.error("Error accessing webcam:", err);
    });
}
buttonWebcam!.addEventListener("click", clickHandler);

// Create video texture to use in WebGPU
const videoTexture: VideoTexture = new VideoTexture(video);
const framesTexture: FramesTexture = new FramesTexture(video);

// Define material with WGSL shader code
const material: Material = new Material(/* wgsl */`
    // Vertex shader output structure defines data passed to fragment shader
    struct VertexOut {
        @builtin(position) position : vec4<f32>,    // Required: clip space position
        @location(1) normal : vec3<f32>,            // Surface normal for lighting
        @location(2) uv : vec2<f32>,                // Texture coordinates
        @location(3) viewPosition : vec4<f32>,      // Position in camera space
        @location(4) instancePosition : vec4<f32>,  // Per-instance position data
    };

    // Bind global uniforms and textures
    // Group 0: Per-material uniforms
    @group(0) @binding(0) var<uniform> time:f32;              // Global animation time
    @group(0) @binding(1) var videoTexture:texture_2d<f32>;   // Webcam video feed
    @group(0) @binding(2) var texSampler:sampler;             // Texture sampling config

    // Group 1 & 2: Transform matrices
    @group(1) @binding(0) var<uniform> normalMatrix:mat4x4<f32>;     // For normal transformation
    @group(1) @binding(1) var<uniform> worldMatrix:mat4x4<f32>;      // Object to world space
    @group(2) @binding(0) var<uniform> viewMatrix:mat4x4<f32>;       // World to camera space
    @group(2) @binding(1) var<uniform> projectionMatrix:mat4x4<f32>; // Camera to clip space

    @vertex
    fn vertex_main(
        @location(0) position: vec4<f32>,
        @location(1) normal : vec3<f32>,
        @location(2) uv : vec2<f32>,
        @builtin(instance_index) instanceID : u32,
    ) -> VertexOut
    {
        // Setup output struct
        var output : VertexOut;
        var p = position;
        
        // Create depth effect by offsetting each instance along Z
        p.z += (f32(instanceID) * 0.3) - 9.0;  // Spread instances in depth
        
        output.instancePosition = p;
        // Transform to clip space through matrix chain
        output.position = projectionMatrix * viewMatrix * worldMatrix * p;
        
        // Transform normal to world space
        output.normal = (worldMatrix * vec4<f32>(normal, 0.0)).xyz;
        output.uv = uv;
        output.viewPosition = viewMatrix * worldMatrix * position;
        return output;
    } 

    @fragment
    fn fragment_main(fragData: VertexOut) -> @location(0) vec4<f32>
    {   
        var uvFlipY = vec2<f32>(fragData.uv.x, 1.0 - fragData.uv.y);
        var videoColor = textureSample(videoTexture, texSampler, uvFlipY);

        let minEdge = 0.002;
        let maxEdge = 0.004;
        // var n = getCurlVelocity(vec4<f32>(fragData.uv, fragData.instancePosition.z, 0.0));
        var edgeLX = smoothstep(minEdge, maxEdge, fragData.uv.x);
        var edgeRX = smoothstep(minEdge, maxEdge, 1.0 - fragData.uv.x);
        var edgeX = min(edgeLX, edgeRX);
        var edgeTY = smoothstep(minEdge, maxEdge, fragData.uv.y);
        var edgeBY = smoothstep(minEdge, maxEdge, 1.0 - fragData.uv.y);
        var edgeY = min(edgeTY, edgeBY);
        var edge = 1.0 - min(edgeX, edgeY);
        let luminance = dot(videoColor.rgb, vec3<f32>(0.2125, 0.7154, 0.0721));
        
        // Add brightness adjustment
        let brightness = luminance + 0.1; // Increase by 0.2, adjust this value as needed
        let contrast = pow(brightness, 1.9);
        
        videoColor = vec4<f32>(vec3<f32>(contrast + edge), mix(0.2, 1.0, smoothstep(0.25, 0.3, edge)));
        
        return videoColor;
    }`,
    {
        // Configure material bindings for the shader
        bindings: [
            {
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                value: time,
            },
            {
                binding: 1,
                visibility: GPUShaderStage.FRAGMENT,
                value: framesTexture,
            },
            {
                binding: 2,
                visibility: GPUShaderStage.FRAGMENT,
                value: sampler,
            }
        ],
        cullMode: 'none',        // Disable backface culling
        transparent: true,       // Enable alpha blending
    }
);

// Create base geometry for video plane
// Using 16:9 aspect ratio to match typical video dimensions
const geometry: PlaneGeometry = new PlaneGeometry(16, 9, 1, 1);
// Create instanced Geometry for the layered effect
const layersInstanced: InstancedGeometry = new InstancedGeometry(geometry, layerCount);

// Initialize the application
const init = async () => {
    // Setup WebGPU context
    await renderer.initialize();
    canvasContainer?.appendChild(renderer.canvas);
    
    // Create renderable object from geometry and material
    const layerRenderable: Renderable = new Renderable(layersInstanced, material);
    scene.add(layerRenderable);

    // Handle window resizing
    window.addEventListener('resize', resize);
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
    mouseVectors.update(deltaTime);
    cameraControls.update(deltaTime);

    // Only render if video is ready
    if(videoInitialized) {
        renderer.render(scene, camera);
    }
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
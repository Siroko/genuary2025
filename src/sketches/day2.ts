import { BufferBase, Camera, CameraControls, Compute, ComputeBuffer, Float, InstancedGeometry, Material, MouseVectors, PlaneGeometry, Renderable, Renderer, Scene, Vector3 } from "kansei";
import gsap from "gsap";

const canvasContainer: HTMLElement | null = document.getElementById('canvas-container');
const camera: Camera = new Camera(45, 0.1, 10000, window.innerWidth / window.innerHeight);
const renderer: Renderer = new Renderer({
    width: window.innerWidth,
    height: window.innerHeight,
    antialias: true,
    devicePixelRatio: devicePixelRatio,
    sampleCount: 4,
});

const layerCount = 256;
const time = new Float(0);
const mouseVectors: MouseVectors = new MouseVectors(canvasContainer!);
const cameraControls: CameraControls = new CameraControls(camera, new Vector3(0, 0, 0), canvasContainer!);
const scene: Scene = new Scene();
const material: Material = new Material(/* wgsl */`
    #include <curl>
    struct VertexOut {
        @builtin(position) position : vec4<f32>,
        @location(1) normal : vec3<f32>,
        @location(2) uv : vec2<f32>,
        @location(3) viewPosition : vec4<f32>,
        @location(4) instancePosition : vec4<f32>,
    };

    @group(0) @binding(0) var<uniform> time:f32;

    @group(1) @binding(0) var<uniform> normalMatrix:mat4x4<f32>;
    @group(1) @binding(1) var<uniform> worldMatrix:mat4x4<f32>;

    @group(2) @binding(0) var<uniform> viewMatrix:mat4x4<f32>;
    @group(2) @binding(1) var<uniform> projectionMatrix:mat4x4<f32>;

    @vertex
    fn vertex_main(
        @location(0) position: vec4<f32>,
        @location(1) normal : vec3<f32>,
        @location(2) uv : vec2<f32>,
        @builtin(instance_index) instanceID : u32,
    ) -> VertexOut
    {
        var output : VertexOut;
        var p = position;
        p.z -= (f32(instanceID) * 0.7) - 100.0;
        // p.y += sin(time + p.z * 0.07) * 10.7;
        // p.x += cos(time + p.z * 0.07) * 10.7;
        output.instancePosition = p;
        output.position = projectionMatrix * viewMatrix * worldMatrix * p;
        
        output.normal = (worldMatrix * vec4<f32>(normal, 0.0)).xyz;
        output.uv = uv;
        output.viewPosition = viewMatrix * worldMatrix * position;
        return output;
    } 

    @fragment
    fn fragment_main(fragData: VertexOut) -> @location(0) vec4<f32>
    {
        let minEdge = 0.006;
        let maxEdge = 0.008;
        // var n = getCurlVelocity(vec4<f32>(fragData.uv, fragData.instancePosition.z, 0.0));
        var edgeLX = smoothstep(minEdge, maxEdge, fragData.uv.x);
        var edgeRX = smoothstep(minEdge, maxEdge, 1.0 - fragData.uv.x);
        var edgeX = min(edgeLX, edgeRX);
        var edgeTY = smoothstep(minEdge, maxEdge, fragData.uv.y);
        var edgeBY = smoothstep(minEdge, maxEdge, 1.0 - fragData.uv.y);
        var edgeY = min(edgeTY, edgeBY);
        var edge = min(edgeX, edgeY);
 
        return vec4<f32>(1.0, 1.0, 1.0, 1.1 - edge);
    }`,
    {
        bindings: [
            {
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                value: time,
            },
        ],
        cullMode: 'none',
        transparent: true,
    }
);

const geometry: PlaneGeometry = new PlaneGeometry(10, 10, 1, 1);
const layersInstanced: InstancedGeometry = new InstancedGeometry(geometry, layerCount);

const init = async () => {
    await renderer.initialize();
    canvasContainer?.appendChild(renderer.canvas);
    
    const layerRenderable: Renderable = new Renderable(layersInstanced, material);
    scene.add(layerRenderable);
    
    window.addEventListener('resize', resize);
    animate();
}

let lastTime = performance.now();

const animate = () => {
    requestAnimationFrame(animate);
    
    const currentTime = performance.now();
    const deltaTime = (currentTime - lastTime) * 0.001; // Convert to seconds
    lastTime = currentTime;
    time.value += deltaTime;

    mouseVectors.update(deltaTime);
    cameraControls.update(deltaTime);

    renderer.render(scene, camera);
}

const resize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
}

init();
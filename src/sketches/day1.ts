import { BufferBase, Camera, Compute, ComputeBuffer, Material, MouseVectors, PlaneGeometry, Renderable, Renderer, Scene } from "kansei";
import gsap from "gsap";

const canvasContainer: HTMLElement | null = document.getElementById('canvas-container');
const camera: Camera = new Camera(45, 0.1, 100, window.innerWidth / window.innerHeight);
const renderer: Renderer = new Renderer({
    width: window.innerWidth,
    height: window.innerHeight,
    antialias: true,
    devicePixelRatio: devicePixelRatio,
});
const drops: Renderable[] = [];
const ripples: Renderable[] = [];
const dropCount = 500;

const mouseVectors: MouseVectors = new MouseVectors(canvasContainer!);
const scene: Scene = new Scene();
const material: Material = new Material(/* wgsl */`
    struct VertexOut {
        @builtin(position) position : vec4<f32>,
        @location(1) normal : vec3<f32>,
        @location(2) uv : vec2<f32>,
        @location(3) viewPosition : vec4<f32>,
    };

    @group(1) @binding(0) var<uniform> normalMatrix:mat4x4<f32>;
    @group(1) @binding(1) var<uniform> worldMatrix:mat4x4<f32>;

    @group(2) @binding(0) var<uniform> viewMatrix:mat4x4<f32>;
    @group(2) @binding(1) var<uniform> projectionMatrix:mat4x4<f32>;

    @vertex
    fn vertex_main(
        @location(0) position: vec4<f32>,
        @location(1) normal : vec3<f32>,
        @location(2) uv : vec2<f32>
    ) -> VertexOut
    {
        var output : VertexOut;
        output.position = projectionMatrix * viewMatrix * worldMatrix * position;
        output.normal = (worldMatrix * vec4<f32>(normal, 0.0)).xyz;
        output.uv = uv;
        output.viewPosition = viewMatrix * worldMatrix * position;
        return output;
    } 

    @fragment
    fn fragment_main(fragData: VertexOut) -> @location(0) vec4<f32>
    {
        return vec4<f32>(1.0, 1.0, 1.0, 1.0);
    }`,
    {
        bindings: [],
    }
);

const dropsPosBuffer = new Float32Array(dropCount * 4);
for (let i = 0; i < dropCount; i++) {
    dropsPosBuffer[i * 4] = Math.floor(Math.random() * 500 - 250); // X coordinate
    dropsPosBuffer[i * 4 + 1] = Math.random() * 100; // Y coordinate
    dropsPosBuffer[i * 4 + 2] = Math.floor(Math.random() * 60 - 30); // Z coordinate
    dropsPosBuffer[i * 4 + 3] = 1; // W coordinate
}

const computeBufferPositions = new ComputeBuffer({
    usage: 
        BufferBase.BUFFER_USAGE_STORAGE |
        BufferBase.BUFFER_USAGE_COPY_SRC |
        BufferBase.BUFFER_USAGE_VERTEX,
    type: ComputeBuffer.BUFFER_TYPE_STORAGE,
    buffer: dropsPosBuffer,
    shaderLocation: 2,
    offset: 0,
    stride: 4 * 4,
    format: "float32x4"
});

const dropsScaleBuffer = new Float32Array(dropCount * 3);
for (let i = 0; i < dropCount; i++) {
    dropsScaleBuffer[i * 3] = 0.1;
    dropsScaleBuffer[i * 3 + 1] = (Math.random() + 1) * 5;
    dropsScaleBuffer[i * 3 + 2] = 1;
}

const computeBufferScales = new ComputeBuffer({
    usage: 
        BufferBase.BUFFER_USAGE_STORAGE |
        BufferBase.BUFFER_USAGE_COPY_SRC |
        BufferBase.BUFFER_USAGE_VERTEX,
    type: ComputeBuffer.BUFFER_TYPE_STORAGE,
    buffer: dropsScaleBuffer,
    shaderLocation: 3,
    offset: 0,
    stride: 3 * 4,
    format: "float32x3"
});

const compute: Compute = new Compute(/* wgsl */`
    struct Drop {
        position: vec3<f32>,
        scale: vec3<f32>
    };

    @group(0) @binding(0) var<uniform> deltaTime: f32;
    @group(0) @binding(1) var<uniform> dropCount: u32;
    @group(0) @binding(2) var<uniform> dropPositions: array<vec3<f32>>;
    @group(0) @binding(3) var<uniform> dropScales: array<vec3<f32>>;

    @compute @workgroup_size(64)
    fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let index = global_id.x;
        let drop = Drop(dropPositions[index], dropScales[index]);
        drop.position.y -= drop.speed * deltaTime;
        dropPositions[index] = drop.position;
    }`, 
    [
        
    ]
);

const geometry: PlaneGeometry = new PlaneGeometry(1, 1);

const init = async () => {
    await renderer.initialize();
    canvasContainer?.appendChild(renderer.canvas);

    camera.position.set(0, 0, 50);
    for (let i = 0; i < dropCount; i++) {
        const ripple = new Renderable(geometry, material);
        ripple.position.x = 0;
        ripple.position.y = 0;
        ripple.position.z = 0;
        ripple.scale.x = 0;
        ripple.scale.y = 0.1;
        ripple.rotation.x = Math.PI;
        scene.add(ripple);
        ripples.push(ripple);
    }

    for (let i = 0; i < dropCount; i++) {
        const drop = new Renderable(geometry, material);
        drop.position.x = Math.floor(Math.random() * 500 - 250);
        drop.position.y = Math.random() * 100;
        drop.position.z = Math.floor(Math.random() * 60 - 30);
        drop.scale.x = 0.1;
        drop.scale.y = (Math.random() + 1) * 5;
        drop.rotation.x = Math.PI;
        scene.add(drop);
        drops.push(drop);
    }
    window.addEventListener('resize', resize);
    animate();
}

let lastTime = performance.now();

const animate = () => {
    requestAnimationFrame(animate);
    
    const currentTime = performance.now();
    const deltaTime = (currentTime - lastTime) * 0.001; // Convert to seconds
    lastTime = currentTime;

    mouseVectors.update(deltaTime);
    camera.position.x = mouseVectors.mousePosition.x * 2;
    camera.position.y = mouseVectors.mousePosition.y * -1;

    for (let i = 0; i < dropCount; i++) {
        const drop = drops[i];
        drop.position.y -= 1.2 * deltaTime * 60; // Scale movement by deltaTime and normalize to 60fps
        if(drop.position.y < -10) {
            const ripple = ripples[i];
            
            ripple.position.x = drop.position.x;
            ripple.position.z = drop.position.z;
            ripple.position.y = drop.position.y - (drop.scale.y * 0.5);
            ripple.scale.x = 0;
            ripple.scale.y = 0.1;

            drop.position.x = Math.floor(Math.random() * 150 - 75);
            drop.position.z = Math.floor(Math.random() * 60 - 30);
            drop.position.y += 90;

            const timeRandom = Math.random() * 0.25 + 0.75;
            gsap.to(ripple.scale, {
                x: (Math.random() + 1) * 5,
                duration: timeRandom,
                ease: 'elastic.out',
            });
            gsap.to(ripple.scale, {
                y: 0,
                duration: 0.2,
                ease: 'power1.inOut',
                delay: 0.1,
            });
        }
    }
    renderer.render(scene, camera);
}

const resize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
}

init();
import { Camera, Material, MouseVectors, PlaneGeometry, Renderable, Renderer, Scene } from "kansei";
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
const dropCount = 1000;

const mouseVectors: MouseVectors = new MouseVectors(canvasContainer!);
const scene: Scene = new Scene();
const material: Material =new Material(/* wgsl */`
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

const geometry: PlaneGeometry = new PlaneGeometry(1, 1);

const init = async () => {
    await renderer.initialize();
    canvasContainer?.appendChild(renderer.canvas);

    camera.position.set(0, 0, 50);
    for (let i = 0; i < dropCount; i++) {
        const ripple = new Renderable(geometry, material);
        ripple.position.x = Math.floor(Math.random() * 1000 - 500);
        ripple.position.y = -15;
        ripple.position.z = Math.floor(Math.random() * 60 - 30);
        ripple.scale.x = 0;
        ripple.scale.y = 0.1;
        ripple.rotation.x = Math.PI;
        scene.add(ripple);
        ripples.push(ripple);
    }

    for (let i = 0; i < dropCount; i++) {
        const drop = new Renderable(geometry, material);
        drop.position.x = Math.floor(Math.random() * 1000 - 500);
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

    mouseVectors.update(0.01);
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

            drop.position.x = Math.floor(Math.random() * 1000 - 500);
            drop.position.z = Math.floor(Math.random() * 60 - 30);
            drop.position.y += 90;

            const timeRandom = Math.random() * 0.25 + 0.75;
            gsap.to(ripple.scale, {
                x: (Math.random() + 1) * 5,
                duration: timeRandom,
                ease: 'elastic.out',
            });
            gsap.to(ripple.scale, {
                x: 0,
                duration: 0.2,
                ease: 'power1.inOut',
                delay: timeRandom,
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
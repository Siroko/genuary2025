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
const dropCount = 1500;
const ripples: Renderable[] = [];
const rippleCount = 100;

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
        ripple.scale.x = (Math.random() + 1) * 5;
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

const animate = () => {
    requestAnimationFrame(animate);
    mouseVectors.update(0.01);
    camera.position.x = mouseVectors.mousePosition.x * 2;
    camera.position.y = mouseVectors.mousePosition.y * -1;
    const time = performance.now() * 0.0001;
    for (let i = 0; i < dropCount; i++) {
        const drop = drops[i];
        drop.position.y -= 0.7;
        if(drop.position.y < -10) {
            drop.position.x = Math.floor(Math.random() * 1000 - 500);
            drop.position.y += 100;
            ripples[i].position.x = drop.position.x;
            ripples[i].position.z =drop.position.z;
            ripples[i].position.y = -15;
            ripples[i].scale.x = 0;
            gsap.to(ripples[i].scale, {
                x: (Math.random() + 1) * 5,
                duration: 1.0,
                ease: 'elastic.out',
            });
            gsap.to(ripples[i].scale, {
                x: 0,
                duration: 0.5,
                ease: 'power1.inOut',
                delay: 1.0,
            });
        }
        // cube.position.x = Math.sin(time + i * 0.001) * 200 - 100;
    }
    renderer.render(scene, camera);
}

const resize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
}

init();
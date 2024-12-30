import { Camera, Material, PlaneGeometry, Renderable, Renderer, Scene } from "kansei";

const canvasContainer: HTMLElement | null = document.getElementById('canvas-container');
const camera: Camera = new Camera(45, 0.1, 100, window.innerWidth / window.innerHeight);
const renderer: Renderer = new Renderer({
    width: window.innerWidth,
    height: window.innerHeight,
    antialias: true,
    devicePixelRatio: devicePixelRatio,
});
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
    for (let i = 0; i < 5000; i++) {
        const cube = new Renderable(geometry, material);
        cube.position.x = Math.floor(Math.random() * 1000 - 500);
        cube.position.y = Math.floor(Math.random() * 60 - 30);
        cube.position.z = Math.floor(Math.random() * 60 - 30);
        cube.scale.x = (Math.random() + 1) * 5 ;
        cube.scale.y = 0.1;
        cube.rotation.x = Math.PI;
        scene.add(cube);
    }
    window.addEventListener('resize', resize);
    animate();
}

const animate = () => {
    requestAnimationFrame(animate);
    const time = performance.now() * 0.0001;
    for (let i = 0; i < 5000; i++) {
        const cube = scene.children[i];
        cube.position.x = Math.sin(time + i * 0.001) * 100 - 50;
    }
    renderer.render(scene, camera);
}

const resize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
}

init();
import { BoxGeometry, Camera, Material, Renderable, Renderer, Scene } from "kansei";

const canvasContainer: HTMLElement | null = document.getElementById('canvas-container');
const camera: Camera = new Camera(45, 0.1, 100, window.innerWidth / window.innerHeight);
const renderer: Renderer = new Renderer({
    width: window.innerWidth,
    height: window.innerHeight,
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
        var pointLight = vec3<f32>(100.0, 50.0, 0.0);
        var lightVector = pointLight;
        var lightDirection = normalize(lightVector);
        var surfaceColor = vec3<f32>(0.967, 0.8321, 0.837);
        var fogColor = vec3<f32>(0.1);
        var diffuse = (dot(fragData.normal, lightDirection) + 1.0) / 2.0;
        var halfLambertDiffuse = (diffuse * 0.5 + 0.5) * surfaceColor;
        halfLambertDiffuse = mix(halfLambertDiffuse, fogColor,  smoothstep(0.0, 1.0, abs(fragData.viewPosition.z / 1000.0)));
        return vec4<f32>(halfLambertDiffuse, 1.0);
    }`,
    {
        bindings: [],
    }
);

const geometry: BoxGeometry = new BoxGeometry(1, 1, 1);

let cube: Renderable;

const init = async () => {
    await renderer.initialize();
    canvasContainer?.appendChild(renderer.canvas);

    camera.position.set(0, 0, 10);
    for (let i = 0; i < 1000; i++) {
        const cube = new Renderable(geometry, material);
        cube.position.x = Math.random() * 20 - 10;
        cube.position.y = Math.random() * 20 - 10;
        cube.scale.x = 10;
        cube.scale.y = 0.01;
        cube.scale.z = 0.01;
        scene.add(cube);
    }

    animate();
}

const animate = () => {
    requestAnimationFrame(animate);
 
    renderer.render(scene, camera);
}

init();
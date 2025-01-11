import { Sampler, VideoTexture } from "kansei";
import { IBindable } from "kansei/dist/buffers/IBindable";

class FramesTexture implements IBindable {
    private computePipeline: GPUComputePipeline | null = null;
    private width = 4096;
    private height = 4096;

    private gpuDevice?: GPUDevice;
    /** Flag indicating if the texture has been initialized */
    public initialized: boolean = false;
    /** Magnification filter mode for the texture */
    public magFilter: GPUFilterMode = 'linear';
    /** Minification filter mode for the texture */
    public minFilter: GPUFilterMode = 'linear';
     /** Unique identifier for the texture */
     public uuid: string;
    /** Type identifier for the texture */
    public type: string = 'texture';
    /** Flag indicating if the texture needs to be updated */
    public needsUpdate: boolean = true;
    /** The underlying WebGPU texture object */
    private texture?: GPUTexture;
    private tempTexture?: GPUTexture;
    private externalTexture?: GPUExternalTexture;
    /** Shader to propagate frames into an atlas texture */
    private propagateFramesShader: string = /* wgsl */`
        @group(0) @binding(0) var inputTexture: texture_external;
        @group(0) @binding(1) var outputTexture: texture_storage_2d<rgba8unorm, write>;
        @group(0) @binding(2) var texSampler: sampler;
        @group(0) @binding(3) var atlasTexture: texture_2d<f32>;

        @compute @workgroup_size(8, 8)
        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
            let outCoord = vec2<u32>(global_id.xy);
            let inputTextureDimensions = vec2<f32>(textureDimensions(inputTexture));
            let outputTextureDimensions = vec2<f32>(textureDimensions(outputTexture));
            let uv = vec2<f32>(outCoord) / outputTextureDimensions;
            let totalFrames = 64.0;
            let colsRows = sqrt(totalFrames);
            
            // Calculate which frame bucket we're in
            let frameX = floor(uv.x * colsRows);
            let frameY = floor(uv.y * colsRows);
            let currentFrame = frameY * colsRows + frameX;
            
            // Calculate UV within the current frame bucket
            let localUV = vec2<f32>(
                fract(uv.x * colsRows),
                fract(uv.y * colsRows)
            );

            var writeColor: vec4<f32>;
            if (currentFrame == 0.0) {
                // First frame comes from webcam
                writeColor = textureSampleBaseClampToEdge(inputTexture, texSampler, localUV);
            } else {
                // Other frames come from the previous frame in the atlas
                let prevFrameX = (currentFrame - 1.0) % colsRows;
                let prevFrameY = floor((currentFrame - 1.0) / colsRows);
                let prevUV = vec2<f32>(
                    (prevFrameX + localUV.x) / colsRows,
                    (prevFrameY + localUV.y) / colsRows
                );
                writeColor = textureSampleLevel(atlasTexture, texSampler, prevUV, 0.0);
            }
            
            textureStore(outputTexture, vec2<i32>(outCoord), writeColor);
        }
    `;
    private sampler?: Sampler;
    private bindGroupLayout?: GPUBindGroupLayout;
    private updateInterval?: number;
    private fps: number = 30; // Default to 30 fps
    private lastUpdateTime: number = 0;
    private updateIntervalMs: number;

    constructor(
        private videoElement: HTMLVideoElement,
        fps: number = 30 // Default to 30 fps
    ) {
        this.uuid = crypto.randomUUID();
        this.sampler = new Sampler('linear', 'linear', 'repeat');
        this.fps = fps;
        this.updateIntervalMs = 1000 / fps;
    }

    public setFPS(fps: number) {
        this.fps = fps;
        this.updateIntervalMs = 1000 / fps;
    }

    // Update dispose method
    public dispose() {
        if (this.updateInterval !== undefined) {
            clearInterval(this.updateInterval);
        }
    }

    get resource(): GPUBindingResource {
        return this.texture!.createView({});
    }
    update(gpuDevice: GPUDevice): void {
        const currentTime = performance.now();
        const timeSinceLastUpdate = currentTime - this.lastUpdateTime;

        // Only update if enough time has passed
        if (timeSinceLastUpdate >= this.updateIntervalMs) {
            this.lastUpdateTime = currentTime;
            
            this.externalTexture = gpuDevice.importExternalTexture({ source: this.videoElement! });
            this.externalTexture.label = 'VideoTexture ' + this.uuid;

            const bindGroup = gpuDevice.createBindGroup({
                label: "Frames texture bind group",
                layout: this.computePipeline!.getBindGroupLayout(0),
                entries: [
                    { binding: 0, resource: this.externalTexture! },
                    { binding: 1, resource: this.tempTexture!.createView({}) },
                    { binding: 2, resource: this.sampler!.sampler! },
                    { binding: 3, resource: this.texture!.createView({}) },
                ],
            });

            const commandEncoder = gpuDevice.createCommandEncoder();
            const pass = commandEncoder.beginComputePass();
            pass.setPipeline(this.computePipeline!);
            pass.setBindGroup(0, bindGroup);
            pass.dispatchWorkgroups(Math.ceil(this.width / 8), Math.ceil(this.height / 8));
            pass.end();

            commandEncoder.copyTextureToTexture(
                { texture: this.tempTexture! },
                { texture: this.texture! },
                { width: this.width, height: this.height }
            );

            gpuDevice.queue.submit([commandEncoder.finish()]);
        }
    }

    initialize(gpuDevice: GPUDevice): void {
        this.gpuDevice = gpuDevice;
        this.sampler?.initialize(gpuDevice);
        const entries: GPUBindGroupLayoutEntry[] = [
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                externalTexture : {
                    sampleType: 'float',
                }
            },
            {
                binding: 1,
                visibility: GPUShaderStage.COMPUTE,
                storageTexture : {
                    access: 'write-only',
                    format: 'rgba8unorm'
                }
            },
            {
                binding: 2,
                visibility: GPUShaderStage.COMPUTE,
                sampler: { type: 'filtering' }
            },
            {
                binding: 3,
                visibility: GPUShaderStage.COMPUTE,
                texture: {
                    sampleType: 'float'
                }
            },
        ];
        this.bindGroupLayout = gpuDevice.createBindGroupLayout({
            label: 'Frames Textures BindGroupLayout',
            entries
        });

        this.computePipeline = gpuDevice.createComputePipeline({
            layout: 'auto',
            compute: {
                module: gpuDevice.createShaderModule({ code: this.propagateFramesShader }),
                entryPoint: 'main',
            },
        });

        const textureDescriptor: GPUTextureDescriptor = {
            size: { width: this.width, height: this.height },
            format: 'rgba8unorm',
            usage:
                GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_SRC |
                GPUTextureUsage.COPY_DST |
                GPUTextureUsage.RENDER_ATTACHMENT |
                GPUTextureUsage.STORAGE_BINDING,
            mipLevelCount: 1
        };
        this.texture = gpuDevice.createTexture(textureDescriptor);
        this.tempTexture = gpuDevice.createTexture(textureDescriptor);

        this.initialized = true;
    }
}

export { FramesTexture };
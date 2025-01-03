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
    private externalTexture?: GPUExternalTexture;
    /** Shader to propagate frames into an atlas texture */
    private propagateFramesShader: string = /* wgsl */`
        @group(0) @binding(0) var inputTexture: texture_external;
        @group(0) @binding(1) var outputTexture: texture_storage_2d<rgba8unorm, write>;
        @group(0) @binding(2) var texSampler: sampler;

        @compute @workgroup_size(8, 8)
        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
            let outCoord = vec2<u32>(global_id.xy);
            let inputTextureDimensions = vec2<f32>(textureDimensions(inputTexture));
            let outputTextureDimensions = vec2<f32>(textureDimensions(outputTexture));
            let uv = vec2<f32>(outCoord) / outputTextureDimensions;
            let totalFrames = 64.0;
            let colsRows = sqrt(totalFrames);
            let inputColor = textureSampleBaseClampToEdge(inputTexture, texSampler, uv);
            // let sliceColor = textureSample(outputTexture, texSampler, uv);
            textureStore(outputTexture, vec2<i32>(outCoord), inputColor);
        }
    `;
    private sampler?: Sampler;
    private bindGroupLayout?: GPUBindGroupLayout;

    constructor(
        private videoElement: HTMLVideoElement
    ) {
        this.uuid = crypto.randomUUID();
        this.sampler = new Sampler('linear', 'linear', 'repeat');
    }
    get resource(): GPUBindingResource {
        return this.texture!.createView({});
    }
    update(gpuDevice: GPUDevice): void {
        this.externalTexture = gpuDevice.importExternalTexture({ source: this.videoElement! });
        this.externalTexture.label = 'VideoTexture ' + this.uuid;

        const bindGroup = gpuDevice.createBindGroup({
            label: "Fames texture bind group",
            layout: this.computePipeline!.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: this.externalTexture! },
                { binding: 1, resource: this.texture!.createView({}) },
                { binding: 2, resource: this.sampler!.sampler! },
            ],
        });

        const commandEncoder = gpuDevice.createCommandEncoder();
        const pass = commandEncoder.beginComputePass();
        pass.setPipeline(this.computePipeline!);
        pass.setBindGroup(0, bindGroup);
        pass.dispatchWorkgroups(Math.ceil(this.width / 2), Math.ceil(this.height / 2));
        pass.end();
        gpuDevice.queue.submit([commandEncoder.finish()]);
        
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

        this.initialized = true;
    }
}

export { FramesTexture };
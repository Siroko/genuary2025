import { IBindable } from "kansei/dist/buffers/IBindable";

/**
 * Represents a WebGPU texture that can be bound to a shader.
 * Handles the creation and management of GPUTexture objects from ImageBitmap sources.
 * @implements {IBindable}
 */
class TextureUpdateable implements IBindable {
    /** Flag indicating if the texture has been initialized */
    public initialized: boolean = false;
    /** Magnification filter mode for the texture */
    public magFilter: GPUFilterMode = 'linear';
    /** Minification filter mode for the texture */
    public minFilter: GPUFilterMode = 'linear';
    /** Unique identifier for the texture */
    public uuid: string;
    /** Type identifier for the texture */
    type: string = 'texture';
    /** Flag indicating if the texture needs to be updated */
    public needsUpdate: boolean = false;
    /** The underlying WebGPU texture object */
    private texture?: GPUTexture;

    /**
     * Creates a new Texture instance.
     * @param {ImageBitmap} imageBitmap - The source image bitmap to create the texture from
     */
    constructor(
        public imageBitmap: ImageBitmap | HTMLCanvasElement,
        private mipmaps: boolean = false
    ) {
        this.uuid = crypto.randomUUID();
    }

    /**
     * Updates the texture. Currently a placeholder for future implementation.
     * @returns {Promise<void>}
     */
    public async update(gpuDevice: GPUDevice): Promise<void> {
        console.log('update texture', gpuDevice);
        this.initialize(gpuDevice);
        this.needsUpdate = false;
    }

    /**
     * Initializes the texture with the given WebGPU device.
     * @param {GPUDevice} gpuDevice - The WebGPU device to create the texture with
     */
    public initialize(gpuDevice: GPUDevice) {
        this.texture = this.webGPUTextureFromImageBitmapOrCanvas(gpuDevice, this.imageBitmap);
        if (this.mipmaps) this.createMipmaps(gpuDevice);
        this.initialized = true;
    }

    /**
     * Gets the binding resource for this texture.
     * @returns {GPUBindingResource} The texture view that can be used for binding
     */
    get resource(): GPUBindingResource {
        return this.texture!.createView();
    }

    /**
     * Creates a WebGPU texture from an ImageBitmap or Canvas source.
     * @param {GPUDevice} gpuDevice - The WebGPU device to create the texture with
     * @param {ImageBitmap | HTMLCanvasElement} source - The source image or canvas
     * @returns {GPUTexture} The created WebGPU texture
     * @private
     */
    private webGPUTextureFromImageBitmapOrCanvas(gpuDevice: GPUDevice, source: ImageBitmap | HTMLCanvasElement) {
        const textureDescriptor: GPUTextureDescriptor = {
            size: { width: source.width, height: source.height },
            format: 'rgba8unorm',
            usage:
                GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_SRC |
                GPUTextureUsage.COPY_DST |
                GPUTextureUsage.RENDER_ATTACHMENT |
                GPUTextureUsage.STORAGE_BINDING,
            mipLevelCount: this.mipmaps ? Math.floor(Math.log2(Math.max(source.width, source.height))) + 1 : 1
        };
        const texture = gpuDevice.createTexture(textureDescriptor);

        gpuDevice.queue.copyExternalImageToTexture({ source }, { texture }, textureDescriptor.size);

        return texture;
    }

    public createMipmaps(gpuDevice: GPUDevice) {
        const computePipeline = gpuDevice.createComputePipeline({
            layout: 'auto',
            compute: {
                module: gpuDevice.createShaderModule({ code: this.mipmapShader }),
                entryPoint: 'main',
            },
        });

        let width = this.texture!.width;
        let height = this.texture!.height;

        for (let level = 0; level < this.texture!.mipLevelCount - 1; level++) {
            const inputView = this.texture!.createView({
                baseMipLevel: level,
                mipLevelCount: 1,
            });
            const outputView = this.texture!.createView({
                baseMipLevel: level + 1,
                mipLevelCount: 1,
            });

            const bindGroup = gpuDevice.createBindGroup({
                layout: computePipeline.getBindGroupLayout(0),
                entries: [
                    { binding: 0, resource: inputView },
                    { binding: 1, resource: outputView },
                ],
            });

            const commandEncoder = gpuDevice.createCommandEncoder();
            const pass = commandEncoder.beginComputePass();
            pass.setPipeline(computePipeline);
            pass.setBindGroup(0, bindGroup);
            pass.dispatchWorkgroups(Math.ceil(width / 2), Math.ceil(height / 2));
            pass.end();
            gpuDevice.queue.submit([commandEncoder.finish()]);

            width /= 2;
            height /= 2;
        }

    }

    private mipmapShader: string = /* wgsl */`
        @group(0) @binding(0) var inputTexture: texture_2d<f32>;
        @group(0) @binding(1) var outputTexture: texture_storage_2d<rgba8unorm, write>;

        @compute @workgroup_size(8, 8)
        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
            let outCoord = vec2<u32>(global_id.xy);
            
            // Sample in a 6x3 pattern for enhanced anisotropic filtering
            let color = (
                // First (top) row - weight 0.1
                textureLoad(inputTexture, vec2<i32>(outCoord * 2u) + vec2<i32>(-2, -1), 0) * 0.01 +
                textureLoad(inputTexture, vec2<i32>(outCoord * 2u) + vec2<i32>(-1, -1), 0) * 0.02 +
                textureLoad(inputTexture, vec2<i32>(outCoord * 2u) + vec2<i32>(0, -1), 0) * 0.03 +
                textureLoad(inputTexture, vec2<i32>(outCoord * 2u) + vec2<i32>(1, -1), 0) * 0.02 +
                textureLoad(inputTexture, vec2<i32>(outCoord * 2u) + vec2<i32>(2, -1), 0) * 0.01 +
                textureLoad(inputTexture, vec2<i32>(outCoord * 2u) + vec2<i32>(3, -1), 0) * 0.01 +

                // Middle row (primary sampling) - weight 0.5
                textureLoad(inputTexture, vec2<i32>(outCoord * 2u) + vec2<i32>(-2, 0), 0) * 0.05 +
                textureLoad(inputTexture, vec2<i32>(outCoord * 2u) + vec2<i32>(-1, 0), 0) * 0.1 +
                textureLoad(inputTexture, vec2<i32>(outCoord * 2u) + vec2<i32>(0, 0), 0) * 0.15 +
                textureLoad(inputTexture, vec2<i32>(outCoord * 2u) + vec2<i32>(1, 0), 0) * 0.1 +
                textureLoad(inputTexture, vec2<i32>(outCoord * 2u) + vec2<i32>(2, 0), 0) * 0.05 +
                textureLoad(inputTexture, vec2<i32>(outCoord * 2u) + vec2<i32>(3, 0), 0) * 0.05 +

                // Bottom row - weight 0.4
                textureLoad(inputTexture, vec2<i32>(outCoord * 2u) + vec2<i32>(-2, 1), 0) * 0.04 +
                textureLoad(inputTexture, vec2<i32>(outCoord * 2u) + vec2<i32>(-1, 1), 0) * 0.08 +
                textureLoad(inputTexture, vec2<i32>(outCoord * 2u) + vec2<i32>(0, 1), 0) * 0.12 +
                textureLoad(inputTexture, vec2<i32>(outCoord * 2u) + vec2<i32>(1, 1), 0) * 0.08 +
                textureLoad(inputTexture, vec2<i32>(outCoord * 2u) + vec2<i32>(2, 1), 0) * 0.04 +
                textureLoad(inputTexture, vec2<i32>(outCoord * 2u) + vec2<i32>(3, 1), 0) * 0.04
            );

            textureStore(outputTexture, vec2<i32>(outCoord), color);
        }
    `;
}

export { TextureUpdateable }

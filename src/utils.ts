import { Texture } from "kansei";

const audioSelector = document.querySelector('audio');
const audioBtn: HTMLElement | null = document.querySelector('.audio-btn');
audioBtn!.style.opacity = audioSelector!.muted ? '0.5' : '1';
(window as any).toggleAudio = () => {
    if (audioSelector && audioBtn) {
        audioSelector.muted = !audioSelector.muted;
        audioSelector.play();
        audioBtn.style.opacity = audioSelector.muted ? '0.5' : '1';
    }
}

const infoContainer: HTMLElement | null = document.querySelector('.wrapper');
infoContainer!.style.transition = 'opacity 0.5s ease-in-out';
let timeoutId: number = 0;
timeoutId = setTimeout(() => {
    infoContainer!.style.opacity = '0';
}, 4000);
addEventListener('mousemove', (e) => {
    const y = e.clientY;
    if(y > window.innerHeight / 1.3) {
        infoContainer!.style.opacity = '1';
    }
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
        infoContainer!.style.opacity = '0';
    }, 2000);
});


// Propagate frames into one single texture
let computePipeline: GPUComputePipeline | null = null;
let width = 4096;
let height = 4096;
let inputView: GPUTextureView;
let outputView: GPUTextureView;

export const initializeFramesPropagationPipeline = (gpuDevice: GPUDevice) => {
    computePipeline = gpuDevice.createComputePipeline({
        layout: 'auto',
        compute: {
            module: gpuDevice.createShaderModule({ code: propagateFramesShader }),
            entryPoint: 'main',
        },
    });

    const textureDescriptor: GPUTextureDescriptor = {
        size: { width: width, height: height },
        format: 'rgba8unorm',
        usage:
            GPUTextureUsage.TEXTURE_BINDING |
            GPUTextureUsage.COPY_SRC |
            GPUTextureUsage.COPY_DST |
            GPUTextureUsage.RENDER_ATTACHMENT |
            GPUTextureUsage.STORAGE_BINDING,
        mipLevelCount: 1
    };
    const texture = gpuDevice.createTexture(textureDescriptor);

    inputView = texture!.createView({});
    outputView = texture!.createView({});
}

export const updateFrames = (gpuDevice: GPUDevice) => {
    if(computePipeline) {
        const bindGroup = gpuDevice.createBindGroup({
            layout: computePipeline!.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: inputView },
                { binding: 1, resource: outputView },
            ],
        });

        const commandEncoder = gpuDevice.createCommandEncoder();
        const pass = commandEncoder.beginComputePass();
        pass.setPipeline(computePipeline!);
        pass.setBindGroup(0, bindGroup);
        pass.dispatchWorkgroups(Math.ceil(width / 2), Math.ceil(height / 2));
        pass.end();
        gpuDevice.queue.submit([commandEncoder.finish()]);
    }
}

const propagateFramesShader: string = /* wgsl */`
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
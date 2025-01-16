import { Object3D, Geometry, Material, Texture, TextureLoader, Renderable, Sampler } from "kansei";
import IJsonFormat from "./IJsonFormat";
import { shaderCode } from "./shaders/shaderMaterial";

class JSONGeometryLoader extends Object3D {
    private json: unknown;
    private data?: IJsonFormat;
    private textureLoader: TextureLoader = new TextureLoader();
    private sampler: Sampler = new Sampler('linear', 'linear', 'repeat');

    public geometries: Map<string, Geometry> = new Map();
    public materials: Map<string, Material> = new Map();
    public textures: Map<string, Texture> = new Map();


    constructor() {
        super();
    }

    public async loadJSON(jsonUrl: string): Promise<void> {
        const response = await fetch(jsonUrl);
        this.json = await response.json();
        this.data = this.json as IJsonFormat;
        console.log(this.data);
        // Parse the geometry data and create meshes
        await this.createMeshes();

        return new Promise((resolve) => {
            resolve();
        });
    }

    private async createMeshes() {
        if (!this.data) return;

        // Process each geometry in the scene
        this.data.scene.geometries.forEach((geometry, geoIndex) => {
            const { attributes } = geometry.data;

            // Create interleaved vertex buffer
            const vertexCount = attributes.position.array.length / 3;
            const interleavedArray = new Float32Array(vertexCount * 9);

            // Validate index buffer using a loop
            let maxIndex = 0;
            if (geometry.data.index) {
                for (let i = 0; i < geometry.data.index.array.length; i++) {
                    maxIndex = Math.max(maxIndex, geometry.data.index.array[i]);
                }
            }
            
            if (maxIndex >= vertexCount) {
                console.warn(`Geometry ${geoIndex}: Index buffer references vertex ${maxIndex} but only ${vertexCount} vertices exist. Skipping geometry.`);
                return;
            }

            for (let i = 0; i < vertexCount; i++) {
                const vertexOffset = i * 9;
                const positionOffset = i * 3;
                const normalOffset = i * 3;
                const uvOffset = i * 2;

                // Position (vec4)
                interleavedArray[vertexOffset + 0] = attributes.position.array[positionOffset + 0];
                interleavedArray[vertexOffset + 1] = attributes.position.array[positionOffset + 1];
                interleavedArray[vertexOffset + 2] = attributes.position.array[positionOffset + 2];
                interleavedArray[vertexOffset + 3] = 1.0; // w component

                // Normal (vec3)
                interleavedArray[vertexOffset + 4] = attributes.normal?.array[normalOffset + 0] ?? 0;
                interleavedArray[vertexOffset + 5] = attributes.normal?.array[normalOffset + 1] ?? 0;
                interleavedArray[vertexOffset + 6] = attributes.normal?.array[normalOffset + 2] ?? 0;

                // UV (vec2)
                interleavedArray[vertexOffset + 7] = attributes.uv?.array[uvOffset + 0] ?? 0;
                interleavedArray[vertexOffset + 8] = attributes.uv?.array[uvOffset + 1] ?? 0;
            }

            const g = new Geometry();
            
            // Create Uint16Array and pad to ensure 4-byte alignment
            const originalIndices = new Uint16Array(geometry.data.index?.array ?? []);
            const paddedLength = Math.ceil(originalIndices.length / 2) * 2; // Ensure length is even
            const indices = new Uint16Array(paddedLength);
            indices.set(originalIndices);
            
            g.indices = indices;
            g.vertices = interleavedArray;
            g.vertexCount = originalIndices.length; // Use original length for vertex count

            if (g.indices.length % 3 !== 0) {
                console.warn(`Geometry ${geoIndex}: Index count (${g.indices.length}) is not a multiple of 3. Skipping geometry.`);
                return;
            }

            this.geometries.set(geometry.uuid, g);
        });

        await this.loadTextures();

        this.data.scene.materials.forEach((material, matIndex) => {
            console.log(material.map);
            console.log(this.textures.get(material.map!));
            const m = new Material(shaderCode, {
                bindings: [
                    {
                        binding: 0,
                        visibility: GPUShaderStage.FRAGMENT,
                        value: this.textures.get(material.map!)
                    },
                    {
                        binding: 1,
                        visibility: GPUShaderStage.FRAGMENT,
                        value: this.textures.get(material.normalMap!)
                    },
                    {
                        binding: 6,
                        visibility: GPUShaderStage.FRAGMENT,
                        value: this.sampler
                    }
                ],
                cullMode: 'none'
            });
            this.materials.set(material.uuid, m);
        });

        this.traverseChildren(this.data.scene.object, this);
    }

    private async loadTextures(): Promise<void> {
        console.log('loading textures')
        for (let i = 0; i < this.data!.scene.textures.length; i++) {
            const texture = this.data!.scene.textures[i];
            const url = this.data?.scene.images.find(image => image.uuid === texture.image)?.url;
            console.log(url);
            if (!url) return;
            try {
                const image = await this.textureLoader.load(url);
                const t = new Texture(image);
                this.textures.set(texture.uuid, t);
            }catch (e) {
                console.log(e);
            }
        }

        return new Promise((resolve) => {
            resolve();
        });
    }

    private traverseChildren(object: any, parent: Object3D) {
        let container = parent;
        
        // Create or use group
        if (object.type === 'Group') {
            const group = new Object3D();
            // TODO: Apply any transformations from object to group
            container.add(group);
            container = group;
        }
        
        // Create renderable object if it has geometry
        const renderable = object.geometry ? this.createObject(object) : null;
        // Add renderable to appropriate container
        if (renderable) {
            renderable.rotation.x = Math.PI / 2;
            container.add(renderable);
        }

        // Process children
        if (object.children?.length > 0) {
            object.children.forEach((child: any) => {
                this.traverseChildren(child, container);
            });
        }
    }

    private createObject(object: any): Renderable | null {
        const geometry = this.geometries.get(object.geometry);
        const material = this.materials.get(object.material);
        if (!geometry || !material) return null;
        return new Renderable(geometry, material);
    }
}

export { JSONGeometryLoader };
export interface IJsonFormat {
    metadata: Record<string, unknown>;
    project: {
        shadows: boolean;
        shadowType: number;
        toneMapping: number;
        toneMappingExposure: number;
    };
    camera: {
        metadata: {
            version: number;
            type: string;
            generator: string;
        };
        object: {
            uuid: string;
            type: string;
            name: string;
            layers: number;
            matrix: number[];
            up: number[];
            fov: number;
            zoom: number;
            near: number;
            far: number;
            focus: number;
            aspect: number;
            filmGauge: number;
            filmOffset: number;
        };
    };
    scene: {
        metadata: {
            version: number;
            type: string;
            generator: string;
        };
        images: Array<{
            uuid: string;
            url: string;
            width?: number;
            height?: number;
        }>;
        textures: Array<{
            uuid: string;
            name?: string;
            image: string;
            mapping?: number;
            repeat?: [number, number];
            offset?: [number, number];
            center?: [number, number];
            rotation?: number;
            wrap?: [number, number];
            format?: number;
            type?: number;
            encoding?: number;
            minFilter?: number;
            magFilter?: number;
            anisotropy?: number;
            flipY?: boolean;
            premultiplyAlpha?: boolean;
            unpackAlignment?: number;
        }>;
        geometries: Array<{
            uuid: string;
            type: string;
            data: {
                attributes: {
                    position: {
                        itemSize: number;
                        type: string;
                        array: number[];
                    };
                    normal?: {
                        itemSize: number;
                        type: string;
                        array: number[];
                    };
                    uv?: {
                        itemSize: number;
                        type: string;
                        array: number[];
                    };
                };
                index?: {
                    type: string;
                    array: number[];
                };
                boundingSphere?: {
                    center: number[];
                    radius: number;
                };
            };
        }>;
        materials: Array<{
            uuid: string;
            type: string;
            name: string;
            color: number;
            roughness?: number;
            metalness?: number;
            emissive?: number;
            side?: number;
            map?: string;
            normalMap?: string;
            roughnessMap?: string;
            metalnessMap?: string;
            emissiveMap?: string;
            aoMap?: string;
            displacementMap?: string;
            alphaMap?: string;
            envMap?: string;
            normalScale?: { x: number; y: number };
            displacementScale?: number;
            displacementBias?: number;
            envMapIntensity?: number;
            transparent?: boolean;
            opacity?: number;
            alphaTest?: number;
            depthFunc?: number;
            depthTest?: boolean;
            depthWrite?: boolean;
            stencilWrite?: boolean;
            stencilWriteMask?: number;
            stencilFunc?: number;
            stencilRef?: number;
            stencilFuncMask?: number;
            stencilFail?: number;
            stencilZFail?: number;
            stencilZPass?: number;
        }>;
        object: {
            uuid: string;
            type: string;
            name: string;
            layers: number;
            matrix: number[];
            up: number[];
            children: Array<{
                uuid: string;
                type: string;
                name: string;
                layers: number;
                matrix: number[];
                up: number[];
                children?: Array<{
                    uuid: string;
                    type: string;
                    name: string;
                    userData?: {
                        name: string;
                    };
                    layers: number;
                    matrix: number[];
                    up: number[];
                    geometry: string;
                    material: string;
                }>;
            }>;
            backgroundRotation?: (number | string)[];
            environmentRotation?: (number | string)[];
        };
    };
    scripts?: Record<string, unknown>;
    history?: {
        undos: unknown[];
        redos: unknown[];
    };
    environment?: null;
}

export default IJsonFormat; 
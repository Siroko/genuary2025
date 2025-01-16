export const shaderCode = /* wgsl */`
struct VertexOut {
    @builtin(position) position : vec4<f32>,
    @location(1) uv : vec2<f32>,
    @location(2) normal : vec3<f32>,
    @location(3) tangent : vec3<f32>,
    @location(4) bitangent : vec3<f32>,
    @location(5) worldPos : vec3<f32>
};

@group(0) @binding(0) var map:texture_2d<f32>;
@group(0) @binding(1) var normalMap:texture_2d<f32>;
@group(0) @binding(2) var roughnessMap:texture_2d<f32>;
@group(0) @binding(3) var metallicMap:texture_2d<f32>;
@group(0) @binding(4) var aoMap:texture_2d<f32>;
@group(0) @binding(5) var emissiveMap:texture_2d<f32>;
@group(0) @binding(6) var samplerTexture:sampler;

@group(1) @binding(0) var<uniform> normalMatrix:mat4x4<f32>;
@group(1) @binding(1) var<uniform> worldMatrix:mat4x4<f32>;

@group(2) @binding(0) var<uniform> viewMatrix:mat4x4<f32>;
@group(2) @binding(1) var<uniform> projectionMatrix:mat4x4<f32>;

@vertex
fn vertex_main(
    @builtin(instance_index) instanceID: u32,
    @location(0) position: vec4<f32>,
    @location(1) normal : vec3<f32>,
    @location(2) uv : vec2<f32>
) -> VertexOut
{
    var output : VertexOut;
    var pos = position;
    
    // Calculate world space position
    var worldPos = (worldMatrix * pos).xyz;
    
    // Transform normal to world space
    var worldNormal = normalize((normalMatrix * vec4<f32>(normal, 0.0)).xyz);
    
    // Calculate tangent and bitangent
    // This is a simple approximation - works for most cases but might not be perfect
    var tangent = normalize(cross(worldNormal, vec3<f32>(0.0, 1.0, 0.0)));
    if (length(tangent) < 0.01) {
        tangent = normalize(cross(worldNormal, vec3<f32>(0.0, 0.0, 1.0)));
    }
    var worldBitangent = normalize(cross(worldNormal, tangent));
    var worldTangent = normalize(cross(worldBitangent, worldNormal));

    output.position = projectionMatrix * viewMatrix * worldMatrix * pos;
    output.uv = uv;
    output.normal = worldNormal;
    output.tangent = worldTangent;
    output.bitangent = worldBitangent;
    output.worldPos = worldPos;
    return output;
} 

@fragment
fn fragment_main(fragData: VertexOut) -> @location(0) vec4<f32>
{
    let baseColor = textureSample(map, samplerTexture, fragData.uv);
    
    // Convert normal from texture (0 to 1) to normal space (-1 to 1)
    let normalMap = textureSample(normalMap, samplerTexture, fragData.uv).xyz * 2.0 - 1.0;
    
    // Construct TBN matrix for tangent space to world space conversion
    let TBN = mat3x3<f32>(
        fragData.tangent,
        fragData.bitangent,
        fragData.normal
    );
    
    // Transform normal from tangent space to world space
    let worldNormal = normalize(TBN * normalMap);
    
    // Basic lighting calculation (you can adjust light direction)
    let lightDir = normalize(vec3<f32>(1.0, 1.0, 1.0));
    let lightColor = vec3<f32>(1.0, 1.0, 1.0);
    
    // Calculate diffuse lighting
    let diffuse = max(dot(worldNormal, lightDir), 0.0);
    let ambient = 0.5;
    
    let finalColor = baseColor.rgb * (diffuse + ambient);
    
    return vec4<f32>(finalColor, baseColor.a);
} 
`;
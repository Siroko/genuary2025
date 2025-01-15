import Delaunator from "delaunator";
import { Geometry } from "kansei";

export class DelaunayGeometry extends Geometry {
    // buffers

    private _indices: number[] = [];
    private _vertices: number[] = [];

    // helper variables

    private numberOfVertices: number = 0;

    public vertexCount: number = 0;

    constructor(
        points: Float32Array, 
        renderMode: 'triangles' | 'lines' = 'triangles',
        pointSelection: 'hull' | 'all' = 'all'
    ) {
        super();

        this.update(points, renderMode, pointSelection);
    }

    public update(
        points: Float32Array,
        renderMode: 'triangles' | 'lines' = 'triangles',
        pointSelection: 'hull' | 'all' = 'all'
    ) {
        // Clear the existing buffers
        this._vertices = [];
        this._indices = [];
        
        // Calculate bounding box
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (let i = 0; i < points.length; i += 2) {
            minX = Math.min(minX, points[i]);
            maxX = Math.max(maxX, points[i]);
            minY = Math.min(minY, points[i + 1]);
            maxY = Math.max(maxY, points[i + 1]);
        }

        const width = maxX - minX;
        const height = maxY - minY;

        const delaunay = new Delaunator(points);
        
        // First, create vertices from input points
        for (let i = 0; i < points.length; i += 2) {
            // Add vertex position (x, y, 0, 1)
            this._vertices.push(points[i], points[i + 1], 0, 1);
            // Add normal (0, 0, 1) for front face
            this._vertices.push(0, 0, 1);
            // Add UV coordinates (normalized based on bounding box)
            const u = (points[i] - minX) / width;
            const v = (points[i + 1] - minY) / height;
            this._vertices.push(u, v);
        }

        // First determine which points to use
        let trianglesToUse: Uint32Array;
        if (pointSelection === 'hull') {
            // Create triangles from hull points by making a fan from first point
            const tempTriangles = [];
            const hullPoints = delaunay.hull;
            const firstPoint = hullPoints[0];
            // Create triangles by connecting first point to each pair of consecutive hull points
            for (let i = 1; i < hullPoints.length - 1; i++) {
                tempTriangles.push(firstPoint, hullPoints[i], hullPoints[i + 1]);
            }
            trianglesToUse = new Uint32Array(tempTriangles);
        } else {
            // Use all triangles directly
            trianglesToUse = delaunay.triangles;
        }

        // Then apply the rendering mode
        if (renderMode === 'lines') {
            // Convert triangles to lines
            const lineIndices = [];
            for (let i = 0; i < trianglesToUse.length; i += 3) {
                const a = trianglesToUse[i];
                const b = trianglesToUse[(i + 1) % trianglesToUse.length];
                const c = trianglesToUse[(i + 2) % trianglesToUse.length];
                lineIndices.push(a, b, b, c, c, a);
            }
            this._indices = lineIndices;
        } else {
            // Use triangles directly
            this._indices = Array.from(trianglesToUse);
        }
        
        // Pad indices array to ensure multiple of 4
        while (this._indices.length % 4 !== 0) {
            this._indices.push(0);
        }
        
        this.vertexCount = this._indices.length;
        
        this.vertices = new Float32Array(this._vertices);
        this.indices = new Uint16Array(this._indices);

        this.initialized = false;
    }
}
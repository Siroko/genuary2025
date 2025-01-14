import Delaunator from "delaunator";
import { Geometry } from "kansei";

export class DelaunayGeometry extends Geometry {
    // buffers

    private _indices: number[] = [];
    private _vertices: number[] = [];

    // helper variables

    private numberOfVertices: number = 0;

    public vertexCount: number = 0;

    constructor(points: Float32Array, mode: 'triangles' | 'lines' = 'triangles') {
        super();

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

        // Convert triangles based on mode
        if (mode === 'lines') {
            // Use halfedges to get unique edges
            const { triangles, halfedges } = delaunay;
            for (let i = 0; i < triangles.length; i++) {
                // Only add edge if this halfedge is the primary one
                // (i.e., has a higher index than its pair or has no pair)
                if (halfedges[i] === -1 || i < halfedges[i]) {
                    const j = triangles[i];
                    const k = triangles[i % 3 === 2 ? i - 2 : i + 1];
                    this._indices.push(j, k);
                }
            }
        } else {
            // For triangles, just use the triangles directly
            this._indices.push(...delaunay.triangles);
        }
        
        // Pad indices array to ensure multiple of 4
        while (this._indices.length % 4 !== 0) {
            this._indices.push(0);
        }
        
        this.vertexCount = this._indices.length;
        
        this.vertices = new Float32Array(this._vertices);
        this.indices = new Uint16Array(this._indices);
        
    }
}

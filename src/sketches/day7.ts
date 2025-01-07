(() => {
  // Get reference to the container where our WebGPU canvas will be mounted
  const textContainer: HTMLElement | null = document.getElementById('text-container');
  textContainer!.style.fontFamily = "monospace";
  textContainer!.style.fontSize = "10px";
  textContainer!.style.lineHeight = "5px";
  textContainer!.style.color = "white";
  textContainer!.style.position = "absolute";
  textContainer!.style.left = "50%";
  textContainer!.style.top = "50%";
  textContainer!.style.transform = "translate3d(-50%, -50%, 0)";

  const width: number = 128; // Reduced for better visibility
  const totalPixels: number = width * width;
  let time = 0;

  // 3D cube vertices (centered at origin)
  const vertices = [
    [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
    [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
  ];

  // Cube edges (pairs of vertex indices)
  const edges = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7]
  ];

  const animate = () => {
    requestAnimationFrame(animate);
    let text = "";
    const buffer = Array(totalPixels).fill("·");

    // Rotation angles
    const rotationX = time * 0.03;
    const rotationY = time * 0.02;
    const rotationZ = time * 0.01;

    // Project and draw each edge
    for (const edge of edges) {
      const v1 = vertices[edge[0]];
      const v2 = vertices[edge[1]];

      // Rotate and project both vertices
      const points = [v1, v2].map(v => {
        // 3D rotations
        let [x, y, z] = v;
        
        // Rotate around X
        let temp = y;
        y = y * Math.cos(rotationX) - z * Math.sin(rotationX);
        z = temp * Math.sin(rotationX) + z * Math.cos(rotationX);

        // Rotate around Y
        temp = x;
        x = x * Math.cos(rotationY) + z * Math.sin(rotationY);
        z = -temp * Math.sin(rotationY) + z * Math.cos(rotationY);

        // Rotate around Z
        temp = x;
        x = x * Math.cos(rotationZ) - y * Math.sin(rotationZ);
        y = temp * Math.sin(rotationZ) + y * Math.cos(rotationZ);

        // Project to 2D
        const scale = 20;
        const px = Math.floor(x * scale + width / 2);
        const py = Math.floor(y * scale + width / 2);

        return [px, py];
      });

      // Draw line between projected points
      const [x1, y1] = points[0];
      const [x2, y2] = points[1];
      drawLine(x1, y1, x2, y2, buffer, width);
    }

    // Convert buffer to text
    for (let i = 0; i < totalPixels; i++) {
      text += buffer[i];
      if ((i + 1) % width === 0) text += "\n";
    }

    textContainer!.innerText = text;
    time++;
  }

  // Helper function to draw a line using Bresenham's algorithm
  function drawLine(x1: number, y1: number, x2: number, y2: number, buffer: string[], width: number) {
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      if (x1 >= 0 && x1 < width && y1 >= 0 && y1 < width) {
        buffer[y1 * width + x1] = "G";
      }

      if (x1 === x2 && y1 === y2) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x1 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y1 += sy;
      }
    }
  }

  animate();
})();


(() => {
  const textContainer: HTMLElement | null = document.getElementById('text-container');
  textContainer!.style.fontFamily = "monospace";
  textContainer!.style.fontSize = "16px";
  textContainer!.style.lineHeight = "24px";
  textContainer!.style.color = "white";
  textContainer!.style.position = "absolute";
  textContainer!.style.left = "50%";
  textContainer!.style.top = "50%";
  textContainer!.style.transform = "translate3d(-50%, -50%, 0)";

  const width: number = 32;
  const height: number = 32;
  let time = 0;

  class Vector {
    constructor(public x: number, public y: number) {}

    add(v: Vector): Vector {
      return new Vector(this.x + v.x, this.y + v.y);
    }

    sub(v: Vector): Vector {
      return new Vector(this.x - v.x, this.y - v.y);
    }

    mult(n: number): Vector {
      return new Vector(this.x * n, this.y * n);
    }

    div(n: number): Vector {
      return new Vector(this.x / n, this.y / n);
    }

    mag(): number {
      return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    normalize(): Vector {
      const m = this.mag();
      if (m !== 0) return this.div(m);
      return this;
    }

    limit(max: number): Vector {
      if (this.mag() > max) {
        return this.normalize().mult(max);
      }
      return this;
    }
  }

  class Boid {
    position: Vector;
    velocity: Vector;
    acceleration: Vector;
    maxForce: number = 0.1;
    maxSpeed: number = 2;

    constructor(x: number, y: number) {
      this.position = new Vector(x, y);
      this.velocity = new Vector(Math.random() * 2 - 1, Math.random() * 2 - 1);
      this.acceleration = new Vector(0, 0);
    }

    seek(target: Vector): Vector {
      let desired = target.sub(this.position);
      desired = desired.normalize().mult(this.maxSpeed);
      let steer = desired.sub(this.velocity);
      return steer.limit(this.maxForce);
    }

    flock(boids: Boid[]) {
      const alignPerception = 10;
      const cohesionPerception = 10;
      const separationPerception = 10;

      let alignSum = new Vector(0, 0);
      let cohesionSum = new Vector(0, 0);
      let separationSum = new Vector(0, 0);
      let alignTotal = 0;
      let cohesionTotal = 0;
      let separationTotal = 0;

      // Single unified loop for all behaviors
      for (let other of boids) {
        if (other === this) continue;
        
        const d = Math.hypot(
          this.position.x - other.position.x,
          this.position.y - other.position.y
        );

        // Alignment
        if (d < alignPerception) {
          alignSum = alignSum.add(other.velocity);
          alignTotal++;
        }

        // Cohesion
        if (d < cohesionPerception) {
          cohesionSum = cohesionSum.add(other.position);
          cohesionTotal++;
        }

        // Separation
        if (d < separationPerception) {
          let diff = this.position.sub(other.position);
          diff = diff.div(d * d);
          separationSum = separationSum.add(diff);
          separationTotal++;
        }
      }

      // Calculate final steering forces
      let alignment = new Vector(0, 0);
      let cohesion = new Vector(0, 0);
      let separation = new Vector(0, 0);

      // Alignment
      if (alignTotal > 0) {
        alignment = alignSum
          .div(alignTotal)
          .normalize()
          .mult(this.maxSpeed)
          .sub(this.velocity)
          .limit(this.maxForce);
      }

      // Cohesion
      if (cohesionTotal > 0) {
        cohesion = cohesionSum
          .div(cohesionTotal)
          .sub(this.position)
          .normalize()
          .mult(this.maxSpeed)
          .sub(this.velocity)
          .limit(this.maxForce);
      }

      // Separation
      if (separationTotal > 0) {
        separation = separationSum
          .div(separationTotal)
          .normalize()
          .mult(this.maxSpeed)
          .sub(this.velocity)
          .limit(this.maxForce);
      }

      // Calculate center attraction
      const center = new Vector(width/2, height/2);
      const centerAttraction = this.seek(center);

      // Apply forces with weights
      alignment = alignment.mult(1);
      cohesion = cohesion.mult(1);
      separation = separation.mult(1.1);
      const centerForce = centerAttraction.mult(0.6); // Adjust this weight to change center attraction strength

      this.acceleration = this.acceleration
        .add(alignment)
        .add(cohesion)
        .add(separation)
        .add(centerForce);
    }

    update() {
      this.position = this.position.add(this.velocity);
      this.velocity = this.velocity.add(this.acceleration);
      this.velocity = this.velocity.limit(this.maxSpeed);
      this.acceleration = this.acceleration.mult(0);

      // Reset if position becomes invalid (NaN or Infinity)
      if (!isFinite(this.position.x) || !isFinite(this.position.y)) {
        this.position = new Vector(width/2, height/2);
        this.velocity = new Vector(Math.random() * 2 - 1, Math.random() * 2 - 1);
      }

      this.edges();
    }

    edges() {
      // Wrap around edges
      if (this.position.x > width - 1) this.position.x = 0;
      if (this.position.x < 0) this.position.x = width - 1;
      if (this.position.y > height - 1) this.position.y = 0;
      if (this.position.y < 0) this.position.y = height - 1;
      
      // Safety check for velocity
      if (this.velocity.mag() < 0.01 || !isFinite(this.velocity.mag())) {
        this.velocity = new Vector(Math.random() * 2 - 1, Math.random() * 2 - 1);
      }
    }
  }

  const flock: Boid[] = Array(64).fill(0).map(() => 
    new Boid(Math.random() * width, Math.random() * height)
  );

  const animate = () => {
    requestAnimationFrame(animate);
    let buffer = Array(height).fill('').map(() => Array(width).fill('⚫'));

    // Update and draw boids
    for (let boid of flock) {
      boid.flock(flock);
      boid.update();
      
      // Ensure position is within bounds and valid
      const x = Math.floor(Math.max(0, Math.min(width - 1, boid.position.x)));
      const y = Math.floor(Math.max(0, Math.min(height - 1, boid.position.y)));
      
      // Only draw if coordinates are valid
      if (x >= 0 && x < width && y >= 0 && y < height && 
          isFinite(x) && isFinite(y)) {
        buffer[y][x] = '🐦';
      }
    }

    textContainer!.innerText = buffer
      .map(row => row.join(' '))
      .join('\n');
    time++;
  }

  animate();
})();


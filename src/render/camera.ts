export class Camera {
  x = 0;
  y = 0;
  initialized = false;

  reset(): void {
    this.x = 0;
    this.y = 0;
    this.initialized = false;
  }

  snapTo(targetX: number, targetY: number): void {
    this.x = targetX;
    this.y = targetY;
    this.initialized = true;
  }

  follow(targetX: number, targetY: number, dt: number): void {
    if (!this.initialized) {
      this.snapTo(targetX, targetY);
      return;
    }
    const smoothing = 1 - Math.exp(-dt * 8);
    this.x += (targetX - this.x) * smoothing;
    this.y += (targetY - this.y) * smoothing;
  }

  apply(ctx: CanvasRenderingContext2D, width: number, centerY: number): void {
    ctx.translate(width / 2 - this.x, centerY - this.y);
  }
}

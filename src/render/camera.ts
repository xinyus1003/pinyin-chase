export class Camera {
  x = 0;
  y = 0;
  initialized = false;

  follow(targetX: number, targetY: number, dt: number): void {
    if (!this.initialized) {
      this.x = targetX;
      this.y = targetY;
      this.initialized = true;
      return;
    }
    const smoothing = 1 - Math.exp(-dt * 8);
    this.x += (targetX - this.x) * smoothing;
    this.y += (targetY - this.y) * smoothing;
  }

  apply(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.translate(width / 2 - this.x, height / 2 - this.y);
  }
}

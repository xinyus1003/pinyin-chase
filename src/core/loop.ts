export class GameLoop {
  private raf = 0;
  private previous = 0;
  private accumulator = 0;
  private readonly step = 1 / 60;

  constructor(
    private readonly update: (dt: number) => void,
    private readonly render: (time: number) => void,
  ) {}

  start(): void {
    if (this.raf) return;
    this.previous = performance.now();
    const frame = (now: number) => {
      const elapsed = Math.min(0.1, (now - this.previous) / 1000);
      this.previous = now;
      this.accumulator += elapsed;
      while (this.accumulator >= this.step) {
        this.update(this.step);
        this.accumulator -= this.step;
      }
      this.render(now);
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }
}

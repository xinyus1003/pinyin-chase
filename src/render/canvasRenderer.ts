import type { GameSnapshot } from '../types';
import { sampleMaze } from '../core/maze';
import { Camera } from './camera';
import { drawEnemy, drawHero } from './characters';

type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string };

export class CanvasRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly camera = new Camera();
  private particles: Particle[] = [];
  private heroPosition = { x: 0, y: 0 };
  private lastFrame = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is not available');
    this.ctx = context;
    this.resize();
  }

  resize(): void {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.max(1, Math.round(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.round(rect.height * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  emitCorrect(): void {
    this.emit({ color: '#ddf247', count: 8, speed: 50 });
  }

  emitWrong(): void {
    this.emit({ color: '#ff4d4d', count: 14, speed: 90 });
  }

  emitLevelClear(): void {
    this.emit({ color: '#32e6d4', count: 28, speed: 140 });
  }

  emitCaught(): void {
    this.emit({ color: '#ff4d4d', count: 36, speed: 180 });
  }

  render(snapshot: GameSnapshot, time: number): void {
    const dt = this.lastFrame === 0 ? 1 / 60 : Math.min(0.1, (time - this.lastFrame) / 1000);
    this.lastFrame = time;
    const { ctx } = this;
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    ctx.clearRect(0, 0, width, height);
    ctx.save();

    const heroDistance = snapshot.level.maze.heroStartDistance + snapshot.heroLetters * 28;
    const hero = sampleMaze(snapshot.level.maze, heroDistance);
    this.heroPosition = { x: hero.x, y: hero.y };
    this.camera.follow(hero.x, hero.y, dt);
    this.camera.apply(ctx, width, height);

    this.drawMaze(snapshot);
    this.drawGate(snapshot);

    const enemy = sampleMaze(snapshot.level.maze, hero.distance - snapshot.gap * 28);
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    drawEnemy(ctx, time, 1 - Math.min(1, snapshot.gap / snapshot.level.initialGap));
    ctx.restore();

    ctx.save();
    ctx.translate(hero.x, hero.y);
    ctx.rotate(hero.angle);
    drawHero(ctx, time, snapshot.stunRemaining > 0);
    ctx.restore();

    this.updateParticles(dt);
    this.drawParticles();
    ctx.restore();

    if (snapshot.stunRemaining > 0) {
      ctx.fillStyle = 'rgba(255, 77, 77, .12)';
      ctx.fillRect(0, 0, width, height);
    }
  }

  private drawMaze(snapshot: GameSnapshot): void {
    const { ctx } = this;
    const samples = snapshot.level.maze.samples;
    const trace = () => {
      ctx.beginPath();
      samples.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
    };
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    trace();
    ctx.strokeStyle = '#183c5a';
    ctx.lineWidth = snapshot.level.maze.corridorWidth + 18;
    ctx.stroke();
    trace();
    ctx.strokeStyle = '#0d2038';
    ctx.lineWidth = snapshot.level.maze.corridorWidth;
    ctx.stroke();
    trace();
    ctx.strokeStyle = '#ddf24722';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 12]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawGate(snapshot: GameSnapshot): void {
    const end = snapshot.level.maze.samples.at(-1);
    if (!end) return;
    const { ctx } = this;
    ctx.save();
    ctx.translate(end.x, end.y);
    ctx.fillStyle = '#32e6d4';
    ctx.shadowColor = '#32e6d4';
    ctx.shadowBlur = 24;
    ctx.fillRect(-7, -30, 14, 60);
    ctx.restore();
  }

  private emit(options: { color: string; count: number; speed: number }): void {
    const sourceX = this.heroPosition.x;
    const sourceY = this.heroPosition.y;
    for (let i = 0; i < options.count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = options.speed * (0.4 + Math.random() * 0.8);
      this.particles.push({
        x: sourceX,
        y: sourceY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color: options.color,
      });
    }
  }

  private updateParticles(dt: number): void {
    for (const particle of this.particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 0.94;
      particle.vy *= 0.94;
      particle.life -= dt * 1.8;
    }
    this.particles = this.particles.filter((particle) => particle.life > 0);
  }

  private drawParticles(): void {
    const { ctx } = this;
    for (const particle of this.particles) {
      ctx.globalAlpha = particle.life;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

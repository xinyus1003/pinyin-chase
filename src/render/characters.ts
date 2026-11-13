export function drawHero(
  ctx: CanvasRenderingContext2D,
  time: number,
  stunned: boolean,
  animate = true,
): void {
  const bounce = animate && !stunned ? Math.sin(time / 70) * 2 : 0;
  ctx.save();
  ctx.translate(0, bounce);
  ctx.fillStyle = '#fff6d8';
  ctx.beginPath();
  ctx.arc(0, -9, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#32e6d4';
  ctx.beginPath();
  ctx.roundRect(-9, -1, 18, 18, 7);
  ctx.fill();
  ctx.fillStyle = '#071426';
  ctx.fillRect(-4, -11, 2, 3);
  ctx.fillRect(4, -11, 2, 3);
  ctx.strokeStyle = '#ff8b3d';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-7, 2);
  ctx.quadraticCurveTo(-22, 8 + (animate ? Math.sin(time / 90) * 4 : 0), -27, -3);
  ctx.stroke();
  ctx.restore();
}

export function drawEnemy(
  ctx: CanvasRenderingContext2D,
  time: number,
  danger: number,
  animate = true,
): void {
  const pulse = (animate ? 1 + Math.sin(time / 100) * 0.04 : 1) + danger * 0.08;
  ctx.save();
  ctx.scale(pulse, pulse);
  ctx.fillStyle = '#ff4d4d';
  ctx.beginPath();
  const points = 14;
  for (let i = 0; i <= points; i += 1) {
    const angle = (i / points) * Math.PI * 2;
    const radius = i % 2 === 0 ? 28 : 22;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ddf247';
  ctx.beginPath();
  ctx.arc(-8, -5, 4, 0, Math.PI * 2);
  ctx.arc(8, -5, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawGhost(ctx: CanvasRenderingContext2D, time: number, animate = true): void {
  const drift = animate ? Math.sin(time / 120) * 2 : 0;
  ctx.save();
  ctx.translate(0, drift);
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = '#32e6d4';
  ctx.shadowColor = '#32e6d4';
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.roundRect(-10, -2, 20, 20, 8);
  ctx.fill();
  ctx.globalAlpha = 0.46;
  ctx.fillStyle = '#fff6d8';
  ctx.beginPath();
  ctx.arc(0, -10, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.62;
  ctx.strokeStyle = '#32e6d4';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.arc(0, 0, 23, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

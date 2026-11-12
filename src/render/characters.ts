export function drawHero(ctx: CanvasRenderingContext2D, time: number, stunned: boolean): void {
  const bounce = stunned ? 0 : Math.sin(time / 70) * 2;
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
  ctx.quadraticCurveTo(-22, 8 + Math.sin(time / 90) * 4, -27, -3);
  ctx.stroke();
  ctx.restore();
}

export function drawEnemy(ctx: CanvasRenderingContext2D, time: number, danger: number): void {
  const pulse = 1 + Math.sin(time / 100) * 0.04 + danger * 0.08;
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

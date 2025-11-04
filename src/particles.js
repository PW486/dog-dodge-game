export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.boneImage = new Image();
    this.boneImage.src = 'src/images/particle-bone.svg';
  }

  spawn(x, y, color, options = {}) {
    const {
      count = 12,
      speed = { min: 40, max: 180 },
      life = { min: 0.6, max: 1.2 },
      size = { min: 4, max: 8 },
  type = 'circle'
    } = options;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = options.speed.min + Math.random() * (options.speed.max - options.speed.min);
      const size = options.size.min + Math.random() * (options.size.max - options.size.min);

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size,
        type,
        color,
        life: life.min + Math.random() * (life.max - life.min),
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 5
      });
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.vy += 300 * dt;
      p.vx *= 0.99;
      p.vy *= 0.99;

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.rotationSpeed * dt;
    }
  }

  draw(ctx) {
    ctx.save();
    for (const p of this.particles) {
      const alpha = Math.max(0, Math.min(1, p.life));
      ctx.globalAlpha = alpha;

      if (p.type === 'bone' && this.boneImage.complete) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.drawImage(this.boneImage, -p.size/2, -p.size/2, p.size, p.size);
        ctx.restore();
      } else {
        const gradient = ctx.createRadialGradient(
          p.x, p.y, 0,
          p.x, p.y, p.size
        );
        gradient.addColorStop(0, p.color);
        gradient.addColorStop(1, `${p.color}00`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}
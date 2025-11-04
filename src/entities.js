export class Sprite {
  constructor(imagePath, options = {}) {
    this.image = new Image();
    this.image.src = imagePath;
    this.width = options.width || 40;
    this.height = options.height || 40;
    this.scale = options.scale || 1;
  }

  draw(ctx, x, y) {
    if (!this.image.complete) return;
    
    const w = this.width * this.scale;
    const h = this.height * this.scale;
    
    ctx.save();
    ctx.translate(x + w/2, y + h/2);
    const bounce = Math.sin(Date.now() / 150) * 2;
    ctx.translate(0, bounce);
    ctx.drawImage(this.image, -w/2, -h/2, w, h);
    ctx.restore();
  }
}

export class Entity {
  constructor(x, y, width, height, sprite) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.sprite = sprite;
  }

  draw(ctx) {
    if (this.sprite) {
      this.sprite.draw(ctx, this.x, this.y);
    }
  }

  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
  }
}

export class Player extends Entity {
  constructor(x, y) {
    const sprite = new Sprite('src/images/player-dog.svg');
    super(x, y, 40, 40, sprite);
    this.speed = 280;
  }

  move(direction, dt) {
    this.x += direction * this.speed * dt;
  }
}

export class Obstacle extends Entity {
  constructor(x, y, width, height, speed) {
    const sprite = new Sprite('src/images/obstacle-dog.svg', { scale: width/40 });
    super(x, y, width, height, sprite);
    this.speed = speed;
  }

  update(dt) {
    this.y += this.speed * dt;
  return this.y > 800;
  }
}
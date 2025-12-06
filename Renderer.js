// Renderer.js - Pure rendering logic separated from game state
// Handles all visual output for the game

class GameRenderer {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.DPR = window.devicePixelRatio || 1;
    
    // Cache for loaded images
    this.images = {
      background: null,
      nuke: null,
      rocket: null,
      fireball: null,
      shotgun: null,
      playerHealthBar: null
    };
    
    this.imagesLoaded = {
      background: false,
      nuke: false,
      rocket: false,
      fireball: false,
      shotgun: false,
      playerHealthBar: false
    };
  }

  loadImage(key, src) {
    const img = new Image();
    img.onload = () => {
      this.imagesLoaded[key] = true;
    };
    img.onerror = () => {
      console.warn(`Failed to load image: ${src}`);
    };
    img.src = src;
    this.images[key] = img;
    return img;
  }

  // Render entire game state
  render(gameState) {
    const W = window.innerWidth;
    const H = window.innerHeight;

    // Draw background
    this.drawBackground(W, H);

    // Draw entities in order (back to front)
    this.drawGems(gameState.gems);
    this.drawEnemies(gameState.enemies);
    this.drawEnemyProjectiles(gameState.enemyProjectiles);
    this.drawProjectiles(gameState.projectiles);
    this.drawPowerups(gameState.powerups);
    this.drawPlayers(gameState.players);
    this.drawParticles(gameState.particles);
    this.drawDamageNumbers(gameState.damageNumbers);

    // Draw UI overlays
    if (gameState.gameState === 'playing') {
      this.drawPlayerUI(gameState);
    }
  }

  drawBackground(W, H) {
    if (this.imagesLoaded.background) {
      const img = this.images.background;
      const tileW = img.width;
      const tileH = img.height;
      const tilesX = Math.ceil(W / tileW) + 1;
      const tilesY = Math.ceil(H / tileH) + 1;
      for (let y = 0; y < tilesY; y++) {
        for (let x = 0; x < tilesX; x++) {
          this.ctx.drawImage(img, x * tileW, y * tileH);
        }
      }
    } else {
      this.ctx.fillStyle = '#04121a';
      this.ctx.fillRect(0, 0, W, H);
    }
  }

  drawGems(gems) {
    gems.forEach(g => {
      this.ctx.fillStyle = '#8fffa0';
      this.ctx.beginPath();
      this.ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }

  drawEnemies(enemies) {
    enemies.forEach(e => {
      // Try to use animation controller if available
      let drewSprite = false;

      if (e.isGolem && window.golemAnimController && e.animInstance) {
        drewSprite = window.golemAnimController.draw(this.ctx, e.animInstance, e.x, e.y, e.scale || 1.0);
      } else if (e.isRedAlien && window.redAlienAnimController && e.animInstance) {
        drewSprite = window.redAlienAnimController.draw(this.ctx, e.animInstance, e.x, e.y, e.scale || 1.0);
      } else if (!e.isGolem && !e.isRedAlien && window.enemyAnimController && e.animInstance) {
        drewSprite = window.enemyAnimController.draw(this.ctx, e.animInstance, e.x, e.y, e.scale || 1.0);
      }

      // Fallback to circle if sprite not available
      if (!drewSprite) {
        const color = e.isGolem ? '#8b4513' : e.isRedAlien ? '#ff0000' : '#5fff6f';
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        this.ctx.fill();
      }

      // Draw health bar
      this.drawHealthBar(e.x, e.y - e.radius - 8, e.hp, e.maxHp, 24, 3);
    });
  }

  drawEnemyProjectiles(projectiles) {
    projectiles.forEach(p => {
      this.ctx.fillStyle = '#8b4513';
      this.ctx.strokeStyle = '#654321';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();
    });
  }

  drawProjectiles(projectiles) {
    projectiles.forEach(p => {
      if (p.type === 'rocket') {
        this.ctx.fillStyle = '#fa4';
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = 'rgba(255,160,64,0.12)';
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.explosion, 0, Math.PI * 2);
        this.ctx.stroke();
      } else if (p.type === 'fireball' && this.imagesLoaded.fireball) {
        const size = 28;
        this.ctx.drawImage(this.images.fireball, p.x - size / 2, p.y - size / 2, size, size);
        this.ctx.fillStyle = 'rgba(255, 102, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.radius * 1.5, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        const color = p.type === 'rocket' ? '#ff9e4a' : p.type === 'fireball' ? '#ff6600' : '#fff7b2';
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        this.ctx.fill();
      }
    });
  }

  drawPowerups(powerups) {
    powerups.forEach(u => {
      let drewImage = false;
      
      if (u.type === 'nuke' && this.imagesLoaded.nuke) {
        const size = u.radius * 2;
        this.ctx.drawImage(this.images.nuke, u.x - size / 2, u.y - size / 2, size, size);
        drewImage = true;
      } else if (u.type === 'rocket' && this.imagesLoaded.rocket) {
        const size = u.radius * 2;
        this.ctx.drawImage(this.images.rocket, u.x - size / 2, u.y - size / 2, size, size);
        drewImage = true;
      } else if (u.type === 'shotgun' && this.imagesLoaded.shotgun) {
        const size = u.radius * 2;
        this.ctx.drawImage(this.images.shotgun, u.x - size / 2, u.y - size / 2, size, size);
        drewImage = true;
      }

      if (!drewImage) {
        this.ctx.fillStyle = u.color;
        this.ctx.beginPath();
        this.ctx.arc(u.x, u.y, u.radius, 0, Math.PI * 2);
        this.ctx.fill();
      }
    });
  }

  drawPlayers(players) {
    for (const [playerId, player] of players) {
      this.drawPlayer(player);
    }
  }

  drawPlayer(player) {
    // Try to use player animation if this is the 'player' character
    let drewSprite = false;
    if (player.characterId === 'player' && window.playerAnimController && player.animInstance) {
      drewSprite = window.playerAnimController.draw(this.ctx, player.animInstance, player.x, player.y, 1.0);
    }

    // Fallback to colored circle
    if (!drewSprite) {
      this.ctx.fillStyle = player.color;
      this.ctx.beginPath();
      this.ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Draw player health bar
    const barY = player.y - player.radius - 12;
    this.drawHealthBar(player.x, barY, player.health, player.maxHealth, 40, 5, player.color);

    // Draw player name tag (for multiplayer)
    if (player.name) {
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '12px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(player.name, player.x, player.y - player.radius - 25);
    }
  }

  drawHealthBar(x, y, current, max, width, height, color = '#ff4444') {
    const barWidth = width;
    const barHeight = height;
    const percent = Math.max(0, current / max);

    // Background
    this.ctx.fillStyle = '#333';
    this.ctx.fillRect(x - barWidth / 2, y, barWidth, barHeight);

    // Health fill
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x - barWidth / 2, y, barWidth * percent, barHeight);

    // Border
    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x - barWidth / 2, y, barWidth, barHeight);
  }

  drawParticles(particles) {
    particles.forEach(p => {
      const alpha = p.life / 0.5;
      this.ctx.fillStyle = p.color.replace('rgb', 'rgba').replace(')', `,${alpha})`);
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }

  drawDamageNumbers(damageNumbers) {
    damageNumbers.forEach(dn => {
      const alpha = dn.life / 0.6;
      this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      this.ctx.font = 'bold 16px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(dn.text, dn.x, dn.y);
    });
  }

  drawPlayerUI(gameState) {
    const player = gameState.getLocalPlayer();
    if (!player) return;

    const W = window.innerWidth;
    
    // Draw weapon indicator
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '16px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`Weapon: ${player.weapon}`, 10, H - 10);

    // Draw dash charges
    this.ctx.fillText(`Dash: ${'⚡'.repeat(player.dashCharges)}`, 10, H - 30);
  }

  // Clear the canvas
  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

// Export
window.GameRenderer = GameRenderer;

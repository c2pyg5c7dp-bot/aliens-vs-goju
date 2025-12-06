// GameState.js - Centralized game state management for multiplayer
// Separates game logic from rendering for Discord Activities integration

class GameState {
  constructor() {
    this.reset();
  }

  reset() {
    // Core game state
    this.gameState = 'menu'; // 'menu', 'playing', 'paused', 'leaderboard', 'charSelect'
    this.running = false;
    this.paused = false;
    this.score = 0;
    this.wave = 0;
    this.gameTime = 0;
    
    // Entity arrays
    this.players = new Map(); // Map of playerId -> player object
    this.enemies = [];
    this.projectiles = [];
    this.enemyProjectiles = [];
    this.powerups = [];
    this.gems = [];
    this.particles = [];
    this.damageNumbers = [];
    
    // Wave management
    this.waveInProgress = false;
    this.waveRewardShownForWave = 0;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.waveRewards = {};
    
    // Local player reference (for single player or local input)
    this.localPlayerId = null;
  }

  // Add a player to the game
  addPlayer(playerId, characterId = 'player', isLocal = false) {
    const char = window.CHARACTERS[characterId] || window.CHARACTERS.player;
    const player = {
      id: playerId,
      characterId: characterId,
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      radius: 14,
      health: char.maxHealth,
      maxHealth: char.maxHealth,
      speed: char.speed,
      damage: char.damage,
      fireRate: char.fireRate,
      fireTimer: 0,
      weapon: 'standard',
      weapons: { standard: true },
      baseSpeed: char.speed,
      activePowerups: {},
      fireballRingTimer: 0,
      swordAngle: 0,
      swordSwingDirection: 1,
      scoreMultiplier: 1,
      dashCharges: 3,
      maxDashCharges: 3,
      dashRechargeTime: 10,
      dashRechargeTimer: 0,
      isDashing: false,
      dashDuration: 0.2,
      dashTimer: 0,
      dashVelocity: { x: 0, y: 0 },
      gemPickupRange: char.gemPickupRange,
      color: char.color,
      _attachedAnims: [],
      // Animation instance if using sprite animations
      animInstance: null
    };

    this.players.set(playerId, player);
    
    if (isLocal) {
      this.localPlayerId = playerId;
    }

    return player;
  }

  // Remove a player from the game
  removePlayer(playerId) {
    this.players.delete(playerId);
    if (this.localPlayerId === playerId) {
      this.localPlayerId = null;
    }
  }

  // Get local player (for single player compatibility)
  getLocalPlayer() {
    if (this.localPlayerId) {
      return this.players.get(this.localPlayerId);
    }
    // Fallback: return first player
    return this.players.values().next().value;
  }

  // Update game logic (called every frame)
  update(dt, inputs) {
    if (!this.running || this.paused) return;

    // Update game timer
    this.gameTime += dt;

    // Process spawn queue
    this.updateSpawnQueue(dt);

    // Update all players
    for (const [playerId, player] of this.players) {
      const playerInput = inputs[playerId] || {};
      this.updatePlayer(player, dt, playerInput);
    }

    // Update enemies
    this.updateEnemies(dt);

    // Update projectiles
    this.updateProjectiles(dt);

    // Update enemy projectiles
    this.updateEnemyProjectiles(dt);

    // Update powerups
    this.updatePowerups(dt);

    // Update gems
    this.updateGems(dt);

    // Update particles
    this.updateParticles(dt);

    // Update damage numbers
    this.updateDamageNumbers(dt);
  }

  updateSpawnQueue(dt) {
    if (this.spawnQueue.length > 0) {
      this.spawnTimer += dt;
      const spawnInterval = 0.15;
      const enemiesPerInterval = 5;
      if (this.spawnTimer >= spawnInterval) {
        this.spawnTimer -= spawnInterval;
        const toSpawn = Math.min(enemiesPerInterval, this.spawnQueue.length);
        for (let i = 0; i < toSpawn; i++) {
          this.enemies.push(this.spawnQueue.shift());
        }
      }
    }
  }

  updatePlayer(player, dt, input) {
    // Dash recharge
    if (player.dashCharges < player.maxDashCharges) {
      player.dashRechargeTimer += dt;
      if (player.dashRechargeTimer >= player.dashRechargeTime) {
        player.dashRechargeTimer -= player.dashRechargeTime;
        player.dashCharges = Math.min(player.dashCharges + 1, player.maxDashCharges);
      }
    }

    // Dash activation
    if (input.space && !player.isDashing && player.dashCharges > 0) {
      player.isDashing = true;
      player.dashTimer = player.dashDuration;
      player.dashCharges--;

      let dx = 0, dy = 0;
      if (input.up) dy -= 1;
      if (input.down) dy += 1;
      if (input.left) dx -= 1;
      if (input.right) dx += 1;

      const dashDist = Math.hypot(dx, dy);
      if (dashDist > 0) {
        const dashSpeed = 1000;
        player.dashVelocity.x = (dx / dashDist) * dashSpeed;
        player.dashVelocity.y = (dy / dashDist) * dashSpeed;
      } else {
        player.dashVelocity.x = 0;
        player.dashVelocity.y = 1000;
      }
    }

    // Dash movement
    if (player.isDashing) {
      player.dashTimer -= dt;
      player.x += player.dashVelocity.x * dt;
      player.y += player.dashVelocity.y * dt;

      // Spawn dash particles
      if (typeof window.spawnParticles === 'function') {
        window.spawnParticles(player.x, player.y, '#00ffff', 3, 80);
      }

      if (player.dashTimer <= 0) {
        player.isDashing = false;
      }
    } else {
      // Normal movement
      let dx = 0, dy = 0;
      if (input.up) dy -= 1;
      if (input.down) dy += 1;
      if (input.left) dx -= 1;
      if (input.right) dx += 1;

      if (dx !== 0 || dy !== 0) {
        const dist = Math.hypot(dx, dy);
        player.x += (dx / dist) * player.speed * dt;
        player.y += (dy / dist) * player.speed * dt;
      }
    }

    // Clamp player to screen
    const W = window.innerWidth, H = window.innerHeight;
    player.x = Math.max(player.radius, Math.min(W - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(H - player.radius, player.y));

    // Fire weapon
    player.fireTimer += dt;
    if (player.fireTimer >= player.fireRate) {
      player.fireTimer -= player.fireRate;
      this.fireWeapon(player);
    }

    // Update powerup timers
    this.updatePlayerPowerups(player, dt);
  }

  updatePlayerPowerups(player, dt) {
    for (const type in player.activePowerups) {
      player.activePowerups[type] -= dt;
      if (player.activePowerups[type] <= 0) {
        delete player.activePowerups[type];
        
        // Reset effects when powerup expires
        if (type === 'speed') {
          player.speed = player.baseSpeed;
        } else if (type === 'x2score') {
          player.scoreMultiplier = Math.max(1, player.scoreMultiplier / 2);
        }
      }
    }
  }

  fireWeapon(player) {
    // This will be called from the main update - weapon firing logic
    // Keep reference to external shooting logic for now
    if (typeof window.handlePlayerShooting === 'function') {
      window.handlePlayerShooting(player, this);
    }
  }

  updateEnemies(dt) {
    // Reference to external enemy update for now
    if (typeof window.updateEnemiesLogic === 'function') {
      window.updateEnemiesLogic(this, dt);
    }
  }

  updateProjectiles(dt) {
    if (typeof window.updateProjectilesLogic === 'function') {
      window.updateProjectilesLogic(this, dt);
    }
  }

  updateEnemyProjectiles(dt) {
    if (typeof window.updateEnemyProjectilesLogic === 'function') {
      window.updateEnemyProjectilesLogic(this, dt);
    }
  }

  updatePowerups(dt) {
    if (typeof window.updatePowerupsLogic === 'function') {
      window.updatePowerupsLogic(this, dt);
    }
  }

  updateGems(dt) {
    if (typeof window.updateGemsLogic === 'function') {
      window.updateGemsLogic(this, dt);
    }
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  updateDamageNumbers(dt) {
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const dn = this.damageNumbers[i];
      dn.life -= dt;
      dn.y -= 30 * dt; // Float upward
      if (dn.life <= 0) {
        this.damageNumbers.splice(i, 1);
      }
    }
  }

  // Serialize state for network sync
  serialize() {
    return {
      gameState: this.gameState,
      running: this.running,
      paused: this.paused,
      score: this.score,
      wave: this.wave,
      gameTime: this.gameTime,
      players: Array.from(this.players.entries()).map(([id, p]) => [id, {
        id: p.id,
        characterId: p.characterId,
        x: p.x,
        y: p.y,
        health: p.health,
        weapon: p.weapon,
        isDashing: p.isDashing,
        dashCharges: p.dashCharges,
        scoreMultiplier: p.scoreMultiplier
      }]),
      enemies: this.enemies.map(e => ({
        x: e.x,
        y: e.y,
        hp: e.hp,
        isGolem: e.isGolem,
        isRedAlien: e.isRedAlien,
        isAttacking: e.isAttacking
      })),
      projectiles: this.projectiles.map(p => ({
        x: p.x,
        y: p.y,
        type: p.type
      })),
      powerups: this.powerups.map(p => ({
        x: p.x,
        y: p.y,
        type: p.type
      })),
      gems: this.gems.map(g => ({
        x: g.x,
        y: g.y,
        value: g.value
      }))
    };
  }

  // Deserialize state from network
  deserialize(data) {
    // Only update from authoritative server
    this.score = data.score;
    this.wave = data.wave;
    this.gameTime = data.gameTime;
    
    // Update players (keep local player control)
    // This is simplified - full implementation would handle interpolation
    for (const [id, playerData] of data.players) {
      if (id !== this.localPlayerId) {
        const player = this.players.get(id);
        if (player) {
          player.x = playerData.x;
          player.y = playerData.y;
          player.health = playerData.health;
        }
      }
    }
  }
}

// Export for use in main game
window.GameState = GameState;

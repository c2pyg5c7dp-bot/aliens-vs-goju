// Aliens vs Goju — A survival game
console.log('🎮 game.v2.js loading...');
console.log('Document ready state:', document.readyState);
console.log('DOM elements:', {
  canvas: document.getElementById('game'),
  startBtn: document.getElementById('startBtn'),
  characterCards: document.querySelectorAll('.character-card')
});

// Update loading screen
const loadingGame = document.getElementById('loading-game');
if (loadingGame) loadingGame.textContent = '⏳ Game Engine';

const canvas = document.getElementById('game');
if (!canvas) {
  console.error('CRITICAL: Canvas element not found!');
  console.error('Available elements with id:', Array.from(document.querySelectorAll('[id]')).map(el => el.id));
  alert('Game canvas not found. The page may not have loaded correctly. Please refresh.');
  throw new Error('Canvas element with id="game" not found');
}
const ctx = canvas.getContext('2d');
if (!ctx) {
  console.error('CRITICAL: Cannot get 2D context!');
  throw new Error('Cannot get 2D rendering context');
}
console.log('Canvas initialized successfully', { width: canvas.width, height: canvas.height });
if (loadingGame) loadingGame.textContent = '✅ Game Engine';
let DPR = window.devicePixelRatio || 1;

// Game dimensions
let W = window.innerWidth, H = window.innerHeight;

function resizeCanvas(){
  DPR = window.devicePixelRatio || 1;
  
  // Use visualViewport for better mobile support (especially iOS)
  let width = window.innerWidth;
  let height = window.innerHeight;
  
  if (window.visualViewport) {
    width = window.visualViewport.width;
    height = window.visualViewport.height;
  }
  
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  canvas.width = Math.floor(width * DPR);
  canvas.height = Math.floor(height * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  
  // Update game dimensions
  W = width;
  H = height;
}

window.addEventListener('resize', resizeCanvas);
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', resizeCanvas);
}
resizeCanvas();

// UI Elements
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const restartBtn = document.getElementById('restartBtn');

console.log('UI Elements found:', {
  startBtn: !!startBtn,
  pauseBtn: !!pauseBtn,
  restartBtn: !!restartBtn
});

if (!startBtn) {
  console.error('CRITICAL: Start button not found!');
  alert('Start button not found - game cannot start');
}

const leaderboardBtn = document.getElementById('leaderboardBtn');
const leaderboardList = document.getElementById('leaderboardList');
const leaderboardModal = document.getElementById('leaderboardModal');
const leaderboardModalList = document.getElementById('leaderboardModalList');
const closeLeaderboard = document.getElementById('closeLeaderboard');
const clearLeaderboard = document.getElementById('clearLeaderboard');
const rewardModal = document.getElementById('rewardModal');
const rewardHealth = document.getElementById('rewardHealth');
const rewardDamage = document.getElementById('rewardDamage');
const rewardRate = document.getElementById('rewardRate');
const rewardSpeed = document.getElementById('rewardSpeed');
const rewardMagnet = document.getElementById('rewardMagnet');
const scoreEl = document.getElementById('score');
const healthEl = document.getElementById('health');
const powerupsEl = document.getElementById('powerups');
const waveEl = document.getElementById('wave');

// Game state (W and H already declared above before resizeCanvas)
let gameState = 'menu'; // 'menu', 'playing', 'paused', 'leaderboard', 'charSelect'
let running = false, paused = false;
let score = 0, wave = 0;
let gameTime = 0; // Track elapsed game time in seconds
let enemies = [], projectiles = [], powerups = [], particles = [], gems = [];
let enemyProjectiles = []; // Red alien rock projectiles
let damageNumbers = []; // Floating damage numbers
let lastTime = 0;
let selectedCharacter = 'player'; // Default character

// Multiplayer player tracking
let multiplayerPlayers = []; // Array of {id, name, score, character}
function updateMultiplayerScore(playerId, playerName, playerScore, playerCharacter) {
  const existing = multiplayerPlayers.find(p => p.id === playerId);
  if (existing) {
    existing.score = playerScore;
    existing.name = playerName;
    existing.character = playerCharacter;
  } else {
    multiplayerPlayers.push({ id: playerId, name: playerName, score: playerScore, character: playerCharacter });
  }
}

// Character definitions
const CHARACTERS = {
  player: {
    name: 'Player',
    maxHealth: 12,
    speed: 220,
    damage: 1,
    fireRate: 0.12,
    gemPickupRange: 14,
    description: 'Balanced stats',
    color: '#4da6ff' // Blue
  },
  tank: {
    name: 'Tank',
    maxHealth: 20,
    speed: 180,
    damage: 1.5,
    fireRate: 0.18,
    gemPickupRange: 14,
    description: 'High health, slow but powerful',
    color: '#ff4444' // Red
  },
  speedster: {
    name: 'Speedster',
    maxHealth: 8,
    speed: 300,
    damage: 0.7,
    fireRate: 0.08,
    gemPickupRange: 20,
    description: 'Fast and agile with better pickup',
    color: '#ffff00' // Yellow
  },
  glass_cannon: {
    name: 'Glass Cannon',
    maxHealth: 6,
    speed: 200,
    damage: 2,
    fireRate: 0.10,
    gemPickupRange: 10,
    description: 'High damage but very fragile',
    color: '#ff00ff' // Magenta
  }
};
let rafId = null; // current requestAnimationFrame id
let waveInProgress = false;
let waveRewardShownForWave = 0; // ensure one reward per wave, require pick to continue
let spawnQueue = []; // Queue of enemies to spawn over time
let spawnTimer = 0; // Timer for spawn intervals
// track picked rewards per wave: { [waveNumber]: [ 'Health +3', 'Damage +0.5' ] }
const waveRewards = {};

function recordWaveReward(waveNum, text){
  if(!waveRewards[waveNum]) waveRewards[waveNum] = [];
  waveRewards[waveNum].push(text);
}

function renderRewardSummary(){
  if(!rewardModal) return;
  let summary = rewardModal.querySelector('.reward-summary');
  if(!summary){
    summary = document.createElement('div');
    summary.className = 'reward-summary';
    summary.style.marginTop = '10px';
    summary.style.fontSize = '13px';
    summary.style.color = '#fff';
    summary.style.maxHeight = '160px';
    summary.style.overflowY = 'auto';
    rewardModal.querySelector('.modal-content').appendChild(summary);
  }
  // build summary HTML
  const waves = Object.keys(waveRewards).map(n => parseInt(n,10)).sort((a,b)=>a-b);
  if(waves.length === 0){
    summary.innerHTML = '<em>No rewards picked yet.</em>';
    return;
  }
  let out = '<strong>Picked rewards per wave:</strong><br/>';
  waves.forEach(n => {
    out += `<div style="margin-top:6px"><strong>Wave ${n}:</strong> ${waveRewards[n].join(', ')}</div>`;
  });
  summary.innerHTML = out;
}

// compatibility object for tests / other code
window.diffMod = window.diffMod || { spawnRate: 1 };

// Wave triggers at score milestones
const waveThresholds = [500, 2000, 5000, 12000, 30000, 75000, 200000];
let nextWaveIndex = 0;

// Power-up configuration
const POWERUP_DURATION = 10.0; // seconds that active power-ups last
// Global tuning: slow enemies by 15% (multiply speeds by this factor)
const ENEMY_SPEED_FACTOR = 0.85;

// Animation Loader: allows external scripts to register sprites/animations
class AnimationLoader {
  constructor(){
    this.sprites = {}; // name -> { image, frameW, frameH, frames }
    this.instances = []; // active instances to update/draw
    this.externalFactories = {};
  }

  // Register a sprite sheet
  // imageUrl: string, frameW/frameH: numeric, frames: optional count
  registerSprite(name, imageUrl, frameW, frameH, frames){
    const img = new Image(); img.src = imageUrl;
    this.sprites[name] = { image: img, frameW, frameH, frames: frames || 1 };
    return this.sprites[name];
  }

  // Create an animation instance from a registered sprite
  // options: { x, y, loop=true, frameDuration=0.08, scale=1, z=0 }
  createInstance(spriteName, options={}){
    const s = this.sprites[spriteName];
    if(!s) throw new Error('Sprite not found: ' + spriteName);
    const inst = {
      sprite: s,
      x: options.x || 0,
      y: options.y || 0,
      loop: options.loop !== false,
      frameDuration: options.frameDuration || 0.08,
      scale: options.scale || 1,
      z: options.z || 0,
      playing: true,
      cur: 0,
      timer: 0,
      removeOnFinish: !!options.removeOnFinish,
      update: function(dt){
        if(!this.playing) return;
        this.timer += dt;
        while(this.timer >= this.frameDuration){
          this.timer -= this.frameDuration;
          this.cur++;
          if(this.cur >= this.sprite.frames){
            if(this.loop) this.cur = 0; else { this.cur = this.sprite.frames - 1; this.playing = false; }
          }
        }
      },
      draw: function(ctx){
        const fw = this.sprite.frameW, fh = this.sprite.frameH;
        const cols = Math.max(1, Math.floor(this.sprite.image.width / fw) || this.sprite.frames);
        const sx = (this.cur % cols) * fw;
        const sy = Math.floor(this.cur / cols) * fh;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);
        ctx.drawImage(this.sprite.image, sx, sy, fw, fh, -fw/2, -fh/2, fw, fh);
        ctx.restore();
      }
    };
    this.instances.push(inst);
    // keep instances sorted by z for draw order
    this.instances.sort((a,b)=> (a.z||0) - (b.z||0));
    return inst;
  }

  // Remove an instance (safe noop if not present)
  removeInstance(inst){ const i = this.instances.indexOf(inst); if(i>=0) this.instances.splice(i,1); }

  // Update all instances
  update(dt){
    for(let i = this.instances.length - 1; i >= 0; i--){
      const it = this.instances[i];
      it.update(dt);
      if(!it.playing && it.removeOnFinish) this.instances.splice(i,1);
    }
  }

  // Draw all instances (in z order)
  draw(ctx){
    for(const it of this.instances) it.draw(ctx);
  }

  // Load an external JS file that can register animations. The script can call
  // `window.registerAnimationFactory(name, factory)` to expose a factory function.
  loadScript(url){
    return new Promise((resolve, reject)=>{
      const s = document.createElement('script'); s.src = url; s.onload = ()=>resolve(); s.onerror = e=>reject(e); document.head.appendChild(s);
    });
  }

  // Allow external scripts to register a factory function that returns instances
  registerAnimationFactory(name, factory){ this.externalFactories[name] = factory; }

  // Create via factory if available
  createFromFactory(name, ...args){
    const f = this.externalFactories[name]; if(!f) throw new Error('Factory not found: '+name); const inst = f(this, ...args); if(inst) this.instances.push(inst); return inst;
  }
}

const animLoader = new AnimationLoader();
// expose a compact API for external use
window.AnimationLoader = AnimationLoader;
window.animLoader = animLoader;
window.registerSprite = animLoader.registerSprite.bind(animLoader);
window.createAnimationInstance = animLoader.createInstance.bind(animLoader);
window.loadAnimationScript = animLoader.loadScript.bind(animLoader);
window.registerAnimationFactory = animLoader.registerAnimationFactory.bind(animLoader);
window.createAnimationFromFactory = animLoader.createFromFactory.bind(animLoader);

// --- Player-attached animations helpers ---
// Keep a list of instances attached to the player and keep them synced each frame.
window.attachAnimationToPlayer = function(spriteOrFactoryName, opts = {}){
  // Initialize player._attachedAnims if needed
  if(!player._attachedAnims) player._attachedAnims = [];
  // If a factory with that name exists, prefer factory; otherwise treat as sprite name
  let inst = null;
  try{
    if(window.animLoader && window.animLoader.externalFactories && window.animLoader.externalFactories[spriteOrFactoryName]){
      inst = window.createAnimationFromFactory(spriteOrFactoryName, opts.text || '', Math.round(player.x + (opts.offsetX||0)), Math.round(player.y + (opts.offsetY||0)), opts);
    } else {
      inst = window.createAnimationInstance(spriteOrFactoryName, { x: Math.round(player.x + (opts.offsetX||0)), y: Math.round(player.y + (opts.offsetY||0)), loop: opts.loop !== false, frameDuration: opts.frameDuration || 0.08, scale: opts.scale || 1, removeOnFinish: !!opts.removeOnFinish, z: (opts.z != null ? opts.z : 50) });
    }
  } catch(e){ console.warn('attachAnimationToPlayer failed', e); }
  if(inst){
    // store sync options on instance
    inst._attachOffsetX = opts.offsetX || 0;
    inst._attachOffsetY = opts.offsetY || 0;
    inst._attachFollowRotation = !!opts.followRotation; // reserved, not implemented
    player._attachedAnims.push(inst);
  }
  return inst;
};

window.detachAnimationFromPlayer = function(instOrName){
  if(!player._attachedAnims) return;
  for(let i = player._attachedAnims.length - 1; i >= 0; i--){
    const it = player._attachedAnims[i];
    if(it === instOrName || (typeof instOrName === 'string' && (it.sprite && it.sprite.name === instOrName))){
      // remove from animLoader list if present
      if(window.animLoader) window.animLoader.removeInstance(it);
      player._attachedAnims.splice(i,1);
    }
  }
};

// Classes
class Player {
  constructor(characterId = 'player'){
    const char = CHARACTERS[characterId] || CHARACTERS.player;
    this.x = W/2; this.y = H/2; this.radius = 14;
    this.health = char.maxHealth; this.maxHealth = char.maxHealth;
    this.speed = char.speed;
    this.damage = char.damage;
    this.fireRate = char.fireRate; this.fireTimer = 0;
    this.weapon = 'standard';
    this.weapons = { standard: true };
    this.baseSpeed = char.speed; // keep original base speed
    this.activePowerups = {}; // { type: remainingSeconds }
    this.fireballRingTimer = 0; // Timer for fireball ring damage ticks
    this.swordAngle = 0; // Track sword swing angle
    this.swordSwingDirection = 1; // 1 for forward, -1 for backward
    this.scoreMultiplier = 1; // Score multiplier for x2score powerup
    this.dashCharges = 3; // Number of dash charges
    this.maxDashCharges = 3;
    this.dashRechargeTime = 10; // 10 seconds per charge (30 seconds for all 3)
    this.dashRechargeTimer = 0; // Timer for recharging
    this.isDashing = false;
    this.dashDuration = 0.2; // Dash lasts 0.2 seconds
    this.dashTimer = 0;
    this.dashVelocity = { x: 0, y: 0 };
    this.gemPickupRange = char.gemPickupRange; // Base pickup range
    this.characterId = characterId; // Track which character this is
    this.color = char.color; // Character color for fallback rendering
  }
}

class Enemy {
  constructor(x, y, hp, isGolem = false, isRedAlien = false){
    this.x = x; this.y = y; this.hp = hp; this.maxHp = hp;
    this.isGolem = isGolem;
    this.isRedAlien = isRedAlien;
    this.radius = 16; // Match 32x32 animation size (half width)
    this.speed = window.ENEMY_BASE_SPEED || 198; // Use global speed or default
    this.color = hp <= 1 ? '#ff6b6b' : hp <= 3 ? '#ffb86b' : hp <= 6 ? '#ffd86b' : '#7ef0a6';
    this.scale = isGolem ? 4.5 : isRedAlien ? 2.5 : (1.5 + (hp * 0.15)); // Red alien is 2.5x size
    this.vx = 0; this.vy = 0; // velocity for animations
    this.burnDamage = 0; // Damage per tick from burn
    this.burnDuration = 0; // Remaining burn duration
    // Golem attack state
    if(isGolem){
      this.attackRange = 80; // Distance to trigger attack
      this.isAttacking = false;
      this.attackCooldown = 0;
      this.attackTimer = 0;
      this.attackDuration = 0.7; // Duration of high-kick animation
      this.hasDealtDamage = false; // Track if damage was dealt this attack
    }
    // Red Alien attack state
    if(isRedAlien){
      this.attackRange = 1400; // Distance to trigger rock throw (4x the original 350)
      this.isAttacking = false;
      this.attackCooldown = 0;
      this.attackTimer = 0;
      this.attackDuration = 0.8; // Duration of throw animation
      this.hasThrown = false; // Track if rock was thrown this attack
    }
    // Create animation instance
    try{
      if(isGolem && window.golemAnimController){
        this.animInstance = window.golemAnimController.createInstance();
      } else if(isRedAlien && window.redAlienAnimController){
        this.animInstance = window.redAlienAnimController.createInstance();
      } else if(window.enemyAnimController){
        this.animInstance = window.enemyAnimController.createInstance();
      }
    }catch(e){}
  }
}

class Projectile {
  constructor(x, y, vx, vy, type, damage){
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.type = type; this.damage = damage;
    this.radius = type === 'rocket' ? 7.5 : type === 'fireball' ? 7.5 : 3;
    this.life = 4; this.explosion = type === 'rocket' ? 90 : 0;
  }
}

class EnemyProjectile {
  constructor(x, y, vx, vy, damage){
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.damage = damage;
    this.radius = 9;
    this.life = 5; // Time before disappearing
  }
}

class PowerUp {
  constructor(x, y, type){
    this.x = x; this.y = y; this.type = type;
    this.radius = type === 'nuke' ? 15 : type === 'x2score' ? 15 : 10; this.life = POWERUP_DURATION;
    this.color = type === 'minigun' ? '#7fe8ff' : type === 'rocket' ? '#ffb27f' : type === 'shotgun' ? '#d19cff' : type === 'fireball' ? '#4da6ff' : type === 'nuke' ? '#ffff00' : type === 'speed' ? '#00ff88' : type === 'sword' ? '#c0c0c0' : type === 'x2score' ? '#ffa500' : '#fff28f';
  }
}

class Gem {
  constructor(x, y, amount){
    this.x = x; this.y = y; this.amount = amount;
    this.radius = 5; this.life = 10;
  }
}

let player = new Player();

// Background image
const backgroundImage = new Image();
backgroundImage.src = 'animations/background.png';
let backgroundLoaded = false;
backgroundImage.onload = () => { backgroundLoaded = true; };
backgroundImage.onerror = () => { /* Background image optional */ };

// Enemy health bar sprite sheet
const enemyHealthBarImage = new Image();
enemyHealthBarImage.src = 'animations/enemyhealthbar.png';
let healthBarLoaded = false;
enemyHealthBarImage.onload = () => { healthBarLoaded = true; };
enemyHealthBarImage.onerror = () => { /* Health bar image optional */ };

// Nuke powerup image
const nukeImage = new Image();
nukeImage.src = 'animations/nuke.png';
let nukeImageLoaded = false;
nukeImage.onload = () => { nukeImageLoaded = true; };
nukeImage.onerror = () => { /* Nuke image optional */ };

// Rocket launcher projectile sprite
const rocketImage = new Image();
rocketImage.src = 'animations/rocketlaucher.png';
let rocketImageLoaded = false;
let rocketPowerupLoaded = false; // Share the same image for powerup pickup
rocketImage.onload = () => { 
  rocketImageLoaded = true; 
  rocketPowerupLoaded = true;
};
rocketImage.onerror = () => { /* Rocket image optional */ };

// Fireball projectile sprite
const fireballImage = new Image();
fireballImage.src = 'animations/fireball.png';
let fireballImageLoaded = false;
let fireballPowerupLoaded = false; // Share the same image for powerup pickup
fireballImage.onload = () => { 
  fireballImageLoaded = true; 
  fireballPowerupLoaded = true;
};
fireballImage.onerror = () => { /* Fireball image optional */ };

// Minigun powerup sprite
const minigunImage = new Image();
minigunImage.src = 'animations/minigun.png';
let minigunPowerupLoaded = false;
minigunImage.onload = () => { 
  minigunPowerupLoaded = true;
};
minigunImage.onerror = () => { /* Minigun image optional */ };

// Shotgun powerup sprite
const shotgunImage = new Image();
shotgunImage.src = 'animations/shotgun.png';
let shotgunPowerupLoaded = false;
shotgunImage.onload = () => { 
  shotgunPowerupLoaded = true;
};
shotgunImage.onerror = () => { /* Shotgun image optional */ };

// Speed powerup sprite
const speedImage = new Image();
speedImage.src = 'animations/lightning.png';
let speedPowerupLoaded = false;
speedImage.onload = () => { 
  speedPowerupLoaded = true;
};
speedImage.onerror = () => { /* Speed image optional */ };

// Player health bar sprite sheet
const playerHealthBarImage = new Image();
playerHealthBarImage.src = 'animations/player health bar.png';
let playerHealthBarLoaded = false;
playerHealthBarImage.onload = () => { playerHealthBarLoaded = true; };
playerHealthBarImage.onerror = () => { /* Player health bar image optional */ };

// Score animation sprite sheet
const scoreAnimImage = new Image();
scoreAnimImage.src = 'animations/score.png';
let scoreAnimLoaded = false;
let scoreAnimFrame = 0;
let scoreAnimTimer = 0;
const SCORE_ANIM_FRAME_TIME = 0.667; // 15% speed (slower animation)
scoreAnimImage.onload = () => { scoreAnimLoaded = true; };
scoreAnimImage.onerror = () => { /* Score image optional */ };

// Digital number font sprite sheet (wave.png)
const digitalFontImage = new Image();
digitalFontImage.src = 'animations/wave.png';
let digitalFontLoaded = false;
digitalFontImage.onload = () => { 
  digitalFontLoaded = true;
};
digitalFontImage.onerror = () => { /* Wave font image optional */ };

// Digital font character mapping (based on sprite sheet layout)
// Numbers are arranged: Row 0: 0 1 2 3 4, Row 1: 5 6 7 8 9
const digitalChars = '0123456789';
function getDigitalCharIndex(char) {
  const upperChar = char.toString().toUpperCase();
  // Based on the actual sprite sheet layout:
  // Row 0: 0 1 2 3 4 (columns 0-4)
  // Row 1: 5 6 7 8 9 (columns 0-4)
  const mapping = {
    '0': [0, 0], '1': [1, 0], '2': [2, 0], '3': [3, 0], '4': [4, 0],
    '5': [0, 1], '6': [1, 1], '7': [2, 1], '8': [3, 1], '9': [4, 1],
    '/': [5, 0], '-': [6, 0], '+': [7, 0]
  };
  return mapping[upperChar] || null;
}

// Function to draw text using digital font sprite
function drawDigitalText(text, x, y, charWidth = 30, charHeight = 40, spacing = 5) {
  if (!digitalFontLoaded) return;
  
  // For 800x480 sprite with 2 rows: top row 0-4, bottom row 5-9
  // Each character is 160px wide (800/5) and 240px tall (480/2)
  const charSpriteWidth = digitalFontImage.width / 5; // 5 numbers per row
  const charSpriteHeight = digitalFontImage.height / 2; // 2 rows total
  
  let currentX = x;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === ' ') {
      currentX += charWidth * 0.5;
      continue;
    }
    
    const pos = getDigitalCharIndex(char);
    if (pos) {
      const [col, row] = pos;
      ctx.drawImage(
        digitalFontImage,
        col * charSpriteWidth, row * charSpriteHeight,
        charSpriteWidth, charSpriteHeight,
        currentX, y,
        charWidth, charHeight
      );
      currentX += charWidth + spacing;
    }
  }
}

// Audio
let audioCtx = null;
function ensureAudio(){ if(!audioCtx){ try{ audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){ audioCtx = null; } } }
function beep(freq, time=0.06, type='sine', vol=0.002){ try{ ensureAudio(); if(!audioCtx) return; const o = audioCtx.createOscillator(); const g = audioCtx.createGain(); o.type = type; o.frequency.setValueAtTime(freq, audioCtx.currentTime); g.gain.setValueAtTime(vol, audioCtx.currentTime); o.connect(g); g.connect(audioCtx.destination); o.start(); g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + time); o.stop(audioCtx.currentTime + time + 0.02); } catch(e){} }
function explodeSound(){ try{ ensureAudio(); if(!audioCtx) return; const size = Math.floor(audioCtx.sampleRate * 0.12); const buf = audioCtx.createBuffer(1, size, audioCtx.sampleRate); const d = buf.getChannelData(0); for(let i=0;i<size;i++) d[i] = (Math.random()*2-1) * (1 - i/size); const src = audioCtx.createBufferSource(); src.buffer = buf; const g = audioCtx.createGain(); g.gain.setValueAtTime(0.6, audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.14); src.connect(g); g.connect(audioCtx.destination); src.start(); } catch(e){} }

// Power-up sounds
function powerUpSound(type){
  try{
    ensureAudio();
    if(!audioCtx) return;
    
    if(type === 'nuke'){
      // Epic nuke sound - deep rumble
      explodeSound();
      beep(150, 0.6, 'square', 0.004);
    } else if(type === 'x2score'){
      // Magical score multiplier - ascending notes
      beep(600, 0.08, 'sine', 0.003);
      beep(800, 0.08, 'sine', 0.003);
      beep(1000, 0.12, 'sine', 0.003);
      beep(1200, 0.15, 'triangle', 0.003);
    } else if(type === 'rocket'){
      // Rocket launcher - explosive power
      beep(300, 0.05, 'sawtooth', 0.003);
      beep(700, 0.12, 'square', 0.003);
    } else if(type === 'shotgun'){
      // Shotgun - pump action
      beep(200, 0.06, 'square', 0.004);
      beep(150, 0.08, 'sawtooth', 0.003);
    } else if(type === 'minigun'){
      // Minigun - rapid fire
      beep(800, 0.04, 'square', 0.003);
      beep(900, 0.06, 'square', 0.003);
    } else if(type === 'fireball'){
      // Fireball - whoosh effect
      beep(400, 0.08, 'sine', 0.003);
      beep(300, 0.12, 'triangle', 0.003);
    } else if(type === 'speed'){
      // Speed boost - rising pitch
      beep(600, 0.06, 'sine', 0.003);
      beep(1200, 0.1, 'sine', 0.003);
    } else if(type === 'sword'){
      // Sword - metallic slash
      beep(1200, 0.05, 'sawtooth', 0.003);
      beep(800, 0.08, 'triangle', 0.003);
    } else {
      // Default generic powerup
      beep(900, 0.12, 'triangle', 0.003);
    }
  } catch(e){
    console.error('PowerUpSound error:', e);
  }
}

// Particles
function spawnParticles(x, y, col, count=16, vel=160){ for(let i=0;i<count;i++){ particles.push({ x, y, vx:(Math.random()*2-1)*vel, vy:(Math.random()*2-1)*vel, life:0.5+Math.random()*0.8, col }); } }

// Damage numbers
function spawnDamageNumber(x, y, damage) {
  damageNumbers.push({
    x: x + (Math.random() * 20 - 10),
    y: y,
    damage: Math.round(damage),
    life: 1.0,
    vy: -80 // Float upward
  });
}

// Input
const input = { up: false, down: false, left: false, right: false, mouseX: W/2, mouseY: H/2, space: false };

// Touch controls for mobile/iOS
let touchJoystick = { active: false, startX: 0, startY: 0, currentX: 0, currentY: 0, identifier: null };
let touchShoot = { active: false, x: 0, y: 0, identifier: null };
let isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// Prevent default touch behaviors on canvas
canvas.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
canvas.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
canvas.addEventListener('touchend', e => e.preventDefault(), { passive: false });

// Touch start
canvas.addEventListener('touchstart', e => {
  const r = canvas.getBoundingClientRect();
  
  for (let i = 0; i < e.changedTouches.length; i++) {
    const touch = e.changedTouches[i];
    const x = touch.clientX - r.left;
    const y = touch.clientY - r.top;
    
    // Left half = movement joystick
    if (x < W / 2 && !touchJoystick.active) {
      touchJoystick.active = true;
      touchJoystick.startX = x;
      touchJoystick.startY = y;
      touchJoystick.currentX = x;
      touchJoystick.currentY = y;
      touchJoystick.identifier = touch.identifier;
    }
    // Right half = shoot/aim
    else if (x >= W / 2 && !touchShoot.active) {
      touchShoot.active = true;
      touchShoot.x = x;
      touchShoot.y = y;
      touchShoot.identifier = touch.identifier;
      input.mouseX = x;
      input.mouseY = y;
    }
  }
}, { passive: false });

// Touch move
canvas.addEventListener('touchmove', e => {
  const r = canvas.getBoundingClientRect();
  
  for (let i = 0; i < e.changedTouches.length; i++) {
    const touch = e.changedTouches[i];
    const x = touch.clientX - r.left;
    const y = touch.clientY - r.top;
    
    // Update joystick
    if (touchJoystick.active && touch.identifier === touchJoystick.identifier) {
      touchJoystick.currentX = x;
      touchJoystick.currentY = y;
      
      const dx = x - touchJoystick.startX;
      const dy = y - touchJoystick.startY;
      const deadzone = 10;
      
      input.up = dy < -deadzone;
      input.down = dy > deadzone;
      input.left = dx < -deadzone;
      input.right = dx > deadzone;
    }
    
    // Update shoot position
    if (touchShoot.active && touch.identifier === touchShoot.identifier) {
      touchShoot.x = x;
      touchShoot.y = y;
      input.mouseX = x;
      input.mouseY = y;
    }
  }
}, { passive: false });

// Touch end
canvas.addEventListener('touchend', e => {
  for (let i = 0; i < e.changedTouches.length; i++) {
    const touch = e.changedTouches[i];
    
    if (touchJoystick.active && touch.identifier === touchJoystick.identifier) {
      touchJoystick.active = false;
      input.up = input.down = input.left = input.right = false;
    }
    
    if (touchShoot.active && touch.identifier === touchShoot.identifier) {
      touchShoot.active = false;
    }
  }
}, { passive: false });

// Keyboard controls
window.addEventListener('keydown', e=>{
  if(e.key === 'w' || e.key === 'ArrowUp') input.up = true;
  if(e.key === 's' || e.key === 'ArrowDown') input.down = true;
  if(e.key === 'a' || e.key === 'ArrowLeft') input.left = true;
  if(e.key === 'd' || e.key === 'ArrowRight') input.right = true;
  if(e.key === ' ') input.space = true;
  if(e.key === 'Escape'){
    if(gameState === 'playing'){
      paused = !paused;
    } else if(gameState === 'leaderboard'){
      gameState = 'menu';
    }
  }
});
window.addEventListener('keyup', e=>{
  if(e.key === 'w' || e.key === 'ArrowUp') input.up = false;
  if(e.key === 's' || e.key === 'ArrowDown') input.down = false;
  if(e.key === 'a' || e.key === 'ArrowLeft') input.left = false;
  if(e.key === 'd' || e.key === 'ArrowRight') input.right = false;
  if(e.key === ' ') input.space = false;
});
canvas.addEventListener('mousemove', e=>{ const r = canvas.getBoundingClientRect(); input.mouseX = e.clientX - r.left; input.mouseY = e.clientY - r.top; });

canvas.addEventListener('click', e=>{
  const r = canvas.getBoundingClientRect();
  const x = e.clientX - r.left;
  const y = e.clientY - r.top;
  
  if(gameState === 'menu'){
    // Check button clicks (3 buttons stacked vertically in center)
    const btnWidth = 300;
    const btnHeight = 80;
    const btnX = W/2 - btnWidth/2;
    const spacing = 100;
    const startY = H/2 - 100;
    
    // Start button
    if(x >= btnX && x <= btnX + btnWidth && y >= startY && y <= startY + btnHeight){
      gameState = 'playing';
      if(!running) startGame();
    }
    // Leaderboard button
    else if(x >= btnX && x <= btnX + btnWidth && y >= startY + spacing && y <= startY + spacing + btnHeight){
      gameState = 'leaderboard';
    }
    // Exit button
    else if(x >= btnX && x <= btnX + btnWidth && y >= startY + spacing*2 && y <= startY + spacing*2 + btnHeight){
      window.close();
    }
  } else if(gameState === 'leaderboard'){
    // Click anywhere to go back
    gameState = 'menu';
  }
});

// Leaderboard
const HB_KEY = 'vs_lite_scores_v1';
function getHighScores(){ try{ const raw = localStorage.getItem(HB_KEY); return raw ? JSON.parse(raw) : []; } catch(e){ return []; } }
function saveHighScore(name, sc, time, waveNum){ const list = getHighScores(); list.push({name, score: sc, time: time || 0, wave: waveNum || 0}); list.sort((a,b)=>b.score-a.score); while(list.length>10) list.pop(); localStorage.setItem(HB_KEY, JSON.stringify(list)); }
function renderLeaderboard(el){ const list = getHighScores(); if(!el) return; el.innerHTML=''; list.forEach(it=>{ const li = document.createElement('li'); const minutes = Math.floor((it.time || 0) / 60); const seconds = Math.floor((it.time || 0) % 60); const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`; const waveStr = it.wave ? ` Wave ${it.wave}` : ''; li.textContent = `${it.name} - ${it.score} (${timeStr}${waveStr})`; el.appendChild(li); }); }

// Wave spawning
function startWave(){
  // Start a wave using the current `wave` number for scaling
  const spawnWaveNum = Math.max(1, wave || 1);
  waveInProgress = true;
  // Non-linear (exponential) enemy count scaling.
  // basePerWave: enemies on wave 1; growth: per-wave multiplier (>1 for increasing difficulty)
  const basePerWave = 10;
  const growth = 1.25; // Reduced from 1.38 for gentler difficulty curve
  // compute count with exponential growth and cap it to avoid runaway numbers
  const count = Math.min(1200, Math.max(1, Math.round(basePerWave * Math.pow(growth, spawnWaveNum - 1))));
  
  // For waves 1-3, spawn all enemies immediately. After wave 3, use spawn queue
  const useSpawnQueue = spawnWaveNum > 3;
  
  if(useSpawnQueue){
    spawnQueue = [];
    spawnTimer = 0;
  }
  
  for(let i = 0; i < count; i++){
    let x, y;
    const side = Math.random();
    // Spread spawns along the edge away from corners. edgeMargin avoids near-corner spawns.
    const edgeMargin = Math.min(120, Math.floor(Math.min(W, H) * 0.12));
    const spawnableWidth = Math.max(0, W - 2 * edgeMargin);
    const spawnableHeight = Math.max(0, H - 2 * edgeMargin);
    // offset: how far off-screen the enemy appears (randomized to add spread)
    const offset = 40 + Math.random() * 120;
    if(side < 0.25) { x = edgeMargin + Math.random() * spawnableWidth; y = -offset; }
    else if(side < 0.5) { x = edgeMargin + Math.random() * spawnableWidth; y = H + offset; }
    else if(side < 0.75) { y = edgeMargin + Math.random() * spawnableHeight; x = -offset; }
    else { y = edgeMargin + Math.random() * spawnableHeight; x = W + offset; }

    const baseHp = [1,1,1,3,3,6,12][Math.floor(Math.random()*7)];
    const hpMultiplier = 1 + (spawnWaveNum * 0.2); // Reduced from 0.3
    const hp = Math.max(1, Math.round(baseHp * hpMultiplier));
    
    const e = new Enemy(x, y, hp);
    
    // Vary enemy speeds: starts at 90% at 50, 7% between 50-100, 3% between 100-220
    // Each wave: 50 speed rate -2%, 50-100 speed rate +2%
    const slowRate = Math.max(0, 0.90 - (spawnWaveNum - 1) * 0.02); // Decreases 2% per wave
    const mediumRate = Math.min(0.97, 0.07 + (spawnWaveNum - 1) * 0.02); // Increases 2% per wave
    const speedRoll = Math.random();
    let baseSpeed;
    if(speedRoll < slowRate) {
      baseSpeed = 50; // Starts at 90%, decreases each wave
    } else if(speedRoll < slowRate + mediumRate) {
      baseSpeed = 50 + Math.random() * 50; // Starts at 7%, increases each wave
    } else {
      baseSpeed = 100 + Math.random() * 120; // Remains at 3%
    }
    e.speed = Math.round(baseSpeed); // No wave scaling
    e.radius = Math.max(6, Math.round(e.radius * (1 + spawnWaveNum * 0.04))); // Reduced to 4%
    
    if(useSpawnQueue){
      spawnQueue.push(e);
    } else {
      enemies.push(e);
    }
  }
  
  // Spawn Golem enemies every 3 waves (waves 3, 6, 9, 12, etc.)
  if(spawnWaveNum % 3 === 0){
    for(let i = 0; i < 3; i++){
      let x, y;
      const side = Math.random();
      const edgeMargin = Math.min(120, Math.floor(Math.min(W, H) * 0.12));
      const spawnableWidth = Math.max(0, W - 2 * edgeMargin);
      const spawnableHeight = Math.max(0, H - 2 * edgeMargin);
      const offset = 40 + Math.random() * 120;
      if(side < 0.25) { x = edgeMargin + Math.random() * spawnableWidth; y = -offset; }
      else if(side < 0.5) { x = edgeMargin + Math.random() * spawnableWidth; y = H + offset; }
      else if(side < 0.75) { y = edgeMargin + Math.random() * spawnableHeight; x = -offset; }
      else { y = edgeMargin + Math.random() * spawnableHeight; x = W + offset; }

      // Golem has 2x the health of a typical enemy at this wave
      const baseHp = 12; // High base HP
      const hpMultiplier = 1 + (spawnWaveNum * 0.2); // Reduced from 0.3
      const hp = Math.max(1, Math.round(baseHp * hpMultiplier * 2)); // 2x multiplier
      
      const golem = new Enemy(x, y, hp, true); // isGolem = true
      
      // Vary golem speeds: starts at 90% at 50, 7% between 50-100, 3% between 100-220
      // Each wave: 50 speed rate -1%, 50-100 speed rate +1%
      const slowRate = Math.max(0, 0.90 - (spawnWaveNum - 1) * 0.01); // Decreases 1% per wave
      const mediumRate = Math.min(0.97, 0.07 + (spawnWaveNum - 1) * 0.01); // Increases 1% per wave
      const speedRoll = Math.random();
      let baseSpeed;
      if(speedRoll < slowRate) {
        baseSpeed = 50; // Starts at 90%, decreases each wave
      } else if(speedRoll < slowRate + mediumRate) {
        baseSpeed = 50 + Math.random() * 50; // Starts at 7%, increases each wave
      } else {
        baseSpeed = 100 + Math.random() * 120; // Remains at 3%
      }
      golem.speed = Math.round(baseSpeed); // No wave scaling
      golem.radius = Math.max(6, Math.round(golem.radius * (1 + spawnWaveNum * 0.04))); // Reduced to 4%
      
      if(useSpawnQueue){
        spawnQueue.push(golem);
      } else {
        enemies.push(golem);
      }
    }
  }
  
  // Spawn Red Alien enemies starting at wave 5, then every wave after wave 10
  if(spawnWaveNum === 5 || spawnWaveNum >= 10){
    console.log('Spawning Red Aliens for wave', spawnWaveNum);
    for(let i = 0; i < 2; i++){
      let x, y;
      const side = Math.random();
      const edgeMargin = Math.min(120, Math.floor(Math.min(W, H) * 0.12));
      const spawnableWidth = Math.max(0, W - 2 * edgeMargin);
      const spawnableHeight = Math.max(0, H - 2 * edgeMargin);
      const offset = 40 + Math.random() * 120;
      if(side < 0.25) { x = edgeMargin + Math.random() * spawnableWidth; y = -offset; }
      else if(side < 0.5) { x = edgeMargin + Math.random() * spawnableWidth; y = H + offset; }
      else if(side < 0.75) { y = edgeMargin + Math.random() * spawnableHeight; x = -offset; }
      else { y = edgeMargin + Math.random() * spawnableHeight; x = W + offset; }

      // Red Alien has moderate health
      const baseHp = 15;
      const hpMultiplier = 1 + (spawnWaveNum * 0.2);
      const hp = Math.max(1, Math.round(baseHp * hpMultiplier));
      
      const redAlien = new Enemy(x, y, hp, false, true); // isRedAlien = true
      redAlien.speed = 60; // Slower movement
      redAlien.radius = Math.max(6, Math.round(redAlien.radius * (1 + spawnWaveNum * 0.04)));
      
      console.log('Created Red Alien:', redAlien);
      
      if(useSpawnQueue){
        spawnQueue.push(redAlien);
      } else {
        enemies.push(redAlien);
      }
    }
  }
}

// Reset
function resetGame(){ 
  player = new Player(selectedCharacter); 
  // clear arrays in-place so external references (window.exports/tests) remain valid
  enemies.length = 0; projectiles.length = 0; powerups.length = 0; particles.length = 0; gems.length = 0;
  enemyProjectiles.length = 0; // Clear enemy projectiles
  damageNumbers.length = 0; // Clear damage numbers
  spawnQueue.length = 0; spawnTimer = 0;
  score = 0; nextWaveIndex = 0;
  gameTime = 0; // Reset game timer
  // do not auto-start waves here (tests expect resetGame to clear state without spawning)
  wave = 0;
  // stop running until explicitly started by UI
  running = false; paused = false;
  waveRewardShownForWave = 0;
  if(rewardModal) rewardModal.style.display = 'none';
  // clear past rewards summary on reset
  Object.keys(waveRewards).forEach(k => delete waveRewards[k]);
  if(rafId){ cancelAnimationFrame(rafId); rafId = null; }
}

// Reward handlers
rewardHealth.addEventListener('click', ()=>{ 
  // apply effect
  player.maxHealth += 3; player.health = Math.min(player.maxHealth, player.health + 3);
  const desc = `+Health +3 (max ${player.maxHealth})`;
  // record and update UI
  recordWaveReward(wave, desc);
  renderRewardSummary();
  // show confirmation in modal
  let confirm = rewardModal.querySelector('.reward-confirm');
  if(!confirm){ confirm = document.createElement('div'); confirm.className = 'reward-confirm'; confirm.style.marginTop = '8px'; confirm.style.color = '#cfe3ff'; rewardModal.querySelector('.modal-content').appendChild(confirm); }
  confirm.textContent = `Selected: ${desc}`;
  // brief pause so player sees the confirmation, then continue
  setTimeout(()=>{ rewardModal.style.display = 'none'; paused = false; startNextWave(); }, 700);
});
rewardDamage.addEventListener('click', ()=>{ 
  player.damage += 0.5;
  const desc = `+Damage +0.5 (now ${player.damage.toFixed(2)})`;
  recordWaveReward(wave, desc);
  renderRewardSummary();
  let confirm = rewardModal.querySelector('.reward-confirm');
  if(!confirm){ confirm = document.createElement('div'); confirm.className = 'reward-confirm'; confirm.style.marginTop = '8px'; confirm.style.color = '#cfe3ff'; rewardModal.querySelector('.modal-content').appendChild(confirm); }
  confirm.textContent = `Selected: ${desc}`;
  setTimeout(()=>{ rewardModal.style.display = 'none'; paused = false; startNextWave(); }, 700);
});
rewardRate.addEventListener('click', ()=>{ 
  player.fireRate = Math.max(0.02, player.fireRate * 0.88);
  const desc = `Firerate x0.88 (now ${player.fireRate.toFixed(3)}s)`;
  recordWaveReward(wave, desc);
  renderRewardSummary();
  let confirm = rewardModal.querySelector('.reward-confirm');
  if(!confirm){ confirm = document.createElement('div'); confirm.className = 'reward-confirm'; confirm.style.marginTop = '8px'; confirm.style.color = '#cfe3ff'; rewardModal.querySelector('.modal-content').appendChild(confirm); }
  confirm.textContent = `Selected: ${desc}`;
  setTimeout(()=>{ rewardModal.style.display = 'none'; paused = false; startNextWave(); }, 700);
});
rewardSpeed.addEventListener('click', ()=>{ 
  player.baseSpeed = Math.round(player.baseSpeed * 1.05);
  player.speed = player.baseSpeed;
  const desc = `+Speed +5% (now ${player.baseSpeed})`;
  recordWaveReward(wave, desc);
  renderRewardSummary();
  let confirm = rewardModal.querySelector('.reward-confirm');
  if(!confirm){ confirm = document.createElement('div'); confirm.className = 'reward-confirm'; confirm.style.marginTop = '8px'; confirm.style.color = '#cfe3ff'; rewardModal.querySelector('.modal-content').appendChild(confirm); }
  confirm.textContent = `Selected: ${desc}`;
  setTimeout(()=>{ rewardModal.style.display = 'none'; paused = false; startNextWave(); }, 700);
});
rewardMagnet.addEventListener('click', ()=>{ 
  player.gemPickupRange += 30;
  const desc = `+Magnet Range +30 (now ${player.gemPickupRange})`;
  recordWaveReward(wave, desc);
  renderRewardSummary();
  let confirm = rewardModal.querySelector('.reward-confirm');
  if(!confirm){ confirm = document.createElement('div'); confirm.className = 'reward-confirm'; confirm.style.marginTop = '8px'; confirm.style.color = '#cfe3ff'; rewardModal.querySelector('.modal-content').appendChild(confirm); }
  confirm.textContent = `Selected: ${desc}`;
  setTimeout(()=>{ rewardModal.style.display = 'none'; paused = false; startNextWave(); }, 700);
});

function startNextWave(){
  // increment wave and spawn
  wave = Math.max(1, wave + 1);
  startWave();
}

// Controls
function startGameFromUI(){
  console.log('🚀 startGameFromUI called');
  console.log('Current gameState:', gameState);
  console.log('startScreen element:', document.getElementById('startScreen'));
  console.log('charSelectScreen element:', document.getElementById('charSelectScreen'));
  
  gameState = 'charSelect';
  const startScreen = document.getElementById('startScreen');
  const charSelectScreen = document.getElementById('charSelectScreen');
  
  if (startScreen) {
    startScreen.style.display = 'none';
    console.log('✅ Start screen hidden');
  } else {
    console.error('❌ Start screen element not found!');
  }
  
  if (charSelectScreen) {
    charSelectScreen.style.display = 'flex';
    console.log('✅ Character select screen shown');
  } else {
    console.error('❌ Character select screen element not found!');
  }
}

function startGameWithCharacter(charId){
  console.log('startGameWithCharacter called with:', charId);
  selectedCharacter = charId;
  gameState = 'playing';
  document.getElementById('charSelectScreen').style.display = 'none';
  resetGame();
  // spawn first wave when the player actually starts the game
  wave = 1;
  startWave();
  running = true;
  // start loop if not already running
  if(rafId === null) rafId = requestAnimationFrame(loop);
  console.log('Game started with character:', charId);
}

// Expose to window for main.js to call
window.startGameWithCharacter = startGameWithCharacter;
console.log('startGameWithCharacter exposed to window');

function startGame(){
  gameState = 'playing';
  running = true;
  paused = false;
  resetGame();
  wave = 1;
  startWave();
  lastTime = performance.now();
  if(!rafId) rafId = requestAnimationFrame(loop);
}

startBtn.addEventListener('click', startGameFromUI);
console.log('Start button click listener added');

// Test click handler
startBtn.addEventListener('click', () => {
  console.log('🎯 Start button CLICKED! (raw event)');
}, { once: false });

if(pauseBtn) pauseBtn.addEventListener('click', ()=>{ paused = !paused; pauseBtn.textContent = paused ? 'Resume' : 'Pause'; });
if(restartBtn) restartBtn.addEventListener('click', ()=>{ 
  // Stop the game
  running = false;
  paused = false;
  if(rafId) { cancelAnimationFrame(rafId); rafId = null; }
  
  // Hide game UI
  const hud = document.getElementById('hud');
  if(hud) hud.style.display = 'none';
  if(pauseBtn) pauseBtn.style.display = 'none';
  if(restartBtn) restartBtn.style.display = 'none';
  
  // Show start screen (main menu)
  const startScreen = document.getElementById('startScreen');
  if(startScreen) startScreen.style.display = 'flex';
  
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});
if(leaderboardBtn) leaderboardBtn.addEventListener('click', ()=>{ if(leaderboardModalList) renderLeaderboard(leaderboardModalList); if(leaderboardModal) leaderboardModal.style.display = 'block'; });
if(closeLeaderboard) closeLeaderboard.addEventListener('click', ()=>{ if(leaderboardModal) leaderboardModal.style.display = 'none'; });
if(clearLeaderboard) clearLeaderboard.addEventListener('click', ()=>{ localStorage.removeItem(HB_KEY); if(leaderboardModalList) renderLeaderboard(leaderboardModalList); if(leaderboardList) renderLeaderboard(leaderboardList); });

// Drawing
function drawPlayer(ctx, p){
  // Try to use animated sprite if available - only for 'player' character
  let drewSprite = false;
  if(p.characterId === 'player' && window.playerAnimController){
    try{
      drewSprite = window.playerAnimController.draw(ctx, p.x, p.y, 1.21);
    }catch(e){
      // Silent fail, use fallback
    }
  }
  // Fallback to simple shape if animations not loaded or failed, or for other characters
  if(!drewSprite){
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = p.color || '#6ea8ff';
    ctx.beginPath();
    ctx.arc(0, 0, p.radius, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#223344';
    ctx.fillRect(-8, -p.radius-6, 16, 6);
    ctx.fillStyle = '#cfe3ff';
    ctx.fillRect(-6, -p.radius-4, 12, 3);
    ctx.restore();
  }
}

function drawEnemy(ctx, e){
  // Try to draw sprite first
  let drewSprite = false;
  try{
    if(e.isGolem && window.golemAnimController && e.animInstance){
      drewSprite = window.golemAnimController.draw(ctx, e.animInstance, e.x, e.y, e.scale || 1.0);
    } else if(e.isRedAlien && window.redAlienAnimController && e.animInstance){
      drewSprite = window.redAlienAnimController.draw(ctx, e.animInstance, e.x, e.y, e.scale || 1.0);
    } else if(window.enemyAnimController && e.animInstance){
      drewSprite = window.enemyAnimController.draw(ctx, e.animInstance, e.x, e.y, e.scale || 1.0);
    }
  }catch(err){}
  
  // Fallback to rectangle if sprite didn't render
  if(!drewSprite){
    ctx.save();
    ctx.translate(e.x, e.y);
    const r = Math.max(6, e.radius);
    ctx.fillStyle = e.isRedAlien ? '#ff3333' : e.color;
    ctx.fillRect(-r, -r, r*2, r*2);
    ctx.restore();
  }
  
  // Draw health bar using sprite sheet
  if(healthBarLoaded){
    const healthPercent = e.hp / e.maxHp;
    // Sprite sheet has 6 frames (0-5), choose based on health
    const frameIndex = Math.max(0, Math.min(5, Math.floor(healthPercent * 6)));
    const frameHeight = enemyHealthBarImage.height / 6;
    const barWidth = enemyHealthBarImage.width;
    const r = Math.max(6, e.radius) * (e.scale || 1.0);
    const barY = e.y - r - 8;
    
    // Scale to 24% of enemy size
    const scaledWidth = r * 2 * 0.24;
    const scaledHeight = (frameHeight / barWidth) * scaledWidth;
    
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(
      enemyHealthBarImage,
      0, frameIndex * frameHeight,  // source x, y
      barWidth, frameHeight,         // source width, height
      e.x - scaledWidth/2, barY,     // dest x, y
      scaledWidth, scaledHeight      // dest width, height
    );
    ctx.restore();
  } else {
    // Fallback to simple bar if sprite not loaded
    ctx.save();
    ctx.translate(e.x, e.y);
    const r = Math.max(6, e.radius) * (e.scale || 1.0);
    const barWidth = r * 1.5;
    const barY = -r - 8;
    ctx.fillStyle = '#000';
    ctx.fillRect(-barWidth/2, barY, barWidth, 6);
    ctx.fillStyle = '#ff5555';
    ctx.fillRect(-barWidth/2, barY, (e.hp / e.maxHp) * barWidth, 6);
    ctx.restore();
  }
}

// Main loop
function loop(ts){
  const dt = Math.min(0.05, (ts - lastTime) / 1000 || 0.016);
  lastTime = ts;
  
  if(gameState === 'playing' && running && !paused){
    update(dt);
  }
  
  draw();
  rafId = requestAnimationFrame(loop);
}

function update(dt){
  // Update game timer
  gameTime += dt;
  
  // Broadcast score in co-op mode every second
  if (window.isCoopMode) {
    if (!window.scoreBroadcastTimer) window.scoreBroadcastTimer = 0;
    window.scoreBroadcastTimer += dt;
    if (window.scoreBroadcastTimer >= 1.0) {
      window.scoreBroadcastTimer = 0;
      if (window.broadcastScore) window.broadcastScore();
    }
  }
  
  // Process spawn queue - spawn enemies gradually over time
  if(spawnQueue.length > 0){
    spawnTimer += dt;
    // Spawn 5 enemies every 0.15 seconds for smooth flow
    const spawnInterval = 0.15;
    const enemiesPerInterval = 5;
    if(spawnTimer >= spawnInterval){
      spawnTimer -= spawnInterval;
      const toSpawn = Math.min(enemiesPerInterval, spawnQueue.length);
      for(let i = 0; i < toSpawn; i++){
        enemies.push(spawnQueue.shift());
      }
    }
  }
  
  // Dash recharge logic
  if(player.dashCharges < player.maxDashCharges){
    player.dashRechargeTimer += dt;
    if(player.dashRechargeTimer >= player.dashRechargeTime){
      player.dashRechargeTimer -= player.dashRechargeTime;
      player.dashCharges = Math.min(player.dashCharges + 1, player.maxDashCharges);
    }
  }

  // Dash activation
  if(input.space && !player.isDashing && player.dashCharges > 0){
    player.isDashing = true;
    player.dashTimer = player.dashDuration;
    player.dashCharges--;
    
    // Calculate dash direction based on player movement input
    let dx = 0, dy = 0;
    if(input.up) dy -= 1;
    if(input.down) dy += 1;
    if(input.left) dx -= 1;
    if(input.right) dx += 1;
    
    const dashDist = Math.hypot(dx, dy);
    if(dashDist > 0){
      const dashSpeed = 1000; // Fast dash speed
      player.dashVelocity.x = (dx / dashDist) * dashSpeed;
      player.dashVelocity.y = (dy / dashDist) * dashSpeed;
    } else {
      // If no movement input, dash in the direction player last moved or default down
      player.dashVelocity.x = 0;
      player.dashVelocity.y = dashSpeed;
    }
    input.space = false; // Consume the input
  }

  // Update dash
  if(player.isDashing){
    player.dashTimer -= dt;
    // Spawn dash trail particles
    spawnParticles(player.x, player.y, '#00ffff', 3, 60);
    if(player.dashTimer <= 0){
      player.isDashing = false;
      player.dashVelocity.x = 0;
      player.dashVelocity.y = 0;
    }
  }

  // Movement
  let vx = 0, vy = 0;
  if(player.isDashing){
    // Use dash velocity during dash
    vx = player.dashVelocity.x;
    vy = player.dashVelocity.y;
  } else {
    // Normal movement
    if(input.up) vy -= player.speed;
    if(input.down) vy += player.speed;
    if(input.left) vx -= player.speed;
    if(input.right) vx += player.speed;
    const L = Math.hypot(vx, vy);
    if(L > 0){ vx = vx / L * player.speed; vy = vy / L * player.speed; }
  }
  player.x = Math.max(player.radius, Math.min(W - player.radius, player.x + vx * dt));
  player.y = Math.max(player.radius, Math.min(H - player.radius, player.y + vy * dt));

  // Update player animation controller
  try{
    if(window.playerAnimController){
      const isFiring = player.fireTimer <= 0;
      window.playerAnimController.update(dt, vx, vy, isFiring);
    }
  }catch(e){}

  // Update sword swing if sword is active
  if(player.weapon === 'sword'){
    const swingSpeed = 9.0; // Doubled from 4.5 to 9.0 radians per second
    const maxAngle = Math.PI * 0.6; // 108 degrees swing arc
    
    player.swordAngle += swingSpeed * dt * player.swordSwingDirection;
    
    // Reverse direction at swing limits
    if(player.swordAngle >= maxAngle){
      player.swordAngle = maxAngle;
      player.swordSwingDirection = -1;
    } else if(player.swordAngle <= -maxAngle){
      player.swordAngle = -maxAngle;
      player.swordSwingDirection = 1;
    }
    
    // Check sword collision with enemies
    const swordLength = 90; // 25% shorter than 120
    const swordWidth = 15;
    const swordX = player.x + Math.cos(player.swordAngle) * swordLength;
    const swordY = player.y + Math.sin(player.swordAngle) * swordLength;
    
    for(let i = enemies.length - 1; i >= 0; i--){
      const e = enemies[i];
      const dist = Math.hypot(swordX - e.x, swordY - e.y);
      if(dist < e.radius + swordWidth){
        // Instant kill - set HP to 0
        e.hp = 0;
        score += 10 * player.scoreMultiplier;
        spawnParticles(e.x, e.y, '#ff9b9b', 12, 120);
        explodeSound();
        if(Math.random() < 0.12 * 0.35){
          const r = Math.random();
          const _pt = r < 0.25 ? 'minigun' : (r < 0.45 ? 'rocket' : (r < 0.65 ? 'shotgun' : (r < 0.80 ? 'fireball' : (r < 0.92 ? 'speed' : 'sword'))));
          powerups.push(new PowerUp(e.x, e.y, _pt));
        }
        if(Math.random() < 0.01){ // Reduced from 0.03 to 0.01
          powerups.push(new PowerUp(e.x, e.y, 'nuke'));
        }
        if(Math.random() < 0.2) gems.push(new Gem(e.x, e.y, 8));
        enemies.splice(i, 1);
      }
    }
  }

  // Firing
  player.fireTimer -= dt;
  if(player.fireTimer <= 0){
    const dx = input.mouseX - player.x;
    const dy = input.mouseY - player.y;
    const dist = Math.hypot(dx, dy);
    if(dist > 6){
      const ax = dx / dist, ay = dy / dist;
      if(player.weapon === 'standard'){
        projectiles.push(new Projectile(player.x, player.y, ax * 380, ay * 380, 'bullet', Math.round(player.damage)));
        window._firedShots++;
        player.fireTimer = player.fireRate;
        beep(1000, 0.06, 'square');
      } else if(player.weapon === 'minigun'){
        projectiles.push(new Projectile(player.x, player.y, ax * 420, ay * 420, 'bullet', Math.round(player.damage)));
        window._firedShots++;
        player.fireTimer = player.fireRate * 0.33; // 200% faster (3x speed = 1/3 time)
        beep(1200, 0.03, 'square');
      } else if(player.weapon === 'shotgun'){
        const spread = 0.42;
        for(let k = -2; k <= 2; k++){
          const ang = Math.atan2(ay, ax) + (k * spread / 4);
          projectiles.push(new Projectile(player.x, player.y, Math.cos(ang) * 360, Math.sin(ang) * 360, 'bullet', Math.round(player.damage)));
          window._firedShots++;
        }
        player.fireTimer = Math.max(0.02, player.fireRate * 0.525); // 50% slower fire rate (0.35 * 1.5)
        beep(900, 0.04, 'square');
      } else if(player.weapon === 'rocket'){
        projectiles.push(new Projectile(player.x, player.y, ax * 260, ay * 260, 'rocket', Math.round(player.damage * 8)));
        window._firedShots++;
        player.fireTimer = player.fireRate * 3;
        beep(350, 0.18, 'sine');
      } else if(player.weapon === 'fireball'){
        projectiles.push(new Projectile(player.x, player.y, ax * 260, ay * 260, 'fireball', Math.round(player.damage * 8)));
        window._firedShots++;
        player.fireTimer = player.fireRate * 2.5;
        beep(450, 0.15, 'triangle');
      }
    }
  }

  // Wave spawning at score thresholds
  if(nextWaveIndex < waveThresholds.length && score >= waveThresholds[nextWaveIndex]){
    startWave();
    nextWaveIndex++;
  }

  // Enemy movement and collision
  for(let i = enemies.length - 1; i >= 0; i--){
    const e = enemies[i];
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    
    // Golem attack logic
    if(e.isGolem){
      // Update attack cooldown
      if(e.attackCooldown > 0){
        e.attackCooldown -= dt;
      }
      
      // Check if player is in attack range
      if(d <= e.attackRange && !e.isAttacking && e.attackCooldown <= 0){
        // Start attack
        e.isAttacking = true;
        e.attackTimer = 0;
        e.hasDealtDamage = false;
        e.vx = 0;
        e.vy = 0;
        // Switch to high-kick animation
        if(e.animInstance){
          e.animInstance.animType = 'high-kick';
          e.animInstance.frameIndex = 0;
          e.animInstance.frameTime = 0;
        }
      }
      
      // Update attack
      if(e.isAttacking){
        e.attackTimer += dt;
        
        // Deal damage at mid-point of animation (frame 3-4 of 7 frames)
        if(!e.hasDealtDamage && e.attackTimer >= e.attackDuration * 0.5){
          e.hasDealtDamage = true;
          // Area damage around golem
          const attackRadius = 100;
          if(Math.hypot(player.x - e.x, player.y - e.y) < attackRadius){
            player.health -= 8; // Fixed 8 damage per kick
            spawnParticles(player.x, player.y, '#ff9b9b', 12, 120);
            explodeSound();
          }
        }
        
        // End attack
        if(e.attackTimer >= e.attackDuration){
          e.isAttacking = false;
          e.attackCooldown = 2.0; // 2 second cooldown
          // Switch back to walking animation
          if(e.animInstance){
            e.animInstance.animType = 'walking-8-frames';
            e.animInstance.frameIndex = 0;
            e.animInstance.frameTime = 0;
          }
        }
      } else {
        // Move towards player when not attacking
        e.vx = dx / d * e.speed * ENEMY_SPEED_FACTOR;
        e.vy = dy / d * e.speed * ENEMY_SPEED_FACTOR;
        e.x += e.vx * dt;
        e.y += e.vy * dt;
      }
    } else if(e.isRedAlien){
      // Red Alien attack logic - throws rocks
      if(e.attackCooldown > 0){
        e.attackCooldown -= dt;
      }
      
      // Check if player is in attack range
      if(d <= e.attackRange && !e.isAttacking && e.attackCooldown <= 0){
        // Start attack
        e.isAttacking = true;
        e.attackTimer = 0;
        e.hasThrown = false;
        // Save direction before stopping
        if(e.animInstance && window.redAlienAnimController){
          // Calculate direction to player and lock it
          const attackVx = dx / d;
          const attackVy = dy / d;
          // Set direction directly based on player position
          e.animInstance.direction = window.redAlienAnimController.getDirection8(attackVx, attackVy);
          e.animInstance.animType = 'throw-object';
          e.animInstance.frameIndex = 0;
          e.animInstance.frameTime = 0;
        }
        e.vx = 0;
        e.vy = 0;
      }
      
      // Update attack
      if(e.isAttacking){
        e.attackTimer += dt;
        
        // Throw rock at mid-point of animation
        if(!e.hasThrown && e.attackTimer >= e.attackDuration * 0.5){
          e.hasThrown = true;
          // Calculate direction to player
          const rockSpeed = 150; // Slow rock speed
          const rockVx = (dx / d) * rockSpeed;
          const rockVy = (dy / d) * rockSpeed;
          enemyProjectiles.push(new EnemyProjectile(e.x, e.y, rockVx, rockVy, 6)); // 6 damage
        }
        
        // End attack
        if(e.attackTimer >= e.attackDuration){
          e.isAttacking = false;
          e.attackCooldown = 3.0; // 3 second cooldown
          // Switch back to walking animation
          if(e.animInstance){
            e.animInstance.animType = 'scary-walk';
            e.animInstance.frameIndex = 0;
            e.animInstance.frameTime = 0;
          }
        }
      } else {
        // Move towards player when not attacking (slowly)
        e.vx = dx / d * e.speed * ENEMY_SPEED_FACTOR;
        e.vy = dy / d * e.speed * ENEMY_SPEED_FACTOR;
        e.x += e.vx * dt;
        e.y += e.vy * dt;
      }
    } else {
      // Normal enemy movement
      e.vx = dx / d * e.speed * ENEMY_SPEED_FACTOR;
      e.vy = dy / d * e.speed * ENEMY_SPEED_FACTOR;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
    }
    
    // Update enemy animation
    try{
      if(e.isGolem && window.golemAnimController && e.animInstance){
        window.golemAnimController.update(e.animInstance, dt, e.vx, e.vy);
      } else if(e.isRedAlien && window.redAlienAnimController && e.animInstance){
        // Only update direction when moving (not attacking)
        if(!e.isAttacking){
          window.redAlienAnimController.update(e.animInstance, dt, e.vx, e.vy);
        } else {
          // Just update frame timing during attack, keep direction locked
          window.redAlienAnimController.update(e.animInstance, dt, 0, 0);
        }
      } else if(window.enemyAnimController && e.animInstance){
        window.enemyAnimController.update(e.animInstance, dt, e.vx, e.vy);
      }
    }catch(err){}
    
    // Contact damage (skip for golems and red aliens)
    if(!e.isGolem && !e.isRedAlien && Math.hypot(e.x - player.x, e.y - player.y) < e.radius + player.radius){
      player.health -= Math.max(1, Math.round(e.maxHp / 2));
      spawnParticles(player.x, player.y, '#ff9b9b', 12, 120);
      explodeSound();
      enemies.splice(i, 1);
      if(player.health <= 0){
        running = false;
        if(rafId) { cancelAnimationFrame(rafId); rafId = null; }
        startScreen.style.display = 'flex';
        saveHighScore('Player', score, gameTime, wave);
        if(leaderboardList) renderLeaderboard(leaderboardList);
      }
    }
  }

  // Projectile physics
  for(let i = projectiles.length - 1; i >= 0; i--){
    const p = projectiles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    
    // Rocket: set to explode when near an enemy (keep original behavior)
    if(p.type === 'rocket'){
      for(let k = enemies.length - 1; k >= 0; k--){
        const ee = enemies[k];
        const dd = Math.hypot(p.x - ee.x, p.y - ee.y);
        if(dd < ee.radius + 6){
          p.life = 0;
          break;
        }
      }
    } else if(p.type === 'fireball'){
      // Fireball: apply burn on impact
      for(let k = enemies.length - 1; k >= 0; k--){
        const ee = enemies[k];
        const dd = Math.hypot(p.x - ee.x, p.y - ee.y);
        if(dd < ee.radius + 6){
          // Apply initial damage
          ee.hp -= p.damage;
          spawnDamageNumber(ee.x, ee.y - ee.radius, p.damage);
          // Apply burn effect: 3 seconds of damage over time
          ee.burnDuration = 3.0;
          ee.burnDamage = 8; // 8 damage per second for 3 seconds
          spawnParticles(ee.x, ee.y, '#ff6600', 12, 100);
          p.life = 0;
          break;
        }
      }
    } else {
      // Non-rocket/fireball projectiles: check collision each frame and apply damage immediately
      let hit = false;
      for(let j = enemies.length - 1; j >= 0; j--){
        const e = enemies[j];
        const d = Math.hypot(p.x - e.x, p.y - e.y);
        if(d < p.radius + e.radius){
          // apply damage
          e.hp -= p.damage;
          spawnDamageNumber(e.x, e.y - e.radius, p.damage);
          if(e.hp <= 0){
            score += 10 * player.scoreMultiplier;
            spawnParticles(e.x, e.y, '#ffd', 18, 160);
            explodeSound();
            if(Math.random() < 0.12 * 0.35){
              const r = Math.random();
              const _pt = r < 0.3 ? 'minigun' : (r < 0.55 ? 'rocket' : (r < 0.75 ? 'shotgun' : (r < 0.9 ? 'fireball' : 'speed')));
              powerups.push(new PowerUp(e.x, e.y, _pt));
            }
            // 1% chance to drop nuke (reduced from 3%)
            if(Math.random() < 0.01){
              powerups.push(new PowerUp(e.x, e.y, 'nuke'));
            }
            if(Math.random() < 0.2) gems.push(new Gem(e.x, e.y, 8));
            enemies.splice(j, 1);
          }
          hit = true;
          break;
        }
      }
      if(hit){
        projectiles.splice(i, 1);
        continue;
      }
    }

    // advance lifetime
    p.life -= dt;
    if(p.life <= 0){
      if(p.type === 'rocket'){
        // rocket explosion damage
        for(let j = enemies.length - 1; j >= 0; j--){
          const e = enemies[j];
          const d = Math.hypot(p.x - e.x, p.y - e.y);
          if(d < p.explosion){
            e.hp -= p.damage;
            spawnDamageNumber(e.x, e.y - e.radius, p.damage);
            if(e.hp <= 0){
              score += 10 * player.scoreMultiplier;
              spawnParticles(e.x, e.y, '#ffd', 18, 160);
              explodeSound();
              if(Math.random() < 0.12 * 0.35){
                const r = Math.random();
                const _pt = r < 0.3 ? 'minigun' : (r < 0.55 ? 'rocket' : (r < 0.75 ? 'shotgun' : (r < 0.9 ? 'fireball' : 'speed')));
                powerups.push(new PowerUp(e.x, e.y, _pt));
              }
              // 1% chance to drop nuke
              if(Math.random() < 0.01){
                powerups.push(new PowerUp(e.x, e.y, 'nuke'));
              }
              if(Math.random() < 0.01){ // 1% chance for x2 score
                powerups.push(new PowerUp(e.x, e.y, 'x2score'));
              }
              if(Math.random() < 0.2) gems.push(new Gem(e.x, e.y, 8));
              enemies.splice(j, 1);
            }
          }
        }
      }
      // remove projectile at end of life (rockets handled above)
      projectiles.splice(i, 1);
    }
  }

  // Enemy Projectiles (rocks from red aliens)
  for(let i = enemyProjectiles.length - 1; i >= 0; i--){
    const p = enemyProjectiles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    
    // Check collision with player
    if(Math.hypot(p.x - player.x, p.y - player.y) < p.radius + player.radius){
      player.health -= p.damage;
      spawnParticles(player.x, player.y, '#ff9b9b', 8, 100);
      explodeSound();
      enemyProjectiles.splice(i, 1);
      
      if(player.health <= 0){
        running = false;
        if(rafId) { cancelAnimationFrame(rafId); rafId = null; }
        startScreen.style.display = 'flex';
        saveHighScore('Player', score, gameTime, wave);
        if(leaderboardList) renderLeaderboard(leaderboardList);
        gameState = 'menu';
      }
      continue;
    }
    
    // Remove if out of bounds or life expired
    if(p.life <= 0 || p.x < -50 || p.x > W + 50 || p.y < -50 || p.y > H + 50){
      enemyProjectiles.splice(i, 1);
    }
  }

  // Power-ups
  for(let i = powerups.length - 1; i >= 0; i--){
    const u = powerups[i];
    u.life -= dt;
    if(u.life <= 0){
      powerups.splice(i, 1);
      continue;
    }
    if(Math.hypot(u.x - player.x, u.y - player.y) < u.radius + player.radius){
      // Activate powerup for configured duration
      const dur = POWERUP_DURATION; // seconds
      player.activePowerups = player.activePowerups || {};
      
      // Handle nuke - kills all enemies immediately
      if(u.type === 'nuke'){
        // Kill all enemies on screen with drops
        const killedCount = enemies.length;
        enemies.forEach(e => {
          score += 10 * player.scoreMultiplier;
          spawnParticles(e.x, e.y, '#ff6600', 25, 200);
          
          // Drop powerups with same chance as normal kills
          if(Math.random() < 0.12 * 0.35){
            const r = Math.random();
            const _pt = r < 0.3 ? 'minigun' : (r < 0.55 ? 'rocket' : (r < 0.75 ? 'shotgun' : (r < 0.9 ? 'fireball' : 'speed')));
            powerups.push(new PowerUp(e.x, e.y, _pt));
          }
          // 1% chance to drop nuke
          if(Math.random() < 0.01){
            powerups.push(new PowerUp(e.x, e.y, 'nuke'));
          }
          // 1% chance to drop x2score
          if(Math.random() < 0.01){
            powerups.push(new PowerUp(e.x, e.y, 'x2score'));
          }
          // Drop gems
          if(Math.random() < 0.2) gems.push(new Gem(e.x, e.y, 8));
        });
        enemies.length = 0; // Clear all enemies
        powerUpSound('nuke');
      } else {
        const duration = u.type === 'x2score' ? 30 : dur; // x2score lasts 30 seconds
        player.activePowerups[u.type] = duration;
        // apply immediate effect
        if(u.type === 'minigun'){ player.weapon = 'minigun'; player.weapons.minigun = true; }
        else if(u.type === 'rocket'){ player.weapon = 'rocket'; player.weapons.rocket = true; }
        else if(u.type === 'shotgun'){ player.weapon = 'shotgun'; player.weapons.shotgun = true; }
        else if(u.type === 'fireball'){ player.weapon = 'fireball'; player.weapons.fireball = true; }
        else if(u.type === 'sword'){ player.weapon = 'sword'; player.weapons.sword = true; }
        else if(u.type === 'speed'){ player.speed = player.baseSpeed * 1.6; } // 60% speed boost
        else if(u.type === 'x2score'){ 
          player.scoreMultiplier *= 2; // Double the score multiplier (stacks!)
        }
        powerUpSound(u.type);
      }
      powerups.splice(i, 1);
    }
  }

  // Gems
  for(let i = gems.length - 1; i >= 0; i--){
    const g = gems[i];
    g.life -= dt;
    if(g.life <= 0){
      gems.splice(i, 1);
      continue;
    }
    if(Math.hypot(g.x - player.x, g.y - player.y) < g.radius + player.gemPickupRange){
      score += 50 * player.scoreMultiplier;
      gems.splice(i, 1);
      beep(1400, 0.05, 'sine');
    }
  }

  // Particles
  for(let i = particles.length - 1; i >= 0; i--){
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if(p.life <= 0) particles.splice(i, 1);
  }
  
  // Damage numbers
  for(let i = damageNumbers.length - 1; i >= 0; i--){
    const dn = damageNumbers[i];
    dn.y += dn.vy * dt;
    dn.life -= dt * 1.2; // Fade faster than particles
    if(dn.life <= 0) damageNumbers.splice(i, 1);
  }

  // Apply burn damage over time to enemies
  for(let i = enemies.length - 1; i >= 0; i--){
    const e = enemies[i];
    if(e.burnDuration > 0){
      e.burnDuration -= dt;
      // Tick burn damage every frame
      e.hp -= e.burnDamage * dt;
      // Spawn fire particles
      if(Math.random() < 0.3){
        spawnParticles(e.x, e.y, '#ff6600', 2, 40);
      }
      if(e.hp <= 0){
        score += 10 * player.scoreMultiplier;
        spawnParticles(e.x, e.y, '#ff6600', 18, 160);
        explodeSound();
        if(Math.random() < 0.12 * 0.35){
          const r = Math.random();
          const _pt = r < 0.3 ? 'minigun' : (r < 0.55 ? 'rocket' : (r < 0.75 ? 'shotgun' : (r < 0.9 ? 'fireball' : 'speed')));
          powerups.push(new PowerUp(e.x, e.y, _pt));
        }
        // 1% chance to drop nuke (reduced from 3%)
        if(Math.random() < 0.01){
          powerups.push(new PowerUp(e.x, e.y, 'nuke'));
        }
        if(Math.random() < 0.01){ // 1% chance for x2 score
          powerups.push(new PowerUp(e.x, e.y, 'x2score'));
        }
        if(Math.random() < 0.2) gems.push(new Gem(e.x, e.y, 8));
        enemies.splice(i, 1);
      }
    }
  }



  // Advance active powerup timers and expire when <= 0
  if(player.activePowerups){
    Object.keys(player.activePowerups).forEach(key => {
      player.activePowerups[key] -= dt;
      if(player.activePowerups[key] <= 0){
        delete player.activePowerups[key];
        // expire effects
        if(key === 'minigun' || key === 'rocket' || key === 'shotgun' || key === 'fireball' || key === 'sword'){
          if(player.weapon === key) player.weapon = 'standard';
        }
        if(key === 'speed'){
          player.speed = player.baseSpeed;
        }
        if(key === 'x2score'){
          player.scoreMultiplier = Math.max(1, player.scoreMultiplier / 2); // Halve the multiplier when one expires
        }
      }
    });
  }

  // Update score animation
  scoreAnimTimer += dt;
  if(scoreAnimTimer >= SCORE_ANIM_FRAME_TIME){
    scoreAnimTimer = 0;
    scoreAnimFrame = (scoreAnimFrame + 1) % 5; // 5 frames in the animation
  }

  // Update UI
  if(scoreEl) scoreEl.textContent = score;
  if(healthEl) healthEl.textContent = `${player.health}/${player.maxHealth}`;
  if(waveEl) waveEl.textContent = wave;
  
  // Update timer display
  const timerEl = document.getElementById('timer');
  if(timerEl){
    const minutes = Math.floor(gameTime / 60);
    const seconds = Math.floor(gameTime % 60);
    timerEl.textContent = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  }
  
  // Update dash charges display
  const dashEl = document.getElementById('dashCharges');
  if(dashEl){
    const chargeSymbols = '●'.repeat(player.dashCharges) + '○'.repeat(player.maxDashCharges - player.dashCharges);
    let dashText = chargeSymbols;
    // Show countdown if not at max charges
    if(player.dashCharges < player.maxDashCharges){
      const timeRemaining = Math.ceil(player.dashRechargeTime - player.dashRechargeTimer);
      dashText += ` (${timeRemaining}s)`;
    }
    dashEl.textContent = dashText;
  }
  
  // Update health bar
  const healthBar = document.getElementById('healthBar');
  if(healthBar){
    const healthPercent = (player.health / player.maxHealth) * 100;
    healthBar.style.width = Math.max(0, healthPercent) + '%';
  }
  

  
  // Update powerups display: show active timers; legend is initialized once
  if(powerupsEl){
    // create active powerups container once
    if(!powerupsEl._legendInited){
      const activeDiv = document.createElement('div');
      activeDiv.className = 'active-powerups';
      powerupsEl.appendChild(activeDiv);
      powerupsEl._legendInited = true;
    }

    // update active timers
    const activeDiv = powerupsEl.querySelector('.active-powerups');
    activeDiv.innerHTML = '';
    if(player.activePowerups){
      Object.keys(player.activePowerups).forEach(key => {
        const rem = Math.max(0, Math.ceil(player.activePowerups[key]));
        const color = key === 'minigun' ? '#7fe8ff' : key === 'rocket' ? '#ffb27f' : key === 'shotgun' ? '#d19cff' : key === 'sword' ? '#c0c0c0' : key === 'x2score' ? '#ffa500' : '#fff';
        const el = document.createElement('div');
        el.style.display = 'inline-block'; el.style.marginRight = '8px';
        el.innerHTML = `<span style="display:inline-block;width:10px;height:10px;background:${color};margin-right:6px;border:1px solid #000;vertical-align:middle"></span>${key}: ${rem}s`;
        activeDiv.appendChild(el);
      });
    }
  }

  // Update custom animations (external loader)
  try{ if(window.animLoader) window.animLoader.update(dt); } catch(e) { console.error('animLoader.update error', e); }

  // Sync any animations attached to the player so they follow player's position
  try{
    if(player._attachedAnims && player._attachedAnims.length){
      for(const a of player._attachedAnims){
        if(!a) continue;
        a.x = player.x + (a._attachOffsetX || 0);
        a.y = player.y + (a._attachOffsetY || 0);
      }
    }
  }catch(e){ console.error('player attach sync error', e); }

    // When a wave is cleared, pause and show the reward modal. Player must pick
    // a reward to start the next wave. Ensures one reward per wave via flag.
    // Check both enemies array and spawn queue to see if wave is truly complete
    if(waveInProgress && enemies.length === 0 && spawnQueue.length === 0){
      waveInProgress = false;
      if(waveRewardShownForWave !== wave){
        waveRewardShownForWave = wave;
        paused = true;
        rewardModal.style.display = 'flex';
        renderRewardSummary();
      }
    }
}

function draw(){
  // Draw tiled background
  if(backgroundLoaded){
    const tileW = backgroundImage.width;
    const tileH = backgroundImage.height;
    const tilesX = Math.ceil(W / tileW) + 1;
    const tilesY = Math.ceil(H / tileH) + 1;
    for(let y = 0; y < tilesY; y++){
      for(let x = 0; x < tilesX; x++){
        ctx.drawImage(backgroundImage, x * tileW, y * tileH);
      }
    }
  } else {
    // Fallback solid color
    ctx.fillStyle = '#04121a';
    ctx.fillRect(0, 0, W, H);
  }
  
  gems.forEach(g=>{
    ctx.fillStyle = '#8fffa0';
    ctx.beginPath();
    ctx.arc(g.x, g.y, g.radius, 0, Math.PI*2);
    ctx.fill();
  });
  
  enemies.forEach(e => drawEnemy(ctx, e));
  
  // Draw enemy projectiles (rocks from red aliens)
  enemyProjectiles.forEach(p => {
    ctx.fillStyle = '#8b4513'; // Brown rock color
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2);
    ctx.fill();
    ctx.stroke();
  });
  
  projectiles.forEach(p => {
    if(p.type === 'rocket'){
      // Draw rocket projectile as orange circle (not the sprite)
      ctx.fillStyle = '#fa4';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7.5, 0, Math.PI*2);
      ctx.fill();
      // Draw explosion radius indicator
      ctx.strokeStyle = 'rgba(255,160,64,0.12)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.explosion, 0, Math.PI*2);
      ctx.stroke();
    } else if(p.type === 'fireball' && fireballImageLoaded){
      // Draw fireball sprite
      const size = 42; // Size of fireball sprite (50% bigger)
      ctx.drawImage(fireballImage, p.x - size/2, p.y - size/2, size, size);
      // Draw fireball glow
      ctx.fillStyle = 'rgba(255, 102, 0, 0.3)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 1.5, 0, Math.PI*2);
      ctx.fill();
    } else {
      // Fallback to simple circle rendering
      ctx.fillStyle = p.type === 'rocket' ? '#ff9e4a' : p.type === 'fireball' ? '#ff6600' : '#fff7b2';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2);
      ctx.fill();
      if(p.type === 'rocket'){
        ctx.strokeStyle = 'rgba(255,160,64,0.12)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.explosion, 0, Math.PI*2);
        ctx.stroke();
      }
      if(p.type === 'fireball'){
        ctx.fillStyle = 'rgba(255, 102, 0, 0.4)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 1.5, 0, Math.PI*2);
        ctx.fill();
      }
    }
  });
  
  powerups.forEach(u => {
    if(u.type === 'nuke' && nukeImageLoaded){
      // Draw nuke image
      const size = u.radius * 2;
      ctx.drawImage(nukeImage, u.x - size/2, u.y - size/2, size, size);
    } else if(u.type === 'rocket' && rocketPowerupLoaded){
      // Draw rocket powerup sprite at 600% size
      const size = u.radius * 6;
      ctx.drawImage(rocketImage, u.x - size/2, u.y - size/2, size, size);
    } else if(u.type === 'fireball' && fireballPowerupLoaded){
      // Draw fireball powerup sprite scaled up 200%
      const size = u.radius * 4; // 2x larger than default
      ctx.drawImage(fireballImage, u.x - size/2, u.y - size/2, size, size);
    } else if(u.type === 'minigun' && minigunPowerupLoaded){
      // Draw minigun powerup sprite at 600% size
      const size = u.radius * 6;
      ctx.drawImage(minigunImage, u.x - size/2, u.y - size/2, size, size);
    } else if(u.type === 'shotgun' && shotgunPowerupLoaded){
      // Draw shotgun powerup sprite at 600% size
      const size = u.radius * 6;
      ctx.drawImage(shotgunImage, u.x - size/2, u.y - size/2, size, size);
    } else if(u.type === 'speed' && speedPowerupLoaded){
      // Draw speed powerup sprite at 600% size
      const size = u.radius * 6;
      ctx.drawImage(speedImage, u.x - size/2, u.y - size/2, size, size);
    } else {
      // Draw default powerup as colored box
      ctx.fillStyle = u.color;
      ctx.fillRect(u.x - u.radius, u.y - u.radius, u.radius*2, u.radius*2);
      ctx.fillStyle = '#000';
      ctx.fillRect(u.x - u.radius + 3, u.y - u.radius + 3, 6, 6);
    }
    
    // Draw countdown timer
    const timeLeft = Math.ceil(u.life);
    ctx.save();
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Draw background for timer
    const timerText = timeLeft.toString();
    const textWidth = ctx.measureText(timerText).width;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(u.x - textWidth/2 - 3, u.y - u.radius - 20, textWidth + 6, 16);
    
    // Draw timer text with color based on urgency
    if(timeLeft <= 3){
      ctx.fillStyle = '#ff4444';
    } else if(timeLeft <= 5){
      ctx.fillStyle = '#ffaa44';
    } else {
      ctx.fillStyle = '#ffffff';
    }
    ctx.fillText(timerText, u.x, u.y - u.radius - 12);
    ctx.restore();
  });
  
  particles.forEach(p => {
    ctx.fillStyle = p.col;
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillRect(p.x, p.y, 2, 2);
    ctx.globalAlpha = 1;
  });
  
  // Draw damage numbers with digital font
  damageNumbers.forEach(dn => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, dn.life);
    
    if (digitalFontLoaded) {
      const damageText = dn.damage.toString();
      const charWidth = 16;
      const charHeight = 20;
      const totalWidth = damageText.length * (charWidth + 2);
      drawDigitalText(damageText, dn.x - totalWidth/2, dn.y - charHeight/2, charWidth, charHeight, 2);
    } else {
      // Fallback to regular font
      ctx.fillStyle = '#ffff00';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      const damageText = dn.damage.toString();
      ctx.strokeText(damageText, dn.x, dn.y);
      ctx.fillText(damageText, dn.x, dn.y);
    }
    
    ctx.restore();
  });
  
  drawPlayer(ctx, player);

  // Draw sword if active
  if(player.weapon === 'sword'){
    const swordLength = 90; // 25% shorter than 120
    const swordWidth = 8;
    const handleLength = 15;
    
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.swordAngle);
    
    // Draw sword blade
    ctx.fillStyle = '#c0c0c0';
    ctx.strokeStyle = '#505050';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(handleLength, -swordWidth/2);
    ctx.lineTo(swordLength, 0);
    ctx.lineTo(handleLength, swordWidth/2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Draw sword handle
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(0, -swordWidth/2 - 2, handleLength, swordWidth + 4);
    
    // Draw crossguard
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(handleLength - 2, -swordWidth - 2, 4, swordWidth * 2 + 4);
    
    ctx.restore();
  }

  // Draw player health bar sprite at top left (HUD area)
  if(playerHealthBarLoaded){
    const healthPercent = player.health / player.maxHealth;
    const frameIndex = Math.max(0, Math.min(5, Math.floor(healthPercent * 6)));
    const frameHeight = playerHealthBarImage.height / 6;
    const barWidth = playerHealthBarImage.width;
    
    // Scale to reasonable HUD size (200px width)
    const scaledWidth = 200;
    const scaledHeight = (frameHeight / barWidth) * scaledWidth;
    
    // Draw at top left above HUD
    const barX = 15;
    const barY = 15;
    
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(
      playerHealthBarImage,
      0, frameIndex * frameHeight,
      barWidth, frameHeight,
      barX, barY,
      scaledWidth, scaledHeight
    );
    ctx.restore();
    
    // Draw health text overlay with digital font
    const healthText = `${player.health}/${player.maxHealth}`;
    if (digitalFontLoaded) {
      const textWidth = healthText.length * 18; // Estimate text width
      drawDigitalText(healthText, barX + scaledWidth/2 - textWidth/2, barY + scaledHeight/2 - 10, 16, 20, 2);
    } else {
      // Fallback to regular font
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText(healthText, barX + scaledWidth/2, barY + scaledHeight/2 + 5);
      ctx.fillText(healthText, barX + scaledWidth/2, barY + scaledHeight/2 + 5);
    }
  }
  
  // Draw animated score sprite next to health bar
  if(scoreAnimLoaded){
    const frameHeight = scoreAnimImage.height / 5; // 5 frames
    const frameWidth = scoreAnimImage.width;
    
    // Position to the right of health bar
    const scoreX = 230; // Right after health bar (15 + 200 + 15 spacing)
    const scoreY = 15;
    const scoreWidth = 180;
    const scoreHeight = (frameHeight / frameWidth) * scoreWidth;
    
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(
      scoreAnimImage,
      0, scoreAnimFrame * frameHeight, // Animated frames
      frameWidth, frameHeight,
      scoreX, scoreY,
      scoreWidth, scoreHeight
    );
    ctx.restore();
    
    // Draw score value overlay with digital font
    const scoreText = `${score}`;
    if (digitalFontLoaded) {
      const textWidth = scoreText.length * 22;
      drawDigitalText(scoreText, scoreX + scoreWidth/2 - textWidth/2, scoreY + scoreHeight/2 - 12, 20, 24, 3);
    } else {
      // Fallback to regular font
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText(scoreText, scoreX + scoreWidth/2, scoreY + scoreHeight/2 + 6);
      ctx.fillText(scoreText, scoreX + scoreWidth/2, scoreY + scoreHeight/2 + 6);
    }
  }

  // Draw multiplayer scoreboard in co-op mode
  if (window.isCoopMode && multiplayerPlayers.length > 0) {
    const sbX = W - 250; // Top right corner
    const sbY = 15;
    const sbWidth = 230;
    const lineHeight = 35;
    const sbHeight = 20 + (multiplayerPlayers.length + 1) * lineHeight; // +1 for local player
    
    // Semi-transparent background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(sbX, sbY, sbWidth, sbHeight);
    
    // Border
    ctx.strokeStyle = '#4da6ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(sbX, sbY, sbWidth, sbHeight);
    
    // Title
    ctx.fillStyle = '#ffff00';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('CO-OP SCOREBOARD', sbX + 10, sbY + 20);
    
    // Local player (you)
    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 14px Arial';
    const localName = window.discordAuth?.user?.username || 'You';
    ctx.fillText(`${localName} (You)`, sbX + 10, sbY + 20 + lineHeight);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'right';
    ctx.fillText(`${score}`, sbX + sbWidth - 10, sbY + 20 + lineHeight);
    
    // Other players
    multiplayerPlayers.sort((a, b) => b.score - a.score); // Sort by score descending
    multiplayerPlayers.forEach((player, idx) => {
      const yPos = sbY + 20 + (idx + 2) * lineHeight;
      
      // Player name
      ctx.fillStyle = '#4da6ff';
      ctx.font = '14px Arial';
      ctx.textAlign = 'left';
      const displayName = player.name.length > 15 ? player.name.substring(0, 15) + '...' : player.name;
      ctx.fillText(displayName, sbX + 10, yPos);
      
      // Player score
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'right';
      ctx.fillText(`${player.score}`, sbX + sbWidth - 10, yPos);
    });
    
    // Reset text alignment
    ctx.textAlign = 'center';
  }

  // Draw custom animations (on top of game entities)
  try{ if(window.animLoader) window.animLoader.draw(ctx); } catch(e) { console.error('animLoader.draw error', e); }
  
  if(paused && gameState === 'playing'){
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.font = '36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', W/2, H/2 - 120);
    
    // Display player stats
    ctx.font = '24px Arial';
    ctx.fillStyle = '#ffff00';
    const statsY = H/2 - 60;
    ctx.fillText(`Damage: ${player.damage.toFixed(1)}`, W/2, statsY);
    ctx.fillText(`Fire Rate: ${player.fireRate.toFixed(2)}`, W/2, statsY + 35);
    ctx.fillText(`Speed: ${player.speed}`, W/2, statsY + 70);
    ctx.fillText(`Weapon: ${player.weapon}`, W/2, statsY + 105);
    ctx.fillText(`Score Multiplier: x${player.scoreMultiplier}`, W/2, statsY + 140);
  }
  
  // Draw menu screen
  if(gameState === 'menu'){
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, W, H);
    
    // Draw 3 buttons as simple colored boxes
    const btnWidth = 300;
    const btnHeight = 80;
    const btnX = W/2 - btnWidth/2;
    const spacing = 100;
    const startY = H/2 - 100;
    
    // Start button
    ctx.fillStyle = '#0f0';
    ctx.fillRect(btnX, startY, btnWidth, btnHeight);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('START', btnX + btnWidth/2, startY + btnHeight/2 + 8);
    
    // Leaderboard button
    ctx.fillStyle = '#ff0';
    ctx.fillRect(btnX, startY + spacing, btnWidth, btnHeight);
    ctx.fillStyle = '#000';
    ctx.fillText('LEADERBOARD', btnX + btnWidth/2, startY + spacing + btnHeight/2 + 8);
    
    // Exit button
    ctx.fillStyle = '#f00';
    ctx.fillRect(btnX, startY + spacing*2, btnWidth, btnHeight);
    ctx.fillStyle = '#fff';
    ctx.fillText('EXIT', btnX + btnWidth/2, startY + spacing*2 + btnHeight/2 + 8);
    
    // Title
    ctx.fillStyle = '#ff3366';
    ctx.font = 'bold 64px Arial';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 6;
    ctx.strokeText('ALIENS VS GOJU', W/2, H/2 - 250);
    ctx.fillText('ALIENS VS GOJU', W/2, H/2 - 250);
  }
  
  // Draw leaderboard screen
  if(gameState === 'leaderboard'){
    ctx.fillStyle = 'rgba(0,0,0,0.9)';
    ctx.fillRect(0, 0, W, H);
    
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 5;
    ctx.strokeText('LEADERBOARD', W/2, 100);
    ctx.fillText('LEADERBOARD', W/2, 100);
    
    const scores = getHighScores();
    ctx.font = 'bold 28px Arial';
    ctx.fillStyle = '#fff';
    ctx.lineWidth = 3;
    
    scores.forEach((entry, i) => {
      const y = 200 + i * 50;
      
      if (digitalFontLoaded) {
        // Draw rank number with digital font
        const rankText = `${i+1}`;
        drawDigitalText(rankText, W/2 - 350, y - 18, 24, 30, 3);
        
        // Draw name with regular font
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${entry.name}`, W/2, y);
        
        // Draw score with digital font
        const scoreText = `${entry.score}`;
        const scoreWidth = scoreText.length * 27;
        drawDigitalText(scoreText, W/2 + 100, y - 18, 24, 30, 3);
      } else {
        // Fallback to regular font
        const text = `${i+1}. ${entry.name} - ${entry.score}`;
        ctx.strokeText(text, W/2, y);
        ctx.fillText(text, W/2, y);
      }
    });
    
    // Back instruction
    ctx.font = '20px Arial';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Click anywhere or press ESC to return', W/2, H - 50);
  }
  
  // Draw touch controls for mobile
  if (isMobile && gameState === 'playing' && !paused) {
    // Draw joystick on left side
    if (touchJoystick.active) {
      const baseRadius = 60;
      const stickRadius = 30;
      
      // Joystick base
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.arc(touchJoystick.startX, touchJoystick.startY, baseRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // Joystick stick
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.beginPath();
      ctx.arc(touchJoystick.currentX, touchJoystick.currentY, stickRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // Connection line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(touchJoystick.startX, touchJoystick.startY);
      ctx.lineTo(touchJoystick.currentX, touchJoystick.currentY);
      ctx.stroke();
    } else {
      // Show hint for movement
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Touch left to move', W * 0.25, H - 40);
    }
    
    // Show hint for shooting on right side
    if (!touchShoot.active) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Touch right to aim', W * 0.75, H - 40);
    }
    
    ctx.textAlign = 'center'; // Reset
  }
}

// Exports (use getters so external code sees live values)
Object.defineProperty(window, 'player', { get: () => player, configurable: true });
Object.defineProperty(window, 'score', { get: () => score, configurable: true });
Object.defineProperty(window, 'wave', { get: () => wave, configurable: true });
Object.defineProperty(window, 'enemies', { get: () => enemies, configurable: true });
Object.defineProperty(window, 'projectiles', { get: () => projectiles, configurable: true });
Object.defineProperty(window, 'powerups', { get: () => powerups, configurable: true });
Object.defineProperty(window, 'particles', { get: () => particles, configurable: true });
Object.defineProperty(window, 'gems', { get: () => gems, configurable: true });
Object.defineProperty(window, 'running', { get: () => running, configurable: true });
// Expose constructors and input for tests
window.Gem = Gem;
window.Enemy = Enemy;
window.input = input;

window.resetGame = resetGame;
window.startWave = startWave;
window.update = update;
window.draw = draw;

// Debugging helpers: create UI bindings and logging
function debugLog(msg, level='info'){
  const out = document.getElementById('testOutput');
  if(!out) return;
  const el = document.createElement('div');
  el.textContent = `[${(new Date()).toLocaleTimeString()}] ${msg}`;
  el.style.color = level === 'err' ? '#f88' : (level === 'warn' ? '#ffb86b' : '#9f9');
  out.appendChild(el);
  out.scrollTop = out.scrollHeight;
}

function updateDebugStats(){
  const s = document.getElementById('dbgScore');
  const w = document.getElementById('dbgWave');
  const e = document.getElementById('dbgEnemies');
  const p = document.getElementById('dbgProjectiles');
  const pu = document.getElementById('dbgPowerups');
  const g = document.getElementById('dbgGems');
  const hp = document.getElementById('dbgHP');
  const fs = document.getElementById('dbgFired');
  if(s) s.textContent = String(score);
  if(w) w.textContent = String(wave);
  if(e) e.textContent = String(enemies.length);
  if(p) p.textContent = String(projectiles.length);
  if(pu) pu.textContent = String(powerups.length);
  if(g) g.textContent = String(gems.length);
  if(hp) hp.textContent = `${player.health}/${player.maxHealth}`;
  if(fs) fs.textContent = String(window._firedShots || 0);
}

function initDebugConsole(){
  // attach handlers if elements exist
  const auto = document.getElementById('dbgAuto');
  const btnLog = document.getElementById('dbgLogState');
  const btnClear = document.getElementById('dbgClear');
  const btnSpawn = document.getElementById('dbgSpawnWave');
  const btnSim = document.getElementById('dbgSimFire');
  const btnStart = document.getElementById('dbgStart');
  const btnLoadAnim = document.getElementById('dbgLoadAnim');
  const btnSpawnAnim = document.getElementById('dbgSpawnAnim');
  
  // Powerup spawn buttons
  const btnSpawnMinigun = document.getElementById('spawnMinigun');
  const btnSpawnRocket = document.getElementById('spawnRocket');
  const btnSpawnShotgun = document.getElementById('spawnShotgun');
  const btnSpawnFireball = document.getElementById('spawnFireball');
  const btnSpawnNuke = document.getElementById('spawnNuke');
  const btnSpawnSpeed = document.getElementById('spawnSpeed');
  const btnSpawnSword = document.getElementById('spawnSword');
  const btnSpawnX2Score = document.getElementById('spawnX2Score');
  const btnSpawnGem = document.getElementById('spawnGem');

  if(btnLog) btnLog.addEventListener('click', ()=>{
    debugLog(`State: score=${score} wave=${wave} enemies=${enemies.length} projectiles=${projectiles.length}`);
  });
  if(btnClear) btnClear.addEventListener('click', ()=>{ const out = document.getElementById('testOutput'); if(out) out.innerHTML=''; });
  if(btnSpawn) btnSpawn.addEventListener('click', ()=>{ startWave(); debugLog('Spawned wave via Debug'); updateDebugStats(); });
  if(btnSim) btnSim.addEventListener('click', ()=>{ player.fireTimer = -1; update(0.016); debugLog('Simulated fire (update called)'); updateDebugStats(); });
  if(btnStart) btnStart.addEventListener('click', ()=>{ startGameFromUI(); debugLog('Game started via Debug'); updateDebugStats(); });
  
  // Powerup spawn handlers
  if(btnSpawnMinigun) btnSpawnMinigun.addEventListener('click', ()=>{ 
    powerups.push(new PowerUp(W/2, H/2, 'minigun')); 
    debugLog('Spawned Minigun at center'); 
    updateDebugStats(); 
  });
  if(btnSpawnRocket) btnSpawnRocket.addEventListener('click', ()=>{ 
    powerups.push(new PowerUp(W/2, H/2, 'rocket')); 
    debugLog('Spawned Rocket at center'); 
    updateDebugStats(); 
  });
  if(btnSpawnShotgun) btnSpawnShotgun.addEventListener('click', ()=>{ 
    powerups.push(new PowerUp(W/2, H/2, 'shotgun')); 
    debugLog('Spawned Shotgun at center'); 
    updateDebugStats(); 
  });
  if(btnSpawnFireball) btnSpawnFireball.addEventListener('click', ()=>{ 
    powerups.push(new PowerUp(W/2, H/2, 'fireball')); 
    debugLog('Spawned Fireball at center'); 
    updateDebugStats(); 
  });
  if(btnSpawnNuke) btnSpawnNuke.addEventListener('click', ()=>{ 
    powerups.push(new PowerUp(W/2, H/2, 'nuke')); 
    debugLog('Spawned NUKE at center'); 
    updateDebugStats(); 
  });
  if(btnSpawnSpeed) btnSpawnSpeed.addEventListener('click', ()=>{ 
    powerups.push(new PowerUp(W/2, H/2, 'speed')); 
    debugLog('Spawned Speed Boost at center'); 
    updateDebugStats(); 
  });
  if(btnSpawnSword) btnSpawnSword.addEventListener('click', ()=>{ 
    powerups.push(new PowerUp(W/2, H/2, 'sword')); 
    debugLog('Spawned Sword at center'); 
    updateDebugStats(); 
  });
  if(btnSpawnX2Score) btnSpawnX2Score.addEventListener('click', ()=>{ 
    powerups.push(new PowerUp(W/2, H/2, 'x2score')); 
    debugLog('Spawned X2 Score at center'); 
    updateDebugStats(); 
  });
  if(btnSpawnGem) btnSpawnGem.addEventListener('click', ()=>{ 
    gems.push(new Gem(W/2, H/2, 50)); 
    debugLog('Spawned Gem at center'); 
    updateDebugStats(); 
  });
  
  // Add Red Alien spawn button
  const btnSpawnRedAlien = document.getElementById('spawnRedAlien');
  if(btnSpawnRedAlien) btnSpawnRedAlien.addEventListener('click', ()=>{ 
    const redAlien = new Enemy(W/2, H/2 - 100, 50, false, true);
    redAlien.speed = 60;
    enemies.push(redAlien); 
    debugLog('Spawned Red Alien at center'); 
    updateDebugStats(); 
  });
  
  if(btnLoadAnim) btnLoadAnim.addEventListener('click', ()=>{
    // try to load example animations file from animations/ folder
    const url = 'animations/my-animations.js';
    window.loadAnimationScript(url).then(()=>{
      debugLog('Loaded animations script: ' + url);
      // if the loaded script exported a pending factory, register it
      if(window._pendingFloatingTextFactory && window.registerAnimationFactory){
        window.registerAnimationFactory('floatingText', window._pendingFloatingTextFactory);
        delete window._pendingFloatingTextFactory;
        debugLog('Registered pending floatingText factory');
      }
      // register any pending sprites (animations script may have queued some)
      if(window._pendingSprites && window.registerSprite){
        Object.keys(window._pendingSprites).forEach(k => {
          const s = window._pendingSprites[k];
          try{ window.registerSprite(k, s.imageUrl, s.frameW, s.frameH, s.frames); debugLog('Registered pending sprite: '+k); } catch(e){ debugLog('Failed to register sprite '+k+': '+e.message, 'err'); }
        });
        window._pendingSprites = {};
      }
      // register any pending factory named _pendingSparkFactory
      if(window._pendingSparkFactory && window.registerAnimationFactory){
        window.registerAnimationFactory('sparkBurst', window._pendingSparkFactory);
        delete window._pendingSparkFactory;
        debugLog('Registered pending sparkBurst factory');
      }
      // refresh animation dropdown if available
      if(typeof refreshAnimDropdown === 'function') refreshAnimDropdown();
    }).catch(e=>{ debugLog('Failed to load animation script: ' + e.message, 'err'); });
  });
  if(btnSpawnAnim) btnSpawnAnim.addEventListener('click', ()=>{
    try{
      const sel = document.getElementById('dbgAnimList');
      if(!sel) return debugLog('No animation selected', 'warn');
      const val = sel.value;
      if(!val) return debugLog('No animation selected', 'warn');
      const [type, name] = val.split(':');
      if(type === 'factory'){
        if(window.createAnimationFromFactory){ window.createAnimationFromFactory(name, 'Nice!', Math.round(player.x), Math.round(player.y)); debugLog('Spawned factory animation: '+name); }
        else debugLog('Factory creation unavailable', 'err');
      } else if(type === 'sprite'){
        if(window.createAnimationInstance){ window.createAnimationInstance(name, { x: Math.round(player.x), y: Math.round(player.y), loop: false, frameDuration: 0.06, removeOnFinish: true, scale: 1.2, z: 50 }); debugLog('Spawned sprite animation: '+name); }
        else debugLog('Sprite creation unavailable', 'err');
      } else {
        debugLog('Unknown anim type: '+type, 'err');
      }
      // refresh stats
      updateDebugStats();
    }catch(e){ debugLog('Spawn anim error: ' + e.message, 'err'); }
  });

  // helper: populate the animation dropdown
  window.refreshAnimDropdown = function(){
    const sel = document.getElementById('dbgAnimList');
    if(!sel) return;
    sel.innerHTML = '';
    // factories
    try{
      if(window.animLoader && window.animLoader.externalFactories){
        Object.keys(window.animLoader.externalFactories).forEach(n=>{
          const o = document.createElement('option'); o.value = 'factory:'+n; o.textContent = 'Factory: '+n; sel.appendChild(o);
        });
      }
    }catch(e){}
    // sprites
    try{
      if(window.animLoader && window.animLoader.sprites){
        Object.keys(window.animLoader.sprites).forEach(n=>{
          const o = document.createElement('option'); o.value = 'sprite:'+n; o.textContent = 'Sprite: '+n; sel.appendChild(o);
        });
      }
    }catch(e){}
    if(sel.options.length === 0){ const o = document.createElement('option'); o.value=''; o.textContent='(no animations)'; sel.appendChild(o); }
  };
  // initial populate
  setTimeout(()=>{ try{ if(typeof window.refreshAnimDropdown === 'function') window.refreshAnimDropdown(); }catch(e){} }, 300);

  // live update if checkbox is toggled
  let liveInterval = null;
  if(auto) auto.addEventListener('change', ()=>{
    if(auto.checked){
      updateDebugStats();
      liveInterval = setInterval(updateDebugStats, 400);
      debugLog('Live debug ON');
    } else {
      if(liveInterval) clearInterval(liveInterval);
      debugLog('Live debug OFF');
    }
  });

  // initial stat update
  updateDebugStats();
}

// init when DOM ready (best-effort)
setTimeout(initDebugConsole, 400);

// Try to preload the sprite example so the 'spark' sprite is available for the player glow.
setTimeout(()=>{
  try{
    if(window.loadAnimationScript){
      window.loadAnimationScript('animations/sprite-example.js').then(()=>{
        console.info('Preloaded animations/sprite-example.js');
        if(typeof refreshAnimDropdown === 'function') refreshAnimDropdown();
      }).catch(()=>{});
    }
  }catch(e){}
}, 900);

// Expose multiplayer functions globally
window.updateMultiplayerScore = updateMultiplayerScore;
window.getLocalScore = () => score;
window.getLocalPlayerInfo = () => ({
  score: score,
  character: selectedCharacter,
  name: window.discordAuth?.user?.username || 'Player'
});

// Broadcast score updates in co-op mode (call this periodically)
window.broadcastScore = function() {
  if (window.isCoopMode && window.discordSdk) {
    // This would integrate with your Discord SDK or networking layer
    // For now, it's a placeholder that can be called from main.js
    console.log('Broadcasting score:', score);
  }
};

// Start game loop in menu mode
setTimeout(() => {
  gameState = 'menu';
  lastTime = performance.now();
  rafId = requestAnimationFrame(loop);
  if(leaderboardList) renderLeaderboard(leaderboardList);
}, 100);

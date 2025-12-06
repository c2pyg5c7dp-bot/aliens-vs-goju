// Vampire Survivors Lite - Cleaned up game.js
// Core setup
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let DPR = window.devicePixelRatio || 1;
function resizeCanvas(){
	DPR = window.devicePixelRatio || 1;
	canvas.style.width = window.innerWidth + 'px';
	canvas.style.height = window.innerHeight + 'px';
	canvas.width = Math.floor(window.innerWidth * DPR);
	canvas.height = Math.floor(window.innerHeight * DPR);
	ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// UI elements
const startScreen = document.getElementById('startScreen');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const restartBtn = document.getElementById('restartBtn');
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
const scoreEl = document.getElementById('score');
const healthEl = document.getElementById('health');
const xpEl = document.getElementById('xp');
const powerupsEl = document.getElementById('powerups');

const difficultyModifiers = {
	easy: { enemyHp:0.6, spawnRate:1.4, playerDamage:1.3, fireRate:0.85 },
	medium: { enemyHp:1.0, spawnRate:1.0, playerDamage:1.0, fireRate:1.0 },
	hard: { enemyHp:1.5, spawnRate:0.75, playerDamage:0.8, fireRate:1.15 },
	expert: { enemyHp:2.2, spawnRate:0.6, playerDamage:0.6, fireRate:1.3 },
	unreal: { enemyHp:3.5, spawnRate:0.5, playerDamage:0.4, fireRate:1.4 }
};

let currentDifficulty = 'medium';
let diffMod = difficultyModifiers[currentDifficulty];
let W = window.innerWidth, H = window.innerHeight;
let running = false, paused = false;
let score = 0;
let nextRewardAt = 500;
let rewardTriggered = false;
let wave = 0, spawnTimer = 0;
let enemies = [], projectiles = [], powerups = [], particles = [], gems = [];
let lastTime = 0;
let gameTime = 0;

class Player {
	constructor(){
		this.x = W/2; this.y = H/2; this.radius = 14;
		this.health = 12; this.maxHealth = 12; this.baseSpeed = 220; this.speed = this.baseSpeed;
		this.damage = 1; this.fireRate = 0.12; this.fireTimer = 0;
		this.weapon = 'standard'; this.weapons = { standard:true, minigun:false, rocket:false };
		this.multiplier = 1; this.xp = 0; this.level = 1; this.xpToLevel = 50;
		this.ringOfFire = null;
		this.speedBoostTimer = 0;
	}
}
let player = new Player();

class RingOfFire {
	constructor(){ this.angle = 0; this.radius = 80; this.duration = 10; this.lifetime = 10; this.damage = 2; this.hitEnemies = new Set(); }
	update(dt){ this.lifetime -= dt; this.angle += Math.PI*2.5*dt; }
	isActive(){ return this.lifetime > 0; }
}

const input = { up:false, down:false, left:false, right:false, mouseX:W/2, mouseY:H/2 };
window.addEventListener('keydown', e=>{ if(e.key==='w'||e.key==='ArrowUp') input.up = true; if(e.key==='s'||e.key==='ArrowDown') input.down = true; if(e.key==='a'||e.key==='ArrowLeft') input.left = true; if(e.key==='d'||e.key==='ArrowRight') input.right = true; });
window.addEventListener('keyup', e=>{ if(e.key==='w'||e.key==='ArrowUp') input.up = false; if(e.key==='s'||e.key==='ArrowDown') input.down = false; if(e.key==='a'||e.key==='ArrowLeft') input.left = false; if(e.key==='d'||e.key==='ArrowRight') input.right = false; });
canvas.addEventListener('mousemove', e=>{ const r = canvas.getBoundingClientRect(); input.mouseX = e.clientX - r.left; input.mouseY = e.clientY - r.top; });

class Enemy{ constructor(x,y,hp){ this.x=x; this.y=y; this.hp=hp; this.maxHp=hp; this.radius=8+hp*4; this.speed=40+hp*6; this.color = hp<=1? '#ff6b6b' : hp<=3? '#ffb86b' : hp<=6? '#ffd86b' : '#7ef0a6'; } }
class Projectile{ constructor(x,y,vx,vy,type,damage){ this.x=x; this.y=y; this.vx=vx; this.vy=vy; this.type=type; this.damage=damage; this.radius = type==='rocket'?5:2; this.life=4; this.explosion = type==='rocket'?90:0; } }
class PowerUp{ constructor(x,y,type){ this.x=x; this.y=y; this.type=type; this.radius=10; this.life=18; this.color = type==='minigun'? '#7fe8ff' : type==='rocket'? '#ffb27f' : type==='ringoffire'? '#ff3333' : type==='speedboost'? '#ff00ff' : '#fff28f'; } }
class Gem{ constructor(x,y,amount){ this.x=x; this.y=y; this.amount=amount; this.radius=5; this.life=10; } }

let audioCtx = null;
function ensureAudio(){ if(!audioCtx){ try{ audioCtx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ audioCtx = null; } } }
function beep(freq, time=0.06, type='sine', vol=0.002){ try{ ensureAudio(); if(!audioCtx) return; const o = audioCtx.createOscillator(); const g = audioCtx.createGain(); o.type = type; o.frequency.setValueAtTime(freq, audioCtx.currentTime); g.gain.setValueAtTime(vol, audioCtx.currentTime); o.connect(g); g.connect(audioCtx.destination); o.start(); g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + time); o.stop(audioCtx.currentTime + time + 0.02); }catch(e){} }
function explodeSound(){ try{ ensureAudio(); if(!audioCtx) return; const size = Math.floor(audioCtx.sampleRate * 0.12); const buf = audioCtx.createBuffer(1, size, audioCtx.sampleRate); const d = buf.getChannelData(0); for(let i=0;i<size;i++) d[i] = (Math.random()*2-1)*(1 - i/size); const src = audioCtx.createBufferSource(); src.buffer = buf; const g = audioCtx.createGain(); g.gain.setValueAtTime(0.6, audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.14); src.connect(g); g.connect(audioCtx.destination); src.start(); }catch(e){} }

function spawnParticles(x,y,col,count=16,vel=160){ for(let i=0;i<count;i++){ particles.push({ x, y, vx:(Math.random()*2-1)*vel, vy:(Math.random()*2-1)*vel, life:0.5 + Math.random()*0.8, col }); } }
function rand(a,b){ return a + Math.random()*(b-a); }

const HB_KEY = 'vs_lite_scores_v1';
function getHighScores(){ try{ const raw = localStorage.getItem(HB_KEY); return raw ? JSON.parse(raw) : []; }catch(e){ return []; } }
function saveHighScore(name, sc){ const list = getHighScores(); list.push({ name, score: sc }); list.sort((a,b)=>b.score - a.score); while(list.length>10) list.pop(); localStorage.setItem(HB_KEY, JSON.stringify(list)); }
function renderLeaderboard(el){ const list = getHighScores(); if(!el) return; el.innerHTML = ''; list.forEach(it=>{ const li = document.createElement('li'); li.textContent = it.name + ' - ' + it.score; el.appendChild(li); }); }

function startWave(){ wave++; const baseCount = 5 + Math.floor(wave * 1.6); const count = Math.ceil(baseCount * (diffMod.spawnRate || 1)); for(let i=0;i<count;i++){ const side = Math.random(); let x,y; if(side < 0.25){ x = rand(0, W); y = -40; } else if(side < 0.5){ x = rand(0, W); y = H + 40; } else if(side < 0.75){ x = -40; y = rand(0, H); } else { x = W + 40; y = rand(0, H); } const baseHp = [1,1,1,3,3,6,12][Math.floor(Math.random()*7)]; const hp = Math.ceil(baseHp * (diffMod.enemyHp || 1)); enemies.push(new Enemy(x,y,hp)); } }

function resetGame(){ player = new Player(); player.damage *= (diffMod.playerDamage || 1); player.fireRate *= (diffMod.fireRate || 1); enemies = []; projectiles = []; powerups = []; particles = []; gems = []; score = 0; nextRewardAt = 500; rewardTriggered = false; wave = 0; spawnTimer = 0; gameTime = 0; running = true; paused = false; window.player = player; window.enemies = enemies; window.projectiles = projectiles; window.powerups = powerups; window.particles = particles; window.gems = gems; window.score = score; window.running = running; }

rewardHealth.addEventListener('click', ()=>{ player.maxHealth += 3; player.health = Math.min(player.maxHealth, player.health + 3); rewardModal.style.display = 'none'; paused = false; rewardTriggered = false; nextRewardAt += 500; });
rewardDamage.addEventListener('click', ()=>{ player.damage += 0.5; rewardModal.style.display = 'none'; paused = false; rewardTriggered = false; nextRewardAt += 500; });
rewardRate.addEventListener('click', ()=>{ player.fireRate = Math.max(0.02, player.fireRate * 0.88); rewardModal.style.display = 'none'; paused = false; rewardTriggered = false; nextRewardAt += 500; });
startBtn.addEventListener('click', ()=>{ startScreen.style.display = 'none'; resetGame(); renderLeaderboard(leaderboardList); requestAnimationFrame(loop); });
pauseBtn.addEventListener('click', ()=>{ paused = !paused; pauseBtn.textContent = paused ? 'Resume' : 'Pause'; });
restartBtn.addEventListener('click', ()=>{ resetGame(); });
leaderboardBtn.addEventListener('click', ()=>{ renderLeaderboard(leaderboardModalList); leaderboardModal.style.display = 'block'; });
closeLeaderboard.addEventListener('click', ()=>{ leaderboardModal.style.display = 'none'; });
clearLeaderboard.addEventListener('click', ()=>{ localStorage.removeItem(HB_KEY); renderLeaderboard(leaderboardModalList); renderLeaderboard(leaderboardList); });
document.querySelectorAll('.diff-btn').forEach(btn => { btn.addEventListener('click', (e)=>{ document.querySelectorAll('.diff-btn').forEach(b=>b.classList.remove('selected')); e.target.classList.add('selected'); currentDifficulty = e.target.dataset.difficulty; diffMod = difficultyModifiers[currentDifficulty]; }); });
if(document.getElementById('diffMedium')) document.getElementById('diffMedium').classList.add('selected');

function drawSoldier(ctx,p){ ctx.save(); ctx.translate(p.x,p.y); ctx.fillStyle = '#6ea8ff'; ctx.beginPath(); ctx.arc(0,0,p.radius,0,Math.PI*2); ctx.fill(); ctx.fillStyle = '#223344'; ctx.fillRect(-8,-p.radius-6,16,6); ctx.fillStyle = '#cfe3ff'; ctx.fillRect(-6,-p.radius-4,12,3); ctx.fillStyle = '#1f497d'; ctx.fillRect(-7,0,14,10); ctx.fillStyle = '#0f2b3d'; ctx.fillRect(-6,10,5,8); ctx.fillRect(1,10,5,8); ctx.restore(); }
function drawLegoZombie(ctx,e){ ctx.save(); ctx.translate(e.x,e.y); const r = Math.max(6, e.radius); ctx.fillStyle = e.color; ctx.fillRect(-r,-r,r*2,r*2); ctx.fillStyle = shade(e.color, -20); ctx.beginPath(); ctx.arc(0, -r-6, 6, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#111'; ctx.fillRect(-r/2+6, -r+6, 4,4); ctx.fillRect(r/2-10, -r+6,4,4); ctx.fillStyle = '#000'; ctx.fillRect(-r, -r-8, r*2, 6); ctx.fillStyle = '#ff5555'; ctx.fillRect(-r, -r-8, (e.hp / e.maxHp) * (r*2), 6); ctx.restore(); }
function shade(hex, percent){ try{ const c = hex.replace('#',''); const num = parseInt(c,16); let r = (num>>16) + percent; let g = ((num>>8)&0xFF) + percent; let b = (num & 0xFF) + percent; r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b)); return '#'+((1<<24) + (r<<16) + (g<<8) + b).toString(16).slice(1); }catch(e){ return hex; } }

function drawRingOfFire(ctx,p){ if(!p.ringOfFire || !p.ringOfFire.isActive()) return; const ring = p.ringOfFire; const numPoints = 12; const alpha = Math.max(0.3, ring.lifetime / ring.duration); ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = '#ff3333'; ctx.lineWidth = 8; ctx.lineCap = 'round'; for(let i=0;i<numPoints;i++){ const ang = (Math.PI*2*i/numPoints) + ring.angle; const x1 = p.x + Math.cos(ang)*ring.radius; const y1 = p.y + Math.sin(ang)*ring.radius; const ang2 = (Math.PI*2*(i+1)/numPoints) + ring.angle; const x2 = p.x + Math.cos(ang2)*ring.radius; const y2 = p.y + Math.sin(ang2)*ring.radius; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); } ctx.restore(); }

function loop(ts){ if(!running) return; const dt = Math.min(0.05, (ts - lastTime)/1000 || 0.016); lastTime = ts; if(!paused) update(dt); draw(); requestAnimationFrame(loop); }

function update(dt){ let vx=0, vy=0; if(input.up) vy -= player.speed; if(input.down) vy += player.speed; if(input.left) vx -= player.speed; if(input.right) vx += player.speed; const L = Math.hypot(vx,vy); if(L>0){ vx = vx / L * player.speed; vy = vy / L * player.speed; } player.x = Math.max(player.radius, Math.min(W - player.radius, player.x + vx * dt)); player.y = Math.max(player.radius, Math.min(H - player.radius, player.y + vy * dt));
				if(player.ringOfFire && player.ringOfFire.isActive()){ player.ringOfFire.update(dt); } else { player.ringOfFire = null; }
				// handle speed boost timer
				if(player.speedBoostTimer && player.speedBoostTimer > 0){
					player.speedBoostTimer -= dt;
					if(player.speedBoostTimer <= 0){ player.speed = player.baseSpeed; player.speedBoostTimer = 0; }
				}
				player.fireTimer -= dt;
  if(player.fireTimer <= 0){ const dx = input.mouseX - player.x; const dy = input.mouseY - player.y; const dist = Math.hypot(dx,dy); if(dist > 0.1){ const ax = dx / dist, ay = dy / dist; if(player.weapon === 'standard'){ for(let i=-1;i<=1;i++){ const ang = Math.atan2(ay,ax) + i * 0.16; projectiles.push(new Projectile(player.x, player.y, Math.cos(ang)*380, Math.sin(ang)*380, 'bullet', Math.round(player.damage))); } player.fireTimer = player.fireRate; beep(1000, 0.06, 'square'); } else if(player.weapon === 'minigun'){ for(let i=0;i<3;i++){ const spread = (i-1)*0.08; const ang = Math.atan2(ay,ax) + spread; projectiles.push(new Projectile(player.x, player.y, Math.cos(ang)*420, Math.sin(ang)*420, 'bullet', Math.round(player.damage*0.8))); } player.fireTimer = player.fireRate * 0.15; beep(1200, 0.03, 'square'); } else if(player.weapon === 'rocket'){ projectiles.push(new Projectile(player.x, player.y, ax*260, ay*260, 'rocket', Math.round(player.damage*2))); player.fireTimer = player.fireRate * 3; beep(350, 0.18, 'sine'); } } }	spawnTimer -= dt; if(spawnTimer <= 0){ startWave(); spawnTimer = Math.max(0.6, 3 - wave * 0.08); }

	// Enemies movement & collisions
	for(let i = enemies.length - 1; i >= 0; i--){ const e = enemies[i]; const dx = player.x - e.x; const dy = player.y - e.y; const d = Math.hypot(dx,dy) || 1; e.x += dx / d * e.speed * dt; e.y += dy / d * e.speed * dt; if(Math.hypot(e.x - player.x, e.y - player.y) < e.radius + player.radius){ player.health -= Math.max(1, Math.round(e.maxHp / 2)); spawnParticles(player.x, player.y, '#ff9b9b', 12, 120); explodeSound(); enemies.splice(i,1); if(player.health <= 0){ running = false; startScreen.style.display = 'flex'; saveHighScore('Player', score); renderLeaderboard(leaderboardList); } } }

	// Ring of fire damage
	if(player.ringOfFire && player.ringOfFire.isActive()){
		for(let i = enemies.length - 1; i >= 0; i--){ const e = enemies[i]; const ringX = player.x + Math.cos(player.ringOfFire.angle) * player.ringOfFire.radius; const ringY = player.y + Math.sin(player.ringOfFire.angle) * player.ringOfFire.radius; const dist = Math.hypot(e.x - ringX, e.y - ringY); if(dist < 50){ if(!player.ringOfFire.hitEnemies.has(i)){ e.hp -= player.ringOfFire.damage; player.ringOfFire.hitEnemies.add(i); if(e.hp <= 0){ score += 10 * player.multiplier; spawnParticles(e.x, e.y, '#ffd', 18, 160); explodeSound(); if(Math.random() < 0.03) powerups.push(new PowerUp(e.x, e.y, 'ringoffire')); else if(Math.random() < 0.12) powerups.push(new PowerUp(e.x, e.y, Math.random() < 0.5 ? 'minigun' : 'rocket')); if(Math.random() < 0.2) gems.push(new Gem(e.x, e.y, 8)); enemies.splice(i,1); player.xp += 10; } } } }
		if(player.ringOfFire) player.ringOfFire.hitEnemies.clear();
	}

	// Projectiles - update position, check collisions each frame
        for(let i = projectiles.length - 1; i >= 0; i--){
                const p = projectiles[i];
                p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;

                // Handle rockets: explode on impact or on expiry
                if(p.type === 'rocket'){
                        // direct hit check
                        let exploded = false;
                        for(let j = enemies.length - 1; j >= 0; j--){
                                const e = enemies[j];
                                const d = Math.hypot(p.x - e.x, p.y - e.y);
                                if(d < p.radius + e.radius){
                                        exploded = true; break;
                                }
                        }

                        if(exploded || p.life <= 0){
                                // apply AoE damage
                                for(let j = enemies.length - 1; j >= 0; j--){
                                        const e = enemies[j];
                                        const d = Math.hypot(p.x - e.x, p.y - e.y);
                                        if(d < p.explosion){
                                                e.hp -= p.damage;
                                                if(e.hp <= 0){
                                                        score += 10 * player.multiplier;
                                                        spawnParticles(e.x, e.y, '#ffd', 18, 160);
                                                        explodeSound();
                                                        const r = Math.random();
                                                        if(r < 0.03) powerups.push(new PowerUp(e.x, e.y, 'speedboost'));
                                                        else if(r < 0.06) powerups.push(new PowerUp(e.x, e.y, 'ringoffire'));
                                                        else if(r < 0.18) powerups.push(new PowerUp(e.x, e.y, Math.random() < 0.5 ? 'minigun' : 'rocket'));
                                                        if(Math.random() < 0.2) gems.push(new Gem(e.x, e.y, 8));
                                                        enemies.splice(j,1);
                                                        player.xp += 10;
                                                }
                                        }
                                }
                                spawnParticles(p.x, p.y, '#ff6b35', 32, 250);
                                spawnParticles(p.x, p.y, '#ffb703', 20, 200);
                                spawnParticles(p.x, p.y, '#fb5607', 16, 180);
                                explodeSound();
                                projectiles.splice(i,1);
                                continue;
                        }
                } else {
                        // non-rocket projectiles: check collision per frame
                        let hit = false;
                        for(let j = enemies.length - 1; j >= 0; j--){
                                const e = enemies[j];
                                const d = Math.hypot(p.x - e.x, p.y - e.y);
                                if(d < p.radius + e.radius){
                                        hit = true;
                                        e.hp -= p.damage;
                                        if(e.hp <= 0){
                                                score += 10 * player.multiplier;
                                                spawnParticles(e.x, e.y, '#ffd', 18, 160);
                                                explodeSound();
                                                const r = Math.random();
                                                if(r < 0.03) powerups.push(new PowerUp(e.x, e.y, 'speedboost'));
                                                else if(r < 0.06) powerups.push(new PowerUp(e.x, e.y, 'ringoffire'));
                                                else if(r < 0.18) powerups.push(new PowerUp(e.x, e.y, Math.random() < 0.5 ? 'minigun' : 'rocket'));
                                                if(Math.random() < 0.2) gems.push(new Gem(e.x, e.y, 8));
                                                enemies.splice(j,1);
                                                player.xp += 10;
                                        }
                                        break;
                                }
                        }
                        if(hit){ projectiles.splice(i,1); continue; }
                        // if it simply expired in flight, remove it
                        if(p.life <= 0){ projectiles.splice(i,1); continue; }
                }
        }// Powerups pickup
        for(let i = powerups.length - 1; i >= 0; i--){
          const u = powerups[i];
          u.life -= dt; if(u.life <= 0){ powerups.splice(i,1); continue; }
          if(Math.hypot(u.x - player.x, u.y - player.y) < u.radius + player.radius){
            if(u.type === 'speedboost'){
              player.speed = player.baseSpeed * 1.5;
              player.speedBoostTimer = 6; // seconds
              beep(1100, 0.15, 'sine');
            } else if(u.type === 'minigun'){
              player.weapon = 'minigun'; player.weapons.minigun = true; beep(900, 0.12, 'triangle');
            } else if(u.type === 'rocket'){
              player.weapon = 'rocket'; player.weapons.rocket = true; beep(900, 0.12, 'triangle');
            } else if(u.type === 'ringoffire'){
              player.ringOfFire = new RingOfFire(); player.weapons.ringoffire = true; beep(600, 0.3, 'sine', 0.004);
            }
            powerups.splice(i,1);
          }
        }// Gems pickup
	for(let i = gems.length - 1; i >= 0; i--){ const g = gems[i]; g.life -= dt; if(g.life <= 0){ gems.splice(i,1); continue; } if(Math.hypot(g.x - player.x, g.y - player.y) < g.radius + player.radius){ player.xp += g.amount; gems.splice(i,1); beep(1400, 0.05, 'sine'); } }

	// Particles update
	for(let i = particles.length - 1; i >= 0; i--){ const p = particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if(p.life <= 0) particles.splice(i,1); }

	// Level up
	if(player.xp >= player.xpToLevel){ player.xp -= player.xpToLevel; player.level++; player.xpToLevel = Math.round(player.xpToLevel * 1.5); player.damage += 0.5; player.maxHealth += 2; player.health = Math.min(player.maxHealth, player.health + 2); }

  // Rewards
        if(score >= nextRewardAt && !rewardTriggered){ rewardTriggered = true; paused = true; rewardModal.style.display = 'flex'; }       

        if(scoreEl) scoreEl.textContent = 'Score: ' + score;
        if(healthEl) healthEl.textContent = 'Health: ' + player.health + '/' + player.maxHealth;
        if(xpEl) xpEl.textContent = 'XP: ' + player.xp + '/' + player.xpToLevel;
        
        gameTime += dt;
        const timerEl = document.getElementById('timer');
        if(timerEl) timerEl.textContent = 'Time: ' + Math.floor(gameTime) + 's';
        
        // Sync window state for consistency
        window.score = score;
        window.player = player;
        window.enemies = enemies;
        window.projectiles = projectiles;
        window.powerups = powerups;
        window.particles = particles;
        window.gems = gems;
}function draw(){ ctx.fillStyle = '#04121a'; ctx.fillRect(0,0,W,H);
	gems.forEach(g => { ctx.fillStyle = '#8fffa0'; ctx.beginPath(); ctx.arc(g.x, g.y, g.radius, 0, Math.PI*2); ctx.fill(); });
	enemies.forEach(e => drawLegoZombie(ctx, e));
	projectiles.forEach(p => { ctx.fillStyle = p.type === 'rocket' ? '#ff9e4a' : '#fff7b2'; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2); ctx.fill(); if(p.type === 'rocket'){ ctx.strokeStyle = 'rgba(255,160,64,0.12)'; ctx.beginPath(); ctx.arc(p.x, p.y, p.explosion, 0, Math.PI*2); ctx.stroke(); } });
	powerups.forEach(u => { ctx.fillStyle = u.color; ctx.fillRect(u.x - u.radius, u.y - u.radius, u.radius*2, u.radius*2); ctx.fillStyle = '#000'; ctx.fillRect(u.x - u.radius + 3, u.y - u.radius + 3, 6, 6); });
	particles.forEach(p => { ctx.fillStyle = p.col; ctx.globalAlpha = Math.max(0, p.life); ctx.fillRect(p.x, p.y, 2, 2); ctx.globalAlpha = 1; });
	drawRingOfFire(ctx, player);
	drawSoldier(ctx, player);
	if(powerupsEl){ powerupsEl.innerHTML = ''; if(player.weapons.minigun){ const b = document.createElement('div'); b.className = 'badge'; b.textContent = 'Minigun'; powerupsEl.appendChild(b); } if(player.weapons.rocket){ const b = document.createElement('div'); b.className = 'badge'; b.textContent = 'Rocket'; powerupsEl.appendChild(b); } if(player.ringOfFire && player.ringOfFire.isActive()){ const b = document.createElement('div'); b.className = 'badge'; b.style.background = '#ff3333'; b.textContent = 'Ring of Fire: ' + Math.ceil(player.ringOfFire.lifetime) + 's'; powerupsEl.appendChild(b); } }
	if(paused){ ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0,0,W,H); ctx.fillStyle = '#fff'; ctx.font = '36px Inter, Arial'; ctx.textAlign = 'center'; ctx.fillText('PAUSED', W/2, H/2); }
}

renderLeaderboard(leaderboardList); renderLeaderboard(leaderboardModalList);

// expose for tests
window.player = player;
window.running = running;
window.score = score;
window.enemies = enemies;
window.projectiles = projectiles;
window.powerups = powerups;
window.particles = particles;
window.gems = gems;
window.input = input;
window.resetGame = resetGame;
window.startWave = startWave;
window.update = update;
window.draw = draw;
window.getHighScores = getHighScores;
window.saveHighScore = saveHighScore;
window.renderLeaderboard = renderLeaderboard;
window.Gem = Gem;
window.Projectile = Projectile;
window.Enemy = Enemy;
window.PowerUp = PowerUp;
window.RingOfFire = RingOfFire;
window.beep = beep;
window.explodeSound = explodeSound;
window.spawnParticles = spawnParticles;
window.diffMod = diffMod;
window.wave = wave;










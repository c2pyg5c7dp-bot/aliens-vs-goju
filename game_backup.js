// Vampire Survivors — Lite v3 (clean rewrite: complete working implementation)
(function(){
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  let W = canvas.width = window.innerWidth;
  let H = canvas.height = window.innerHeight;
  window.addEventListener('resize', ()=>{ W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; });

  // HUD elements
  const scoreEl = document.getElementById('score');
  const healthEl = document.getElementById('health');
  const powerupsEl = document.getElementById('powerups');
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const leaderboardBtn = document.getElementById('leaderboardBtn');
  const restartBtn = document.getElementById('restartBtn');

  // Input
  const input = {up:false,down:false,left:false,right:false,mouseX:W/2,mouseY:H/2};
  window.addEventListener('keydown', e=>{ if(e.key==='w'||e.key==='ArrowUp')input.up=true; if(e.key==='s'||e.key==='ArrowDown')input.down=true; if(e.key==='a'||e.key==='ArrowLeft')input.left=true; if(e.key==='d'||e.key==='ArrowRight')input.right=true });
  window.addEventListener('keyup', e=>{ if(e.key==='w'||e.key==='ArrowUp')input.up=false; if(e.key==='s'||e.key==='ArrowDown')input.down=false; if(e.key==='a'||e.key==='ArrowLeft')input.left=false; if(e.key==='d'||e.key==='ArrowRight')input.right=false });
  canvas.addEventListener('mousemove', e=>{ const r=canvas.getBoundingClientRect(); input.mouseX = e.clientX - r.left; input.mouseY = e.clientY - r.top });

  // Audio
  let audioCtx = null;
  function ensureAudio(){ if(!audioCtx){ try{ audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){ audioCtx = null }} }
  function makeBeep(freq, time=0.08, type='sine', volume=0.002){ try{ ensureAudio(); if(!audioCtx) return; const o = audioCtx.createOscillator(); const g = audioCtx.createGain(); o.type = type; o.frequency.setValueAtTime(freq, audioCtx.currentTime); g.gain.setValueAtTime(volume, audioCtx.currentTime); o.connect(g); g.connect(audioCtx.destination); o.start(); g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + time); o.stop(audioCtx.currentTime + time + 0.02);}catch(e){} }
  function playShoot(){ makeBeep(1000, 0.07, 'square', 0.0016); }
  function playMinigun(){ makeBeep(1200, 0.04, 'square', 0.0018); }
  function playRocketFire(){ makeBeep(320, 0.18, 'sine', 0.0024); }
  function playPickup(){ makeBeep(900, 0.14, 'triangle', 0.0022); }
  function playExplosion(){ try{ ensureAudio(); if(!audioCtx) return; const bufferSize = audioCtx.sampleRate * 0.22; const buf = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate); const data = buf.getChannelData(0); for(let i=0;i<bufferSize;i++){ data[i] = (Math.random()*2-1) * Math.pow(1 - i/bufferSize, 2); } const src = audioCtx.createBufferSource(); src.buffer = buf; const g = audioCtx.createGain(); g.gain.setValueAtTime(0.6, audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime+0.25); src.connect(g); g.connect(audioCtx.destination); src.start(); }catch(e){} }

  // Entities
  class Player{ constructor(){ this.x=W/2; this.y=H/2; this.speed=260; this.radius=14; this.health=10; this.weapon='standard'; this.weaponTimer=0; this.weaponFireTimer=0; this.minigunCooldown=0.035; this.rocketCooldown=0.45; this.weaponStandardCooldown=0.15; this.multiplier=1; this.multTimer=0; this.damageBonus=0; } update(dt){ let dx=0,dy=0; if(input.up)dy-=1; if(input.down)dy+=1; if(input.left)dx-=1; if(input.right)dx+=1; if(dx||dy){ const len=Math.hypot(dx,dy)||1; dx/=len; dy/=len; this.x += dx*this.speed*dt; this.y += dy*this.speed*dt } this.x = Math.max(this.radius, Math.min(W-this.radius, this.x)); this.y = Math.max(this.radius, Math.min(H-this.radius, this.y)); if(this.weaponTimer>0) this.weaponTimer = Math.max(0, this.weaponTimer - dt); else if(this.weapon !== 'standard'){ this.weapon = 'standard'; } if(this.multTimer>0) this.multTimer = Math.max(0, this.multTimer - dt); else this.multiplier = 1 } draw(){ ctx.fillStyle='#b7e4ff'; ctx.beginPath(); ctx.arc(this.x,this.y,this.radius,0,Math.PI*2); ctx.fill(); const ang = Math.atan2(input.mouseY - this.y, input.mouseX - this.x); ctx.strokeStyle='rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(this.x,this.y); ctx.lineTo(this.x + Math.cos(ang)*30, this.y + Math.sin(ang)*30); ctx.stroke(); ctx.lineWidth = 1 } }

  class Projectile{ constructor(x,y,dx,dy,opts={owner:'player',speed:800,radius:4,type:'bullet',damage:1,life:2,explosionRadius:0}){ this.x=x; this.y=y; this.vx=dx; this.vy=dy; this.speed=opts.speed; this.radius=opts.radius; this.owner=opts.owner; this.type=opts.type; this.damage=opts.damage; this.life=opts.life; this.explosionRadius=opts.explosionRadius } update(dt){ this.x += this.vx*this.speed*dt; this.y += this.vy*this.speed*dt; this.life -= dt } draw(){ if(this.type==='rocket'){ ctx.fillStyle='#ffb4a2'; ctx.beginPath(); ctx.arc(this.x,this.y,this.radius,0,Math.PI*2); ctx.fill(); ctx.fillStyle='rgba(255,180,160,0.25)'; ctx.beginPath(); ctx.arc(this.x,this.y,this.explosionRadius*0.25,0,Math.PI*2); ctx.fill(); } else { ctx.fillStyle='#ffd166'; ctx.beginPath(); ctx.arc(this.x,this.y,this.radius,0,Math.PI*2); ctx.fill(); } } }

  class Enemy{ constructor(x,y,hp=1,speed=80){ this.x=x; this.y=y; this.hp=hp; this.maxHp=hp; this.radius = 8 + hp*6; this.speed=Math.max(20, speed*(1 - (hp-1)*0.06)); } update(dt,player){ const ang = Math.atan2(player.y - this.y, player.x - this.x); this.x += Math.cos(ang)*this.speed*dt; this.y += Math.sin(ang)*this.speed*dt } draw(){ if(this.maxHp<=2) ctx.fillStyle='#ff6b6b'; else if(this.maxHp<=6) ctx.fillStyle='#ff9f1c'; else ctx.fillStyle='#9b5de5'; ctx.beginPath(); ctx.arc(this.x,this.y,this.radius,0,Math.PI*2); ctx.fill(); const barW = this.radius*1.6, barH=4; const ratio = Math.max(0, this.hp/this.maxHp); ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(this.x-barW/2, this.y-this.radius-10, barW, barH); ctx.fillStyle='#4ade80'; ctx.fillRect(this.x-barW/2, this.y-this.radius-10, barW*ratio, barH); } }

  class PowerUp{ constructor(x,y,type){ this.x=x; this.y=y; this.type=type; this.radius=12; this.life=18 } update(dt){ this.life -= dt } draw(){ if(this.type==='minigun') ctx.fillStyle='#7ee787'; else if(this.type==='rocket') ctx.fillStyle='#ff7b7b'; else if(this.type==='mult') ctx.fillStyle='#7bdff6'; else ctx.fillStyle='white'; ctx.beginPath(); ctx.rect(this.x-this.radius,this.y-this.radius,this.radius*2,this.radius*2); ctx.fill(); ctx.fillStyle='rgba(0,0,0,0.16)'; ctx.fillRect(this.x-this.radius+2,this.y-this.radius+2,this.radius*2-4,this.radius*2-4); ctx.fillStyle='white'; ctx.font='12px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(this.type==='minigun'?'MG':this.type==='rocket'?'RK':this.type==='mult'?'x2':'?',this.x,this.y); } }

  // Particles
  let particles = [];
  function spawnParticles(x,y,color,count=18,power=120){ for(let i=0;i<count;i++){ const ang = Math.random()*Math.PI*2; const speed = Math.random()*power; particles.push({ x, y, vx:Math.cos(ang)*speed, vy:Math.sin(ang)*speed, life:0.5 + Math.random()*0.8, size:2 + Math.random()*3, color }); } }

  // Game state
  let player, projectiles, enemies, powerups, spawnTimer, spawnInterval, puSpawnTimer, score, running, paused, lastTime;
  let nextRewardScore = 75;
  let lastUncommittedScore = null;

  function updateHUD(){ if(scoreEl) scoreEl.textContent = `Score: ${score}`; if(healthEl) healthEl.textContent = `Health: ${player?player.health:0}`; renderPowerupHUD(); }
  function renderPowerupHUD(){ if(!powerupsEl || !player) return; powerupsEl.innerHTML = ''; const nodes = []; if(player.weapon !== 'standard'){ const div = document.createElement('span'); div.className='powerup-badge'; const ico = document.createElement('span'); ico.className='powerup-icon'; ico.style.background = (player.weapon==='minigun'?'#7ee787':'#ff7b7b'); const txt = document.createElement('span'); txt.className='powerup-name'; txt.textContent = player.weapon==='minigun'?'Minigun':'Rocket'; const t = document.createElement('span'); t.className='powerup-timer'; t.textContent = ` ${Math.ceil(player.weaponTimer)}s`; div.appendChild(ico); div.appendChild(txt); div.appendChild(t); nodes.push(div); } if(player.multiplier && player.multiplier>1){ const div = document.createElement('span'); div.className='powerup-badge'; const ico = document.createElement('span'); ico.className='powerup-icon'; ico.style.background = '#7bdff6'; const txt = document.createElement('span'); txt.className='powerup-name'; txt.textContent = `x${player.multiplier}`; const t = document.createElement('span'); t.className='powerup-timer'; t.textContent = ` ${Math.ceil(player.multTimer)}s`; div.appendChild(ico); div.appendChild(txt); div.appendChild(t); nodes.push(div); } nodes.forEach(n=>powerupsEl.appendChild(n)); }

  function reset(){ player = new Player(); projectiles = []; enemies = []; powerups = []; spawnTimer = 0; spawnInterval = 0.9; puSpawnTimer = 10 + Math.random()*6; score = 0; running = false; paused = false; lastTime = performance.now(); particles = []; lastUncommittedScore = null; nextRewardScore = 75; updateHUD(); if(pauseBtn) pauseBtn.style.display='none'; if(restartBtn) restartBtn.style.display='none'; if(startBtn) startBtn.style.display='inline-block'; }

  function start(){ ensureAudio(); if(!player) reset(); try{ hideLeaderboard(); }catch(e){} running = true; paused = false; lastTime = performance.now(); if(startBtn) startBtn.style.display='none'; if(pauseBtn) pauseBtn.style.display='inline-block'; if(restartBtn) restartBtn.style.display='none'; requestAnimationFrame(loop); }
  function gameOver(){ running = false; paused = false; if(restartBtn) restartBtn.style.display='inline-block'; if(pauseBtn) pauseBtn.style.display='none'; if(startBtn) startBtn.style.display='none'; }

  if(startBtn) startBtn.addEventListener('click', ()=>start()); if(restartBtn) restartBtn.addEventListener('click', ()=>start()); if(pauseBtn) pauseBtn.addEventListener('click', ()=>{ if(!running) return; paused = !paused; pauseBtn.textContent = paused ? 'Resume' : 'Pause'; });

  function spawnEnemy(){ const side = Math.floor(Math.random()*4); let x,y; if(side===0){ x=-40; y=Math.random()*H } else if(side===1){ x=W+40; y=Math.random()*H } else if(side===2){ x=Math.random()*W; y=-40 } else { x=Math.random()*W; y=H+40 } const r=Math.random(); let hp; if(r<0.6) hp=1; else if(r<0.9) hp=3; else if(r<0.99) hp=6; else hp=12; const spd = 40 + Math.random()*80 + Math.min(120, Math.floor(score/10)*5); enemies.push(new Enemy(x,y,hp,spd)); }
  function spawnPowerup(){ const side = Math.floor(Math.random()*4); let x,y; if(side===0){ x=20; y=Math.random()*(H-40)+20 } else if(side===1){ x=W-20; y=Math.random()*(H-40)+20 } else if(side===2){ x=Math.random()*(W-40)+20; y=20 } else { x=Math.random()*(W-40)+20; y=H-20 } const r=Math.random(); let type; if(r<0.45) type='minigun'; else if(r<0.9) type='rocket'; else type='mult'; powerups.push(new PowerUp(x,y,type)); }

  function applyPowerup(pu){ if(!pu) return; playPickup(); spawnParticles(player.x, player.y, '#fff', 12, 80); if(pu.type==='minigun'){ player.weapon='minigun'; player.weaponTimer = 8; player.weaponFireTimer = 0; } else if(pu.type==='rocket'){ player.weapon='rocket'; player.weaponTimer = 10; player.weaponFireTimer = 0; } else if(pu.type==='mult'){ player.multiplier = 2; player.multTimer = 10; } }

  function spawnRandoms(dt){ spawnTimer += dt; if(spawnTimer >= spawnInterval){ spawnTimer = 0; spawnEnemy(); spawnInterval = Math.max(0.25, spawnInterval - 0.004); } puSpawnTimer -= dt; if(puSpawnTimer <= 0){ puSpawnTimer = 10 + Math.random()*8; spawnPowerup(); } }

  function handleCollisions(){ // projectiles -> enemies
    for(let i=enemies.length-1;i>=0;i--){ const e = enemies[i]; for(let j=projectiles.length-1;j>=0;j--){ const p = projectiles[j]; const dx = e.x - p.x, dy = e.y - p.y; const dist = Math.hypot(dx,dy); if(dist < e.radius + p.radius){ if(p.type === 'rocket'){ const ex = p.x, ey = p.y, rad = p.explosionRadius || 60; playExplosion(); spawnParticles(ex, ey, '#ffb4a2', 36, 220); for(let k=enemies.length-1;k>=0;k--){ const ee = enemies[k]; const d2 = Math.hypot(ee.x - ex, ee.y - ey); if(d2 < rad + ee.radius){ ee.hp -= Math.max(1, Math.round(p.damage || 4)); if(ee.hp <= 0){ score += ee.maxHp * (player.multiplier||1); enemies.splice(k,1); } } } projectiles.splice(j,1); } else { projectiles.splice(j,1); e.hp -= p.damage || 1; if(e.hp <= 0){ score += e.maxHp * (player.multiplier||1); enemies.splice(i,1); } } updateHUD(); break; } } }
    // enemies -> player (damage scales with enemy hp)
    for(let i=enemies.length-1;i>=0;i--){ const e=enemies[i]; const d=Math.hypot(e.x - player.x, e.y - player.y); if(d < e.radius + player.radius){ const damage = Math.max(1, Math.round(e.maxHp / 2)); spawnParticles(player.x, player.y, '#ff9b9b', 18, 160); playExplosion(); enemies.splice(i,1); player.health -= damage; updateHUD(); if(player.health<=0){ gameOver(); lastUncommittedScore = score || 0; if(recentScoreDisplayRef) recentScoreDisplayRef.textContent = String(lastUncommittedScore||0); if(nameInputRef) nameInputRef.value = 'Player'; if(recentScoreBoxRef) recentScoreBoxRef.style.display='block'; renderLeaderboard(); showLeaderboard(); return; } } }
    // player -> powerups
    for(let i=powerups.length-1;i>=0;i--){ const pu = powerups[i]; const d = Math.hypot(pu.x - player.x, pu.y - player.y); if(d < pu.radius + player.radius){ applyPowerup(pu); powerups.splice(i,1); updateHUD(); } }
  }

  function checkRewardThreshold(){ if(score >= nextRewardScore && running && !paused){ paused = true; if(rewardModal) { rewardModal.style.display = 'flex'; } } }

  function loop(ts){ if(!running) return; const dt = Math.min(0.05, (ts - (lastTime||ts))/1000); lastTime = ts; if(!paused){ player.update(dt); // fire
      if(player.weapon === 'standard'){ player.weaponFireTimer -= dt; if(player.weaponFireTimer <= 0){ player.weaponFireTimer = player.weaponStandardCooldown; const ang = Math.atan2(input.mouseY - player.y, input.mouseX - player.x); for(let i=-1;i<=1;i++){ const a = ang + i*0.12; const damage = 1 + (player.damageBonus||0); projectiles.push(new Projectile(player.x + Math.cos(a)*18, player.y + Math.sin(a)*18, Math.cos(a), Math.sin(a), {type:'bullet', speed:800, radius:4, damage:damage, life:2})); } playShoot(); } }
      else if(player.weapon === 'minigun'){ player.weaponFireTimer -= dt; if(player.weaponFireTimer <= 0){ player.weaponFireTimer = player.minigunCooldown; const ang = Math.atan2(input.mouseY - player.y, input.mouseX - player.x); const spread = (Math.random()-0.5)*0.06; const a = ang + spread; const damage = 1 + (player.damageBonus||0); projectiles.push(new Projectile(player.x + Math.cos(a)*18, player.y + Math.sin(a)*18, Math.cos(a), Math.sin(a), {type:'bullet', speed:1100, radius:3, damage:damage, life:1.4})); playMinigun(); } }
      else if(player.weapon === 'rocket'){ player.weaponFireTimer -= dt; if(player.weaponFireTimer <= 0){ player.weaponFireTimer = player.rocketCooldown; const ang = Math.atan2(input.mouseY - player.y, input.mouseX - player.x); const damage = 4 + (player.damageBonus||0); projectiles.push(new Projectile(player.x + Math.cos(ang)*18, player.y + Math.sin(ang)*18, Math.cos(ang), Math.sin(ang), {type:'rocket', speed:520, radius:6, damage:damage, life:3, explosionRadius:60})); playRocketFire(); } }
      for(const p of projectiles) p.update(dt);
      projectiles = projectiles.filter(p=>p.life>0 && p.x>-400 && p.x < W+400 && p.y>-400 && p.y < H+400);
      enemies.forEach(e=>e.update(dt, player));
      powerups.forEach(pu=>pu.update(dt)); powerups = powerups.filter(pu=>pu.life>0);
      handleCollisions();
      for(let i=particles.length-1;i>=0;i--){ const pa = particles[i]; pa.x += pa.vx*dt; pa.y += pa.vy*dt; pa.vx *= 0.98; pa.vy *= 0.98; pa.life -= dt; if(pa.life <= 0) particles.splice(i,1); }
      spawnRandoms(dt);
      checkRewardThreshold();
    }
    ctx.clearRect(0,0,W,H); ctx.fillStyle='#0b0b10'; ctx.fillRect(0,0,W,H);
    player.draw(); projectiles.forEach(p=>p.draw()); enemies.forEach(e=>e.draw()); powerups.forEach(pu=>pu.draw());
    for(const pa of particles){ ctx.globalAlpha = Math.max(0, pa.life/1.2); ctx.fillStyle = pa.color; ctx.beginPath(); ctx.arc(pa.x, pa.y, pa.size, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1; }
    if(paused){ ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.fillRect(0,0,W,H); ctx.fillStyle='white'; ctx.font='48px sans-serif'; ctx.textAlign='center'; ctx.fillText('PAUSED', W/2, H/2); }
    updateHUD(); requestAnimationFrame(loop);
  }

  // Leaderboard functions
  function getHighScores(){ try{ const raw = localStorage.getItem('vs_lite_highscores'); if(!raw) return []; const parsed = JSON.parse(raw); if(!Array.isArray(parsed)) return []; return parsed; }catch(e){ return []; } }
  function saveHighScore(name, scoreVal){ const list = getHighScores(); list.push({ name: name||'Player', score: Number(scoreVal)||0, when: Date.now() }); list.sort((a,b)=>b.score - a.score || a.when - b.when); const top = list.slice(0,10); localStorage.setItem('vs_lite_highscores', JSON.stringify(top)); }
  function renderLeaderboard(){ const leaderboardList = document.getElementById('leaderboardList'); if(!leaderboardList) return; const list = getHighScores(); leaderboardList.innerHTML = ''; if(list.length === 0){ const li = document.createElement('li'); li.textContent = 'No scores yet'; leaderboardList.appendChild(li); return; } list.forEach((s,i)=>{ const li = document.createElement('li'); li.textContent = `${i+1}. ${s.name} — ${s.score}`; if(lastUncommittedScore !== null && s.score === lastUncommittedScore && i < 10){ li.className = 'recent-entry'; } leaderboardList.appendChild(li); }); }
  function showLeaderboard(){ const leaderboardModal = document.getElementById('leaderboardModal'); if(leaderboardModal){ renderLeaderboard(); leaderboardModal.style.display = 'flex'; } }
  function hideLeaderboard(){ const leaderboardModal = document.getElementById('leaderboardModal'); if(leaderboardModal) leaderboardModal.style.display = 'none'; }

  const leaderboardBtnRef = document.getElementById('leaderboardBtn');
  const closeLeaderboardBtnRef = document.getElementById('closeLeaderboardBtn');
  const closeLeaderboardBtn2Ref = document.getElementById('closeLeaderboardBtn2');
  const clearScoresBtnRef = document.getElementById('clearScoresBtn');
  const nameInputRef = document.getElementById('nameInput');
  const saveScoreBtnRef = document.getElementById('saveScoreBtn');
  const recentScoreBoxRef = document.getElementById('recentScoreBox');
  const recentScoreDisplayRef = document.getElementById('recentScoreDisplay');

  if(leaderboardBtnRef) leaderboardBtnRef.addEventListener('click', ()=>{ renderLeaderboard(); showLeaderboard(); });
  if(closeLeaderboardBtnRef) closeLeaderboardBtnRef.addEventListener('click', hideLeaderboard);
  if(closeLeaderboardBtn2Ref) closeLeaderboardBtn2Ref.addEventListener('click', hideLeaderboard);
  if(clearScoresBtnRef) clearScoresBtnRef.addEventListener('click', ()=>{ localStorage.removeItem('vs_lite_highscores'); renderLeaderboard(); });
  if(saveScoreBtnRef) saveScoreBtnRef.addEventListener('click', ()=>{ try{ const name = (nameInputRef && nameInputRef.value.trim()) || 'Player'; saveHighScore(name, lastUncommittedScore||0); lastUncommittedScore = null; renderLeaderboard(); if(recentScoreBoxRef) recentScoreBoxRef.style.display='none'; }catch(e){} });

  // Rewards
  function grantReward(choice){ if(!player) return; if(choice === 'health'){ player.health += 3; spawnParticles(player.x, player.y, '#7ee787', 12, 80); } else if(choice === 'damage'){ player.damageBonus = (player.damageBonus||0) + 0.5; spawnParticles(player.x, player.y, '#ffd166', 12, 100); } else if(choice === 'rate'){ player.weaponStandardCooldown = Math.max(0.03, player.weaponStandardCooldown * 0.88); player.minigunCooldown = Math.max(0.012, player.minigunCooldown * 0.92); spawnParticles(player.x, player.y, '#7bdff6', 12, 100); } nextRewardScore += 75; hideRewardModal(); paused = false; updateHUD(); }
  function hideRewardModal(){ const rewardModal = document.getElementById('rewardModal'); if(rewardModal) rewardModal.style.display = 'none'; }

  // create reward modal if not in DOM
  if(!document.getElementById('rewardModal')){ const container = document.createElement('div'); container.id = 'rewardModal'; container.className = 'modal'; container.style.display = 'none'; container.style.position = 'fixed'; container.style.left = '0'; container.style.top = '0'; container.style.width = '100%'; container.style.height = '100%'; container.style.zIndex = '50'; container.style.alignItems = 'center'; container.style.justifyContent = 'center'; container.innerHTML = '<div class="modal-content" style="background:linear-gradient(180deg,#0f1724,#0b1220);padding:18px;border-radius:10px;color:white;min-width:320px;text-align:center"><h3>Choose a Reward</h3><p style="text-align:center;margin:6px 0 12px 0">You reached a score milestone — pick one permanent upgrade:</p><div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap"><button id="rewardHealth" style="background:#ff6b6b;border:none;color:white;padding:8px 12px;border-radius:8px;cursor:pointer">❤️ Health Up (+3)</button><button id="rewardDamage" style="background:#ff6b6b;border:none;color:white;padding:8px 12px;border-radius:8px;cursor:pointer">💥 Damage Up (+0.5)</button><button id="rewardRate" style="background:#ff6b6b;border:none;color:white;padding:8px 12px;border-radius:8px;cursor:pointer">⚡ Fire Rate Up</button></div><div style="text-align:center;margin-top:12px"><button id="closeRewardBtn" style="background:#ff6b6b;border:none;color:white;padding:8px 12px;border-radius:8px;cursor:pointer">Close</button></div></div>'; document.body.appendChild(container); }

  const rewardHealth = document.getElementById('rewardHealth');
  const rewardDamage = document.getElementById('rewardDamage');
  const rewardRate = document.getElementById('rewardRate');
  const closeRewardBtn = document.getElementById('closeRewardBtn');
  const rewardModal = document.getElementById('rewardModal');

  if(rewardHealth) rewardHealth.addEventListener('click', ()=>{ grantReward('health'); });
  if(rewardDamage) rewardDamage.addEventListener('click', ()=>{ grantReward('damage'); });
  if(rewardRate) rewardRate.addEventListener('click', ()=>{ grantReward('rate'); });
  if(closeRewardBtn) closeRewardBtn.addEventListener('click', ()=>{ hideRewardModal(); paused=false; });

  reset();
  try{ showLeaderboard(); console.log('Leaderboard shown on init'); }catch(e){ console.error('Failed to show leaderboard', e); }

  window.__vs_lite = { start, reset, showLeaderboard, getHighScores };

})();
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  let W = canvas.width = window.innerWidth;
  let H = canvas.height = window.innerHeight;

  window.addEventListener('resize', ()=>{ W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; });

  // HUD elements
  const scoreEl = document.getElementById('score');
  const healthEl = document.getElementById('health');
  const powerupsEl = document.getElementById('powerups');
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const leaderboardBtn = document.getElementById('leaderboardBtn');
  const restartBtn = document.getElementById('restartBtn');

  // modal elements for leaderboard & inline save
  let leaderboardModal = document.getElementById('leaderboardModal');
  let leaderboardList = document.getElementById('leaderboardList');
  let clearScoresBtn = document.getElementById('clearScoresBtn');
  let closeLeaderboardBtn = document.getElementById('closeLeaderboardBtn');
  let closeLeaderboardBtn2 = document.getElementById('closeLeaderboardBtn2');
  let recentScoreBox = document.getElementById('recentScoreBox');
  let recentScoreDisplay = document.getElementById('recentScoreDisplay');
  let nameInput = document.getElementById('nameInput');
  let saveScoreBtn = document.getElementById('saveScoreBtn');

  // Create minimal fallback elements if any expected DOM nodes are missing (prevents null errors)
  const _makeDummy = (id, tag='div') => { const el = document.createElement(tag); el.id = id; el.style.display = 'none'; document.body.appendChild(el); console.debug('Created dummy element for', id); return el; };
  if(!leaderboardModal) leaderboardModal = _makeDummy('leaderboardModal');
  if(!leaderboardList) leaderboardList = _makeDummy('leaderboardList','ol');
  if(!clearScoresBtn) clearScoresBtn = _makeDummy('clearScoresBtn','button');
  if(!closeLeaderboardBtn) closeLeaderboardBtn = _makeDummy('closeLeaderboardBtn','button');
  if(!closeLeaderboardBtn2) closeLeaderboardBtn2 = _makeDummy('closeLeaderboardBtn2','button');
  if(!recentScoreBox) recentScoreBox = _makeDummy('recentScoreBox','div');
  if(!recentScoreDisplay) recentScoreDisplay = _makeDummy('recentScoreDisplay','span');
  if(!nameInput) nameInput = _makeDummy('nameInput','input');
  if(!saveScoreBtn) saveScoreBtn = _makeDummy('saveScoreBtn','button');
  // reward modal elements (create if missing)
  let rewardModal = document.getElementById('rewardModal');
  let rewardHealth = document.getElementById('rewardHealth');
  let rewardDamage = document.getElementById('rewardDamage');
  let rewardRate = document.getElementById('rewardRate');
  let closeRewardBtn = document.getElementById('closeRewardBtn');
  // if reward modal doesn't exist, create the full markup
  if(!rewardModal) {
    const container = document.createElement('div');
    container.id = 'rewardModal';
    container.className = 'modal';
    container.style.display = 'none';
    container.innerHTML = '<div class="modal-content"><h3>Choose a Reward</h3><p style="text-align:center;margin:6px 0 12px 0">You reached a score milestone — pick one permanent upgrade:</p><div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap"><button id="rewardHealth">❤️ Health Up (+3)</button><button id="rewardDamage">💥 Damage Up (+0.5)</button><button id="rewardRate">⚡ Fire Rate Up</button></div><div style="text-align:center;margin-top:12px"><button id="closeRewardBtn">Close</button></div></div>';
    document.body.appendChild(container);
    rewardModal = container;
    rewardHealth = document.getElementById('rewardHealth');
    rewardDamage = document.getElementById('rewardDamage');
    rewardRate = document.getElementById('rewardRate');
    closeRewardBtn = document.getElementById('closeRewardBtn');
    console.debug('Created reward modal DOM');
  }
  // final fallback in case individual buttons still missing
  if(!rewardHealth) rewardHealth = _makeDummy('rewardHealth','button');
  if(!rewardDamage) rewardDamage = _makeDummy('rewardDamage','button');
  if(!rewardRate) rewardRate = _makeDummy('rewardRate','button');
  if(!closeRewardBtn) closeRewardBtn = _makeDummy('closeRewardBtn','button');

  function showRewardModal(){ if(rewardModal) rewardModal.style.display = 'flex'; }
  function hideRewardModal(){ if(rewardModal) rewardModal.style.display = 'none'; }

  // reward configuration
  let nextRewardScore = 75;
  function grantReward(choice){ // choice: 'health' | 'damage' | 'rate'
    if(!player) return;
    if(choice === 'health'){ player.health += 3; spawnParticles(player.x, player.y, '#7ee787', 12, 80); }
    else if(choice === 'damage'){ player.damageBonus = (player.damageBonus||0) + 0.5; spawnParticles(player.x, player.y, '#ffd166', 12, 100); }
    else if(choice === 'rate'){ player.weaponStandardCooldown = Math.max(0.03, player.weaponStandardCooldown * 0.88); player.minigunCooldown = Math.max(0.012, player.minigunCooldown * 0.92); spawnParticles(player.x, player.y, '#7bdff6', 12, 100); }
    // advance next milestone
    nextRewardScore += 75;
    hideRewardModal(); paused = false; updateHUD();
  }
  // attach reward handlers
  try{ rewardHealth.addEventListener('click', ()=>{ grantReward('health'); }); rewardDamage.addEventListener('click', ()=>{ grantReward('damage'); }); rewardRate.addEventListener('click', ()=>{ grantReward('rate'); }); if(closeRewardBtn) closeRewardBtn.addEventListener('click', ()=>{ hideRewardModal(); paused=false; }); }catch(e){ console.debug('reward handlers attach failed', e); }

+
+  // check reward threshold and show reward modal
+  function checkRewardThreshold(){ try{ if(score >= nextRewardScore && running && !paused){ // pause and show reward choices
+        paused = true; if(rewardModal) { rewardModal.style.display = 'flex'; console.debug('Reward available at score', score); } }
+    }catch(e){ console.debug('checkRewardThreshold error', e); } }


  // Input
  const input = {up:false,down:false,left:false,right:false,mouseX:W/2,mouseY:H/2};
  window.addEventListener('keydown', e=>{ if(e.key==='w'||e.key==='ArrowUp')input.up=true; if(e.key==='s'||e.key==='ArrowDown')input.down=true; if(e.key==='a'||e.key==='ArrowLeft')input.left=true; if(e.key==='d'||e.key==='ArrowRight')input.right=true });
  window.addEventListener('keyup', e=>{ if(e.key==='w'||e.key==='ArrowUp')input.up=false; if(e.key==='s'||e.key==='ArrowDown')input.down=false; if(e.key==='a'||e.key==='ArrowLeft')input.left=false; if(e.key==='d'||e.key==='ArrowRight')input.right=false });
  canvas.addEventListener('mousemove', e=>{ const r = canvas.getBoundingClientRect(); input.mouseX = e.clientX - r.left; input.mouseY = e.clientY - r.top });

  // Audio context (created on first user gesture)
  let audioCtx = null;
  function ensureAudio(){ if(!audioCtx){ try{ audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){ audioCtx = null }} }
  function makeBeep(freq, time=0.08, type='sine', volume=0.002){ try{ ensureAudio(); if(!audioCtx) return; const o = audioCtx.createOscillator(); const g = audioCtx.createGain(); o.type = type; o.frequency.setValueAtTime(freq, audioCtx.currentTime); g.gain.setValueAtTime(volume, audioCtx.currentTime); o.connect(g); g.connect(audioCtx.destination); o.start(); g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + time); o.stop(audioCtx.currentTime + time + 0.02);}catch(e){} }
  function playShoot(){ makeBeep(1000, 0.07, 'square', 0.0016); }
  function playMinigun(){ makeBeep(1200, 0.04, 'square', 0.0018); }
  function playRocketFire(){ makeBeep(320, 0.18, 'sine', 0.0024); }
  function playPickup(){ makeBeep(900, 0.14, 'triangle', 0.0022); }
  function playExplosion(){ try{ ensureAudio(); if(!audioCtx) return; const bufferSize = audioCtx.sampleRate * 0.22; const buf = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate); const data = buf.getChannelData(0); for(let i=0;i<bufferSize;i++){ data[i] = (Math.random()*2-1) * Math.pow(1 - i/bufferSize, 2); } const src = audioCtx.createBufferSource(); src.buffer = buf; const g = audioCtx.createGain(); g.gain.setValueAtTime(0.6, audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime+0.25); src.connect(g); g.connect(audioCtx.destination); src.start(); }catch(e){} }

  // Entities
  class Player{ constructor(){ this.x=W/2; this.y=H/2; this.speed=260; this.radius=14; this.health=10; this.weapon='standard'; this.weaponTimer=0; this.weaponFireTimer=0; this.minigunCooldown=0.035; this.rocketCooldown=0.45; this.weaponStandardCooldown=0.15; this.multiplier=1; this.multTimer=0; this.damageBonus=0; } update(dt){ let dx=0,dy=0; if(input.up)dy-=1; if(input.down)dy+=1; if(input.left)dx-=1; if(input.right)dx+=1; if(dx||dy){ const len=Math.hypot(dx,dy)||1; dx/=len; dy/=len; this.x += dx*this.speed*dt; this.y += dy*this.speed*dt } this.x = Math.max(this.radius, Math.min(W-this.radius, this.x)); this.y = Math.max(this.radius, Math.min(H-this.radius, this.y)); if(this.weaponTimer>0) this.weaponTimer = Math.max(0, this.weaponTimer - dt); else if(this.weapon !== 'standard'){ this.weapon = 'standard'; } if(this.multTimer>0) this.multTimer = Math.max(0, this.multTimer - dt); else this.multiplier = 1 } draw(){ ctx.fillStyle='#b7e4ff'; ctx.beginPath(); ctx.arc(this.x,this.y,this.radius,0,Math.PI*2); ctx.fill(); const ang = Math.atan2(input.mouseY - this.y, input.mouseX - this.x); ctx.strokeStyle='rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(this.x,this.y); ctx.lineTo(this.x + Math.cos(ang)*30, this.y + Math.sin(ang)*30); ctx.stroke(); ctx.lineWidth = 1 } }

  class Projectile{ constructor(x,y,dx,dy,opts={owner:'player',speed:800,radius:4,type:'bullet',damage:1,life:2,explosionRadius:0}){ this.x=x; this.y=y; this.vx=dx; this.vy=dy; this.speed=opts.speed; this.radius=opts.radius; this.owner=opts.owner; this.type=opts.type; this.damage=opts.damage; this.life=opts.life; this.explosionRadius=opts.explosionRadius } update(dt){ this.x += this.vx*this.speed*dt; this.y += this.vy*this.speed*dt; this.life -= dt } draw(){ if(this.type==='rocket'){ ctx.fillStyle='#ffb4a2'; ctx.beginPath(); ctx.arc(this.x,this.y,this.radius,0,Math.PI*2); ctx.fill(); ctx.fillStyle='rgba(255,180,160,0.25)'; ctx.beginPath(); ctx.arc(this.x,this.y,this.explosionRadius*0.25,0,Math.PI*2); ctx.fill(); } else { ctx.fillStyle='#ffd166'; ctx.beginPath(); ctx.arc(this.x,this.y,this.radius,0,Math.PI*2); ctx.fill(); } } }

  class Enemy{ constructor(x,y,hp=1,speed=80){ this.x=x; this.y=y; this.hp=hp; this.maxHp=hp; this.radius = 8 + hp*6; this.speed=Math.max(20, speed*(1 - (hp-1)*0.06)); } update(dt,player){ const ang = Math.atan2(player.y - this.y, player.x - this.x); this.x += Math.cos(ang)*this.speed*dt; this.y += Math.sin(ang)*this.speed*dt } draw(){ if(this.maxHp<=2) ctx.fillStyle='#ff6b6b'; else if(this.maxHp<=6) ctx.fillStyle='#ff9f1c'; else ctx.fillStyle='#9b5de5'; ctx.beginPath(); ctx.arc(this.x,this.y,this.radius,0,Math.PI*2); ctx.fill(); const barW = this.radius*1.6, barH=4; const ratio = Math.max(0, this.hp/this.maxHp); ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(this.x-barW/2, this.y-this.radius-10, barW, barH); ctx.fillStyle='#4ade80'; ctx.fillRect(this.x-barW/2, this.y-this.radius-10, barW*ratio, barH); } }

  class PowerUp{ constructor(x,y,type){ this.x=x; this.y=y; this.type=type; this.radius=12; this.life=18 } update(dt){ this.life -= dt } draw(){ if(this.type==='minigun') ctx.fillStyle='#7ee787'; else if(this.type==='rocket') ctx.fillStyle='#ff7b7b'; else if(this.type==='mult') ctx.fillStyle='#7bdff6'; else ctx.fillStyle='white'; ctx.beginPath(); ctx.rect(this.x-this.radius,this.y-this.radius,this.radius*2,this.radius*2); ctx.fill(); ctx.fillStyle='rgba(0,0,0,0.16)'; ctx.fillRect(this.x-this.radius+2,this.y-this.radius+2,this.radius*2-4,this.radius*2-4); ctx.fillStyle='white'; ctx.font='12px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(this.type==='minigun'?'MG':this.type==='rocket'?'RK':this.type==='mult'?'x2':'?',this.x,this.y); } }

  // Particles (visual effects)
  let particles = [];
  function spawnParticles(x,y,color,count=18,power=120){ for(let i=0;i<count;i++){ const ang = Math.random()*Math.PI*2; const speed = Math.random()*power; particles.push({ x, y, vx:Math.cos(ang)*speed, vy:Math.sin(ang)*speed, life:0.5 + Math.random()*0.8, size:2 + Math.random()*3, color }); } }

  // Game state
  let player, projectiles, enemies, powerups, spawnTimer, spawnInterval, puSpawnTimer, score, running, paused, lastTime, autofireTimer;
  let lastUncommittedScore = null; // pending score to save in modal

  function updateHUD(){ if(scoreEl) scoreEl.textContent = `Score: ${score}`; if(healthEl) healthEl.textContent = `Health: ${player?player.health:0}`; renderPowerupHUD(); }

  function renderPowerupHUD(){ if(!powerupsEl || !player) return; powerupsEl.innerHTML = ''; const nodes = []; if(player.weapon !== 'standard'){ const div = document.createElement('span'); div.className='powerup-badge'; const ico = document.createElement('span'); ico.className='powerup-icon'; ico.style.background = (player.weapon==='minigun'?'#7ee787':'#ff7b7b'); const txt = document.createElement('span'); txt.className='powerup-name'; txt.textContent = player.weapon==='minigun'?'Minigun':'Rocket'; const t = document.createElement('span'); t.className='powerup-timer'; t.textContent = ` ${Math.ceil(player.weaponTimer)}s`; div.appendChild(ico); div.appendChild(txt); div.appendChild(t); nodes.push(div); } if(player.multiplier && player.multiplier>1){ const div = document.createElement('span'); div.className='powerup-badge'; const ico = document.createElement('span'); ico.className='powerup-icon'; ico.style.background = '#7bdff6'; const txt = document.createElement('span'); txt.className='powerup-name'; txt.textContent = `x${player.multiplier}`; const t = document.createElement('span'); t.className='powerup-timer'; t.textContent = ` ${Math.ceil(player.multTimer)}s`; div.appendChild(ico); div.appendChild(txt); div.appendChild(t); nodes.push(div); } nodes.forEach(n=>powerupsEl.appendChild(n)); }

  function reset(){ player = new Player(); projectiles = []; enemies = []; powerups = []; spawnTimer = 0; spawnInterval = 0.9; puSpawnTimer = 10 + Math.random()*6; score = 0; running = false; paused = false; autofireTimer = 0; lastTime = performance.now(); particles = []; lastUncommittedScore = null; updateHUD(); if(pauseBtn) pauseBtn.style.display='none'; if(restartBtn) restartBtn.style.display='none'; if(startBtn) startBtn.style.display='inline-block'; if(recentScoreBox) recentScoreBox.style.display='none'; }

  function start(){ ensureAudio(); if(!player) reset(); try{ hideLeaderboard(); }catch(e){} running = true; paused = false; lastTime = performance.now(); if(startBtn) startBtn.style.display='none'; if(pauseBtn) pauseBtn.style.display='inline-block'; if(restartBtn) restartBtn.style.display='none'; requestAnimationFrame(loop); }

  function gameOver(){ running = false; paused = false; if(restartBtn) restartBtn.style.display='inline-block'; if(pauseBtn) pauseBtn.style.display='none'; if(startBtn) startBtn.style.display='none'; }

  if(startBtn) startBtn.addEventListener('click', ()=>start()); if(restartBtn) restartBtn.addEventListener('click', ()=>start()); if(pauseBtn) pauseBtn.addEventListener('click', ()=>{ if(!running) return; paused = !paused; pauseBtn.textContent = paused ? 'Resume' : 'Pause'; });

  function spawnEnemy(){ const side = Math.floor(Math.random()*4); let x,y; if(side===0){ x=-40; y=Math.random()*H } else if(side===1){ x=W+40; y=Math.random()*H } else if(side===2){ x=Math.random()*W; y=-40 } else { x=Math.random()*W; y=H+40 } const r=Math.random(); let hp; if(r<0.6) hp=1; else if(r<0.9) hp=3; else if(r<0.99) hp=6; else hp=12; const spd = 40 + Math.random()*80 + Math.min(120, Math.floor(score/10)*5); enemies.push(new Enemy(x,y,hp,spd)); }

  function spawnPowerup(){ const side = Math.floor(Math.random()*4); let x,y; if(side===0){ x=20; y=Math.random()*(H-40)+20 } else if(side===1){ x=W-20; y=Math.random()*(H-40)+20 } else if(side===2){ x=Math.random()*(W-40)+20; y=20 } else { x=Math.random()*(W-40)+20; y=H-20 } const r=Math.random(); let type; if(r<0.45) type='minigun'; else if(r<0.9) type='rocket'; else type='mult'; powerups.push(new PowerUp(x,y,type)); }

  function applyPowerup(pu){ if(!pu) return; playPickup(); spawnParticles(player.x, player.y, '#fff', 12, 80); if(pu.type==='minigun'){ player.weapon='minigun'; player.weaponTimer = 8; player.weaponFireTimer = 0; } else if(pu.type==='rocket'){ player.weapon='rocket'; player.weaponTimer = 10; player.weaponFireTimer = 0; } else if(pu.type==='mult'){ player.multiplier = 2; player.multTimer = 10; } }

  function spawnRandoms(dt){ spawnTimer += dt; if(spawnTimer >= spawnInterval){ spawnTimer = 0; spawnEnemy(); spawnInterval = Math.max(0.25, spawnInterval - 0.004); } puSpawnTimer -= dt; if(puSpawnTimer <= 0){ puSpawnTimer = 10 + Math.random()*8; spawnPowerup(); } }

  function handleProjectileEnemyCollisions(){ for(let i=enemies.length-1;i>=0;i--){ const e = enemies[i]; for(let j=projectiles.length-1;j>=0;j--){ const p = projectiles[j]; const dx = e.x - p.x, dy = e.y - p.y; const dist = Math.hypot(dx,dy); if(dist < e.radius + p.radius){ // hit
            console.debug('Projectile hit', { projType: p.type, projDamage: p.damage, enemyIndex: i, enemyHpBefore: e.hp, enemyMaxHp: e.maxHp });
            if(p.type === 'rocket'){ // explosion
              const ex = p.x, ey = p.y, rad = p.explosionRadius || 60; playExplosion(); spawnParticles(ex, ey, '#ffb4a2', 36, 220);
              for(let k=enemies.length-1;k>=0;k--){ const ee = enemies[k]; const d2 = Math.hypot(ee.x - ex, ee.y - ey); if(d2 < rad + ee.radius){ ee.hp -= Math.max(1, Math.round(p.damage || 4)); if(ee.hp <= 0){ score += ee.maxHp * (player.multiplier||1); enemies.splice(k,1); } } }
              // log rocket effects
              console.debug('Rocket exploded', { x: ex, y: ey, radius: rad });
              projectiles.splice(j,1);
            } else { // normal bullet
              projectiles.splice(j,1);
              const dmg = p.damage || 1;
              e.hp -= dmg;
              console.debug('Bullet hit enemy', { enemyIndex: i, damage: dmg, enemyHpAfter: e.hp });
              if(e.hp <= 0){ score += e.maxHp * (player.multiplier||1); console.debug('Enemy died', { enemyIndex: i, award: e.maxHp * (player.multiplier||1) }); enemies.splice(i,1); }
            }
            updateHUD(); break; }
        }
      }
  }

  function playShotForWeapon(weapon){ if(weapon==='standard'){ playShoot(); } else if(weapon==='minigun'){ playMinigun(); } else if(weapon==='rocket'){ playRocketFire(); } }

  function loop(ts){ if(!running) return; const dt = Math.min(0.05, (ts - (lastTime||ts))/1000); lastTime = ts; if(!paused){ player.update(dt);
      // firing logic
      if(player.weapon === 'standard'){ player.weaponFireTimer -= dt; if(player.weaponFireTimer <= 0){ player.weaponFireTimer = player.weaponStandardCooldown; const ang = Math.atan2(input.mouseY - player.y, input.mouseX - player.x); for(let i=-1;i<=1;i++){ const a = ang + i*0.12; const damage = 1 + (player.damageBonus||0); projectiles.push(new Projectile(player.x + Math.cos(a)*18, player.y + Math.sin(a)*18, Math.cos(a), Math.sin(a), {type:'bullet', speed:800, radius:4, damage:damage, life:2})); } playShotForWeapon('standard'); } }
      else if(player.weapon === 'minigun'){ player.weaponFireTimer -= dt; if(player.weaponFireTimer <= 0){ player.weaponFireTimer = player.minigunCooldown; const ang = Math.atan2(input.mouseY - player.y, input.mouseX - player.x); const spread = (Math.random()-0.5)*0.06; const a = ang + spread; const damage = 1 + (player.damageBonus||0); projectiles.push(new Projectile(player.x + Math.cos(a)*18, player.y + Math.sin(a)*18, Math.cos(a), Math.sin(a), {type:'bullet', speed:1100, radius:3, damage:damage, life:1.4})); playShotForWeapon('minigun'); } }
      else if(player.weapon === 'rocket'){ player.weaponFireTimer -= dt; if(player.weaponFireTimer <= 0){ player.weaponFireTimer = player.rocketCooldown; const ang = Math.atan2(input.mouseY - player.y, input.mouseX - player.x); const damage = 4 + (player.damageBonus||0); projectiles.push(new Projectile(player.x + Math.cos(ang)*18, player.y + Math.sin(ang)*18, Math.cos(ang), Math.sin(ang), {type:'rocket', speed:520, radius:6, damage:damage, life:3, explosionRadius:60})); playShotForWeapon('rocket'); } }

      for(const p of projectiles) p.update(dt);
      projectiles = projectiles.filter(p=>p.life>0 && p.x>-400 && p.x < W+400 && p.y>-400 && p.y < H+400);

      enemies.forEach(e=>e.update(dt, player));
      powerups.forEach(pu=>pu.update(dt)); powerups = powerups.filter(pu=>pu.life>0);

      handleProjectileEnemyCollisions();
      // after handling collisions, check if player has reached a reward milestone
      try{ checkRewardThreshold(); }catch(e){ console.debug('checkRewardThreshold error', e); }

      // enemy hits player (damage scales with enemy size / HP)
      for(let i=enemies.length-1;i>=0;i--){ const e=enemies[i]; const d=Math.hypot(e.x - player.x, e.y - player.y); if(d < e.radius + player.radius){ // compute damage based on enemy maxHp
        const damage = Math.max(1, Math.round(e.maxHp / 2));
        console.debug('Enemy collided with player', { enemyIndex: i, enemyMaxHp: e.maxHp, computedDamage: damage });
        // feedback
        spawnParticles(player.x, player.y, '#ff9b9b', 18, 160);
        try{ playExplosion(); }catch(err){ console.debug('Explosion sound failed', err); }
        enemies.splice(i,1);
        player.health -= damage;
        updateHUD();
        if(player.health<=0){ // on death: show modal and inline save
          console.debug('Player died', { finalScore: score });
          gameOver(); lastUncommittedScore = score || 0; if(recentScoreDisplay) recentScoreDisplay.textContent = String(lastUncommittedScore||0); if(nameInput) nameInput.value = 'Player'; if(recentScoreBox) recentScoreBox.style.display='block'; renderLeaderboard(); showLeaderboard(); return; }
        } }

      // player picks powerups
      for(let i=powerups.length-1;i>=0;i--){ const pu = powerups[i]; const d = Math.hypot(pu.x - player.x, pu.y - player.y); if(d < pu.radius + player.radius){ applyPowerup(pu); powerups.splice(i,1); updateHUD(); } }

      // update particles
      for(let i=particles.length-1;i>=0;i--){ const pa = particles[i]; pa.x += pa.vx*dt; pa.y += pa.vy*dt; pa.vx *= 0.98; pa.vy *= 0.98; pa.life -= dt; if(pa.life <= 0) particles.splice(i,1); }

      spawnRandoms(dt);
    }

    // render
    ctx.clearRect(0,0,W,H); ctx.fillStyle='#0b0b10'; ctx.fillRect(0,0,W,H);
    player.draw(); projectiles.forEach(p=>p.draw()); enemies.forEach(e=>e.draw()); powerups.forEach(pu=>pu.draw());
    // draw particles
    for(const pa of particles){ ctx.globalAlpha = Math.max(0, pa.life/1.2); ctx.fillStyle = pa.color; ctx.beginPath(); ctx.arc(pa.x, pa.y, pa.size, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1; }

    if(paused){ ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.fillRect(0,0,W,H); ctx.fillStyle='white'; ctx.font='48px sans-serif'; ctx.textAlign='center'; ctx.fillText('PAUSED', W/2, H/2); }

    updateHUD(); requestAnimationFrame(loop);
  }

  // Leaderboard functions
  function getHighScores(){ try{ const raw = localStorage.getItem('vs_lite_highscores'); if(!raw) return []; const parsed = JSON.parse(raw); if(!Array.isArray(parsed)) return []; return parsed; }catch(e){ return []; } }
  function saveHighScore(name, scoreVal){ const list = getHighScores(); list.push({ name: name||'Player', score: Number(scoreVal)||0, when: Date.now() }); list.sort((a,b)=>b.score - a.score || a.when - b.when); const top = list.slice(0,10); localStorage.setItem('vs_lite_highscores', JSON.stringify(top)); }
  function renderLeaderboard(){ console.debug('renderLeaderboard called'); if(!leaderboardList) { console.debug('renderLeaderboard: leaderboardList element missing'); return; } const list = getHighScores(); console.debug('renderLeaderboard: got scores', list.length); leaderboardList.innerHTML = ''; if(list.length === 0){ const li = document.createElement('li'); li.textContent = 'No scores yet'; leaderboardList.appendChild(li); return; } list.forEach((s,i)=>{ const li = document.createElement('li'); li.textContent = `${i+1}. ${s.name} — ${s.score}`; if(lastUncommittedScore !== null && s.score === lastUncommittedScore && i < 10){ li.className = 'recent-entry'; } leaderboardList.appendChild(li); }); }
  // debug wrappers for get/save
  const _getHighScores = getHighScores;
  getHighScores = function(){ const raw = localStorage.getItem('vs_lite_highscores'); console.debug('getHighScores raw', raw); try{ return _getHighScores(); }catch(e){ console.debug('getHighScores parse error', e); return []; } };
  const _saveHighScore = saveHighScore;
  saveHighScore = function(name, scoreVal){ console.debug('saveHighScore called', name, scoreVal); try{ _saveHighScore(name, scoreVal); console.debug('saveHighScore: saved'); }catch(e){ console.debug('saveHighScore error', e); } };
  function showLeaderboard(){ if(leaderboardModal){ renderLeaderboard(); leaderboardModal.style.display = 'flex'; } }
  function hideLeaderboard(){ if(leaderboardModal) leaderboardModal.style.display = 'none'; }

  if(leaderboardBtn) leaderboardBtn.addEventListener('click', ()=>{ renderLeaderboard(); showLeaderboard(); }); if(closeLeaderboardBtn) closeLeaderboardBtn.addEventListener('click', hideLeaderboard); if(closeLeaderboardBtn2) closeLeaderboardBtn2.addEventListener('click', hideLeaderboard); if(clearScoresBtn) clearScoresBtn.addEventListener('click', ()=>{ localStorage.removeItem('vs_lite_highscores'); renderLeaderboard(); });
  if(saveScoreBtn) saveScoreBtn.addEventListener('click', ()=>{ try{ const name = (nameInput && nameInput.value.trim()) || 'Player'; saveHighScore(name, lastUncommittedScore||0); lastUncommittedScore = null; renderLeaderboard(); if(recentScoreBox) recentScoreBox.style.display='none'; }catch(e){} });

  // Show leaderboard on load
  reset(); try{ showLeaderboard(); }catch(e){}

  // Show leaderboard on load
  reset(); 
  try{ showLeaderboard(); console.log('Leaderboard shown on init'); }catch(e){ console.error('Failed to show leaderboard on init', e); }
  
  // Show reward modal (create it if not in DOM)
  if(!document.getElementById('rewardModal')){
    const container = document.createElement('div');
    container.id = 'rewardModal';
    container.className = 'modal';
    container.style.display = 'none';
    container.style.position = 'fixed';
    container.style.left = '0';
    container.style.top = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.zIndex = '50';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';
    container.innerHTML = '<div class="modal-content" style="background:linear-gradient(180deg,#0f1724,#0b1220);padding:18px;border-radius:10px;color:white;min-width:320px;text-align:center"><h3>Choose a Reward</h3><p style="text-align:center;margin:6px 0 12px 0">You reached a score milestone — pick one permanent upgrade:</p><div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap"><button id="rewardHealth" style="background:#ff6b6b;border:none;color:white;padding:8px 12px;border-radius:8px;cursor:pointer">❤️ Health Up (+3)</button><button id="rewardDamage" style="background:#ff6b6b;border:none;color:white;padding:8px 12px;border-radius:8px;cursor:pointer">💥 Damage Up (+0.5)</button><button id="rewardRate" style="background:#ff6b6b;border:none;color:white;padding:8px 12px;border-radius:8px;cursor:pointer">⚡ Fire Rate Up</button></div><div style="text-align:center;margin-top:12px"><button id="closeRewardBtn" style="background:#ff6b6b;border:none;color:white;padding:8px 12px;border-radius:8px;cursor:pointer">Close</button></div></div>';
    document.body.appendChild(container);
    console.log('Created reward modal DOM');
  }

  // rewire reward modal handlers now that DOM exists
  try{
    const rh = document.getElementById('rewardHealth');
    const rd = document.getElementById('rewardDamage');
    const rr = document.getElementById('rewardRate');
    const cr = document.getElementById('closeRewardBtn');
    if(rh) rh.addEventListener('click', ()=>{ grantReward('health'); });
    if(rd) rd.addEventListener('click', ()=>{ grantReward('damage'); });
    if(rr) rr.addEventListener('click', ()=>{ grantReward('rate'); });
    if(cr) cr.addEventListener('click', ()=>{ hideRewardModal(); paused=false; });
    console.log('Reward modal handlers attached');
  }catch(e){ console.error('Failed to attach reward handlers', e); }

  // expose for debug
  window.__vs_lite = { start, reset, showLeaderboard, getHighScores };

})();
// Vampire Survivors — Lite with power-ups (minigun, rocket, score multiplier)
(function(){
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  let W = canvas.width = window.innerWidth;
  let H = canvas.height = window.innerHeight;

  window.addEventListener('resize', ()=>{ W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; });

  // HUD elements
  const scoreEl = document.getElementById('score');
  const healthEl = document.getElementById('health');
  const powerupsEl = document.getElementById('powerups');
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const leaderboardBtn = document.getElementById('leaderboardBtn');
  const restartBtn = document.getElementById('restartBtn');

  // input
  const input = {up:false,down:false,left:false,right:false,mouseX:W/2,mouseY:H/2};
  window.addEventListener('keydown', e=>{ if(e.key==='w'||e.key==='ArrowUp')input.up=true; if(e.key==='s'||e.key==='ArrowDown')input.down=true; if(e.key==='a'||e.key==='ArrowLeft')input.left=true; if(e.key==='d'||e.key==='ArrowRight')input.right=true });
  window.addEventListener('keyup', e=>{ if(e.key==='w'||e.key==='ArrowUp')input.up=false; if(e.key==='s'||e.key==='ArrowDown')input.down=false; if(e.key==='a'||e.key==='ArrowLeft')input.left=false; if(e.key==='d'||e.key==='ArrowRight')input.right=false });
  canvas.addEventListener('mousemove', e=>{ const r=canvas.getBoundingClientRect(); input.mouseX = e.clientX - r.left; input.mouseY = e.clientY - r.top });

  // Entities
  class Player{
    constructor(){ this.x=W/2; this.y=H/2; this.speed=260; this.radius=14; this.health=10; this.weapon='standard'; this.weaponTimer=0; this.minigunCooldown=0.05; this.rocketCooldown=0.5; this.weaponFireCooldown=0.15; this.weaponFireTimer=0; this.multiplier=1; this.multTimer=0 }
    update(dt){ let dx=0,dy=0; if(input.up)dy-=1; if(input.down)dy+=1; if(input.left)dx-=1; if(input.right)dx+=1; if(dx||dy){ const len=Math.hypot(dx,dy)||1; dx/=len; dy/=len; this.x+=dx*this.speed*dt; this.y+=dy*this.speed*dt } this.x = Math.max(this.radius, Math.min(W-this.radius, this.x)); this.y = Math.max(this.radius, Math.min(H-this.radius, this.y));
      // timers
      if(this.weaponTimer>0) this.weaponTimer = Math.max(0, this.weaponTimer - dt); else if(this.weapon !== 'standard'){ this.weapon = 'standard' }
      if(this.multTimer>0) this.multTimer = Math.max(0, this.multTimer - dt); else this.multiplier = 1;
    }
    draw(){ ctx.fillStyle='#b7e4ff'; ctx.beginPath(); ctx.arc(this.x,this.y,this.radius,0,Math.PI*2); ctx.fill(); const ang = Math.atan2(input.mouseY - this.y, input.mouseX - this.x); ctx.strokeStyle='rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.moveTo(this.x,this.y); ctx.lineTo(this.x+Math.cos(ang)*30, this.y+Math.sin(ang)*30); ctx.stroke(); }
  }

  class Projectile{
    constructor(x,y,dx,dy,opts={owner:'player',speed:800,radius:4,type:'bullet'}){ this.x=x; this.y=y; this.vx=dx; this.vy=dy; this.speed=opts.speed; this.radius=opts.radius; this.owner=opts.owner; this.life=opts.life||2; this.type=opts.type||'bullet'; this.explosionRadius = opts.explosionRadius||0; this.damage = opts.damage||1 }
    update(dt){ this.x += this.vx*this.speed*dt; this.y += this.vy*this.speed*dt; this.life -= dt }
    draw(){ if(this.type==='rocket'){ ctx.fillStyle='#ffb4a2'; ctx.beginPath(); ctx.arc(this.x,this.y,this.radius,0,Math.PI*2); ctx.fill(); ctx.fillStyle='rgba(255,180,160,0.25)'; ctx.beginPath(); ctx.arc(this.x,this.y,this.explosionRadius*0.3,0,Math.PI*2); ctx.fill(); } else { ctx.fillStyle='#ffd166'; ctx.beginPath(); ctx.arc(this.x,this.y,this.radius,0,Math.PI*2); ctx.fill(); } }
  }

  class Enemy{
    constructor(x,y,hp=1,speed=80){ this.x=x; this.y=y; this.hp=hp; this.maxHp=hp; this.radius = 8 + hp*6; this.speed=Math.max(20, speed*(1 - (hp-1)*0.06)); }
    update(dt,player){ const ang=Math.atan2(player.y - this.y, player.x - this.x); this.x += Math.cos(ang)*this.speed*dt; this.y += Math.sin(ang)*this.speed*dt }
    draw(){ if(this.maxHp<=2) ctx.fillStyle='#ff6b6b'; else if(this.maxHp<=6) ctx.fillStyle='#ff9f1c'; else ctx.fillStyle='#9b5de5'; ctx.beginPath(); ctx.arc(this.x,this.y,this.radius,0,Math.PI*2); ctx.fill(); const barW=this.radius*1.6, barH=4; const ratio=Math.max(0,this.hp/this.maxHp); ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(this.x-barW/2,this.y-this.radius-10,barW,barH); ctx.fillStyle='#4ade80'; ctx.fillRect(this.x-barW/2,this.y-this.radius-10,barW*ratio,barH); }
  }

  class PowerUp{
    constructor(x,y,type){ this.x=x; this.y=y; this.type=type; this.radius=12; this.life=20 } // life before it vanishes
    update(dt){ this.life -= dt }
    draw(){ if(this.type==='minigun') ctx.fillStyle='#7ee787'; else if(this.type==='rocket') ctx.fillStyle='#ff7b7b'; else if(this.type==='mult') ctx.fillStyle='#7bdff6'; else ctx.fillStyle='white'; ctx.beginPath(); ctx.rect(this.x-this.radius,this.y-this.radius,this.radius*2,this.radius*2); ctx.fill(); ctx.fillStyle='rgba(0,0,0,0.2)'; ctx.fillRect(this.x-this.radius+2,this.y-this.radius+2,this.radius*2-4,this.radius*2-4); ctx.fillStyle='white'; ctx.font='12px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(this.type==='minigun'?'MG':this.type==='rocket'?'RK':this.type==='mult'?'x2':'?',this.x,this.y); }
  }

  // game state
  let player, projectiles, enemies, powerups, spawnTimer, spawnInterval, puSpawnTimer, score, running, paused, lastTime, autofireTimer;

  function updateHUD(){ if(scoreEl) scoreEl.textContent = `Score: ${score}`; if(healthEl) healthEl.textContent = `Health: ${player?player.health:0}`; renderPowerupHUD(); }

  function renderPowerupHUD(){ if(!powerupsEl || !player) return; powerupsEl.innerHTML=''; const nodes=[]; if(player.weapon !== 'standard'){ const div=document.createElement('span'); div.className='powerup-badge'; const ico=document.createElement('span'); ico.className='powerup-icon'; ico.style.background = (player.weapon==='minigun'?'#7ee787':'#ff7b7b'); const txt=document.createElement('span'); txt.className='powerup-name'; txt.textContent = player.weapon==='minigun'?'Minigun':'Rocket'; const t=document.createElement('span'); t.className='powerup-timer'; t.textContent = ` ${Math.ceil(player.weaponTimer)}s`; div.appendChild(ico); div.appendChild(txt); div.appendChild(t); nodes.push(div); }
    if(player.multiplier && player.multiplier>1){ const div=document.createElement('span'); div.className='powerup-badge'; const ico=document.createElement('span'); ico.className='powerup-icon'; ico.style.background='#7bdff6'; const txt=document.createElement('span'); txt.className='powerup-name'; txt.textContent = `x${player.multiplier}`; const t=document.createElement('span'); t.className='powerup-timer'; t.textContent = ` ${Math.ceil(player.multTimer)}s`; div.appendChild(ico); div.appendChild(txt); div.appendChild(t); nodes.push(div); }
    nodes.forEach(n=>powerupsEl.appendChild(n)); }

  function reset(){ player = new Player(); projectiles=[]; enemies=[]; powerups=[]; spawnTimer=0; spawnInterval=0.9; puSpawnTimer=8; score=0; running=false; paused=false; autofireTimer=0; lastTime = performance.now(); updateHUD(); if(pauseBtn) pauseBtn.style.display='none'; if(restartBtn) restartBtn.style.display='none'; if(startBtn) startBtn.style.display='inline-block'; }

  function start(){ if(!player) reset(); running=true; paused=false; lastTime = performance.now(); if(startBtn) startBtn.style.display='none'; if(pauseBtn) pauseBtn.style.display='inline-block'; if(restartBtn) restartBtn.style.display='none'; requestAnimationFrame(loop); }
  function gameOver(){ running=false; paused=false; if(restartBtn) restartBtn.style.display='inline-block'; if(pauseBtn) pauseBtn.style.display='none'; if(startBtn) startBtn.style.display='none'; }

  if(startBtn) startBtn.addEventListener('click', ()=>start());
  if(restartBtn) restartBtn.addEventListener('click', ()=>start());
  if(pauseBtn) pauseBtn.addEventListener('click', ()=>{ if(!running) return; paused=!paused; pauseBtn.textContent = paused ? 'Resume' : 'Pause'; });

  function spawnEnemy(){ const side = Math.floor(Math.random()*4); let x,y; if(side===0){ x=-40; y=Math.random()*H } else if(side===1){ x=W+40; y=Math.random()*H } else if(side===2){ x=Math.random()*W; y=-40 } else { x=Math.random()*W; y=H+40 };
    const r=Math.random(); let hp; if(r<0.6) hp=1; else if(r<0.9) hp=3; else if(r<0.99) hp=6; else hp=12; const spd = 40 + Math.random()*80 + Math.min(120, Math.floor(score/10)*5); enemies.push(new Enemy(x,y,hp,spd)); }

  function spawnPowerup(){ const side = Math.floor(Math.random()*4); let x,y; if(side===0){ x=20; y=Math.random()*(H-40)+20 } else if(side===1){ x=W-20; y=Math.random()*(H-40)+20 } else if(side===2){ x=Math.random()*(W-40)+20; y=20 } else { x=Math.random()*(W-40)+20; y=H-20 };
    const r=Math.random(); let type; if(r<0.45) type='minigun'; else if(r<0.9) type='rocket'; else type='mult'; powerups.push(new PowerUp(x,y,type)); }

  function applyPowerup(pu){ if(!pu) return; if(pu.type==='minigun'){ player.weapon='minigun'; player.weaponTimer = 10; } else if(pu.type==='rocket'){ player.weapon='rocket'; player.weaponTimer = 12; } else if(pu.type==='mult'){ player.multiplier = 2; player.multTimer = 12; } }

  function spawnRandoms(dt){ // manage spawn timers
    spawnTimer += dt; if(spawnTimer >= spawnInterval){ spawnTimer = 0; spawnEnemy(); spawnInterval = Math.max(0.25, spawnInterval - 0.005); }
    puSpawnTimer -= dt; if(puSpawnTimer <= 0){ puSpawnTimer = 8 + Math.random()*8; spawnPowerup(); }
  }

  function handleProjectileEnemyCollisions(){ for(let i=enemies.length-1;i>=0;i--){ const e=enemies[i]; for(let j=projectiles.length-1;j>=0;j--){ const p=projectiles[j]; const dx=e.x-p.x, dy=e.y-p.y; const dist=Math.hypot(dx,dy); if(dist < e.radius + p.radius){ // hit
          if(p.type==='rocket'){ // explosion damage
            const ex = p.x, ey = p.y, rad = p.explosionRadius || 40; // damage nearby
            for(let k=enemies.length-1;k>=0;k--){ const ee=enemies[k]; const d2 = Math.hypot(ee.x - ex, ee.y - ey); if(d2 < rad + ee.radius){ ee.hp -= Math.max(1, Math.round(p.damage || 3)); if(ee.hp <= 0){ score += ee.maxHp; enemies.splice(k,1); } }
            }
            // remove rocket
            projectiles.splice(j,1);
          } else { // normal bullet
            projectiles.splice(j,1); e.hp -= p.damage || 1; if(e.hp <= 0){ score += e.maxHp; enemies.splice(i,1); }
          }
          updateHUD(); break; }
      }
    }
  }

  function loop(ts){ if(!running) return; const dt = Math.min(0.05, (ts - (lastTime||ts))/1000); lastTime = ts; if(!paused){ player.update(dt); // firing logic
      // determine firing based on weapon
      if(player.weapon==='standard') player.weaponFireTimer -= dt; else if(player.weapon==='minigun') player.weaponFireTimer -= dt; else if(player.weapon==='rocket') player.weaponFireTimer -= dt;
      if(player.weapon === 'standard' && player.weaponFireTimer <= 0){ player.weaponFireTimer = 0.15; const ang = Math.atan2(input.mouseY - player.y, input.mouseX - player.x); for(let i=-1;i<=1;i++){ const a = ang + i*0.12; projectiles.push(new Projectile(player.x + Math.cos(a)*18, player.y + Math.sin(a)*18, Math.cos(a), Math.sin(a), {owner:'player', speed:800, radius:4, damage:1, type:'bullet'})); } }
      else if(player.weapon === 'minigun' && player.weaponFireTimer <= 0){ player.weaponFireTimer = player.minigunCooldown; const ang = Math.atan2(input.mouseY - player.y, input.mouseX - player.x); projectiles.push(new Projectile(player.x + Math.cos(ang)*18, player.y + Math.sin(ang)*18, Math.cos(ang), Math.sin(ang), {owner:'player', speed:1100, radius:3, damage:1, type:'bullet'})); }
      else if(player.weapon === 'rocket' && player.weaponFireTimer <= 0){ player.weaponFireTimer = player.rocketCooldown; const ang = Math.atan2(input.mouseY - player.y, input.mouseX - player.x); projectiles.push(new Projectile(player.x + Math.cos(ang)*18, player.y + Math.sin(ang)*18, Math.cos(ang), Math.sin(ang), {owner:'player', speed:520, radius:6, damage:3, type:'rocket', explosionRadius:48, life:3})); }

      for(let p of projectiles) p.update(dt);
      projectiles = projectiles.filter(p=>p.life>0 && p.x>-300 && p.x < W+300 && p.y>-300 && p.y < H+300);

      enemies.forEach(e=>e.update(dt,player));
      powerups.forEach(pu=>pu.update(dt)); powerups = powerups.filter(pu=>pu.life>0);

      // collisions: projectiles -> enemies
      handleProjectileEnemyCollisions();

      // enemies -> player
      for(let i=enemies.length-1;i>=0;i--){ const e=enemies[i]; const d=Math.hypot(e.x - player.x, e.y - player.y); if(d < e.radius + player.radius){ enemies.splice(i,1); player.health -= 1; updateHUD(); if(player.health<=0){ gameOver(); return } } }

      // player -> powerups
      for(let i=powerups.length-1;i>=0;i--){ const pu=powerups[i]; const d=Math.hypot(pu.x - player.x, pu.y - player.y); if(d < pu.radius + player.radius){ applyPowerup(pu); powerups.splice(i,1); updateHUD(); } }

      // spawn managers
      spawnRandoms(dt);
    }

    // render
    ctx.clearRect(0,0,W,H); ctx.fillStyle='#0b0b10'; ctx.fillRect(0,0,W,H);
    player.draw(); projectiles.forEach(p=>p.draw()); enemies.forEach(e=>e.draw()); powerups.forEach(pu=>pu.draw());
    // paused overlay
    if(paused){ ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.fillRect(0,0,W,H); ctx.fillStyle='white'; ctx.font='48px sans-serif'; ctx.textAlign='center'; ctx.fillText('PAUSED', W/2, H/2); }

    updateHUD();
    requestAnimationFrame(loop);
  }

  // initialize state
  reset();
  // show leaderboard on page load (visible before starting the game)
  try { showLeaderboard(); } catch (e) {}
  function start() { 
    if (!player) reset(); 
    // hide leaderboard when starting
    try { hideLeaderboard(); } catch (e) {}
    running = true; paused = false; lastTime = performance.now(); 
    if (startBtn) startBtn.style.display = 'none'; 
    if (pauseBtn) pauseBtn.style.display = 'inline-block'; 
    if (restartBtn) restartBtn.style.display = 'none'; 
    requestAnimationFrame(loop); 
  }

  // Leaderboard hooks (existing code kept minimal integration)
  const leaderboardModal = document.getElementById('leaderboardModal');
  const leaderboardList = document.getElementById('leaderboardList');
  const clearScoresBtn = document.getElementById('clearScoresBtn');
  const closeLeaderboardBtn = document.getElementById('closeLeaderboardBtn');
  const closeLeaderboardBtn2 = document.getElementById('closeLeaderboardBtn2');

  function getHighScores(){ try{ const raw = localStorage.getItem('vs_lite_highscores'); if(!raw) return []; const parsed = JSON.parse(raw); if(!Array.isArray(parsed)) return []; return parsed;}catch(e){return []} }
  function saveHighScore(name, scoreVal){ const list = getHighScores(); list.push({name: name||'Player', score: Number(scoreVal)||0, when: Date.now()}); list.sort((a,b)=>b.score - a.score || a.when - b.when); const top = list.slice(0,10); localStorage.setItem('vs_lite_highscores', JSON.stringify(top)); }
  function renderLeaderboard(){ if(!leaderboardList) return; const list=getHighScores(); leaderboardList.innerHTML=''; if(list.length===0){ const li=document.createElement('li'); li.textContent='No scores yet'; leaderboardList.appendChild(li); return } list.forEach((s,i)=>{ const li=document.createElement('li'); li.textContent = `${i+1}. ${s.name} — ${s.score}`; leaderboardList.appendChild(li); }); }
  function showLeaderboard(){ if(leaderboardModal){ renderLeaderboard(); leaderboardModal.style.display='flex'; } }
  function hideLeaderboard(){ if(leaderboardModal) leaderboardModal.style.display='none'; }
  if(leaderboardBtn) leaderboardBtn.addEventListener('click', showLeaderboard); if(closeLeaderboardBtn) closeLeaderboardBtn.addEventListener('click', hideLeaderboard); if(closeLeaderboardBtn2) closeLeaderboardBtn2.addEventListener('click', hideLeaderboard); if(clearScoresBtn) clearScoresBtn.addEventListener('click', ()=>{ localStorage.removeItem('vs_lite_highscores'); renderLeaderboard(); });

  // override gameOver to prompt for name and save
  const _originalGameOver = gameOver;
  gameOver = function(){ _originalGameOver(); try{ const p = prompt('Game over! Enter your name for the leaderboard:', 'Player'); const name = (p!==null)?(p.trim()||'Player'):'Player'; saveHighScore(name, score||0); }catch(e){} showLeaderboard(); };

  // hide modal on reset
  const _originalReset = reset;
  reset = function(){ _originalReset(); hideLeaderboard(); };

  // expose for console debug
  window.__vs_lite = { start, reset, showLeaderboard, getHighScores };

})();
// Vampire Survivors — Lite (cleaned & fixed)
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  let W = canvas.width = window.innerWidth;
  let H = canvas.height = window.innerHeight;

  window.addEventListener('resize', () => {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  });

  // HUD elements (guard in case HTML is modified)
  const scoreEl = document.getElementById('score');
  const healthEl = document.getElementById('health');
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const restartBtn = document.getElementById('restartBtn');

  // Input
  const input = { up: false, down: false, left: false, right: false, mouseX: W / 2, mouseY: H / 2 };
  window.addEventListener('keydown', (e) => {
    if (e.key === 'w' || e.key === 'ArrowUp') input.up = true;
    if (e.key === 's' || e.key === 'ArrowDown') input.down = true;
    if (e.key === 'a' || e.key === 'ArrowLeft') input.left = true;
    if (e.key === 'd' || e.key === 'ArrowRight') input.right = true;
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === 'w' || e.key === 'ArrowUp') input.up = false;
    if (e.key === 's' || e.key === 'ArrowDown') input.down = false;
    if (e.key === 'a' || e.key === 'ArrowLeft') input.left = false;
    if (e.key === 'd' || e.key === 'ArrowRight') input.right = false;
  });
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    input.mouseX = e.clientX - r.left;
    input.mouseY = e.clientY - r.top;
  });

  // Entities
  class Player {
    constructor() {
      this.x = W / 2;
      this.y = H / 2;
      this.speed = 260;
      this.radius = 14;
      this.health = 10;
    }
    update(dt) {
      let dx = 0, dy = 0;
      if (input.up) dy -= 1;
      if (input.down) dy += 1;
      if (input.left) dx -= 1;
      if (input.right) dx += 1;
      if (dx !== 0 || dy !== 0) {
        const len = Math.hypot(dx, dy) || 1;
        dx /= len; dy /= len;
        this.x += dx * this.speed * dt;
        this.y += dy * this.speed * dt;
      }
      // clamp inside canvas
      this.x = Math.max(this.radius, Math.min(W - this.radius, this.x));
      this.y = Math.max(this.radius, Math.min(H - this.radius, this.y));
    }
    draw() {
      ctx.fillStyle = '#b7e4ff';
      ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill();
      // aim indicator
      const ang = Math.atan2(input.mouseY - this.y, input.mouseX - this.x);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x + Math.cos(ang) * 30, this.y + Math.sin(ang) * 30); ctx.stroke();
      ctx.lineWidth = 1;
    }
  }

  class Projectile {
    constructor(x, y, dx, dy, owner = 'player') {
      this.x = x; this.y = y; this.vx = dx; this.vy = dy; this.speed = 800; this.radius = 4; this.owner = owner; this.life = 2.0;
    }
    update(dt) {
      this.x += this.vx * this.speed * dt; this.y += this.vy * this.speed * dt; this.life -= dt;
    }
    draw() { ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill(); }
  }

  class Enemy {
    constructor(x, y, hp = 1, speed = 80) {
      this.x = x; this.y = y; this.hp = hp; this.maxHp = hp;
      this.radius = 8 + hp * 6; // scale size with HP
      // heavier enemies slightly slower
      this.speed = Math.max(20, speed * (1 - (hp - 1) * 0.06));
    }
    update(dt, player) {
      const ang = Math.atan2(player.y - this.y, player.x - this.x);
      this.x += Math.cos(ang) * this.speed * dt; this.y += Math.sin(ang) * this.speed * dt;
    }
    draw() {
      if (this.maxHp <= 2) ctx.fillStyle = '#ff6b6b';
      else if (this.maxHp <= 6) ctx.fillStyle = '#ff9f1c';
      else ctx.fillStyle = '#9b5de5';
      ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill();
      // hp bar
      const barW = this.radius * 1.6; const barH = 4;
      const ratio = Math.max(0, this.hp / this.maxHp);
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(this.x - barW / 2, this.y - this.radius - 10, barW, barH);
      ctx.fillStyle = '#4ade80'; ctx.fillRect(this.x - barW / 2, this.y - this.radius - 10, barW * ratio, barH);
    }
  }

  // Game state
  let player, projectiles, enemies, spawnTimer, score, running, lastTime, autofireTimer, spawnInterval, paused;

  function updateHUD() {
    if (scoreEl) scoreEl.textContent = `Score: ${score}`;
    if (healthEl) healthEl.textContent = `Health: ${player ? player.health : 0}`;
  }

  function reset() {
    player = new Player(); projectiles = []; enemies = []; spawnTimer = 0; score = 0; running = false; paused = false; autofireTimer = 0; spawnInterval = 0.9; updateHUD();
    if (pauseBtn) { pauseBtn.textContent = 'Pause'; pauseBtn.style.display = 'none'; }
    if (restartBtn) restartBtn.style.display = 'none';
    if (startBtn) startBtn.style.display = 'inline-block';
  }

  function start() {
    if (!player) reset();
    running = true; paused = false; lastTime = performance.now();
    if (startBtn) startBtn.style.display = 'none';
    if (pauseBtn) pauseBtn.style.display = 'inline-block';
    if (restartBtn) restartBtn.style.display = 'none';
    requestAnimationFrame(loop);
  }

  function gameOver() {
    running = false; paused = false;
    if (restartBtn) restartBtn.style.display = 'inline-block';
    if (pauseBtn) pauseBtn.style.display = 'none';
    if (startBtn) startBtn.style.display = 'none';
  }

  if (startBtn) startBtn.addEventListener('click', () => start());
  if (restartBtn) restartBtn.addEventListener('click', () => start());
  if (pauseBtn) pauseBtn.addEventListener('click', () => {
    if (!running) return; paused = !paused; pauseBtn.textContent = paused ? 'Resume' : 'Pause';
  });

  function spawnEnemy() {
    const side = Math.floor(Math.random() * 4);
    let x, y;
    if (side === 0) { x = -40; y = Math.random() * H; }
    else if (side === 1) { x = W + 40; y = Math.random() * H; }
    else if (side === 2) { x = Math.random() * W; y = -40; }
    else { x = Math.random() * W; y = H + 40; }
    // choose HP distribution
    const r = Math.random();
    let hp;
    if (r < 0.6) hp = 1;
    else if (r < 0.9) hp = 3;
    else if (r < 0.99) hp = 6;
    else hp = 12;
    const spd = 40 + Math.random() * 80 + Math.min(120, Math.floor(score / 10) * 5);
    enemies.push(new Enemy(x, y, hp, spd));
  }

  function loop(ts) {
    if (!running) return;
    const dt = Math.min(0.05, (ts - (lastTime || ts)) / 1000); lastTime = ts;

    // update only when not paused
    if (!paused) {
      player.update(dt);
      autofireTimer -= dt; if (autofireTimer <= 0) { autofireTimer = 0.15; // auto-fire
        const ang = Math.atan2(input.mouseY - player.y, input.mouseX - player.x);
        for (let i = -1; i <= 1; i++) {
          const a = ang + i * 0.12; projectiles.push(new Projectile(player.x + Math.cos(a) * 18, player.y + Math.sin(a) * 18, Math.cos(a), Math.sin(a)));
        }
      }

      for (let p of projectiles) p.update(dt);
      projectiles = projectiles.filter(p => p.life > 0 && p.x > -200 && p.x < W + 200 && p.y > -200 && p.y < H + 200);

      enemies.forEach(e => e.update(dt, player));

      // projectile hits enemy
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        for (let j = projectiles.length - 1; j >= 0; j--) {
          const p = projectiles[j]; if (p.owner !== 'player') continue;
          const dx = e.x - p.x, dy = e.y - p.y; const dist = Math.hypot(dx, dy);
          if (dist < e.radius + p.radius) {
            projectiles.splice(j, 1);
            e.hp -= 1;
            if (e.hp <= 0) {
              // award score equal to enemy max HP (tougher enemies give more)
              score += e.maxHp;
              enemies.splice(i, 1);
              updateHUD();
            }
            break;
          }
        }
      }

      // enemy hits player
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i]; const d = Math.hypot(e.x - player.x, e.y - player.y);
        if (d < e.radius + player.radius) {
          enemies.splice(i, 1);
          player.health -= 1;
          updateHUD();
          if (player.health <= 0) { gameOver(); return; }
        }
      }

      // spawning logic
      spawnTimer += dt; if (spawnTimer >= spawnInterval) { spawnTimer = 0; spawnEnemy(); spawnInterval = Math.max(0.25, spawnInterval - 0.005); }
    }

    // render
    ctx.clearRect(0, 0, W, H);
    // subtle background
    ctx.fillStyle = '#0b0b10'; ctx.fillRect(0, 0, W, H);
    player.draw(); projectiles.forEach(p => p.draw()); enemies.forEach(e => e.draw());

    // paused overlay
    if (paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'white'; ctx.font = '48px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('PAUSED', W / 2, H / 2);
    }

    requestAnimationFrame(loop);
  }

  // initialize
  reset();

  // --- Leaderboard: localStorage-based high scores ---
  const leaderboardBtn = document.getElementById('leaderboardBtn');
  const leaderboardModal = document.getElementById('leaderboardModal');
  const leaderboardList = document.getElementById('leaderboardList');
  const clearScoresBtn = document.getElementById('clearScoresBtn');
  const closeLeaderboardBtn = document.getElementById('closeLeaderboardBtn');
  const closeLeaderboardBtn2 = document.getElementById('closeLeaderboardBtn2');

  function getHighScores() {
    try {
      const raw = localStorage.getItem('vs_lite_highscores');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch (e) { return []; }
  }

  function saveHighScore(name, scoreVal) {
    const list = getHighScores();
    list.push({ name: name || 'Player', score: Number(scoreVal) || 0, when: Date.now() });
    list.sort((a, b) => b.score - a.score || a.when - b.when);
    const top = list.slice(0, 10);
    localStorage.setItem('vs_lite_highscores', JSON.stringify(top));
  }

  function renderLeaderboard() {
    if (!leaderboardList) return;
    const list = getHighScores();
    leaderboardList.innerHTML = '';
    if (list.length === 0) {
      const li = document.createElement('li'); li.textContent = 'No scores yet'; leaderboardList.appendChild(li); return;
    }
    list.forEach((s, i) => {
      const li = document.createElement('li'); li.textContent = `${i+1}. ${s.name} — ${s.score}`; leaderboardList.appendChild(li);
    });
  }

  function showLeaderboard() { if (leaderboardModal) { renderLeaderboard(); leaderboardModal.style.display = 'flex'; } }
  function hideLeaderboard() { if (leaderboardModal) leaderboardModal.style.display = 'none'; }

  if (leaderboardBtn) leaderboardBtn.addEventListener('click', showLeaderboard);
  if (closeLeaderboardBtn) closeLeaderboardBtn.addEventListener('click', hideLeaderboard);
  if (closeLeaderboardBtn2) closeLeaderboardBtn2.addEventListener('click', hideLeaderboard);
  if (clearScoresBtn) clearScoresBtn.addEventListener('click', () => { localStorage.removeItem('vs_lite_highscores'); renderLeaderboard(); });

  // override gameOver to prompt for name and save score, then show leaderboard
  const _originalGameOver = gameOver;
  gameOver = function() {
    _originalGameOver();
    // prompt for name (non-blocking fallback if prompt is unavailable)
    let name = 'Player';
    try { const p = prompt('Game over! Enter your name for the leaderboard:', 'Player'); if (p !== null) name = p.trim() || 'Player'; } catch (e) { name = 'Player'; }
    try { saveHighScore(name, score || 0); } catch (e) { /* ignore storage errors */ }
    showLeaderboard();
  };

  // ensure modal hidden when resetting/starting
  function ensureModalHidden() { if (leaderboardModal) leaderboardModal.style.display = 'none'; }
  // hide on reset/start
  const _originalReset = reset;
  reset = function() { _originalReset(); ensureModalHidden(); };

  // Expose for debugging in console
  window.__vs_lite = { start, reset, showLeaderboard, getHighScores };

})();
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let W = canvas.width = innerWidth;
let H = canvas.height = innerHeight;

window.addEventListener('resize', ()=>{W = canvas.width = innerWidth; H = canvas.height = innerHeight});

// HUD elements
const scoreEl = document.getElementById('score');
const healthEl = document.getElementById('health');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const restartBtn = document.getElementById('restartBtn');

// Simple input
const input = {up:false,down:false,left:false,right:false,mouseX:W/2,mouseY:H/2};
addEventListener('keydown', e=>{if(e.key==='w'||e.key==='ArrowUp')input.up=true; if(e.key==='s'||e.key==='ArrowDown')input.down=true; if(e.key==='a'||e.key==='ArrowLeft')input.left=true; if(e.key==='d'||e.key==='ArrowRight')input.right=true});
addEventListener('keyup', e=>{if(e.key==='w'||e.key==='ArrowUp')input.up=false; if(e.key==='s'||e.key==='ArrowDown')input.down=false; if(e.key==='a'||e.key==='ArrowLeft')input.left=false; if(e.key==='d'||e.key==='ArrowRight')input.right=false});
canvas.addEventListener('mousemove', e=>{const r=canvas.getBoundingClientRect(); input.mouseX = e.clientX - r.left; input.mouseY = e.clientY - r.top});

class Player{
  constructor(){this.x=W/2; this.y=H/2; this.speed=260; this.radius=14; this.health=10}
  update(dt){
    let dx=0,dy=0;
    if(input.up)dy-=1; if(input.down)dy+=1; if(input.left)dx-=1; if(input.right)dx+=1;
    if(dx||dy){ const len=Math.hypot(dx,dy); dx/=len; dy/=len; this.x+=dx*this.speed*dt; this.y+=dy*this.speed*dt }
    // clamp
    this.x = Math.max(this.radius, Math.min(W-this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(H-this.radius, this.y));
  }
  draw(){
    // player body
    ctx.fillStyle='#b7e4ff'; ctx.beginPath(); ctx.arc(this.x,this.y,this.radius,0,Math.PI*2); ctx.fill();
    // aim indicator
    const ang = Math.atan2(input.mouseY - this.y, input.mouseX - this.x);
    ctx.strokeStyle='rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.moveTo(this.x,this.y); ctx.lineTo(this.x+Math.cos(ang)*30, this.y+Math.sin(ang)*30); ctx.stroke();
  }
}

class Projectile{
  constructor(x,y,dx,dy,owner='player'){
    this.x=x; this.y=y; this.vx=dx; this.vy=dy; this.speed=800; this.radius=4; this.owner=owner; this.life=2
  }
  update(dt){ this.x += this.vx*this.speed*dt; this.y += this.vy*this.speed*dt; this.life-=dt }
  draw(){ ctx.fillStyle='#ffd166'; ctx.beginPath(); ctx.arc(this.x,this.y,this.radius,0,Math.PI*2); ctx.fill() }
}

class Enemy{
  // hp: integer health; speed: base speed
  constructor(x,y,hp=1, speed=80){
    this.x = x; this.y = y; this.hp = hp; this.maxHp = hp;
    // size grows with hp
    this.radius = 8 + hp * 6; // base + per-hp growth
    // heavier enemies slightly slower
    this.speed = Math.max(20, speed * (1 - (hp-1) * 0.08));
  }
  update(dt, player){ const ang = Math.atan2(player.y - this.y, player.x - this.x); this.x += Math.cos(ang)*this.speed*dt; this.y += Math.sin(ang)*this.speed*dt }
  draw(){
    // body
    ctx.fillStyle = this.maxHp <= 2 ? '#ff6b6b' : (this.maxHp <=5 ? '#ff9f1c' : '#9b5de5');
    ctx.beginPath(); ctx.arc(this.x,this.y,this.radius,0,Math.PI*2); ctx.fill();
    // hp bar
    const barW = this.radius * 1.6; const barH = 4;
    const ratio = Math.max(0, this.hp / this.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(this.x - barW/2, this.y - this.radius - 10, barW, barH);
    ctx.fillStyle = '#4ade80'; ctx.fillRect(this.x - barW/2, this.y - this.radius - 10, barW * ratio, barH);
  }
}

// Game state
let player, projectiles, enemies, spawnTimer, score, running, lastTime, autofireTimer, spawnInterval;

function reset(){ player = new Player(); projectiles = []; enemies = []; spawnTimer = 0; score = 0; running = false; paused = false; autofireTimer = 0; spawnInterval = 0.9; updateHUD(); pauseBtn.textContent = 'Pause'; pauseBtn.style.display = 'none'; }

let paused = false;

function start(){ reset(); running = true; startBtn.style.display='none'; restartBtn.style.display='none'; pauseBtn.style.display = 'inline-block'; lastTime = performance.now(); requestAnimationFrame(loop) }
function gameOver(){ running = false; restartBtn.style.display='inline-block'; startBtn.style.display='none'; pauseBtn.style.display = 'none'; }

startBtn.addEventListener('click', ()=>start());
restartBtn.addEventListener('click', ()=>start());
pauseBtn.addEventListener('click', ()=>{
  if(!running) return;
  paused = !paused;
  pauseBtn.textContent = paused ? 'Resume' : 'Pause';
});

function updateHUD(){ scoreEl.textContent = `Score: ${score}`; healthEl.textContent = `Health: ${player.health}` }

function spawnEnemy(){
  // spawn at random edge
  const side = Math.floor(Math.random()*4);
  let x,y; if(side===0){ x = -20; y = Math.random()*H }
  else if(side===1){ x = W+20; y = Math.random()*H }
  else if(side===2){ x = Math.random()*W; y = -20 }
  else { x = Math.random()*W; y = H+20 }
  // choose HP distribution: common small, rarer big enemies
  const r = Math.random();
  let hp;
  if(r < 0.6) hp = 1;
  else if(r < 0.9) hp = 3;
  else if(r < 0.99) hp = 6;
  else hp = 12; // very rare boss
  const spd = 40 + Math.random()*80 + Math.min(120, Math.floor(score/10)*5);
  enemies.push(new Enemy(x, y, hp, spd));
}

function loop(ts){
  if(!running) return;
  const dt = Math.min(0.05, (ts - lastTime)/1000); lastTime = ts;
  // update (skip updates when paused)
  if(!paused){
    player.update(dt);
    autofireTimer -= dt; if(autofireTimer <= 0){ autofireTimer = 0.15; // fire
      const ang = Math.atan2(input.mouseY - player.y, input.mouseX - player.x);
      // small spread of 3 projectiles
      for(let i=-1;i<=1;i++){
        const a = ang + i*0.12; projectiles.push(new Projectile(player.x + Math.cos(a)*18, player.y + Math.sin(a)*18, Math.cos(a), Math.sin(a)))
      }
    }

    projectiles = projectiles.filter(p=>p.life>0 && p.x>-100 && p.x<W+100 && p.y>-100 && p.y<H+100);
    projectiles.forEach(p=>p.update(dt));

    enemies.forEach(e=>e.update(dt, player));

    // collisions: projectiles -> enemies (damage, larger enemies take multiple hits)
    for(let i=enemies.length-1;i>=0;i--){
      const e = enemies[i];
      for(let j=projectiles.length-1;j>=0;j--){
        const p = projectiles[j]; if(p.owner!=='player') continue;
        const dx = e.x - p.x; const dy = e.y - p.y; const dist = Math.hypot(dx,dy);
        if(dist < e.radius + p.radius){
          projectiles.splice(j,1);
          e.hp -= 1;
          if(e.hp <= 0){ enemies.splice(i,1); score += e.maxHp; updateHUD(); }
          break;
        }
      }
    }

    // enemy -> player collisions
    for(let i=enemies.length-1;i>=0;i--){ const e = enemies[i]; const d = Math.hypot(e.x-player.x, e.y-player.y); if(d < e.radius + player.radius){ enemies.splice(i,1); player.health -= 1; updateHUD(); if(player.health<=0){ gameOver(); return } } }

    // spawn logic
    spawnTimer += dt; if(spawnTimer >= spawnInterval){ spawnTimer = 0; spawnEnemy(); // gradually increase difficulty
      spawnInterval = Math.max(0.25, spawnInterval - 0.01);
    }
  }

  // draw
  ctx.clearRect(0,0,W,H);
  // background subtle grid
  ctx.fillStyle = '#0b0b10'; ctx.fillRect(0,0,W,H);
  player.draw(); projectiles.forEach(p=>p.draw()); enemies.forEach(e=>e.draw());

  // paused overlay
  if(paused){
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle = 'white'; ctx.font = '48px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('PAUSED', W/2, H/2);
  }

  // simple particle / effects could be added here

  requestAnimationFrame(loop);
}

// init
reset();
// auto-start hint: show start button

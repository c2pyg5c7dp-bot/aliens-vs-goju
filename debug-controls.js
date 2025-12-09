// Enemy speed debug control
window.ENEMY_BASE_SPEED = 198; // Global variable for enemy speed

const enemySpeedSlider = document.getElementById('enemySpeedSlider');
const enemySpeedValue = document.getElementById('enemySpeedValue');
const enemySpeedPercent = document.getElementById('enemySpeedPercent');
const enemySpeedInc = document.getElementById('enemySpeedInc');
const enemySpeedDec = document.getElementById('enemySpeedDec');

function updateEnemySpeed(speed){
  window.ENEMY_BASE_SPEED = parseInt(speed);
  enemySpeedValue.textContent = speed;
  enemySpeedSlider.value = speed;
  const percent = Math.round((speed / 220) * 100);
  enemySpeedPercent.textContent = percent + '%';
  
  // Update existing enemies
  if(window.enemies){
    window.enemies.forEach(e => {
      e.speed = window.ENEMY_BASE_SPEED;
    });
  }
  console.log('Enemy speed updated to:', speed);
}

if(enemySpeedSlider){
  enemySpeedSlider.addEventListener('input', (e) => {
    updateEnemySpeed(e.target.value);
  });
}

if(enemySpeedInc){
  enemySpeedInc.addEventListener('click', () => {
    const newSpeed = Math.min(300, window.ENEMY_BASE_SPEED + 10);
    updateEnemySpeed(newSpeed);
  });
}

if(enemySpeedDec){
  enemySpeedDec.addEventListener('click', () => {
    const newSpeed = Math.max(50, window.ENEMY_BASE_SPEED - 10);
    updateEnemySpeed(newSpeed);
  });
}

// Test Runner
const testOutput = document.getElementById('testOutput');
const runTestBtn = document.getElementById('runTestBtn');

function log(msg, type='info'){ const div = document.createElement('div'); div.style.color = type === 'pass'? '#0f0' : type === 'fail'? '#f00' : '#0f0'; div.textContent = msg; testOutput.appendChild(div); testOutput.scrollTop = testOutput.scrollHeight; }
function test(name, fn){ try{ fn(); log(`✓ ${name}`, 'pass'); } catch(e){ log(`✗ ${name}: ${e.message}`, 'fail'); } }

if(runTestBtn){
  runTestBtn.addEventListener('click', ()=>{
    testOutput.innerHTML = '';
    log('Starting tests...', 'info');

    // Wait for game to be ready
    if(!window.player || !window.resetGame || !window.input){
      log('⚠ Game not ready yet. Waiting...', 'info');
      setTimeout(()=>{
        if(runTestBtn) runTestBtn.click();
      }, 500);
      return;
    }

    // Test 1: Player exists
    test('Player initialized', ()=>{ if(!window.player || !window.player.x) throw new Error('Player not found'); });

    // Test 2: Game state exists
    test('Game state exists', ()=>{ if(typeof window.running === 'undefined') throw new Error('Game state missing'); });

    // Test 3: Reset game
    test('Reset game', ()=>{ if(typeof window.resetGame !== 'function') throw new Error('resetGame not found'); window.resetGame(); if(window.score !== 0) throw new Error('Score not reset'); if(window.enemies.length !== 0) throw new Error('Enemies not cleared'); });

    // Test 4: Spawn wave (must call resetGame first)
    test('Spawn wave', ()=>{ 
      window.resetGame(); // Reset game state before spawning wave
      if(typeof window.startWave !== 'function') throw new Error('startWave not found'); 
      if(!window.diffMod || !window.diffMod.spawnRate) throw new Error('Difficulty modifiers not set');
      const beforeCount = window.enemies.length;
      window.startWave(); 
      const afterCount = window.enemies.length;
      if(afterCount <= beforeCount) throw new Error(`Wave did not spawn enemies. Before: ${beforeCount}, After: ${afterCount}`); 
    });

    // Test 5: Fire projectile (must call resetGame first)
    test('Fire projectile', ()=>{ 
      window.resetGame(); // Reset game state before firing
      window.player.fireTimer = -1; 
      window.input.mouseX = window.player.x + 100; 
      window.input.mouseY = window.player.y; 
      if(typeof window.update !== 'function') throw new Error('update function not found');
      window.update(0.016); 
      if(window.projectiles.length === 0) throw new Error('No projectile fired: ' + window.projectiles.length); 
    });

    // Test 6: Collision (manual spawn)
    test('Spawn gem', ()=>{ const gem = new window.Gem(window.player.x + 5, window.player.y + 5, 10); window.gems.push(gem); if(window.gems.length === 0) throw new Error('Gem not added'); });

    // Test 7: Update simulation
    test('Update simulation (10 frames)', ()=>{ for(let i=0; i<10; i++){ window.update(0.016); } log(`  Score: ${window.score}, Enemies: ${window.enemies.length}, Projectiles: ${window.projectiles.length}`, 'info'); });

    // Test 8: Leaderboard functions
    test('Leaderboard save/load', ()=>{ window.saveHighScore('TestPlayer', 500); const scores = window.getHighScores(); if(!scores.find(s=>s.name==='TestPlayer' && s.score===500)) throw new Error('Score not saved'); });

    // Test 9: Reward modal
    test('Reward modal exists', ()=>{ if(!document.getElementById('rewardModal')) throw new Error('Reward modal not found'); });

    // Test 10: Draw function
    test('Draw function callable', ()=>{ if(typeof window.draw !== 'function') throw new Error('Draw not found'); window.draw(); });

    log('Tests complete!', 'pass');
  });
} else {
  console.warn('runTestBtn not found in DOM; tests button disabled.');
}

// Debug console mobile-friendly controls
const dbgMinimize = document.getElementById('dbgMinimize');
const dbgTab = document.getElementById('dbgTab');
const testRunner = document.getElementById('testRunner');

let touchStartX = 0;
let touchStartY = 0;
let isDebugOpen = false;

function openDebug() {
  if (testRunner && dbgTab) {
    testRunner.style.display = 'block';
    dbgTab.style.display = 'none';
    isDebugOpen = true;
  }
}

function closeDebug() {
  if (testRunner && dbgTab) {
    testRunner.style.display = 'none';
    dbgTab.style.display = 'flex';
    isDebugOpen = false;
  }
}

// Tab click to open debug
if (dbgTab) {
  dbgTab.addEventListener('click', openDebug);
}

// Minimize button to close
if (dbgMinimize) {
  dbgMinimize.addEventListener('click', closeDebug);
}

// Swipe right to close on mobile
if (testRunner) {
  testRunner.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  testRunner.addEventListener('touchmove', (e) => {
    if (!touchStartX) return;
    
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    const diffX = touchX - touchStartX;
    const diffY = touchY - touchStartY;
    
    // If swiping right more than down/up
    if (Math.abs(diffX) > Math.abs(diffY) && diffX > 50) {
      testRunner.style.transform = `translateX(${Math.min(diffX, 300)}px)`;
    }
  }, { passive: true });

  testRunner.addEventListener('touchend', (e) => {
    if (!touchStartX) return;
    
    const touchX = e.changedTouches[0].clientX;
    const diffX = touchX - touchStartX;
    
    // If swiped right more than 100px, close it
    if (diffX > 100) {
      closeDebug();
    }
    
    // Reset transform
    testRunner.style.transform = 'translateX(0)';
    touchStartX = 0;
    touchStartY = 0;
  }, { passive: true });
}

// Start with tab showing, debug hidden
if (dbgTab) {
  dbgTab.style.display = 'flex';
}
if (testRunner) {
  testRunner.style.display = 'none';
}

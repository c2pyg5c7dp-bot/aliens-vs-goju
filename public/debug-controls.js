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

// Load animations when scripts are ready
setTimeout(()=>{
  if(window.playerAnimController){
    console.info('Loading player animations...');
    window.playerAnimController.loadAll();
  }
  if(window.enemyAnimController){
    console.info('Loading enemy animations...');
    window.enemyAnimController.loadAll();
  }
}, 100);

// Test Runner
const testOutput = document.getElementById('testOutput');
const testRunner = document.getElementById('testRunner');
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

// Debug console minimize/maximize
const dbgMinimize = document.getElementById('dbgMinimize');
const dbgContent = document.getElementById('dbgContent');
let isMinimized = false;

if (dbgMinimize && dbgContent) {
  dbgMinimize.addEventListener('click', () => {
    isMinimized = !isMinimized;
    if (isMinimized) {
      dbgContent.style.display = 'none';
      dbgMinimize.textContent = '+';
      testRunner.style.maxHeight = 'auto';
      testRunner.style.width = '150px';
    } else {
      dbgContent.style.display = 'block';
      dbgMinimize.textContent = '−';
      testRunner.style.maxHeight = '400px';
      testRunner.style.width = '280px';
    }
  });
}

// Show test runner on load after a delay
setTimeout(()=>{ testRunner.style.display = 'block'; }, 500);

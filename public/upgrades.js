// Permanent Upgrades UI
console.log('💎 upgrades.js loading...');

// Upgrade costs and max levels
const UPGRADE_COSTS = {
  maxHealth: [50, 75, 100, 150, 200, 250, 300, 400, 500, 600],
  damage: [40, 60, 80, 120, 160, 200, 250, 300, 400, 500],
  fireRate: [40, 60, 80, 120, 160, 200, 250, 300, 400, 500],
  moveSpeed: [40, 60, 80, 120, 160, 200, 250, 300, 400, 500],
  gemMagnet: [30, 50, 75, 100, 150]
};

const UPGRADE_NAMES = {
  maxHealth: '❤️ Max Health',
  damage: '⚔️ Damage',
  fireRate: '⚡ Fire Rate',
  moveSpeed: '🏃 Move Speed',
  gemMagnet: '🧲 Gem Magnet'
};

const UPGRADE_DESCRIPTIONS = {
  maxHealth: '+2 HP per level',
  damage: '+10% damage per level',
  fireRate: '+5% fire rate per level',
  moveSpeed: '+5% speed per level',
  gemMagnet: '+20% pickup range per level'
};

function renderUpgrades() {
  const upgradesList = document.getElementById('upgradesList');
  const totalGemsDisplay = document.getElementById('totalGemsDisplay');
  const totalGemsUpgrade = document.getElementById('totalGemsUpgrade');
  
  if (!upgradesList) return;
  
  // Update gem displays
  if (totalGemsDisplay) totalGemsDisplay.textContent = window.totalGems || 0;
  if (totalGemsUpgrade) totalGemsUpgrade.textContent = window.totalGems || 0;
  
  upgradesList.innerHTML = '';
  
  Object.keys(UPGRADE_COSTS).forEach(upgradeKey => {
    const currentLevel = window.permanentUpgrades[upgradeKey] || 0;
    const maxLevel = UPGRADE_COSTS[upgradeKey].length;
    const isMaxed = currentLevel >= maxLevel;
    const cost = isMaxed ? 0 : UPGRADE_COSTS[upgradeKey][currentLevel];
    const canAfford = window.totalGems >= cost;
    
    const upgradeCard = document.createElement('div');
    upgradeCard.style.cssText = `
      background: rgba(0, 0, 0, 0.4);
      border: 2px solid ${isMaxed ? '#ffd700' : '#7ee787'};
      border-radius: 12px;
      padding: 20px;
      position: relative;
    `;
    
    upgradeCard.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <h3 style="margin: 0; font-size: 20px;">${UPGRADE_NAMES[upgradeKey]}</h3>
        <span style="font-size: 18px; color: ${isMaxed ? '#ffd700' : '#7ee787'};">
          Lv ${currentLevel}/${maxLevel}
        </span>
      </div>
      <p style="font-size: 14px; opacity: 0.8; margin: 5px 0;">${UPGRADE_DESCRIPTIONS[upgradeKey]}</p>
      <div style="background: rgba(255, 255, 255, 0.1); height: 8px; border-radius: 4px; overflow: hidden; margin: 10px 0;">
        <div style="background: linear-gradient(90deg, #7ee787, #4ade80); height: 100%; width: ${(currentLevel / maxLevel) * 100}%; transition: width 0.3s;"></div>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px;">
        <span style="font-size: 16px; color: #ffff00;">
          ${isMaxed ? '✓ MAXED' : `💎 ${cost} gems`}
        </span>
        <button 
          class="upgrade-buy-btn" 
          data-upgrade="${upgradeKey}"
          style="
            background: ${isMaxed ? '#666' : canAfford ? '#4CAF50' : '#555'};
            color: ${isMaxed || !canAfford ? '#999' : '#fff'};
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: bold;
            cursor: ${isMaxed || !canAfford ? 'not-allowed' : 'pointer'};
            transition: all 0.2s;
          "
          ${isMaxed || !canAfford ? 'disabled' : ''}
        >
          ${isMaxed ? 'MAXED' : 'UPGRADE'}
        </button>
      </div>
    `;
    
    upgradesList.appendChild(upgradeCard);
  });
  
  // Add event listeners to upgrade buttons
  document.querySelectorAll('.upgrade-buy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const upgradeKey = btn.dataset.upgrade;
      purchaseUpgrade(upgradeKey);
    });
  });
}

function purchaseUpgrade(upgradeKey) {
  const currentLevel = window.permanentUpgrades[upgradeKey] || 0;
  const maxLevel = UPGRADE_COSTS[upgradeKey].length;
  
  if (currentLevel >= maxLevel) {
    console.log('Upgrade already maxed');
    return;
  }
  
  const cost = UPGRADE_COSTS[upgradeKey][currentLevel];
  
  if (window.totalGems < cost) {
    console.log('Not enough gems');
    return;
  }
  
  // Purchase upgrade
  window.totalGems -= cost;
  window.permanentUpgrades[upgradeKey]++;
  
  // Save to localStorage
  if (window.savePermanentUpgrades) {
    window.savePermanentUpgrades();
  }
  
  // Play success sound
  if (window.beep) {
    window.beep(800, 0.08, 'sine', 0.003);
    window.beep(1200, 0.12, 'sine', 0.003);
  }
  
  // Re-render upgrades
  renderUpgrades();
}

// Setup UI when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const upgradesBtn = document.getElementById('upgradesBtn');
  const closeUpgrades = document.getElementById('closeUpgrades');
  const upgradesScreen = document.getElementById('upgradesScreen');
  const startScreen = document.getElementById('startScreen');
  
  if (upgradesBtn) {
    upgradesBtn.addEventListener('click', () => {
      if (startScreen) startScreen.style.display = 'none';
      if (upgradesScreen) {
        upgradesScreen.style.display = 'flex';
        renderUpgrades();
      }
    });
  }
  
  if (closeUpgrades) {
    closeUpgrades.addEventListener('click', () => {
      if (upgradesScreen) upgradesScreen.style.display = 'none';
      if (startScreen) startScreen.style.display = 'flex';
      // Update gem count on main menu
      const totalGemsDisplay = document.getElementById('totalGemsDisplay');
      if (totalGemsDisplay) totalGemsDisplay.textContent = window.totalGems || 0;
    });
  }
  
  // Initial render of gem count
  const totalGemsDisplay = document.getElementById('totalGemsDisplay');
  if (totalGemsDisplay) totalGemsDisplay.textContent = window.totalGems || 0;
});

console.log('✅ upgrades.js loaded');

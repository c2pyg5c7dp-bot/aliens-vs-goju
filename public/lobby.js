// Lobby functionality for co-op mode
console.log('🎮 lobby.js loading...');

// Create visible debug indicator
const debugDiv = document.createElement('div');
debugDiv.id = 'lobbyDebug';
debugDiv.style.cssText = 'position: fixed; top: 10px; right: 10px; background: lime; color: black; padding: 10px; z-index: 999999; font-size: 11px; border-radius: 5px; max-width: 350px; max-height: 400px; overflow-y: auto;';
debugDiv.innerHTML = 'Lobby script loaded ✅<br>DOM ready: ' + document.readyState;

// Wait for body to exist before appending
if (document.body) {
  document.body.appendChild(debugDiv);
} else {
  window.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('lobbyDebug')) {
      document.body.appendChild(debugDiv);
    }
  });
}

// Log script loads
window.addEventListener('load', () => {
  if (debugDiv) debugDiv.innerHTML += '<br>Window loaded ✅';
  if (debugDiv) debugDiv.innerHTML += '<br>game.v2.js: ' + (typeof window.startGameWithCharacter !== 'undefined' ? '✅' : '❌ NOT LOADED');
});

// Lobby state
const lobbyState = {
  code: null,
  myCharacter: null
};

function generateLobbyCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function getCharacterEmoji(char) {
  const emojiMap = {
    'player': '🧙',
    'tank': '🛡️',
    'speedster': '⚡',
    'glass-cannon': '💥'
  };
  return emojiMap[char] || '❓';
}

function getCharacterName(char) {
  const nameMap = {
    'player': 'Player (Balanced)',
    'tank': 'Tank (Tanky)',
    'speedster': 'Speedster (Fast)',
    'glass-cannon': 'Glass Cannon (High DMG)'
  };
  return nameMap[char] || char;
}

function updateLobbyDisplay() {
  const playersListContent = document.getElementById('playersListContent');
  const lobbyStatus = document.getElementById('lobbyStatus');
  const selectedCharName = document.getElementById('selectedCharName');
  
  if (selectedCharName) {
    selectedCharName.textContent = lobbyState.myCharacter ? getCharacterName(lobbyState.myCharacter) : 'None';
  }
  
  if (playersListContent) {
    const username = 'Player';
    const playerHtml = `
      <div style="padding: 10px; background: rgba(76, 175, 80, 0.2); border-radius: 8px; border: 2px solid #4CAF50;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="font-size: 30px;">${lobbyState.myCharacter ? getCharacterEmoji(lobbyState.myCharacter) : '❓'}</div>
            <div style="text-align: left;">
              <div style="font-weight: bold; font-size: 16px;">${username} (You)</div>
              <div style="font-size: 12px; opacity: 0.7;">${lobbyState.myCharacter ? getCharacterName(lobbyState.myCharacter) : 'No character selected'}</div>
            </div>
          </div>
          <div style="background: #4CAF50; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">HOST</div>
        </div>
      </div>
      <div style="padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px; font-style: italic; opacity: 0.6;">
        <div>Waiting for other players to join...</div>
        <div style="font-size: 12px; margin-top: 5px;">Share the lobby code: ${lobbyState.code || 'XXXX'}</div>
      </div>
    `;
    playersListContent.innerHTML = playerHtml;
  }
  
  if (lobbyStatus) {
    lobbyStatus.textContent = lobbyState.myCharacter 
      ? `Ready! Code: ${lobbyState.code}` 
      : 'Select your character to continue';
  }
}

// Initialize lobby when co-op button is clicked
document.addEventListener('DOMContentLoaded', () => {
  console.log('🎮 Setting up lobby listeners...');
  
  // Co-op button
  const coopBtn = document.getElementById('coopBtn');
  const debugDiv = document.getElementById('lobbyDebug');
  if (coopBtn) {
    if (debugDiv) debugDiv.innerHTML += '<br>Co-op button found ✅';
    coopBtn.addEventListener('click', () => {
      console.log('Co-op clicked!');
      if (debugDiv) debugDiv.innerHTML += '<br>Co-op clicked! 🎮';
      
      // Generate lobby code
      lobbyState.code = generateLobbyCode();
      const lobbyCodeDisplay = document.getElementById('lobbyCodeDisplay');
      if (lobbyCodeDisplay) lobbyCodeDisplay.value = lobbyState.code;
      if (debugDiv) debugDiv.innerHTML += '<br>Code: ' + lobbyState.code;
      
      // Show lobby
      const startScreen = document.getElementById('startScreen');
      const lobbyScreen = document.getElementById('lobbyScreen');
      if (startScreen) startScreen.style.display = 'none';
      if (lobbyScreen) lobbyScreen.style.display = 'flex';
      if (debugDiv) debugDiv.innerHTML += '<br>Lobby shown ✅';
      
      updateLobbyDisplay();
    });
  } else {
    if (debugDiv) debugDiv.innerHTML += '<br>❌ Co-op button NOT found!';
  }
  
  // Copy button
  const copyBtn = document.getElementById('copyLobbyCode');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(lobbyState.code).then(() => {
        copyBtn.textContent = '✅ Copied!';
        setTimeout(() => copyBtn.textContent = '📋 Copy', 2000);
      });
    });
  }
  
  // Share button
  const shareBtn = document.getElementById('shareLobbyCode');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      const shareText = `Join my Aliens vs Goju co-op game! Code: ${lobbyState.code}`;
      if (navigator.share) {
        navigator.share({ text: shareText });
      } else {
        navigator.clipboard.writeText(shareText);
        shareBtn.textContent = '✅ Copied!';
        setTimeout(() => shareBtn.textContent = '🔗 Share', 2000);
      }
    });
  }
  
  // Character selection in lobby
  const charCards = document.querySelectorAll('.lobby-char-card');
  charCards.forEach(card => {
    card.addEventListener('click', () => {
      const character = card.getAttribute('data-character');
      console.log('Character selected in lobby:', character);
      
      // Update UI
      charCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      
      // Update state
      lobbyState.myCharacter = character;
      
      // Refresh display
      updateLobbyDisplay();
    });
  });
  
  // Start button
  const startCoopBtn = document.getElementById('startCoopBtn');
  if (startCoopBtn) {
    startCoopBtn.addEventListener('click', () => {
    if (!lobbyState.myCharacter) {
      console.warn('Please select a character first!');
      window.debugLog?.('⚠️ Please select a character first!');
      // Flash the character selection section
      const charSection = document.querySelector('.lobby-char-card')?.parentElement?.parentElement;
      if (charSection) {
        charSection.style.animation = 'shake 0.3s';
        setTimeout(() => charSection.style.animation = '', 300);
      }
      return;
    }      console.log('Starting game with:', lobbyState.myCharacter);
      
      // Hide lobby
      const lobbyScreen = document.getElementById('lobbyScreen');
      if (lobbyScreen) lobbyScreen.style.display = 'none';
      
      // Start game with selected character
      if (typeof window.startGameWithCharacter === 'function') {
        window.startGameWithCharacter(lobbyState.myCharacter);
      } else {
        console.log('Waiting for game to load...');
        setTimeout(() => {
          if (typeof window.startGameWithCharacter === 'function') {
            window.startGameWithCharacter(lobbyState.myCharacter);
          }
        }, 500);
      }
    });
  }
  
  // Leave button
  const leaveLobbyBtn = document.getElementById('leaveLobbyBtn');
  if (leaveLobbyBtn) {
    leaveLobbyBtn.addEventListener('click', () => {
      const lobbyScreen = document.getElementById('lobbyScreen');
      const startScreen = document.getElementById('startScreen');
      
      if (lobbyScreen) lobbyScreen.style.display = 'none';
      if (startScreen) startScreen.style.display = 'flex';
      
      // Reset state
      lobbyState.code = null;
      lobbyState.myCharacter = null;
    });
  }
  
  console.log('✅ Lobby listeners set up!');
});

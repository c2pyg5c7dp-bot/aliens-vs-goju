// Lobby functionality for co-op mode
console.log('🎮 lobby.js loading...');

// Get lobby debug section from main debug panel
function getLobbyDebugDiv() {
  return document.getElementById('lobbyDebugSection');
}

function logToLobbyDebug(msg) {
  const lobbyDebugDiv = getLobbyDebugDiv();
  if (lobbyDebugDiv) {
    lobbyDebugDiv.innerHTML += '<br>' + msg;
  }
}

// Log initial load
window.addEventListener('DOMContentLoaded', () => {
  logToLobbyDebug('Lobby script loaded ✅');
  logToLobbyDebug('DOM ready: ' + document.readyState);
});

// Log script loads
window.addEventListener('load', () => {
  logToLobbyDebug('Window loaded ✅');
  logToLobbyDebug('game.main.js: ' + (typeof window.startGameWithCharacter !== 'undefined' ? '✅' : '❌ NOT LOADED'));
});

// Lobby state
const lobbyState = {
  code: null,
  myCharacter: null,
  isHost: false
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
    const hostBadge = lobbyState.isHost 
      ? '<div style="background: #4CAF50; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">HOST</div>'
      : '<div style="background: #2196F3; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">JOINED</div>';
    
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
          ${hostBadge}
        </div>
      </div>
      <div style="padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px; font-style: italic; opacity: 0.6;">
        <div>${lobbyState.isHost ? 'Waiting for other players to join...' : 'Waiting for host to start...'}</div>
        <div style="font-size: 12px; margin-top: 5px;">${lobbyState.isHost ? 'Share the lobby code:' : 'Lobby code:'} ${lobbyState.code || 'XXXX'}</div>
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
  if (coopBtn) {
    logToLobbyDebug('Co-op button found ✅');
    coopBtn.addEventListener('click', () => {
      console.log('Co-op clicked!');
      logToLobbyDebug('Co-op clicked! 🎮');
      
      // Generate lobby code
      lobbyState.code = generateLobbyCode();
      lobbyState.isHost = true;
      const lobbyCodeDisplay = document.getElementById('lobbyCodeDisplay');
      if (lobbyCodeDisplay) lobbyCodeDisplay.value = lobbyState.code;
      logToLobbyDebug('Code: ' + lobbyState.code);
      
      // Show lobby
      const startScreen = document.getElementById('startScreen');
      const lobbyScreen = document.getElementById('lobbyScreen');
      if (startScreen) startScreen.style.display = 'none';
      if (lobbyScreen) lobbyScreen.style.display = 'flex';
      logToLobbyDebug('Lobby shown ✅');
      
      updateLobbyDisplay();
    });
  } else {
    logToLobbyDebug('❌ Co-op button NOT found!');
  }

  // Join Lobby button
  const joinLobbyBtn = document.getElementById('joinLobbyBtn');
  const joinLobbyModal = document.getElementById('joinLobbyModal');
  const joinLobbyConfirm = document.getElementById('joinLobbyConfirm');
  const joinLobbyCancel = document.getElementById('joinLobbyCancel');
  const lobbyCodeInput = document.getElementById('lobbyCodeInput');
  const joinError = document.getElementById('joinError');
  
  if (joinLobbyBtn && joinLobbyModal) {
    logToLobbyDebug('Join Lobby button found ✅');
    
    // Show modal when button clicked
    joinLobbyBtn.addEventListener('click', () => {
      console.log('Join Lobby clicked!');
      logToLobbyDebug('Join Lobby clicked! 🔗');
      joinLobbyModal.style.display = 'flex';
      lobbyCodeInput.value = '';
      joinError.textContent = '';
      lobbyCodeInput.focus();
    });
    
    // Cancel button
    joinLobbyCancel.addEventListener('click', () => {
      joinLobbyModal.style.display = 'none';
      lobbyCodeInput.value = '';
      joinError.textContent = '';
    });
    
    // Confirm button
    joinLobbyConfirm.addEventListener('click', () => {
      const code = lobbyCodeInput.value.toUpperCase().trim();
      
      // Validate code
      if (code.length !== 4) {
        joinError.textContent = '⚠️ Code must be 4 characters';
        return;
      }
      
      if (!/^[A-Z0-9]{4}$/.test(code)) {
        joinError.textContent = '⚠️ Code must be letters and numbers only';
        return;
      }
      
      console.log('Joining lobby with code:', code);
      logToLobbyDebug('Joining lobby: ' + code);
      
      // Set lobby state as joiner
      lobbyState.code = code;
      lobbyState.isHost = false;
      
      // Hide modal and start screen
      joinLobbyModal.style.display = 'none';
      const startScreen = document.getElementById('startScreen');
      const lobbyScreen = document.getElementById('lobbyScreen');
      if (startScreen) startScreen.style.display = 'none';
      if (lobbyScreen) lobbyScreen.style.display = 'flex';
      
      // Update lobby display for joined lobby
      const lobbyCodeDisplay = document.getElementById('lobbyCodeDisplay');
      if (lobbyCodeDisplay) lobbyCodeDisplay.value = code;
      
      updateLobbyDisplay();
      
      // TODO: Actual multiplayer connection would go here
      // For now, just show the lobby screen
      logToLobbyDebug('Joined lobby ✅');
    });
    
    // Auto-uppercase input
    lobbyCodeInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.toUpperCase();
    });
    
    // Enter key to submit
    lobbyCodeInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        joinLobbyConfirm.click();
      }
    });
  } else {
    logToLobbyDebug('❌ Join Lobby elements NOT found!');
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

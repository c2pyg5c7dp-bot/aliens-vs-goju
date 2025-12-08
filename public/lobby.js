/**
 * Lobby functionality for co-op multiplayer mode
 * Handles room creation, joining, character selection, and game start
 */

console.log('🎮 lobby.js loading...');

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get lobby debug section from main debug panel
 */
function getLobbyDebugDiv() {
  return document.getElementById('lobbyDebugSection');
}

/**
 * Log message to lobby debug panel
 */
function logToLobbyDebug(msg) {
  const lobbyDebugDiv = getLobbyDebugDiv();
  if (lobbyDebugDiv) {
    lobbyDebugDiv.innerHTML += '<br>' + msg;
  }
}

// ============================================================================
// LOBBY STATE
// ============================================================================

const lobbyState = {
  code: null,
  myCharacter: null,
  isHost: false,
  shareableCode: null,
  hostPeerId: null
};

// ============================================================================
// CHARACTER HELPERS
// ============================================================================

const CHARACTER_EMOJIS = {
  'player': '🧙',
  'tank': '🛡️',
  'speedster': '⚡',
  'glass-cannon': '💥'
};

const CHARACTER_NAMES = {
  'player': 'Player (Balanced)',
  'tank': 'Tank (Tanky)',
  'speedster': 'Speedster (Fast)',
  'glass-cannon': 'Glass Cannon (High DMG)'
};

/**
 * Get emoji for character
 */
function getCharacterEmoji(char) {
  return CHARACTER_EMOJIS[char] || '❓';
}

/**
 * Get display name for character
 */
function getCharacterName(char) {
  return CHARACTER_NAMES[char] || char;
}

// ============================================================================
// UI UPDATE FUNCTIONS
// ============================================================================

/**
 * Update lobby UI with current player list and status
 */
function updateLobbyDisplay() {
  updatePlayersList();
  updateLobbyStatus();
  updateSelectedCharacter();
}

/**
 * Update players list UI
 */
function updatePlayersList() {
  const playersListContent = document.getElementById('playersListContent');
  if (!playersListContent) return;
  
  const allPlayers = window.networkManager ? window.networkManager.getPlayers() : [];
  let playersHtml = '';
  
  // Add local player
  playersHtml += createLocalPlayerCard();
  
  // Add remote players
  allPlayers.filter(p => !p.isLocal).forEach(player => {
    playersHtml += createRemotePlayerCard(player);
  });
  
  // Show waiting message if alone
  if (allPlayers.filter(p => !p.isLocal).length === 0) {
    playersHtml += createWaitingMessage();
  }
  
  playersListContent.innerHTML = playersHtml;
}

/**
 * Create local player card HTML
 */
function createLocalPlayerCard() {
  const username = 'Player' + (window.networkManager?.localPlayerId?.slice(-4) || '');
  const hostBadge = lobbyState.isHost 
    ? '<div style="background: #4CAF50; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">HOST</div>'
    : '<div style="background: #2196F3; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">JOINED</div>';
  
  return `
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
  `;
}

/**
 * Create remote player card HTML
 */
function createRemotePlayerCard(player) {
  const playerBadge = '<div style="background: #666; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">PLAYER</div>';
  
  return `
    <div style="padding: 10px; background: rgba(33, 150, 243, 0.2); border-radius: 8px; border: 2px solid #2196F3;">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="font-size: 30px;">${player.character ? getCharacterEmoji(player.character) : '❓'}</div>
          <div style="text-align: left;">
            <div style="font-weight: bold; font-size: 16px;">${player.name}</div>
            <div style="font-size: 12px; opacity: 0.7;">${player.character ? getCharacterName(player.character) : 'Selecting...'}</div>
          </div>
        </div>
        ${playerBadge}
      </div>
    </div>
  `;
}

/**
 * Create waiting message HTML
 */
function createWaitingMessage() {
  return `
    <div style="padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px; font-style: italic; opacity: 0.6;">
      <div>${lobbyState.isHost ? 'Waiting for other players to join...' : 'Waiting for host to start...'}</div>
      <div style="font-size: 12px; margin-top: 5px;">${lobbyState.isHost ? 'Share the lobby code:' : 'Lobby code:'} ${lobbyState.code || 'XXXX'}</div>
    </div>
  `;
}

/**
 * Update lobby status text
 */
function updateLobbyStatus() {
  const lobbyStatus = document.getElementById('lobbyStatus');
  if (lobbyStatus) {
    lobbyStatus.textContent = lobbyState.myCharacter 
      ? `Ready! Code: ${lobbyState.code}` 
      : 'Select your character to continue';
  }
}

/**
 * Update selected character display
 */
function updateSelectedCharacter() {
  const selectedCharName = document.getElementById('selectedCharName');
  if (selectedCharName) {
    selectedCharName.textContent = lobbyState.myCharacter 
      ? getCharacterName(lobbyState.myCharacter) 
      : 'None';
  }
}

// ============================================================================
// NETWORK CALLBACKS
// ============================================================================

/**
 * Setup network manager callbacks
 */
function setupNetworkCallbacks() {
  if (!window.networkManager) return;
  
  window.networkManager.onPlayerJoined = (playerId, playerName) => {
    console.log('👋 Player joined:', playerName);
    logToLobbyDebug(`✅ ${playerName} joined!`);
    updateLobbyDisplay();
  };
  
  window.networkManager.onPlayerLeft = (playerId) => {
    console.log('👋 Player left:', playerId);
    logToLobbyDebug(`❌ Player left: ${playerId}`);
    updateLobbyDisplay();
  };
  
  window.networkManager.onStartGame = (players) => {
    console.log('🎮 Game starting with players:', players);
    const lobbyScreen = document.getElementById('lobbyScreen');
    if (lobbyScreen) lobbyScreen.style.display = 'none';
    
    if (lobbyState.myCharacter && typeof window.startGameWithCharacter === 'function') {
      window.startGameWithCharacter(lobbyState.myCharacter);
    }
  };
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate and ensure required libraries are loaded
 */
async function validateMultiplayerSetup() {
  if (!window.networkManager) {
    console.error('❌ NetworkManager not loaded!');
    logToLobbyDebug('❌ NetworkManager not loaded!');
    alert('Multiplayer is not available. Please refresh the page and try again.');
    return false;
  }
  
  if (typeof Peer === 'undefined') {
    console.error('❌ PeerJS library not loaded!');
    logToLobbyDebug('❌ PeerJS library not loaded!');
    alert('Multiplayer library failed to load. Please check your internet connection and refresh the page.');
    return false;
  }
  
  if (!window.networkManager.peer) {
    logToLobbyDebug('🔌 Initializing PeerJS...');
    await window.networkManager.init();
    logToLobbyDebug('✅ PeerJS ready!');
  }
  
  return true;
}

/**
 * Validate lobby code format
 */
function validateLobbyCode(code) {
  if (code.length !== 4) {
    return { valid: false, error: '⚠️ Code must be 4 characters' };
  }
  
  if (!/^[A-Z0-9]{4}$/.test(code)) {
    return { valid: false, error: '⚠️ Code must be letters and numbers only' };
  }
  
  return { valid: true };
}

// ============================================================================
// LOBBY ACTIONS
// ============================================================================

/**
 * Create a new lobby room (host)
 */
async function createLobby() {
  console.log('Co-op clicked!');
  logToLobbyDebug('Co-op clicked! 🎮');
  
  try {
    if (!await validateMultiplayerSetup()) return;
    
    const code = window.networkManager.createRoom();
    const shareableCode = `${code}|${window.networkManager.localPlayerId}`;
    
    lobbyState.code = code;
    lobbyState.isHost = true;
    lobbyState.hostPeerId = window.networkManager.localPlayerId;
    lobbyState.shareableCode = shareableCode;
    
    console.log('📤 Shareable code:', shareableCode);
    logToLobbyDebug(`📤 Share: ${shareableCode}`);
    
    setupNetworkCallbacks();
    
    const lobbyCodeDisplay = document.getElementById('lobbyCodeDisplay');
    if (lobbyCodeDisplay) {
      lobbyCodeDisplay.value = shareableCode;
    }
    logToLobbyDebug('Code: ' + shareableCode);
    
    showLobbyScreen();
    updateLobbyDisplay();
    
  } catch (error) {
    console.error('❌ Failed to create lobby:', error);
    logToLobbyDebug('❌ Error: ' + error.message);
    alert('Failed to create lobby. Please check your internet connection.');
  }
}

/**
 * Join an existing lobby room (client)
 */
async function joinLobby(codeInput) {
  let code = codeInput.toUpperCase().trim();
  let hostPeerId = null;
  
  // Parse shareable code (format: CODE|PEERID)
  if (code.includes('|')) {
    const parts = code.split('|');
    code = parts[0];
    hostPeerId = parts[1];
    console.log('📥 Received shareable code:', code, '| Host:', hostPeerId);
    
    // Store peer ID mapping
    const sharedRooms = JSON.parse(localStorage.getItem('sharedRoomCodes') || '{}');
    sharedRooms[code] = hostPeerId;
    localStorage.setItem('sharedRoomCodes', JSON.stringify(sharedRooms));
  }
  
  // Validate code
  const validation = validateLobbyCode(code);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }
  
  try {
    logToLobbyDebug('🔌 Joining lobby: ' + code);
    if (hostPeerId) {
      logToLobbyDebug('🎯 Using host peer ID: ' + hostPeerId);
    }
    
    if (!await validateMultiplayerSetup()) {
      return { success: false, error: '❌ Multiplayer not available' };
    }
    
    const success = await window.networkManager.joinRoom(code);
    
    if (!success) {
      logToLobbyDebug('❌ Failed to join room');
      return { success: false, error: '❌ Room not found or connection failed' };
    }
    
    setupNetworkCallbacks();
    
    lobbyState.code = code;
    lobbyState.isHost = false;
    
    showLobbyScreen();
    
    const lobbyCodeDisplay = document.getElementById('lobbyCodeDisplay');
    if (lobbyCodeDisplay) lobbyCodeDisplay.value = code;
    
    updateLobbyDisplay();
    logToLobbyDebug('✅ Joined lobby! Code: ' + code);
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Join error:', error);
    logToLobbyDebug('❌ Error: ' + error.message);
    return { success: false, error: '❌ Connection failed: ' + error.message };
  }
}

/**
 * Show lobby screen, hide start screen
 */
function showLobbyScreen() {
  const startScreen = document.getElementById('startScreen');
  const lobbyScreen = document.getElementById('lobbyScreen');
  if (startScreen) startScreen.style.display = 'none';
  if (lobbyScreen) lobbyScreen.style.display = 'flex';
  logToLobbyDebug('Lobby shown ✅');
}

/**
 * Show start screen, hide lobby screen
 */
function showStartScreen() {
  const lobbyScreen = document.getElementById('lobbyScreen');
  const startScreen = document.getElementById('startScreen');
  if (lobbyScreen) lobbyScreen.style.display = 'none';
  if (startScreen) startScreen.style.display = 'flex';
}

// ============================================================================
// EVENT LISTENERS SETUP
// ============================================================================

/**
 * Initialize lobby event listeners
 */
/**
 * Initialize lobby event listeners
 */
document.addEventListener('DOMContentLoaded', () => {
  console.log('🎮 Setting up lobby listeners...');
  
  logToLobbyDebug('Lobby script loaded ✅');
  logToLobbyDebug('DOM ready: ' + document.readyState);
  
  setupCoopButton();
  setupJoinLobbyButton();
  setupLobbyControls();
  setupCharacterSelection();
  setupGameControls();
  
  console.log('✅ Lobby listeners set up!');
});

// Log script loads
window.addEventListener('load', () => {
  logToLobbyDebug('Window loaded ✅');
  logToLobbyDebug('game.main.js: ' + (typeof window.startGameWithCharacter !== 'undefined' ? '✅' : '❌ NOT LOADED'));
});

/**
 * Setup co-op button (create lobby)
 */
function setupCoopButton() {
  const coopBtn = document.getElementById('coopBtn');
  if (coopBtn) {
    logToLobbyDebug('Co-op button found ✅');
    coopBtn.addEventListener('click', createLobby);
  } else {
    logToLobbyDebug('❌ Co-op button NOT found!');
  }
}

/**
 * Setup join lobby button and modal
 */
function setupJoinLobbyButton() {
  const joinLobbyBtn = document.getElementById('joinLobbyBtn');
  const joinLobbyModal = document.getElementById('joinLobbyModal');
  const joinLobbyConfirm = document.getElementById('joinLobbyConfirm');
  const joinLobbyCancel = document.getElementById('joinLobbyCancel');
  const lobbyCodeInput = document.getElementById('lobbyCodeInput');
  const joinError = document.getElementById('joinError');
  
  if (!joinLobbyBtn || !joinLobbyModal) {
    logToLobbyDebug('❌ Join Lobby elements NOT found!');
    return;
  }
  
  logToLobbyDebug('Join Lobby button found ✅');
  
  // Show modal
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
  joinLobbyConfirm.addEventListener('click', async () => {
    joinError.textContent = '🔄 Connecting...';
    joinError.style.color = '#2196F3';
    
    const result = await joinLobby(lobbyCodeInput.value);
    
    if (result.success) {
      joinLobbyModal.style.display = 'none';
    } else {
      joinError.textContent = result.error;
      joinError.style.color = '#f44336';
    }
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
}

/**
 * Setup lobby control buttons (copy, share)
 */
function setupLobbyControls() {
  setupCopyButton();
  setupShareButton();
}

/**
 * Setup copy lobby code button
 */
function setupCopyButton() {
  const copyBtn = document.getElementById('copyLobbyCode');
  if (!copyBtn) return;
  
  copyBtn.addEventListener('click', () => {
    const codeInput = document.getElementById('lobbyCodeDisplay');
    const codeToCopy = lobbyState.shareableCode || lobbyState.code || (codeInput ? codeInput.value : '');
    
    if (!codeToCopy || codeToCopy === 'XXXX') {
      copyBtn.textContent = '❌ No code';
      setTimeout(() => copyBtn.textContent = '📋 Copy', 2000);
      return;
    }
    
    navigator.clipboard.writeText(codeToCopy).then(() => {
      copyBtn.textContent = '✅ Copied!';
      setTimeout(() => copyBtn.textContent = '📋 Copy', 2000);
    }).catch(err => {
      console.error('Failed to copy:', err);
      if (codeInput) {
        codeInput.select();
        document.execCommand('copy');
        copyBtn.textContent = '✅ Copied!';
        setTimeout(() => copyBtn.textContent = '📋 Copy', 2000);
      }
    });
  });
}

/**
 * Setup share to Discord button
 */
function setupShareButton() {
  const shareBtn = document.getElementById('shareLobbyCode');
  if (!shareBtn) return;
  
  shareBtn.addEventListener('click', () => {
    const codeInput = document.getElementById('lobbyCodeDisplay');
    const codeToShare = lobbyState.shareableCode || lobbyState.code || (codeInput ? codeInput.value : '');
    
    if (!codeToShare || codeToShare === 'XXXX') {
      shareBtn.textContent = '❌ No code';
      setTimeout(() => shareBtn.textContent = '💬 Invite to Discord', 2000);
      return;
    }
    
    const gameUrl = window.location.origin;
    const inviteMessage = `🎮 Join my Aliens vs Goju co-op game!\n\n🔗 Play here: ${gameUrl}\n🎟️ Room Code: ${codeToShare}\n\nClick Co-op, then Join Lobby and paste the code!`;
    const discordUrl = `https://discord.com/channels/@me`;
    
    navigator.clipboard.writeText(inviteMessage).then(() => {
      window.open(discordUrl, '_blank');
      shareBtn.textContent = '✅ Message copied!';
      setTimeout(() => shareBtn.textContent = '💬 Invite to Discord', 3000);
      alert('📋 Invite message copied to clipboard!\n\n💬 Discord is opening - paste the message to invite your friends!\n\nThey\'ll get the game link and room code.');
    }).catch(err => {
      console.error('Failed to copy invite message:', err);
      shareBtn.textContent = '❌ Failed';
      setTimeout(() => shareBtn.textContent = '💬 Invite to Discord', 2000);
    });
  });
}

/**
 * Setup character selection in lobby
 */
function setupCharacterSelection() {
  const charCards = document.querySelectorAll('.lobby-char-card');
  charCards.forEach(card => {
    card.addEventListener('click', () => {
      const character = card.getAttribute('data-character');
      console.log('Character selected in lobby:', character);
      
      charCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      
      lobbyState.myCharacter = character;
      
      if (window.networkManager && window.networkManager.peer) {
        window.networkManager.selectCharacter(character);
        console.log('📤 Sent character selection:', character);
      }
      
      updateLobbyDisplay();
    });
  });
}

/**
 * Setup game control buttons (start, leave)
 */
function setupGameControls() {
  setupStartButton();
  setupLeaveButton();
}

/**
 * Setup start game button
 */
function setupStartButton() {
  const startCoopBtn = document.getElementById('startCoopBtn');
  if (!startCoopBtn) return;
  
  startCoopBtn.addEventListener('click', () => {
    if (!lobbyState.myCharacter) {
      console.warn('Please select a character first!');
      window.debugLog?.('⚠️ Please select a character first!');
      
      const charSection = document.querySelector('.lobby-char-card')?.parentElement?.parentElement;
      if (charSection) {
        charSection.style.animation = 'shake 0.3s';
        setTimeout(() => charSection.style.animation = '', 300);
      }
      return;
    }
    
    console.log('Starting game with:', lobbyState.myCharacter);
    window.isCoopMode = true;
    
    if (lobbyState.isHost && window.networkManager) {
      window.networkManager.startGame();
    }
    
    const lobbyScreen = document.getElementById('lobbyScreen');
    if (lobbyScreen) lobbyScreen.style.display = 'none';
    
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

/**
 * Setup leave lobby button
 */
function setupLeaveButton() {
  const leaveLobbyBtn = document.getElementById('leaveLobbyBtn');
  if (!leaveLobbyBtn) return;
  
  leaveLobbyBtn.addEventListener('click', () => {
    showStartScreen();
    
    if (window.networkManager) {
      window.networkManager.disconnect();
    }
    
    lobbyState.code = null;
    lobbyState.myCharacter = null;
    window.isCoopMode = false;
  });
}

/**
 * Lobby functionality for co-op multiplayer mode
 * Handles room creation, joining, character selection, and game start
 */

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
  hostPeerId: null,
  isReady: false,
  readyPlayers: new Set()
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
  
  const readyBadge = lobbyState.isReady
    ? '<div style="background: #00ff00; color: #000; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">✓ READY</div>'
    : '<div style="background: #ff9800; color: #000; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">⚠ NOT READY</div>';
  
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
        <div style="display: flex; flex-direction: column; gap: 4px;">
          ${hostBadge}
          ${readyBadge}
        </div>
      </div>
    </div>
  `;
}

/**
 * Create remote player card HTML
 */
function createRemotePlayerCard(player) {
  const isPlayerReady = lobbyState.readyPlayers.has(player.id);
  const readyBadge = isPlayerReady
    ? '<div style="background: #00ff00; color: #000; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">✓ READY</div>'
    : '<div style="background: #ff9800; color: #000; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">⚠ NOT READY</div>';
  
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
        <div style="display: flex; flex-direction: column; gap: 4px;">
          ${playerBadge}
          ${readyBadge}
        </div>
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
  
  // Update start button state
  updateStartButtonState();
}

/**
 * Update start button enabled/disabled state
 */
function updateStartButtonState() {
  const startCoopBtn = document.getElementById('startCoopBtn');
  if (!startCoopBtn) return;
  
  // Check player count
  const playerCount = window.networkManager ? window.networkManager.getPlayers().length + 1 : 1;
  const hasCharacter = !!lobbyState.myCharacter;
  const allPlayers = window.networkManager ? window.networkManager.getPlayers() : [];
  const readyCount = lobbyState.readyPlayers.size + (lobbyState.isReady ? 1 : 0);
  
  if (playerCount < 2) {
    startCoopBtn.disabled = true;
    startCoopBtn.textContent = `⏳ Waiting for Players (${playerCount}/2+)`;
    startCoopBtn.style.opacity = '0.5';
    startCoopBtn.style.cursor = 'not-allowed';
    startCoopBtn.style.background = '#666';
  } else if (!hasCharacter) {
    startCoopBtn.disabled = true;
    startCoopBtn.textContent = '⚠️ Select Character First';
    startCoopBtn.style.opacity = '0.5';
    startCoopBtn.style.cursor = 'not-allowed';
    startCoopBtn.style.background = '#666';
  } else if (lobbyState.isReady) {
    // Already ready - show unready option
    startCoopBtn.disabled = false;
    startCoopBtn.textContent = `✅ READY (${readyCount}/${playerCount}) - Click to Unready`;
    startCoopBtn.style.opacity = '1';
    startCoopBtn.style.cursor = 'pointer';
    startCoopBtn.style.background = '#00ff00';
    startCoopBtn.style.color = '#000';
  } else {
    // Not ready - show ready up button
    startCoopBtn.disabled = false;
    startCoopBtn.textContent = `⚡ Ready Up (${readyCount}/${playerCount} ready)`;
    startCoopBtn.style.opacity = '1';
    startCoopBtn.style.cursor = 'pointer';
    startCoopBtn.style.background = '#4CAF50';
    startCoopBtn.style.color = '#fff';
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
    lobbyState.readyPlayers.delete(playerId);
    updateLobbyDisplay();
  };

  window.networkManager.onPlayerReady = (playerId, isReady) => {
    console.log('✅ Player ready state:', playerId, isReady);
    logToLobbyDebug(`${isReady ? '✅' : '❌'} Player ${playerId.slice(-4)} ${isReady ? 'ready' : 'not ready'}`);
    
    if (isReady) {
      lobbyState.readyPlayers.add(playerId);
    } else {
      lobbyState.readyPlayers.delete(playerId);
    }
    
    updateLobbyDisplay();
    checkAllPlayersReady();
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
 * Check if all players are ready and start game if so
 */
function checkAllPlayersReady() {
  if (!window.networkManager) return;
  
  const allPlayers = window.networkManager.getPlayers();
  const totalPlayers = allPlayers.length + 1; // +1 for local player
  
  // Need at least 2 players
  if (totalPlayers < 2) return;
  
  // Check if local player is ready
  if (!lobbyState.isReady || !lobbyState.myCharacter) return;
  
  // Check if all remote players are ready
  const allRemoteReady = allPlayers.every(p => lobbyState.readyPlayers.has(p.id));
  
  if (allRemoteReady) {
    console.log('🎮 All players ready! Starting game...');
    logToLobbyDebug(`🎮 All ${totalPlayers} players ready! Starting...`);
    
    setTimeout(() => {
      startCoopGame();
    }, 1000); // Small delay for UI feedback
  }
}

/**
 * Start the co-op game
 */
function startCoopGame() {
  console.log('🎮 Starting game with:', lobbyState.myCharacter);
  window.isCoopMode = true;
  
  // Host broadcasts game start to all players
  if (lobbyState.isHost && window.networkManager) {
    console.log('📤 Broadcasting game start...');
    logToLobbyDebug('📤 Broadcasting start...');
    window.networkManager.startGame();
  }
  
  // Hide lobby screen
  const lobbyScreen = document.getElementById('lobbyScreen');
  if (lobbyScreen) lobbyScreen.style.display = 'none';
  
  // Start the game
  if (typeof window.startGameWithCharacter === 'function') {
    window.startGameWithCharacter(lobbyState.myCharacter);
  } else {
    console.log('⏳ Waiting for game to load...');
    setTimeout(() => {
      if (typeof window.startGameWithCharacter === 'function') {
        window.startGameWithCharacter(lobbyState.myCharacter);
      } else {
        console.error('❌ startGameWithCharacter function not available!');
        alert('⚠️ Game failed to load. Please refresh the page.');
      }
    }, 500);
  }
}

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
  
  // Auto-initialize PeerJS connection on page load
  setTimeout(async () => {
    if (window.networkManager && typeof Peer !== 'undefined') {
      if (!window.networkManager.peer) {
        try {
          console.log('🔌 Auto-initializing PeerJS...');
          logToLobbyDebug('🔌 Auto-init PeerJS...');
          await window.networkManager.init();
          console.log('✅ PeerJS auto-initialized successfully!');
          logToLobbyDebug('✅ PeerJS ready!');
        } catch (error) {
          console.error('❌ PeerJS auto-init failed:', error);
          logToLobbyDebug('❌ Auto-init failed: ' + error.message);
        }
      }
    } else {
      console.warn('⚠️ NetworkManager or PeerJS not available for auto-init');
      logToLobbyDebug('⚠️ Missing: NM=' + !!window.networkManager + ' Peer=' + (typeof Peer !== 'undefined'));
    }
  }, 2000); // Wait 2 seconds for everything to load
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
  const joinLobbyModal = document.getElementById('joinLobbyModal');
  const joinLobbyConfirm = document.getElementById('joinLobbyConfirm');
  const joinLobbyCancel = document.getElementById('joinLobbyCancel');
  const lobbyCodeInput = document.getElementById('lobbyCodeInput');
  const joinError = document.getElementById('joinError');
  
  if (!joinLobbyModal) {
    console.warn('❌ Join Lobby modal NOT found!');
    logToLobbyDebug('❌ Join Lobby modal NOT found!');
    return;
  }
  
  console.log('✅ Join Lobby modal found, setting up handlers');
  logToLobbyDebug('Join Lobby modal found ✅');
  
  // Cancel button
  if (joinLobbyCancel) {
    joinLobbyCancel.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('🔚 Cancel button clicked');
      logToLobbyDebug('Cancel clicked 🔚');
      joinLobbyModal.style.display = 'none';
      if (lobbyCodeInput) lobbyCodeInput.value = '';
      if (joinError) joinError.textContent = '';
    });
    console.log('✅ Cancel button handler attached');
  } else {
    console.warn('❌ Cancel button not found');
  }
  
  // Confirm button
  if (joinLobbyConfirm) {
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
    console.log('✅ Confirm button handler attached');
  } else {
    console.warn('❌ Confirm button not found');
  }
  
  // Trim whitespace from input
  if (lobbyCodeInput) {
    lobbyCodeInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.trim();
    });
    
    // Enter key to submit
    lobbyCodeInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && joinLobbyConfirm) {
        joinLobbyConfirm.click();
      }
    });
  }
}

/**
 * Setup lobby control buttons (copy, share)
 */
function setupLobbyControls() {
  setupCopyButton();
  setupShareButton();
  setupJoinGameButton();
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
 * Setup join game button in lobby screen
 */
function setupJoinGameButton() {
  const joinGameBtn = document.getElementById('joinGameBtn');
  if (!joinGameBtn) {
    console.warn('❌ Join Game button NOT found in DOM');
    logToLobbyDebug('❌ Join Game button NOT found!');
    return;
  }
  
  console.log('✅ Join Game button found, setting up click handler');
  logToLobbyDebug('Join Game button found ✅');
  
  joinGameBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🎮 Join Game button clicked!');
    logToLobbyDebug('Join Game clicked! 🎮');
    
    // Show the join lobby modal
    const joinLobbyModal = document.getElementById('joinLobbyModal');
    const lobbyCodeInput = document.getElementById('lobbyCodeInput');
    
    if (!joinLobbyModal) {
      console.error('❌ joinLobbyModal not found');
      logToLobbyDebug('❌ Join modal NOT found!');
      return;
    }
    
    console.log('📂 Opening join lobby modal...');
    logToLobbyDebug('Opening join modal 📂');
    
    joinLobbyModal.style.display = 'flex';
    joinLobbyModal.style.visibility = 'visible';
    
    if (lobbyCodeInput) {
      lobbyCodeInput.value = '';
      lobbyCodeInput.focus();
    }
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
 * Setup start game button (now ready up button)
 */
function setupStartButton() {
  const startCoopBtn = document.getElementById('startCoopBtn');
  if (!startCoopBtn) return;
  
  startCoopBtn.addEventListener('click', () => {
    // Check character selection
    if (!lobbyState.myCharacter) {
      console.warn('⚠️ Please select a character first!');
      logToLobbyDebug('⚠️ Select character first!');
      alert('⚠️ Please select a character before readying up!');
      
      const charSection = document.querySelector('.lobby-char-card')?.parentElement?.parentElement;
      if (charSection) {
        charSection.style.animation = 'shake 0.3s';
        setTimeout(() => charSection.style.animation = '', 300);
      }
      return;
    }

    // Toggle ready state
    lobbyState.isReady = !lobbyState.isReady;
    
    console.log('🎮 Ready state changed:', lobbyState.isReady);
    logToLobbyDebug(`${lobbyState.isReady ? '✅' : '❌'} You are ${lobbyState.isReady ? 'READY' : 'NOT READY'}`);
    
    // Send ready state to other players
    if (window.networkManager) {
      window.networkManager.setReady(lobbyState.isReady);
    }
    
    // Update UI
    updateLobbyDisplay();
    
    // Check if all players are ready
    checkAllPlayersReady();
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

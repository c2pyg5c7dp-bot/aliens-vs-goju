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
    // Get all players from network manager
    const allPlayers = window.networkManager ? window.networkManager.getPlayers() : [];
    
    let playersHtml = '';
    
    // Add local player first
    const username = 'Player' + (window.networkManager?.localPlayerId?.slice(-4) || '');
    const hostBadge = lobbyState.isHost 
      ? '<div style="background: #4CAF50; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">HOST</div>'
      : '<div style="background: #2196F3; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">JOINED</div>';
    
    playersHtml += `
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
    
    // Add remote players
    allPlayers.filter(p => !p.isLocal).forEach(player => {
      const playerBadge = '<div style="background: #666; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">PLAYER</div>';
      playersHtml += `
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
    });
    
    // Show waiting message if alone
    if (allPlayers.filter(p => !p.isLocal).length === 0) {
      playersHtml += `
        <div style="padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px; font-style: italic; opacity: 0.6;">
          <div>${lobbyState.isHost ? 'Waiting for other players to join...' : 'Waiting for host to start...'}</div>
          <div style="font-size: 12px; margin-top: 5px;">${lobbyState.isHost ? 'Share the lobby code:' : 'Lobby code:'} ${lobbyState.code || 'XXXX'}</div>
        </div>
      `;
    }
    
    playersListContent.innerHTML = playersHtml;
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
    coopBtn.addEventListener('click', async () => {
      console.log('Co-op clicked!');
      logToLobbyDebug('Co-op clicked! 🎮');
      
      try {
        // Ensure NetworkManager is loaded
        if (!window.networkManager) {
          console.error('❌ NetworkManager not loaded!');
          logToLobbyDebug('❌ NetworkManager not loaded!');
          alert('Multiplayer is not available. Please refresh the page and try again.');
          return;
        }
        
        // Check if PeerJS is available
        if (typeof Peer === 'undefined') {
          console.error('❌ PeerJS library not loaded!');
          logToLobbyDebug('❌ PeerJS library not loaded!');
          alert('Multiplayer library failed to load. Please check your internet connection and refresh the page.');
          return;
        }
        
        // Initialize network manager if not already
        if (!window.networkManager.peer) {
          logToLobbyDebug('🔌 Initializing PeerJS...');
          await window.networkManager.init();
          logToLobbyDebug('✅ PeerJS ready!');
        }
        
        // Generate lobby code and create room
        const code = window.networkManager.createRoom();
        lobbyState.code = code;
        lobbyState.isHost = true;
        lobbyState.hostPeerId = window.networkManager.localPlayerId;
        
        // Share the host peer ID mapping for cross-device connection
        // Store a shareable link format: CODE|PEERID
        const shareableCode = `${code}|${window.networkManager.localPlayerId}`;
        lobbyState.shareableCode = shareableCode;
        
        console.log('📤 Shareable code:', shareableCode);
        logToLobbyDebug(`📤 Share: ${shareableCode}`);
        
        // Set up network callbacks
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
        
        const lobbyCodeDisplay = document.getElementById('lobbyCodeDisplay');
        if (lobbyCodeDisplay) {
          // Display the full shareable code in the input
          lobbyCodeDisplay.value = shareableCode;
        }
        logToLobbyDebug('Code: ' + shareableCode);
        
        // Show lobby
        const startScreen = document.getElementById('startScreen');
        const lobbyScreen = document.getElementById('lobbyScreen');
        if (startScreen) startScreen.style.display = 'none';
        if (lobbyScreen) lobbyScreen.style.display = 'flex';
        logToLobbyDebug('Lobby shown ✅');
        
        updateLobbyDisplay();
        
      } catch (error) {
        console.error('❌ Failed to create lobby:', error);
        logToLobbyDebug('❌ Error: ' + error.message);
        alert('Failed to create lobby. Please check your internet connection.');
      }
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
    joinLobbyConfirm.addEventListener('click', async () => {
      let code = lobbyCodeInput.value.toUpperCase().trim();
      let hostPeerId = null;
      
      // Check if code includes peer ID (format: CODE|PEERID)
      if (code.includes('|')) {
        const parts = code.split('|');
        code = parts[0];
        hostPeerId = parts[1];
        console.log('📥 Received shareable code:', code, '| Host:', hostPeerId);
        
        // Store this mapping for the join attempt
        const sharedRooms = JSON.parse(localStorage.getItem('sharedRoomCodes') || '{}');
        sharedRooms[code] = hostPeerId;
        localStorage.setItem('sharedRoomCodes', JSON.stringify(sharedRooms));
      }
      
      // Validate code
      if (code.length !== 4) {
        joinError.textContent = '⚠️ Code must be 4 characters';
        return;
      }
      
      if (!/^[A-Z0-9]{4}$/.test(code)) {
        joinError.textContent = '⚠️ Code must be letters and numbers only';
        return;
      }
      
      try {
        logToLobbyDebug('🔌 Joining lobby: ' + code);
        if (hostPeerId) {
          logToLobbyDebug('🎯 Using host peer ID: ' + hostPeerId);
        }
        joinError.textContent = '🔄 Connecting...';
        joinError.style.color = '#2196F3';
        
        // Ensure NetworkManager is loaded
        if (!window.networkManager) {
          console.error('❌ NetworkManager not loaded!');
          joinError.textContent = '❌ Multiplayer not available';
          joinError.style.color = '#f44336';
          logToLobbyDebug('❌ NetworkManager not loaded!');
          alert('Multiplayer is not available. Please refresh the page and try again.');
          return;
        }
        
        // Check if PeerJS is available
        if (typeof Peer === 'undefined') {
          console.error('❌ PeerJS library not loaded!');
          joinError.textContent = '❌ Multiplayer library not loaded';
          joinError.style.color = '#f44336';
          logToLobbyDebug('❌ PeerJS library not loaded!');
          alert('Multiplayer library failed to load. Please check your internet connection and refresh the page.');
          return;
        }
        
        // Initialize network manager if not already
        if (!window.networkManager.peer) {
          logToLobbyDebug('🔌 Initializing PeerJS...');
          await window.networkManager.init();
          logToLobbyDebug('✅ PeerJS ready!');
        }
        
        // Join the room
        const success = await window.networkManager.joinRoom(code);
        
        if (!success) {
          joinError.textContent = '❌ Room not found or connection failed';
          joinError.style.color = '#f44336';
          logToLobbyDebug('❌ Failed to join room');
          return;
        }
        
        // Set up callbacks
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
          // Hide lobby and start game
          const lobbyScreen = document.getElementById('lobbyScreen');
          if (lobbyScreen) lobbyScreen.style.display = 'none';
          
          if (lobbyState.myCharacter && typeof window.startGameWithCharacter === 'function') {
            window.startGameWithCharacter(lobbyState.myCharacter);
          }
        };
        
        // Success!
        lobbyState.code = code;
        lobbyState.isHost = false;
        
        // Hide modal and show lobby
        joinLobbyModal.style.display = 'none';
        const startScreen = document.getElementById('startScreen');
        const lobbyScreen = document.getElementById('lobbyScreen');
        if (startScreen) startScreen.style.display = 'none';
        if (lobbyScreen) lobbyScreen.style.display = 'flex';
        
        const lobbyCodeDisplay = document.getElementById('lobbyCodeDisplay');
        if (lobbyCodeDisplay) lobbyCodeDisplay.value = code;
        
        updateLobbyDisplay();
        logToLobbyDebug('✅ Joined lobby! Code: ' + code);
        
      } catch (error) {
        console.error('❌ Join error:', error);
        joinError.textContent = '❌ Connection failed: ' + error.message;
        joinError.style.color = '#f44336';
        logToLobbyDebug('❌ Error: ' + error.message);
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
  } else {
    logToLobbyDebug('❌ Join Lobby elements NOT found!');
  }
  
  // Copy button
  const copyBtn = document.getElementById('copyLobbyCode');
  if (copyBtn) {
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
        // Fallback: select the text
        if (codeInput) {
          codeInput.select();
          document.execCommand('copy');
          copyBtn.textContent = '✅ Copied!';
          setTimeout(() => copyBtn.textContent = '📋 Copy', 2000);
        }
      });
    });
  }
  
  // Share button - Discord invite
  const shareBtn = document.getElementById('shareLobbyCode');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      const codeInput = document.getElementById('lobbyCodeDisplay');
      const codeToShare = lobbyState.shareableCode || lobbyState.code || (codeInput ? codeInput.value : '');
      
      if (!codeToShare || codeToShare === 'XXXX') {
        shareBtn.textContent = '❌ No code';
        setTimeout(() => shareBtn.textContent = '💬 Invite to Discord', 2000);
        return;
      }
      
      // Create Discord invite message with the game link and code
      const gameUrl = window.location.origin;
      const inviteMessage = `🎮 Join my Aliens vs Goju co-op game!\n\n🔗 Play here: ${gameUrl}\n🎟️ Room Code: ${codeToShare}\n\nClick Co-op, then Join Lobby and paste the code!`;
      
      // Try to open Discord with the message
      // If user has Discord installed, this will open it
      const discordUrl = `https://discord.com/channels/@me`;
      
      // Copy the invite message to clipboard
      navigator.clipboard.writeText(inviteMessage).then(() => {
        // Open Discord
        window.open(discordUrl, '_blank');
        
        shareBtn.textContent = '✅ Message copied!';
        setTimeout(() => shareBtn.textContent = '💬 Invite to Discord', 3000);
        
        // Show helpful message
        alert('📋 Invite message copied to clipboard!\n\n💬 Discord is opening - paste the message to invite your friends!\n\nThey\'ll get the game link and room code.');
      }).catch(err => {
        console.error('Failed to copy invite message:', err);
        shareBtn.textContent = '❌ Failed';
        setTimeout(() => shareBtn.textContent = '💬 Invite to Discord', 2000);
      });
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
      
      // Send to network
      if (window.networkManager && window.networkManager.peer) {
        window.networkManager.selectCharacter(character);
        console.log('📤 Sent character selection:', character);
      }
      
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
      
      // Enable co-op mode
      window.isCoopMode = true;
      
      // If host, trigger network game start
      if (lobbyState.isHost && window.networkManager) {
        window.networkManager.startGame();
      }
      
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
      
      // Disconnect from network
      if (window.networkManager) {
        window.networkManager.disconnect();
      }
      
      // Reset state
      lobbyState.code = null;
      lobbyState.myCharacter = null;
      window.isCoopMode = false;
    });
  }
  
  console.log('✅ Lobby listeners set up!');
});

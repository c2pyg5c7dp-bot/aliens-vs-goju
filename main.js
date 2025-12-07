// Main entry point with Discord SDK integration
console.log('🎮 main.js loading...');
if (window.debugLog) window.debugLog('🎮 main.js loading...');

// Discord SDK will be loaded via CDN in index.html
console.log('✅ main.js loaded');
if (window.debugLog) window.debugLog('✅ Main script loaded');

// Store Discord SDK globally for game access
window.discordSdk = null;
window.discordAuth = null;
window.isCoopMode = false;

// Discord SDK setup function
async function setupDiscordSdk() {
  try {
    if (!window.DiscordSDK) {
      console.log('Discord SDK not available - running standalone');
      return { discordSdk: null, auth: null };
    }
    
    const discordSdk = new window.DiscordSDK('1446725465300664402');
    await discordSdk.ready();
    
    const { code } = await discordSdk.commands.authorize({
      client_id: '1446725465300664402',
      response_type: 'code',
      state: '',
      prompt: 'none',
      scope: ['identify', 'guilds']
    });
    
    const response = await fetch('/.proxy/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    
    const { access_token } = await response.json();
    const auth = await discordSdk.commands.authenticate({ access_token });
    
    return { discordSdk, auth };
  } catch (error) {
    console.error('Discord SDK setup failed:', error);
    return { discordSdk: null, auth: null };
  }
}

async function getCurrentUser(discordSdk) {
  if (!discordSdk) return null;
  try {
    const user = await discordSdk.commands.getUser();
    return user;
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
}

async function getParticipants(discordSdk) {
  if (!discordSdk) return [];
  try {
    const participants = await discordSdk.commands.getInstanceConnectedParticipants();
    return participants || [];
  } catch (error) {
    console.error('Failed to get participants:', error);
    return [];
  }
}

// Add debugging
console.log('Main.js loaded');
console.log('Current URL:', window.location.href);
console.log('Query params:', window.location.search);

// Load game immediately, don't wait for Discord SDK
function loadGameNow() {
  console.log('🎮 loadGameNow() called');
  const loadingStatus = document.getElementById('loading-status');
  const loadingScreen = document.getElementById('loading-screen');
  
  console.log('Loading status element:', loadingStatus ? 'FOUND' : 'NOT FOUND');
  console.log('Loading screen element:', loadingScreen ? 'FOUND' : 'NOT FOUND');
  
  if (loadingStatus) {
    loadingStatus.textContent = 'Game ready!';
    console.log('✅ Updated loading status');
  }
  
  if (loadingScreen) {
    console.log('🎬 Hiding loading screen...');
    loadingScreen.style.display = 'none';
    console.log('✅ Loading screen hidden');
  } else {
    console.error('❌ Cannot hide loading screen - element not found!');
  }
  
  // Game script is already loaded via HTML, just initialize co-op UI
  setTimeout(() => {
    console.log('🔧 Initializing co-op UI...');
    initializeCoopUI();
  }, 500);
}

async function init() {
  console.log('🚀 Init function started');
  if (window.debugLog) window.debugLog('🚀 Init started');
  console.log('⏰ Timestamp:', new Date().toISOString());
  const loadingScreen = document.getElementById('loading-screen');
  console.log('Loading screen found in init:', !!loadingScreen);
  if (window.debugLog) window.debugLog('Loading screen: ' + (loadingScreen ? 'FOUND' : 'NOT FOUND'));
  
  // FAILSAFE: Always remove loading screen after 3 seconds max
  setTimeout(() => {
    console.log('⏱️ Failsafe timeout triggered (3 seconds)');
    if (window.debugLog) window.debugLog('⏱️ 3s Failsafe triggered');
    console.log('Failsafe: Force removing loading screen');
    const ls = document.getElementById('loading-screen');
    if (ls) {
      console.log('Failsafe: Loading screen element found, hiding it');
      if (window.debugLog) window.debugLog('✅ Hiding loading screen');
      ls.style.display = 'none';
      console.log('✅ Failsafe: Loading screen hidden');
      if (window.debugLog) window.debugLog('✅ Loading screen hidden');
    } else {
      console.error('❌ Failsafe: Loading screen element not found!');
      if (window.debugLog) window.debugLog('❌ Loading screen not found!');
    }
  }, 3000);
  
  // Start loading game immediately
  console.log('⏱️ Scheduling loadGameNow in 500ms...');
  if (window.debugLog) window.debugLog('⏱️ Starting game in 500ms...');
  setTimeout(loadGameNow, 500);
  
  // Initialize Discord SDK in parallel (non-blocking)
  try {
    console.log('Setting up Discord SDK in background...');
    const loadingDiscord = document.getElementById('loading-discord');
    if (loadingDiscord) loadingDiscord.textContent = '⏳ Discord SDK';
    
    const { discordSdk, auth } = await setupDiscordSdk();
    
    console.log('Discord SDK setup complete', { discordSdk: !!discordSdk, auth: !!auth });
    if (loadingDiscord) loadingDiscord.textContent = discordSdk ? '✅ Discord SDK' : '⚠️ Standalone Mode';
    
    if (discordSdk) {
      console.log('Discord SDK initialized!');
      console.log('Current user:', auth.user);
      window.discordSdk = discordSdk;
      window.discordAuth = auth;
      setupCoopButton(discordSdk, auth);
    } else {
      console.log('Running in standalone mode - disabling co-op');
      setTimeout(() => {
        const coopBtn = document.getElementById('coopBtn');
        if (coopBtn) {
          coopBtn.disabled = true;
          coopBtn.textContent = 'Co-op (Discord Only)';
          coopBtn.style.opacity = '0.5';
        }
      }, 1000);
    }
    
  } catch (error) {
    console.error('Discord SDK failed (continuing anyway):', error);
    // Disable co-op button on error
    setTimeout(() => {
      const coopBtn = document.getElementById('coopBtn');
      if (coopBtn) {
        coopBtn.disabled = true;
        coopBtn.textContent = 'Co-op (Error)';
        coopBtn.style.opacity = '0.5';
      }
    }, 1000);
  }
}

function setupCoopButton(discordSdk, auth) {
  // Wait for DOM to be ready
  const checkForButton = setInterval(() => {
    const coopBtn = document.getElementById('coopBtn');
    if (coopBtn) {
      clearInterval(checkForButton);
      
      coopBtn.addEventListener('click', async () => {
        console.log('Co-op mode selected');
        window.isCoopMode = true;
        
        // Show lobby screen
        const startScreen = document.getElementById('startScreen');
        const lobbyScreen = document.getElementById('lobbyScreen');
        
        if (startScreen) startScreen.style.display = 'none';
        if (lobbyScreen) lobbyScreen.style.display = 'flex';
        
        // Initialize lobby
        initializeLobby(discordSdk, auth);
      });
    }
  }, 100);
}

// Lobby state
let lobbyState = {
  code: null,
  players: {},
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

function initializeLobby(discordSdk, auth) {
  // Generate lobby code
  lobbyState.code = generateLobbyCode();
  const lobbyCodeDisplay = document.getElementById('lobbyCodeDisplay');
  if (lobbyCodeDisplay) lobbyCodeDisplay.value = lobbyState.code;
  
  // Set up copy button
  const copyBtn = document.getElementById('copyLobbyCode');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(lobbyState.code).then(() => {
        copyBtn.textContent = '✅ Copied!';
        setTimeout(() => copyBtn.textContent = '📋 Copy', 2000);
      });
    });
  }
  
  // Set up share button
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
  
  // Set up character selection in lobby
  const charCards = document.querySelectorAll('.lobby-char-card');
  charCards.forEach(card => {
    card.addEventListener('click', () => {
      const character = card.getAttribute('data-character');
      
      // Update selection UI
      charCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      
      // Update state
      lobbyState.myCharacter = character;
      
      // Update display
      const charNameMap = {
        'player': 'Player (Balanced)',
        'tank': 'Tank (Tanky)',
        'speedster': 'Speedster (Fast)',
        'glass-cannon': 'Glass Cannon (High DMG)'
      };
      const selectedCharName = document.getElementById('selectedCharName');
      if (selectedCharName) {
        selectedCharName.textContent = charNameMap[character] || character;
      }
      
      // Broadcast to other players (simplified - you'd use Discord SDK or WebSocket here)
      console.log('Character selected:', character);
      
      // Update the players list to show new character
      updateLobbyParticipants(discordSdk, auth);
    });
  });
  
  // Display participant info
  updateLobbyParticipants(discordSdk, auth);
}

function updateLobbyParticipants(discordSdk, auth) {
  const playersListContent = document.getElementById('playersListContent');
  const lobbyStatus = document.getElementById('lobbyStatus');
  
  if (!playersListContent) return;

  // Show current user info
  const username = auth?.user?.username || 'Player';
  const userId = auth?.user?.id || 'local';
  
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
      <div style="font-size: 12px; margin-top: 5px;">Share the lobby code with friends!</div>
    </div>
  `;
  
  playersListContent.innerHTML = playerHtml;
  
  if (lobbyStatus) {
    lobbyStatus.textContent = lobbyState.myCharacter 
      ? `Ready! Share code: ${lobbyState.code}` 
      : 'Select your character to continue';
  }
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
  if (playersListContent) {
    // Show static message since we can't get participants without OAuth2
    playersListContent.innerHTML = '<p>👤 You</p><p style="font-size: 12px; opacity: 0.7;">Share this Activity with friends to play together!</p>';
  }
  
  if (lobbyStatus) {
    lobbyStatus.textContent = 'Ready to play';
  }
}

function initializeCoopUI() {
  // Set up lobby buttons
  const startCoopBtn = document.getElementById('startCoopBtn');
  const leaveLobbyBtn = document.getElementById('leaveLobbyBtn');
  
  if (startCoopBtn) {
    startCoopBtn.addEventListener('click', () => {
      // Check if character is selected
      if (!lobbyState.myCharacter) {
        alert('Please select a character before starting!');
        return;
      }
      
      console.log('Starting co-op game with character:', lobbyState.myCharacter);
      
      // Hide lobby and start game with selected character
      const lobbyScreen = document.getElementById('lobbyScreen');
      if (lobbyScreen) lobbyScreen.style.display = 'none';
      
      // Start game directly with the selected character
      if (typeof window.startGameWithCharacter === 'function') {
        window.startGameWithCharacter(lobbyState.myCharacter);
      } else {
        console.error('startGameWithCharacter not available');
        // Fallback: show character select screen
        const charSelectScreen = document.getElementById('charSelectScreen');
        if (charSelectScreen) charSelectScreen.style.display = 'flex';
      }
    });
  }
  
  if (leaveLobbyBtn) {
    leaveLobbyBtn.addEventListener('click', () => {
      const lobbyScreen = document.getElementById('lobbyScreen');
      const startScreen = document.getElementById('startScreen');
      
      window.isCoopMode = false;
      lobbyState = { code: null, players: {}, myCharacter: null };
      
      if (lobbyScreen) lobbyScreen.style.display = 'none';
      if (startScreen) startScreen.style.display = 'flex';
    });
  }
  
  // Set up character selection cards (for non-coop mode)
  const characterCards = document.querySelectorAll('.character-card');
  characterCards.forEach(card => {
    card.addEventListener('click', () => {
      const character = card.getAttribute('data-character');
      console.log('Character card clicked:', character);
      console.log('startGameWithCharacter available?', typeof window.startGameWithCharacter);
      
      if (character && typeof window.startGameWithCharacter === 'function') {
        console.log('Starting game with character:', character);
        window.startGameWithCharacter(character);
      } else if (character) {
        console.error('startGameWithCharacter not available, waiting...');
        // Wait for game_new.js to load and try again
        const checkInterval = setInterval(() => {
          if (typeof window.startGameWithCharacter === 'function') {
            clearInterval(checkInterval);
            console.log('Game loaded, starting with character:', character);
            window.startGameWithCharacter(character);
          }
        }, 100);
      }
    });
  });
}

// Start the initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

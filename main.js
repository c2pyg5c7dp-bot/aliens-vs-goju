// Main entry point with Discord SDK integration
import { setupDiscordSdk, getCurrentUser, getParticipants } from './discordSdk.js';

// Store Discord SDK globally for game access
window.discordSdk = null;
window.discordAuth = null;
window.isCoopMode = false;

// Add debugging
console.log('Main.js loaded');
console.log('Current URL:', window.location.href);
console.log('Query params:', window.location.search);

// Load game immediately, don't wait for Discord SDK
function loadGameNow() {
  console.log('Loading game immediately...');
  const loadingStatus = document.getElementById('loading-status');
  if (loadingStatus) loadingStatus.textContent = 'Game ready!';
  
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    loadingScreen.style.display = 'none';
  }
  
  // Game script is already loaded via HTML, just initialize co-op UI
  setTimeout(() => initializeCoopUI(), 500);
}

async function init() {
  console.log('Init function started');
  const loadingScreen = document.getElementById('loading-screen');
  
  // FAILSAFE: Always remove loading screen after 3 seconds max
  setTimeout(() => {
    console.log('Failsafe: Force removing loading screen');
    if (loadingScreen) {
      loadingScreen.style.display = 'none';
    }
  }, 3000);
  
  // Start loading game immediately
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
        
        // Display static lobby info (no participant polling)
        updateParticipantsList(discordSdk);
      });
    }
  }, 100);
}

async function updateParticipantsList(discordSdk) {
  const playersListContent = document.getElementById('playersListContent');
  const lobbyStatus = document.getElementById('lobbyStatus');
  
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
      console.log('Starting co-op game');
      const lobbyScreen = document.getElementById('lobbyScreen');
      const charSelectScreen = document.getElementById('charSelectScreen');
      
      if (lobbyScreen) lobbyScreen.style.display = 'none';
      if (charSelectScreen) charSelectScreen.style.display = 'flex';
    });
  }
  
  if (leaveLobbyBtn) {
    leaveLobbyBtn.addEventListener('click', () => {
      const lobbyScreen = document.getElementById('lobbyScreen');
      const startScreen = document.getElementById('startScreen');
      
      window.isCoopMode = false;
      
      if (lobbyScreen) lobbyScreen.style.display = 'none';
      if (startScreen) startScreen.style.display = 'flex';
    });
  }
  
  // Set up character selection cards
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

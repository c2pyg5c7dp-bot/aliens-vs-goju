// Main entry point with Discord SDK integration
import { setupDiscordSdk, getCurrentUser, updateActivity, getParticipants } from './discordSdk.js';

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
  
  // Start loading game immediately
  setTimeout(loadGameNow, 500);
  
  // Initialize Discord SDK in parallel (non-blocking)
  try {
    console.log('Setting up Discord SDK in background...');
    const { discordSdk, auth } = await setupDiscordSdk();
    
    console.log('Discord SDK setup complete', { discordSdk: !!discordSdk, auth: !!auth });
    
    if (discordSdk) {
      console.log('Discord SDK initialized!');
      console.log('Current user:', auth.user);
      await updateActivity('Playing Aliens vs Goju');
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
        
        // Update activity
        await updateActivity('In Co-op Lobby');
        
        // Get and display participants
        updateParticipantsList(discordSdk);
        
        // Poll for participants every 2 seconds
        const participantPoll = setInterval(async () => {
          if (lobbyScreen.style.display === 'none') {
            clearInterval(participantPoll);
            return;
          }
          await updateParticipantsList(discordSdk);
        }, 2000);
      });
    }
  }, 100);
}

async function updateParticipantsList(discordSdk) {
  const participants = await getParticipants();
  const playersListContent = document.getElementById('playersListContent');
  
  if (playersListContent && participants) {
    playersListContent.innerHTML = participants.length > 0
      ? participants.map(p => `<p>👤 ${p.username || 'Player'}</p>`).join('')
      : '<p>Waiting for players...</p>';
    
    const lobbyStatus = document.getElementById('lobbyStatus');
    if (lobbyStatus) {
      lobbyStatus.textContent = `${participants.length} player${participants.length !== 1 ? 's' : ''} in lobby`;
    }
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
      
      // Update activity
      if (window.discordSdk) {
        updateActivity('Playing Co-op');
      }
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
      if (character && typeof window.startGameWithCharacter === 'function') {
        window.startGameWithCharacter(character);
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

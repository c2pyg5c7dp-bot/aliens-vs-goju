/**
 * Debug Multiplayer Status Monitor
 * Provides real-time status of multiplayer initialization and connections
 */

function updateMultiplayerStatus() {
  // Check PeerJS
  const peerJsLoaded = typeof Peer !== 'undefined';
  const peerJsEl = document.getElementById('peerJsStatus');
  if (peerJsEl) {
    peerJsEl.textContent = peerJsLoaded ? '✅ Loaded' : '❌ Not Loaded';
    peerJsEl.style.color = peerJsLoaded ? '#00ff00' : '#ff0000';
  }

  // Check NetworkManager existence
  const networkManagerExists = window.networkManager !== undefined;
  const nmEl = document.getElementById('networkManagerStatus');
  if (nmEl) {
    nmEl.textContent = networkManagerExists ? '✅ Exists' : '❌ Not Created';
    nmEl.style.color = networkManagerExists ? '#00ff00' : '#ff0000';
  }

  if (!networkManagerExists) {
    // Set other fields to unavailable
    const fields = ['peerConnectionStatus', 'localPeerId', 'roomCodeStatus', 'isHostStatus', 'connectedPlayersCount'];
    fields.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = 'N/A';
        el.style.color = '#999';
      }
    });
    return;
  }

  const nm = window.networkManager;

  // Check Peer Connection
  const peerConnected = nm.peer !== null && nm.peer !== undefined;
  const pcEl = document.getElementById('peerConnectionStatus');
  if (pcEl) {
    if (peerConnected) {
      if (nm.peer.open) {
        pcEl.textContent = '✅ Open';
        pcEl.style.color = '#00ff00';
      } else if (nm.peer.disconnected) {
        pcEl.textContent = '⚠️ Disconnected';
        pcEl.style.color = '#ffaa00';
      } else {
        pcEl.textContent = '🔄 Connecting...';
        pcEl.style.color = '#ffff00';
      }
    } else {
      pcEl.textContent = '❌ No Connection';
      pcEl.style.color = '#ff0000';
    }
  }

  // Local Peer ID
  const peerIdEl = document.getElementById('localPeerId');
  if (peerIdEl) {
    if (nm.localPlayerId) {
      peerIdEl.textContent = nm.localPlayerId.slice(0, 8) + '...';
      peerIdEl.style.color = '#00ff00';
      peerIdEl.title = nm.localPlayerId;
    } else {
      peerIdEl.textContent = 'Waiting...';
      peerIdEl.style.color = '#ffaa00';
    }
  }

  // Room Code
  const roomCodeEl = document.getElementById('roomCodeStatus');
  if (roomCodeEl) {
    if (nm.roomCode) {
      roomCodeEl.textContent = nm.roomCode;
      roomCodeEl.style.color = '#00ff00';
    } else {
      roomCodeEl.textContent = 'None (Not Host)';
      roomCodeEl.style.color = '#999';
    }
  }

  // Is Host
  const isHostEl = document.getElementById('isHostStatus');
  if (isHostEl) {
    if (nm.isHost) {
      isHostEl.textContent = '👑 YES';
      isHostEl.style.color = '#ffaa00';
    } else if (nm.roomCode) {
      isHostEl.textContent = '❌ NO (Joined)';
      isHostEl.style.color = '#ff6b6b';
    } else {
      isHostEl.textContent = '❓ Not in lobby';
      isHostEl.style.color = '#999';
    }
  }

  // Connected Players
  const playersEl = document.getElementById('connectedPlayersCount');
  if (playersEl) {
    const playerCount = nm.connections ? nm.connections.length : 0;
    playersEl.textContent = playerCount;
    playersEl.style.color = playerCount > 0 ? '#00ff00' : '#999';
  }
}

// Setup refresh button
function setupMultiplayerDebugButton() {
  const refreshBtn = document.getElementById('mpRefreshStatus');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      updateMultiplayerStatus();
      refreshBtn.textContent = '✅ Updated!';
      setTimeout(() => {
        refreshBtn.textContent = '🔄 Refresh Status';
      }, 1500);
    });
  }

  const initBtn = document.getElementById('mpInitialize');
  if (initBtn) {
    initBtn.addEventListener('click', async () => {
      initBtn.textContent = '⏳ Initializing...';
      initBtn.disabled = true;
      
      try {
        if (!window.networkManager) {
          throw new Error('NetworkManager not available');
        }
        
        if (typeof Peer === 'undefined') {
          throw new Error('PeerJS library not loaded');
        }
        
        console.log('🔌 Manual PeerJS initialization...');
        await window.networkManager.init();
        console.log('✅ PeerJS initialized successfully!');
        
        initBtn.textContent = '✅ Initialized!';
        initBtn.style.background = '#00ff00';
        
        setTimeout(() => {
          updateMultiplayerStatus();
          initBtn.textContent = '🔌 Initialize PeerJS';
          initBtn.style.background = '#4CAF50';
          initBtn.disabled = false;
        }, 2000);
        
      } catch (error) {
        console.error('❌ Manual init failed:', error);
        initBtn.textContent = '❌ Failed: ' + error.message;
        initBtn.style.background = '#ff0000';
        
        setTimeout(() => {
          initBtn.textContent = '🔌 Initialize PeerJS';
          initBtn.style.background = '#4CAF50';
          initBtn.disabled = false;
        }, 3000);
      }
    });
  }
}

// Auto-update multiplayer status every 2 seconds if debug is visible
let autoUpdateInterval = null;

function startAutoUpdateMultiplayer() {
  if (autoUpdateInterval) return;
  
  autoUpdateInterval = setInterval(() => {
    const debugSection = document.getElementById('multiplayerDebugSection');
    if (debugSection && debugSection.offsetParent !== null) {
      // Only update if visible
      updateMultiplayerStatus();
    }
  }, 2000);
}

function stopAutoUpdateMultiplayer() {
  if (autoUpdateInterval) {
    clearInterval(autoUpdateInterval);
    autoUpdateInterval = null;
  }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  console.log('🌐 Multiplayer debug monitor loaded');
  
  // Initial update
  setTimeout(() => {
    updateMultiplayerStatus();
    setupMultiplayerDebugButton();
    startAutoUpdateMultiplayer();
  }, 500);
});

// Also update when NetworkManager is initialized
window.addEventListener('load', () => {
  setTimeout(() => {
    updateMultiplayerStatus();
  }, 1000);
});

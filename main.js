// Main entry point with Discord SDK integration

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

// Load game immediately
function loadGameNow() {
  const loadingScreen = document.getElementById('loading-screen');
  
  if (loadingScreen) {
    loadingScreen.style.display = 'none';
  }
}

async function init() {
  // FAILSAFE: Always remove loading screen after 3 seconds max
  setTimeout(() => {
    const ls = document.getElementById('loading-screen');
    if (ls) {
      ls.style.display = 'none';
    }
  }, 3000);
  
  // Start loading game immediately
  setTimeout(loadGameNow, 500);
  
  // Initialize Discord SDK in parallel (non-blocking)
  try {
    const { discordSdk, auth } = await setupDiscordSdk();
    
    if (discordSdk) {
      console.log('✅ Discord SDK initialized');
      window.discordSdk = discordSdk;
      window.discordAuth = auth;
    } else {
      console.log('⚠️ Running in standalone mode');
    }
  } catch (error) {
    console.error('Discord SDK initialization error:', error);
  }
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

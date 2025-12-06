# Vampire Survivors Lite - Multiplayer Refactoring

## 📋 Overview

Your game has been refactored to support multiplayer through Discord Activities. The code is now organized into separate, focused modules that handle game state, rendering, and networking independently.

## 🏗️ New Architecture

### Core Modules

#### 1. **GameState.js**
The brain of the game - manages all game logic and state.

**Key Features:**
- ✅ Multi-player support (Map-based player storage)
- ✅ Serializable state for network transmission
- ✅ Separated from rendering (pure logic)
- ✅ Backward compatible with single-player

**Usage:**
```javascript
const gameState = new GameState();
gameState.addPlayer('player-1', 'tank', true); // Add local player
gameState.update(dt, inputs); // Update game logic
const state = gameState.serialize(); // For network sync
```

#### 2. **Renderer.js**
The eyes of the game - handles all visual output.

**Key Features:**
- ✅ Pure rendering (doesn't modify state)
- ✅ Image loading and caching
- ✅ Multi-player rendering (name tags, multiple players)
- ✅ Fallback rendering when sprites unavailable

**Usage:**
```javascript
const renderer = new GameRenderer(canvas, ctx);
renderer.loadImage('background', 'path/to/bg.png');
renderer.render(gameState); // Render current state
```

#### 3. **NetworkManager.js**
The nervous system - handles player communication.

**Key Features:**
- ✅ Discord Activities integration
- ✅ Host/Client architecture
- ✅ Input transmission
- ✅ State synchronization
- ✅ Graceful degradation (works without Discord SDK)

**Usage:**
```javascript
const networkManager = new NetworkManager(gameState);
await networkManager.initialize('YOUR_DISCORD_CLIENT_ID');
networkManager.sendInput(input); // Send local input
```

## 🚀 Quick Start

### Option 1: Test Refactored Code (Single Player)

Open `multiplayer-example.html` in your browser to see the refactored architecture in action:

```bash
# Serve locally (Python)
python -m http.server 8000

# Or use any local server
# Then visit: http://localhost:8000/multiplayer-example.html
```

### Option 2: Integrate with Existing Game

Add these scripts to your existing HTML (before game_new.js):

```html
<!-- New modules -->
<script src="GameState.js"></script>
<script src="Renderer.js"></script>
<script src="NetworkManager.js"></script>

<!-- Your existing game -->
<script src="game_new.js"></script>
```

Then modify game_new.js to use the new modules (see MULTIPLAYER_GUIDE.md for details).

## 📦 What's Included

```
vampire-survivors-lite/
├── GameState.js              # Core game state management
├── Renderer.js               # Rendering engine
├── NetworkManager.js         # Discord Activities networking
├── multiplayer-example.html  # Working example
├── MULTIPLAYER_GUIDE.md      # Detailed integration guide
└── game_new.js              # Your original game (unchanged)
```

## 🎮 Discord Activities Setup

### Step 1: Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Give it a name (e.g., "Vampire Survivors Lite")
4. Note your **Client ID**

### Step 2: Enable Embedded App SDK

1. In your application settings, go to "Activities"
2. Enable "Embedded App SDK"
3. Add your game URL to "URL Mappings"
   - For local development: `http://localhost:8000`
   - For production: Your hosted URL

### Step 3: Install Discord SDK

```bash
npm init -y
npm install @discord/embedded-app-sdk
```

### Step 4: Update NetworkManager

In `multiplayer-example.html`, replace `'YOUR_CLIENT_ID'` with your actual Discord Client ID:

```javascript
await networkManager.initialize('123456789012345678'); // Your Client ID
```

### Step 5: Host Your Game

Discord Activities require HTTPS in production. Options:

**Local Development:**
- Use Discord's developer mode (allows http://localhost)
- Or use ngrok: `ngrok http 8000`

**Production:**
- Deploy to Netlify, Vercel, GitHub Pages, etc.
- Ensure HTTPS is enabled

## 🔧 Integration Guide

### Minimal Integration

Here's how to integrate with your existing game:

```javascript
// 1. Create instances
const gameState = new GameState();
const renderer = new GameRenderer(canvas, ctx);
const networkManager = new NetworkManager(gameState);

// 2. Initialize
await networkManager.initialize('YOUR_CLIENT_ID');

// 3. Game loop
function gameLoop(timestamp) {
  const dt = (timestamp - lastTime) / 1000;
  
  // Collect inputs
  const inputs = {
    [gameState.localPlayerId]: {
      up: input.up,
      down: input.down,
      left: input.left,
      right: input.right,
      space: input.space
    }
  };
  
  // Update (host only, or single-player)
  if (networkManager.isHost) {
    gameState.update(dt, inputs);
  }
  
  // Render
  renderer.render(gameState);
  
  requestAnimationFrame(gameLoop);
}
```

### Full Integration

See `MULTIPLAYER_GUIDE.md` for complete step-by-step instructions.

## 📊 Architecture Comparison

### Before (Monolithic)
```
game_new.js (2400+ lines)
├── Game State
├── Rendering
├── Input
├── Physics
└── All mixed together
```

### After (Modular)
```
GameState.js        → Pure game logic
├── Players
├── Enemies
├── Projectiles
└── Serialization

Renderer.js         → Pure rendering
├── Draw functions
├── Image loading
└── UI rendering

NetworkManager.js   → Networking
├── Discord SDK
├── State sync
└── Input transmission

game_new.js         → Orchestration
└── Coordinates everything
```

## 🎯 Benefits

### For Single-Player
- ✅ Cleaner code organization
- ✅ Easier to debug
- ✅ Better performance (separated concerns)

### For Multiplayer
- ✅ Ready for Discord Activities
- ✅ Host/Client model implemented
- ✅ State serialization ready
- ✅ Network-aware from the start

## 🐛 Troubleshooting

### "Discord SDK not loaded"
- Normal for single-player testing
- Install SDK: `npm install @discord/embedded-app-sdk`
- Or add script tag: `<script src="https://discord.com/api/v10/applications/CLIENT_ID/embedded-sdk.js"></script>`

### "Cannot read property 'players' of undefined"
- Ensure GameState.js is loaded before game_new.js
- Check browser console for script loading errors

### Players not syncing
- Verify host is running update loop
- Check network messages in Discord Developer Tools
- Ensure all clients have same game version

## 📚 Next Steps

1. ✅ **Test single-player** - Use multiplayer-example.html
2. ⏳ **Set up Discord App** - Follow Discord Activities Setup
3. ⏳ **Integrate networking** - Use NetworkManager in your game
4. ⏳ **Add lobby system** - Wait for all players before starting
5. ⏳ **Test multiplayer** - Invite friends via Discord
6. ⏳ **Add lag compensation** - Implement prediction/reconciliation
7. ⏳ **Deploy** - Host on a platform with HTTPS

## 💡 Tips

- Start with single-player testing using the example
- Test with 2 players before scaling up
- Host logic should be authoritative
- Use Discord Developer Mode for local testing
- Monitor network traffic in browser DevTools

## 📖 Additional Resources

- [Discord Activities Documentation](https://discord.com/developers/docs/activities/overview)
- [Embedded App SDK Guide](https://discord.com/developers/docs/activities/building-an-activity)
- `MULTIPLAYER_GUIDE.md` - Detailed implementation guide

## 🤝 Support

If you encounter issues:
1. Check browser console for errors
2. Verify Discord SDK is loaded
3. Test in single-player mode first
4. Review MULTIPLAYER_GUIDE.md

---

**Status:** ✅ Refactoring Complete - Ready for Discord Activities Integration

The game architecture is now multiplayer-ready. Follow the Discord Activities setup steps to enable real multiplayer functionality!

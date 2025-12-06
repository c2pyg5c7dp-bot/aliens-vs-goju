# Multiplayer Refactoring Guide

## Overview
The game has been refactored to separate game state from rendering, making it ready for Discord Activities multiplayer integration.

## New Architecture

### 1. GameState.js
- **Purpose**: Centralized game state management
- **Key Features**:
  - Multi-player support via `Map<playerId, player>`
  - Serialization/deserialization for network sync
  - Pure game logic (no rendering)
  - All entity management (players, enemies, projectiles, etc.)

### 2. Renderer.js
- **Purpose**: Pure rendering logic
- **Key Features**:
  - Renders game state without modifying it
  - Image loading and caching
  - Support for multiple players on screen
  - Player name tags for multiplayer

### 3. Integration Points

The current `game_new.js` needs to be updated to use these new modules:

```javascript
// Create instances
const gameState = new GameState();
const renderer = new GameRenderer(canvas, ctx);

// Add local player
gameState.addPlayer('local-player-id', selectedCharacter, true);

// Game loop
function loop(timestamp) {
  const dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;
  
  // Collect inputs
  const inputs = {
    'local-player-id': {
      up: input.up,
      down: input.down,
      left: input.left,
      right: input.right,
      space: input.space
    }
  };
  
  // Update game state
  gameState.update(dt, inputs);
  
  // Render
  renderer.render(gameState);
  
  requestAnimationFrame(loop);
}
```

## Discord Activities Integration

### Phase 1: Setup (You'll need to do this)
1. Create a Discord Application at https://discord.com/developers/applications
2. Enable "Embedded App SDK" in your app settings
3. Add your game URL to allowed origins
4. Install Discord Embedded App SDK:
   ```bash
   npm install @discord/embedded-app-sdk
   ```

### Phase 2: Network Layer (Next Step)

Create a `NetworkManager.js`:

```javascript
import { DiscordSDK } from '@discord/embedded-app-sdk';

class NetworkManager {
  constructor(gameState) {
    this.gameState = gameState;
    this.discordSdk = null;
    this.participants = new Map();
    this.isHost = false;
  }
  
  async initialize() {
    // Initialize Discord SDK
    this.discordSdk = new DiscordSDK(YOUR_CLIENT_ID);
    await this.discordSdk.ready();
    
    // Get current user
    const { user } = await this.discordSdk.commands.authenticate();
    
    // Add local player
    this.gameState.addPlayer(user.id, 'player', true);
    
    // Listen for participants
    this.discordSdk.subscribe('ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE', 
      this.handleParticipantsUpdate.bind(this)
    );
  }
  
  handleParticipantsUpdate(event) {
    // Add/remove players based on participants
    event.participants.forEach(participant => {
      if (!this.gameState.players.has(participant.id)) {
        this.gameState.addPlayer(participant.id, 'player', false);
      }
    });
  }
  
  sendState() {
    // Broadcast game state to all participants
    if (this.isHost) {
      const state = this.gameState.serialize();
      // Use Discord's message passing or a custom WebRTC channel
      this.discordSdk.commands.sendMessage({
        type: 'GAME_STATE',
        data: state
      });
    }
  }
  
  receiveState(message) {
    if (message.type === 'GAME_STATE') {
      this.gameState.deserialize(message.data);
    }
  }
}
```

### Phase 3: Hosting Strategy

**Option A: Host-Client Model** (Recommended for simplicity)
- One player is the "host" and runs authoritative game logic
- Other players send inputs to host
- Host broadcasts game state updates
- Pros: Simple, no backend needed
- Cons: Host migration needed if host leaves

**Option B: Dedicated Server**
- Run a Node.js server to manage game state
- All players connect to server
- Server is authoritative
- Pros: Fair, no host advantage
- Cons: Requires hosting costs

### Phase 4: State Synchronization

For smooth multiplayer, implement:

1. **Input Prediction**: Local player moves immediately
2. **Server Reconciliation**: Correct position when server state arrives
3. **Entity Interpolation**: Smooth other players' movements

Example:
```javascript
class NetworkedGameState extends GameState {
  updatePlayer(player, dt, input) {
    if (player.id === this.localPlayerId) {
      // Predict local movement immediately
      super.updatePlayer(player, dt, input);
      
      // Send input to server
      this.sendInput(input);
    } else {
      // Interpolate remote players
      this.interpolatePlayer(player, dt);
    }
  }
}
```

## Migration Checklist

- [ ] Load GameState.js and Renderer.js in HTML
- [ ] Update game_new.js to use new architecture
- [ ] Test single-player still works
- [ ] Create Discord application
- [ ] Implement NetworkManager
- [ ] Add lobby/ready system
- [ ] Test with multiple players
- [ ] Implement lag compensation
- [ ] Add player name tags
- [ ] Handle player disconnect gracefully

## Current State

✅ **Completed:**
- GameState class with multi-player support
- Renderer separated from game logic
- Serialization ready for network sync

⏳ **Next Steps:**
1. Integrate GameState and Renderer into existing game
2. Set up Discord Application
3. Implement NetworkManager
4. Add Discord SDK

## Testing Single Player

To test the refactored code works, add to your HTML:

```html
<script src="GameState.js"></script>
<script src="Renderer.js"></script>
```

Then in game_new.js, initialize:
```javascript
const gameState = new GameState();
const renderer = new GameRenderer(canvas, ctx);
renderer.loadImage('background', 'path/to/background.png');
// etc...
```

## Notes

- The refactored code is **backward compatible** - you can integrate gradually
- All game logic is now in GameState, making it easy to sync
- Renderer is pure and stateless - perfect for multiplayer
- Discord Activities run in iframe with restrictions - test thoroughly

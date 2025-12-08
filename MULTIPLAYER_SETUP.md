# 🎮 Multiplayer Co-op Setup Guide

## ✅ What Works Now

The game now has **FULL co-op synchronization**:
- ✅ **Enemy Spawning** - Host spawns all enemies, clients see them in real-time
- ✅ **Wave Control** - Host manages wave progression, everyone syncs
- ✅ **Powerups** - Host spawns, all players can collect (no duplicates!)
- ✅ **Projectiles** - See everyone's bullets flying around
- ✅ **Position & Health** - Real-time player tracking
- ✅ **Score Tracking** - Individual scores displayed in scoreboard

## How It Works

The game now supports **4-player co-op** using **PeerJS** for peer-to-peer WebRTC connections. No server required!

### Key Features:
- ✅ Room code system (4-character codes like "AB3X")
- ✅ Real-time position, health, and score synchronization
- ✅ Visual rendering of other players
- ✅ Up to 4 players per room
- ✅ Works in Discord Activities and web browsers

## How to Play Multiplayer

### **Player 1 (Host):**
1. Click **"Create Lobby"** on the main menu
2. Wait for PeerJS to initialize (you'll see your room code)
3. **Share the 4-character room code** with your friends
4. Select your character
5. Wait for others to join
6. Click **"Start Co-op Game"** when ready

### **Player 2-4 (Join):**
1. Click **"Join Lobby"** on the main menu
2. Enter the **4-character room code** from the host
3. Click **"Join"** and wait to connect
4. Select your character
5. Wait for host to start the game

## Testing Locally

### Single PC Test (2 Windows):
1. Open the game in **2 browser windows** (or use normal + incognito)
2. Window 1: Create Lobby → Get code (e.g., "XY7K")
3. Window 2: Join Lobby → Enter "XY7K"
4. Both select characters
5. Window 1 (host): Click "Start Co-op Game"
6. You should see the other player as a colored circle in-game!

### Network Test (2 Different PCs):
1. PC 1: Create Lobby → Share room code
2. PC 2: Join Lobby → Enter room code
3. Both players should connect via WebRTC
4. Play together!

## Troubleshooting

### "Room not found"
- Make sure the host created the room first
- Check if the room code is correct (case-insensitive)
- Host might need to refresh if peer connection failed

### "Connection timeout"
- Check firewall settings (WebRTC needs UDP access)
- Try using a different network (some corporate networks block WebRTC)
- Ensure both players have stable internet

### "Can't see other players"
- Check browser console for errors (F12)
- Make sure both players started the game
- Network sync runs every 0.1 seconds - wait a moment

### PeerJS Not Loading
- Check if `https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js` is accessible
- Look for errors in browser console
- Try refreshing the page

## Technical Details

### Network Architecture:
- **Host** = Central peer (all connections go through host)
- **Clients** = Connect to host peer-to-peer
- **Sync Rate** = 10 updates per second (0.1s interval)
- **STUN Servers** = Google STUN for NAT traversal

### Data Synchronized:
- ✅ Enemy spawns and positions (host authoritative)
- ✅ Wave start/end (host controlled)
- ✅ Powerup spawns and collection
- ✅ All projectiles (bullets, rockets, fireballs, shotgun spread)
- ✅ Player position (x, y) - 10 times per second
- ✅ Player health
- ✅ Player score
- ✅ Character selection
- ✅ Enemy damage and kills

### Room Code System:
- Codes stored in `localStorage` temporarily
- Format: 4 alphanumeric characters (e.g., "A3K9")
- Excludes confusing characters (O, 0, 1, I)

## Game Flow (How Co-op Actually Works)

1. **Lobby Phase:**
   - Host creates room → gets 4-letter code
   - Players join with code → see each other in lobby
   - Everyone selects character
   - Host clicks "Start Co-op Game"

2. **Game Start:**
   - **Host spawns first wave** (clients wait)
   - Enemy data broadcast to all players
   - Everyone sees same enemies spawn

3. **Combat:**
   - All players can shoot enemies
   - Projectiles broadcast to show everyone's bullets
   - Damage is applied locally (no lag)
   - When enemy dies, **host spawns powerups**

4. **Powerup Collection:**
   - All players see same powerups
   - First to collect gets it
   - Collection broadcast → powerup removed for everyone

5. **Wave Progression:**
   - When all enemies dead, **host automatically spawns next wave**
   - Wave number synced across all players
   - Difficulty scales together

## Next Steps

### ✅ Completed Features:
- ✅ Enemy synchronization
- ✅ Wave control (host-managed)
- ✅ Powerup sync
- ✅ Projectile broadcasting

### Future Enhancements:
- [ ] Shared health/score pool
- [ ] Chat system
- [ ] Player skins/emotes
- [ ] Spectator mode
- [ ] Reconnection on disconnect
- [ ] Host migration

## Files Modified

1. **NetworkManager.js** - P2P networking + new message handlers for enemies, waves, powerups, projectiles
2. **lobby.js** - Room creation and joining UI
3. **game.main.js** - Full game synchronization (enemies, waves, powerups, projectiles)
4. **index.html** - PeerJS CDN script

## What's Actually Synchronized?

### ✅ Fully Synced:
1. **Enemy Waves** - Host spawns wave → broadcasts enemy data → clients spawn same enemies with IDs
2. **Powerups** - Host spawns on kill → broadcasts → all players see → first to collect wins → removal synced
3. **Projectiles** - Each player fires → broadcasts → all see bullets → damage is client-side
4. **Player Movement** - Position updates 10x/second → other players rendered as colored circles
5. **Scores** - Individual scores tracked and displayed

### ⚠️ Not Synced (Local Only):
- Gems (appear locally based on RNG)
- Hearts (appear locally)
- Particle effects
- Sound effects
- Individual player weapons/powerup timers

## Known Gameplay

Open browser console (F12) and try:
```javascript
// Check network status
window.networkManager.peer // Should show Peer object
window.networkManager.isHost // true if host
window.networkManager.roomCode // Your room code
window.networkManager.getPlayers() // List of connected players

// Manual sync test
window.networkManager.sendGameState({
  position: { x: 100, y: 100 },
  health: 10,
  score: 500
})
```

## Known Limitations

1. **NAT Traversal**: Some strict firewalls may block WebRTC. Use a VPN or different network.
2. **Room Persistence**: Rooms are cleared on page refresh (no persistent server).
3. **Host Dependency**: If host leaves, room closes (no host migration yet).
4. **Local Storage**: Room codes stored locally - clearing browser data resets rooms.

## Support

If multiplayer isn't working:
1. Open browser console (F12) and check for errors
2. Look for NetworkManager logs (prefixed with 🌐, 📞, 📨)
3. Verify PeerJS loaded: `typeof Peer !== 'undefined'`
4. Test with 2 windows on same PC first before testing across network

Enjoy co-op! 👾🎮

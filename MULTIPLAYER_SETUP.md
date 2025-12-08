# 🎮 Multiplayer Co-op Setup Guide

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
- Player position (x, y)
- Player health
- Player score
- Character selection

### Room Code System:
- Codes stored in `localStorage` temporarily
- Format: 4 alphanumeric characters (e.g., "A3K9")
- Excludes confusing characters (O, 0, 1, I)

## Next Steps

### Future Enhancements:
- [ ] Enemy spawns synchronized (currently local only)
- [ ] Shared health/score pool
- [ ] Chat system
- [ ] Player skins/emotes
- [ ] Spectator mode
- [ ] Reconnection on disconnect

## Files Modified

1. **NetworkManager.js** - Core P2P networking logic
2. **lobby.js** - Room creation and joining UI
3. **game.main.js** - Game state synchronization
4. **index.html** - Added PeerJS CDN script

## Console Debug Commands

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

# 🎮 Multiplayer Lobby Code Guide

## How Lobby Codes Work

The multiplayer system uses **PeerJS** for peer-to-peer connections. Each player gets a unique Peer ID when they connect.

### Code Format

Lobby codes use this format:
```
ABCD|peer-id-goes-here-with-dashes
```

Example:
```
XYZW|abc123-def456-ghi789
```

- **ABCD** = 4-letter room code (easy to remember)
- **|** = Separator
- **peer-id** = The host's unique PeerJS identifier (needed for direct connection)

---

## 📋 Step-by-Step: How to Host a Game

1. **Open the game** in your browser
2. **Click "Co-op"** button on start screen
3. **Wait for initialization**:
   - Check 🐛 Debug menu → "🌐 Multiplayer Status"
   - Make sure "PeerJS: ✅ Loaded" and "Peer Connection: ✅ Open"
4. **You'll see a code like**: `XYZW|abc123-def456-ghi789`
5. **Click "📋 Copy Code"** to copy the FULL code
6. **Share it** with your friend via Discord, text, etc.

---

## 🔗 Step-by-Step: How to Join a Game

1. **Get the full code** from your friend (including the | and everything after it)
2. **Open the game** in your browser
3. **Click "Co-op"** button
4. **Click "🔗 Join Game"** button
5. **Paste the FULL code** in the input box
6. **Click "✓ Join"**
7. **Wait for connection** (should take 2-10 seconds)

---

## ⚠️ Common Issues & Solutions

### Issue: "Room not found"
**Problem**: Only typing the 4-letter code without the peer ID  
**Solution**: Make sure you paste the FULL code including `|peer-id`

### Issue: Connection timeout
**Possible causes**:
1. **Firewall blocking WebRTC** - Try disabling firewall temporarily
2. **Restrictive network** - School/work networks may block P2P
3. **Different internet connections** - Try both on same WiFi first
4. **Browser compatibility** - Use Chrome, Edge, or Firefox (not IE)

### Issue: PeerJS not loaded
**Solution**: 
1. Check browser console (F12) for errors
2. Make sure you're connected to internet
3. The PeerJS CDN might be down - check https://peerjs.com

### Issue: Button does nothing
**Solution**:
1. Open 🐛 Debug menu (bottom-right)
2. Check "🌐 Multiplayer Status" section
3. Look for error messages in browser console (F12)
4. Make sure all fields show ✅ green checkmarks

---

## 🧪 Testing on Same Computer

You **can** test multiplayer on the same computer:

1. **Open game in Browser 1** (e.g., Chrome)
2. **Create lobby**, copy code
3. **Open game in Browser 2** (e.g., Firefox or Chrome Incognito)
4. **Join lobby** using the code

> **Note**: Using two tabs in the same browser might work but can cause issues. Use two different browsers or incognito mode.

---

## 🔍 Debugging Tips

### Check Multiplayer Status
1. Click 🐛 debug button (bottom-right)
2. Scroll to "🌐 Multiplayer Status"
3. Check these values:
   - **PeerJS**: Should be "✅ Loaded"
   - **NetworkManager**: Should be "✅ Exists"
   - **Peer Connection**: Should be "✅ Open"
   - **Local Peer ID**: Should show an ID (not "N/A")
   - **Is Host**: Should show "👑 YES" if hosting

### Check Browser Console
Press **F12** → **Console tab**:
- Look for green ✅ messages about PeerJS and NetworkManager
- Red ❌ errors will show what's broken
- Run this to check status:
```javascript
console.log('PeerJS:', typeof Peer !== 'undefined');
console.log('NetworkManager:', window.networkManager);
console.log('Peer ID:', window.networkManager?.localPlayerId);
```

---

## 💡 Pro Tips

1. **Wait for green checkmarks** - Don't rush. Let PeerJS fully initialize before creating/joining
2. **Share quickly** - Peer IDs can change if browser is refreshed
3. **Use Discord** - Easiest way to share codes with friends
4. **Test locally first** - Try on same WiFi before trying over internet
5. **Check the debug panel** - All the info you need is in "🌐 Multiplayer Status"

---

## 🎯 Technical Details

- **PeerJS Version**: 1.5.2
- **Protocol**: WebRTC (P2P)
- **STUN Servers**: Google STUN servers (stun.l.google.com:19302)
- **Code Storage**: localStorage (for same-browser testing)
- **Max Players**: 4
- **Connection Type**: Reliable (guaranteed delivery)

---

## 🆘 Still Having Issues?

1. Check the 🐛 Debug menu for detailed status
2. Look at browser console (F12) for errors
3. Try on a different network
4. Test with incognito/private browsing mode
5. Make sure both players are using latest Chrome/Firefox

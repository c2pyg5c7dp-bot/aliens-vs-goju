# Playing on iOS

## Current Status
Discord Activities have **limited iOS support** as of December 2025. The "not currently available on this OS" error is a Discord platform limitation, not a game issue.

## Options to Play on iOS:

### Option 1: Play in Mobile Browser (Recommended)
Since Discord Activities aren't fully supported on iOS yet, you can play the game directly in Safari:

1. Deploy your game to Vercel (see DEPLOY_VERCEL.md)
2. Open Safari on your iPhone/iPad
3. Go to your Vercel URL (e.g., `https://aliens-vs-goju.vercel.app`)
4. Tap the Share button → "Add to Home Screen"
5. The game will work as a standalone web app with touch controls!

### Option 2: Wait for Discord iOS Support
Discord is gradually rolling out Activities support to mobile platforms. Check:
- Discord's official announcements
- Your Discord app version (ensure it's up to date)
- Discord Developer Portal for iOS availability updates

### Option 3: Test on Desktop Discord
The game works perfectly on:
- ✅ Discord Desktop (Windows, Mac, Linux)
- ✅ Discord Web Browser
- ✅ Android Discord (with touch controls)

## Why This Happens
Discord Activities are a relatively new feature and platform support varies:
- **Desktop**: Full support ✅
- **Web**: Full support ✅
- **Android**: Growing support ✅
- **iOS**: Limited/Rolling out ⚠️

This is a Discord platform limitation, not a bug in your game. Your game is fully compatible with touch controls and will work on iOS as soon as Discord enables Activities for iOS devices.

## For Developers
To check iOS support status:
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Check your application's supported platforms
3. iOS may need to be explicitly enabled (when available)

## Alternative: Standalone Mode
Your game automatically falls back to standalone mode when Discord isn't available, so it can be played as a regular web game on any device.

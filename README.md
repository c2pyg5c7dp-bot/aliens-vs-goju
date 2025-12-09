# Aliens vs Goju - Discord Activity

A Vampire Survivors-style game running as a Discord Activity! Survive waves of enemies with auto-firing weapons and power-ups.

## 🎮 Play in Discord

This game is designed to run as a Discord Activity, allowing you to play directly inside Discord with your friends!

## 🚀 Quick Start

### For Development

1. **Install Dependencies**
   ```powershell
   npm install
   ```

2. **Set Up Environment**
   - Copy `.env.example` to `.env`
   - Get your Discord Client ID from https://discord.com/developers/applications
   - Add it to `.env`

3. **Generate SSL Certificates**
   ```powershell
   # Using mkcert (recommended)
   .\setup-certs.ps1
   
   # OR using OpenSSL
   .\setup-certs-openssl.ps1
   ```

4. **Run Development Server**
   ```powershell
   npm run dev
   ```
   
   Or use the all-in-one script:
   ```powershell
   .\start-discord-activity.ps1
   ```

### Discord Configuration

See [DISCORD_SETUP.md](DISCORD_SETUP.md) for detailed setup instructions.

## 📋 Features

- ✨ Auto-firing weapons
- 🎯 Multiple enemy types
- 💪 Power-ups and upgrades
- 🏆 Leaderboard system
- 🎮 Discord integration
- 👥 Multiplayer ready

## 🛠️ Technology Stack

- Pure JavaScript (no frameworks)
- HTML5 Canvas for rendering
- Discord Embedded App SDK
- Vite for development and building
- HTTPS local development server

## 📖 Documentation

- [Discord Setup Guide](DISCORD_SETUP.md) - Complete setup instructions
- [Multiplayer Guide](MULTIPLAYER_GUIDE.md) - Multiplayer implementation (if available)

## 🎯 Game Controls

- **Move**: WASD or Arrow Keys
- **Aim**: Mouse
- **Fire**: Automatic
- **Pause**: P or Pause button

## 🔧 Development Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 📝 Project Structure

```
aliens-vs-goju/
├── animations/        # Sprite animations
├── certs/            # SSL certificates (generated)
├── game.js           # Main game logic
├── main.js           # Discord SDK initialization
├── discordSdk.js     # Discord SDK wrapper
├── aliensvsgoju.html # Entry point
├── style.css         # Styles
└── vite.config.js    # Vite configuration
```

## 🐛 Troubleshooting

### Activity won't load in Discord
- Verify your Client ID in `.env`
- Check URL mappings in Discord Developer Portal
- Ensure SSL certificates are properly generated
- Make sure dev server is running on port 5173

### SSL Certificate errors
- Use `mkcert -install` to trust certificates
- Or accept the self-signed certificate in your browser

### Game not responding
- Check browser console for errors
- Verify Discord SDK initialized successfully
- Make sure you're running the activity in Discord, not just a browser

## 📄 License

MIT

## 🤝 Contributing

Feel free to submit issues and pull requests!

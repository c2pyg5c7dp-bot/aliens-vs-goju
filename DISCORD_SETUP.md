# Discord Activity Setup Guide

This guide will help you set up your game as a Discord Activity.

## Prerequisites

- Node.js (v18 or higher)
- A Discord account
- Discord Developer Portal access

## Step 1: Create a Discord Application

1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Name it "Aliens vs Goju" (or your preferred name)
4. Click "Create"

## Step 2: Configure Your Application

1. In your application settings, go to "Activities"
2. Enable "Embedded App SDK"
3. Note your **Application ID** (Client ID)
4. Add your development URL mapping:
   - URL Mappings: Add `/.proxy` → `https://localhost:5173`

## Step 3: Set Up SSL Certificates

Discord Activities require HTTPS. You need to create local SSL certificates:

### On Windows (PowerShell):

```powershell
# Install mkcert (if not already installed)
# You may need to install Chocolatey first from https://chocolatey.org/install
choco install mkcert

# Create certificate authority
mkcert -install

# Create directory for certificates
New-Item -ItemType Directory -Force -Path certs

# Generate certificates
mkcert -key-file certs/localhost-key.pem -cert-file certs/localhost.pem localhost 127.0.0.1 ::1
```

### Alternative: Using OpenSSL

If you have OpenSSL installed:

```powershell
New-Item -ItemType Directory -Force -Path certs
openssl req -x509 -newkey rsa:4096 -keyout certs/localhost-key.pem -out certs/localhost.pem -days 365 -nodes -subj "/CN=localhost"
```

## Step 4: Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```powershell
   Copy-Item .env.example .env
   ```

2. Edit `.env` and add your Discord Client ID:
   ```
   VITE_DISCORD_CLIENT_ID=your_actual_client_id_here
   ```

## Step 5: Install Dependencies

```powershell
npm install
```

## Step 6: Run the Development Server

```powershell
npm run dev
```

The server will start on `https://localhost:5173`

## Step 7: Test Your Activity

1. In Discord Developer Portal, go to your application's Activities tab
2. Under "Activity URL Mappings", make sure you have:
   - Prefix: `/.proxy`
   - Target: `https://localhost:5173`
3. Click "Save Changes"
4. In the "URL Mappings" section, click the "Test" button next to your mapping
5. This will open a test channel where you can try your activity

## Step 8: Launch the Activity

1. In Discord, go to any voice channel or direct message
2. Click the rocket icon (🚀) in the chat bar
3. Select your application from the Activities list
4. The game should load in Discord!

## Troubleshooting

### "Failed to Connect" Error
- Make sure your `.env` file has the correct Client ID
- Verify SSL certificates are properly generated in the `certs/` folder
- Check that the dev server is running on port 5173

### Activity Not Showing in Discord
- Ensure "Embedded App SDK" is enabled in Developer Portal
- Verify URL mappings are correct
- Try refreshing Discord (Ctrl+R)

### SSL Certificate Warnings
- If you used mkcert, run `mkcert -install` to trust the certificate authority
- You may need to accept the certificate in your browser first

## Development Tips

- Use Discord's DevTools (Ctrl+Shift+I in the activity window)
- Check the Console tab for errors
- The activity auto-reloads when you make changes

## Building for Production

When ready to deploy:

```powershell
npm run build
```

This creates a `dist/` folder with optimized files. You'll need to:
1. Host these files on a public HTTPS server
2. Update the Activity URL in Discord Developer Portal to point to your production URL
3. Submit your activity for review if you want to make it public

## Next Steps

- Add multiplayer features using Discord's participant APIs
- Implement Discord Rich Presence updates
- Use Discord's social features (invite friends, show scores, etc.)
- Test on both desktop and mobile Discord clients

## Resources

- [Discord Embedded App SDK Documentation](https://discord.com/developers/docs/activities/overview)
- [Discord Developer Portal](https://discord.com/developers/applications)
- [Example Discord Activities](https://github.com/discord/embedded-app-sdk/tree/main/examples)

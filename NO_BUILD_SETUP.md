# Discord Activity - No Build Setup Guide

Since Node.js installation is causing issues, here's how to set up your Discord Activity without any build tools:

## Quick Setup (No Node.js Required)

### Step 1: Create Discord Application

1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Name it "Aliens vs Goju"
4. Copy your **Application ID** (Client ID)

### Step 2: Update the HTML File

1. Open `discord-standalone.html` in a text editor
2. Find this line: `const DISCORD_CLIENT_ID = 'YOUR_CLIENT_ID_HERE';`
3. Replace `YOUR_CLIENT_ID_HERE` with your actual Application ID
4. Save the file

### Step 3: Host Your Game

You need to host your files on HTTPS. Here are some free options:

#### Option A: GitHub Pages (Recommended)
1. Push your code to GitHub
2. Go to repository Settings → Pages
3. Enable GitHub Pages from the main branch
4. Your URL will be: `https://YOUR-USERNAME.github.io/aliens-vs-goju/discord-standalone.html`

#### Option B: Netlify Drop
1. Go to https://app.netlify.com/drop
2. Drag and drop your entire project folder
3. Get your HTTPS URL

#### Option C: Vercel
1. Go to https://vercel.com
2. Import your GitHub repository
3. Deploy and get your HTTPS URL

### Step 4: Configure Discord Activity

1. In Discord Developer Portal, go to your application
2. Navigate to "Activities" tab
3. Enable "Embedded App SDK"
4. Set **Activity URL** to your hosted URL (e.g., `https://your-username.github.io/aliens-vs-goju/discord-standalone.html`)
5. Click "Save Changes"

### Step 5: Test Your Activity

1. In Discord Developer Portal, under Activities, click "Test in Discord"
2. Or go to any voice channel/DM in Discord
3. Click the rocket icon (🚀)
4. Select your activity
5. Play!

## Files You Need to Upload

When hosting, make sure to upload these files:
- `discord-standalone.html` (your main file)
- `game.js`
- `style.css`
- `animations/` folder (entire folder with all subfolders)

## Troubleshooting

### "Failed to Load Discord SDK"
- Make sure you're accessing via HTTPS
- Check browser console for errors
- Verify your Client ID is correct

### Activity not showing in Discord
- Make sure Activity URL is exactly your hosted URL
- Verify "Embedded App SDK" is enabled
- Try refreshing Discord (Ctrl+R)

### Game not loading
- Check all files are uploaded
- Verify paths to game.js and style.css are correct
- Open browser DevTools (F12) and check Console tab

## Alternative: Using Python's Built-in Server

If you want to test locally (not for Discord, just to see if game works):

```powershell
# If you have Python installed
python -m http.server 8000
# Then visit http://localhost:8000/discord-standalone.html
```

Note: This won't work for Discord Activity (no HTTPS), but useful for testing.

## Need Node.js After All?

If you decide to install Node.js properly:

1. Download from: https://nodejs.org/en/download/
2. Run the installer
3. **Important:** Check "Add to PATH" during installation
4. Close ALL terminal windows
5. Open a NEW terminal
6. Run: `node --version` to verify
7. Then run: `npm install`

The issue is likely that Node.js isn't in your PATH or you didn't restart your terminal after installing.

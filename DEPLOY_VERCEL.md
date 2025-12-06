# Deploy to Vercel - Step by Step Guide

## What You Just Did
✅ Pushed your game code to GitHub
✅ Added Vercel configuration file
✅ Ready to deploy!

## Deploy to Vercel (Free & Stable Hosting)

### Step 1: Sign Up for Vercel
1. Go to https://vercel.com
2. Click "Sign Up"
3. Choose "Continue with GitHub"
4. Authorize Vercel to access your GitHub

### Step 2: Deploy Your Project
1. Once logged in, click "Add New..." → "Project"
2. Find and select your repository: `c2pyg5c7dp-bot/aliens-vs-goju`
3. Click "Import"
4. Vercel will auto-detect it's a Vite project
5. Add Environment Variable:
   - Name: `VITE_DISCORD_CLIENT_ID`
   - Value: `1446725465300664402`
6. Click "Deploy"
7. Wait 1-2 minutes for deployment to complete

### Step 3: Get Your Deployment URL
After deployment completes:
- You'll get a URL like: `https://aliens-vs-goju.vercel.app`
- Copy this URL!

### Step 4: Update Discord Developer Portal
1. Go to https://discord.com/developers/applications/1446725465300664402
2. Click "Activities" in the left sidebar
3. Under "URL Mappings", click "Add URL Mapping"
4. Set:
   - **Prefix:** `/`
   - **Target:** `https://aliens-vs-goju.vercel.app` (your Vercel URL)
5. Click "Save Changes"

### Step 5: Test Your Discord Activity
1. Open Discord (desktop or web)
2. Start a voice channel or DM
3. Click the rocket icon 🚀 or Activities button
4. Find your activity "Aliens vs Goju"
5. Launch it!

## Troubleshooting

### If you see a white screen:
- Check browser console for errors (F12)
- Verify the Vercel URL is correct in Discord portal
- Make sure environment variable is set in Vercel

### To redeploy after making changes:
```bash
git add .
git commit -m "Your changes"
git push origin main
```
Vercel will automatically redeploy!

## Benefits of Vercel vs Cloudflare Tunnel
✅ **Stable URL** - Never changes
✅ **Always online** - No disconnections
✅ **Automatic deployments** - Push to GitHub = auto deploy
✅ **Free forever** - No credit card needed
✅ **Fast CDN** - Global edge network
✅ **HTTPS** - Automatic SSL certificates

## Alternative: Deploy to Cloudflare Pages

If you prefer Cloudflare:
1. Go to https://pages.cloudflare.com
2. Connect your GitHub repository
3. Build settings:
   - Build command: `npm run build`
   - Output directory: `dist`
4. Add environment variable: `VITE_DISCORD_CLIENT_ID=1446725465300664402`
5. Deploy!

## Need Help?
- Vercel Docs: https://vercel.com/docs
- Discord Activities: https://discord.com/developers/docs/activities/overview

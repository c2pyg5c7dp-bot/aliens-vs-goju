# Cloudflare Tunnel Setup Guide

## Step 1: Install Cloudflared
```powershell
winget install --id Cloudflare.cloudflared
```

Or download from: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/

## Step 2: Login to Cloudflare
```powershell
cloudflared tunnel login
```
This opens your browser - select your Cloudflare account/domain.

## Step 3: Create a Tunnel
```powershell
cloudflared tunnel create aliens-vs-goju
```
This creates:
- A tunnel ID
- A credentials file at `C:\Users\clari\.cloudflared\<TUNNEL-ID>.json`

**Copy the tunnel ID shown in the output!**

## Step 4: Update Config File
Edit `cloudflared-config.yml` and replace:
- `YOUR-TUNNEL-ID` with your actual tunnel ID
- `YOUR-SUBDOMAIN.trycloudflare.com` with your desired URL

Or if you have a custom domain:
```yaml
tunnel: YOUR-TUNNEL-ID
credentials-file: C:\Users\clari\.cloudflared\YOUR-TUNNEL-ID.json

ingress:
  - hostname: game.yourdomain.com
    service: http://localhost:8080
  - service: http_status:404
```

## Step 5: Route DNS (Choose One)

### Option A: Quick Tunnel (Temporary URL)
Just run and get instant URL:
```powershell
cloudflared tunnel --url http://localhost:8080
```

### Option B: Named Tunnel with trycloudflare.com subdomain
```powershell
cloudflared tunnel route dns aliens-vs-goju aliens-game.trycloudflare.com
```

### Option C: Custom Domain (Requires owning a domain)
```powershell
cloudflared tunnel route dns aliens-vs-goju game.yourdomain.com
```

## Step 6: Start Your Docker Container
```powershell
docker-compose up -d
```

## Step 7: Run the Tunnel
```powershell
cloudflared tunnel --config cloudflared-config.yml run aliens-vs-goju
```

Or run in background:
```powershell
cloudflared service install
```

## Your Game URL
You'll get a URL like:
- Quick: `https://random-words.trycloudflare.com`
- Named: `https://aliens-game.trycloudflare.com`
- Custom: `https://game.yourdomain.com`

Use this URL in your Discord Activity settings!

## Troubleshooting

**Tunnel not starting?**
- Make sure Docker container is running on port 8080
- Check `docker ps` to verify

**Can't access URL?**
- Wait 30 seconds for DNS propagation
- Check tunnel status: `cloudflared tunnel info aliens-vs-goju`

**Need to stop tunnel?**
```powershell
# If running in foreground: Ctrl+C
# If running as service:
cloudflared service uninstall
```

## Keep Tunnel Running on PC Restart
```powershell
cloudflared service install
```
This installs it as a Windows service that auto-starts.

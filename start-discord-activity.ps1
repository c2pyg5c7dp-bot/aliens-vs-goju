# Quick Start Script for Discord Activity
# Run this script to set up and start the development server

Write-Host "=== Discord Activity Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js $nodeVersion found" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js not found. Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host ""
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✓ Created .env file" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠ IMPORTANT: Edit .env and add your Discord Client ID!" -ForegroundColor Yellow
    Write-Host "  Get it from: https://discord.com/developers/applications" -ForegroundColor Cyan
    Write-Host ""
    $response = Read-Host "Press Enter to continue (make sure to edit .env first) or Ctrl+C to exit"
}

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host ""
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
}

# Check for SSL certificates
if (-not (Test-Path "certs")) {
    Write-Host ""
    Write-Host "⚠ SSL certificates not found" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Discord Activities require HTTPS. You have two options:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Option 1 - Using mkcert (recommended):" -ForegroundColor White
    Write-Host "  1. Install Chocolatey from https://chocolatey.org/install" -ForegroundColor Gray
    Write-Host "  2. Run: choco install mkcert" -ForegroundColor Gray
    Write-Host "  3. Run: mkcert -install" -ForegroundColor Gray
    Write-Host "  4. Run: ./setup-certs.ps1" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Option 2 - Using OpenSSL:" -ForegroundColor White
    Write-Host "  1. Install OpenSSL" -ForegroundColor Gray
    Write-Host "  2. Run: ./setup-certs-openssl.ps1" -ForegroundColor Gray
    Write-Host ""
    $createCerts = Read-Host "Do you want to create certificates now using OpenSSL? (y/n)"
    
    if ($createCerts -eq "y") {
        New-Item -ItemType Directory -Force -Path certs | Out-Null
        openssl req -x509 -newkey rsa:4096 -keyout certs/localhost-key.pem -out certs/localhost.pem -days 365 -nodes -subj "/CN=localhost"
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Certificates created" -ForegroundColor Green
        } else {
            Write-Host "✗ Failed to create certificates. Please install OpenSSL or use mkcert" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "Please create SSL certificates before running the dev server" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host ""
Write-Host "=== Starting Development Server ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Server will start at: https://localhost:5173" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Make sure your Discord app is configured at https://discord.com/developers/applications" -ForegroundColor White
Write-Host "2. Add URL mapping: /.proxy -> https://localhost:5173" -ForegroundColor White
Write-Host "3. Test your activity in Discord!" -ForegroundColor White
Write-Host ""
Write-Host "See DISCORD_SETUP.md for detailed instructions" -ForegroundColor Cyan
Write-Host ""

npm run dev

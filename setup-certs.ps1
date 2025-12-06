# SSL Certificate Setup using mkcert
Write-Host "Setting up SSL certificates using mkcert..." -ForegroundColor Cyan

# Check if mkcert is installed
try {
    $mkcertVersion = mkcert -version
    Write-Host "✓ mkcert found: $mkcertVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ mkcert not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install mkcert:" -ForegroundColor Yellow
    Write-Host "  1. Install Chocolatey from https://chocolatey.org/install" -ForegroundColor White
    Write-Host "  2. Run: choco install mkcert" -ForegroundColor White
    Write-Host "  3. Run this script again" -ForegroundColor White
    exit 1
}

# Install mkcert CA
Write-Host ""
Write-Host "Installing certificate authority..." -ForegroundColor Yellow
mkcert -install

# Create certs directory
New-Item -ItemType Directory -Force -Path certs | Out-Null

# Generate certificates
Write-Host "Generating certificates for localhost..." -ForegroundColor Yellow
mkcert -key-file certs/localhost-key.pem -cert-file certs/localhost.pem localhost 127.0.0.1 ::1

Write-Host ""
Write-Host "✓ SSL certificates created successfully!" -ForegroundColor Green
Write-Host "  - certs/localhost.pem" -ForegroundColor Gray
Write-Host "  - certs/localhost-key.pem" -ForegroundColor Gray
Write-Host ""
Write-Host "You can now run: npm run dev" -ForegroundColor Cyan

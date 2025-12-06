# SSL Certificate Setup using OpenSSL
Write-Host "Setting up SSL certificates using OpenSSL..." -ForegroundColor Cyan

# Check if OpenSSL is installed
try {
    $opensslVersion = openssl version
    Write-Host "✓ OpenSSL found: $opensslVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ OpenSSL not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install OpenSSL:" -ForegroundColor Yellow
    Write-Host "  Download from: https://slproweb.com/products/Win32OpenSSL.html" -ForegroundColor White
    Write-Host "  Or use: choco install openssl" -ForegroundColor White
    exit 1
}

# Create certs directory
New-Item -ItemType Directory -Force -Path certs | Out-Null

# Generate self-signed certificate
Write-Host ""
Write-Host "Generating self-signed certificate for localhost..." -ForegroundColor Yellow
openssl req -x509 -newkey rsa:4096 -keyout certs/localhost-key.pem -out certs/localhost.pem -days 365 -nodes -subj "/CN=localhost"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✓ SSL certificates created successfully!" -ForegroundColor Green
    Write-Host "  - certs/localhost.pem" -ForegroundColor Gray
    Write-Host "  - certs/localhost-key.pem" -ForegroundColor Gray
    Write-Host ""
    Write-Host "⚠ Note: You may see browser warnings about self-signed certificates." -ForegroundColor Yellow
    Write-Host "  This is normal. Accept the certificate to proceed." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "You can now run: npm run dev" -ForegroundColor Cyan
} else {
    Write-Host "✗ Failed to create certificates" -ForegroundColor Red
    exit 1
}

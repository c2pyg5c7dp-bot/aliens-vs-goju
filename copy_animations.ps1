$sourceBase = "C:\Users\clari\OneDrive\Documents\GitHub\aliens-vs-goju\animations\Player\animations"
$destBase = "C:\Users\clari\OneDrive\Documents\GitHub\aliens-vs-goju\animations\tank\animations"
$logFile = "C:\Users\clari\OneDrive\Documents\GitHub\aliens-vs-goju\copy_log.txt"

# Clear log file
"" | Out-File -FilePath $logFile -Force

"Starting copy process..." | Out-File -FilePath $logFile -Append

# Verify source exists
if (Test-Path $sourceBase) {
    "Source directory exists: $sourceBase" | Out-File -FilePath $logFile -Append
} else {
    "ERROR: Source directory not found" | Out-File -FilePath $logFile -Append
    exit 1
}

# Verify destination exists
if (Test-Path $destBase) {
    "Destination directory exists: $destBase" | Out-File -FilePath $logFile -Append
} else {
    "ERROR: Destination directory not found" | Out-File -FilePath $logFile -Append
    exit 1
}

# Count source files
$sourceFiles = Get-ChildItem -Path $sourceBase -Recurse -Filter "*.png"
$sourceCount = ($sourceFiles | Measure-Object).Count
"Source PNG files found: $sourceCount" | Out-File -FilePath $logFile -Append

# Copy files
foreach ($file in $sourceFiles) {
    $relative = $file.FullName.Substring($sourceBase.Length + 1)
    $destPath = Join-Path $destBase $relative
    $destDir = Split-Path $destPath
    
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    
    Copy-Item -Path $file.FullName -Destination $destPath -Force
    "Copied: $relative" | Out-File -FilePath $logFile -Append
}

# Verify destination
$destFiles = Get-ChildItem -Path $destBase -Recurse -Filter "*.png"
$destCount = ($destFiles | Measure-Object).Count
"Destination PNG files after copy: $destCount" | Out-File -FilePath $logFile -Append

if ($destCount -eq $sourceCount) {
    "SUCCESS: All $destCount files copied successfully!" | Out-File -FilePath $logFile -Append
} else {
    "WARNING: Source had $sourceCount files but destination has $destCount files" | Out-File -FilePath $logFile -Append
}

Get-Content $logFile

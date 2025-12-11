@echo off
setlocal enabledelayedexpansion

set SOURCE=C:\Users\clari\OneDrive\Documents\GitHub\aliens-vs-goju\animations\Player\animations
set DEST=C:\Users\clari\OneDrive\Documents\GitHub\aliens-vs-goju\animations\tank\animations

echo Copying files from Player to tank...

REM Copy running-8-frames
for %%d in (east, north, north-east, north-west, south, south-east, south-west, west) do (
    echo Copying running-8-frames\%%d...
    xcopy "!SOURCE!\running-8-frames\%%d\*.png" "!DEST!\running-8-frames\%%d\" /Y /Q
)

REM Copy fireball
for %%d in (north, north-east, north-west, south, south-east, south-west, west) do (
    echo Copying fireball\%%d...
    xcopy "!SOURCE!\fireball\%%d\*.png" "!DEST!\fireball\%%d\" /Y /Q
)

echo.
echo Copy complete!
dir /S /B "%DEST%\*.png" | find /C ".png"

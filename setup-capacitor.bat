@echo off
setlocal
cd /d "%~dp0"

echo Installing Capacitor dependencies...
npm install
if errorlevel 1 goto :error

echo.
echo Capacitor packages installed successfully.
echo.
echo IMPORTANT: iOS project generation requires macOS/Xcode.
echo Codemagic will run: npx cap add ios and build the IPA in the cloud.
pause
exit /b 0

:error
echo.
echo ERROR: npm install failed.
pause
exit /b 1

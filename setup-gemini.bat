@echo off
title CanvasFlow - Setup Gemini Key
echo.
echo ==========================================
echo   CanvasFlow AI - Gemini Key Setup
echo ==========================================
echo.
set /p GEMINI_KEY=Paste your Gemini API key (it will be saved only in .env): 
if "%GEMINI_KEY%"=="" (
  echo.
  echo No key entered. Nothing was changed.
  pause
  exit /b 1
)
(
  echo GEMINI_API_KEY=%GEMINI_KEY%
  echo GEMINI_MODEL=gemini-3.5-flash-lite
  echo PORT=3000
  echo MAX_IMAGES=12
  echo MAX_IMAGE_MB=8
) > .env
echo.
echo .env created successfully.
echo You can now run: npm start
echo.
pause

@echo off
rem DarKhwast launcher: uses Node from PATH, or the local tools copy if present
where node >nul 2>nul
if %errorlevel%==0 (
  node server.js
  goto :eof
)
if exist "%USERPROFILE%\tools\node\node.exe" (
  "%USERPROFILE%\tools\node\node.exe" server.js
  goto :eof
)
echo Node.js not found. Install from https://nodejs.org or run:
echo   winget install OpenJS.NodeJS.LTS
pause

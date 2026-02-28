@echo off
echo Closing process on port 40001...
echo.

REM Find the PID using port 40001
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :40001') do (
    set PID=%%a
)

if defined PID (
    echo Found process with PID: %PID%
    echo Killing process...
    taskkill /F /PID %PID%
    echo.
    echo Process on port 40001 has been closed.
) else (
    echo No process found on port 40001.
)

echo.
pause
@echo off
cd /d "%~dp0\.."
echo ====================================
echo   Naplneni databaze testovacimi daty
====================================
echo.
echo POZOR: Tohle pridá ukázková data do databáze.
echo.
set /p confirm="Pokračovat? (ano/ne): "

if /i "%confirm%"=="ano" (
    echo.
    echo Instaluji tsx...
    call npm install -D tsx
    echo.
    echo Spoustim seed skript...
    call npx tsx prisma/seed.ts
    echo.
    echo Hotovo!
) else (
    echo.
    echo Zrušeno.
)
echo.
pause

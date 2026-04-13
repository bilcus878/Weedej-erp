@echo off
cd /d "%~dp0\.."
echo ====================================
echo   VAROVÁNÍ: Reset databáze
echo ====================================
echo.
echo Toto smaže VŠECHNA data v databázi!
echo.
set /p confirm="Opravdu chceš pokračovat? (ano/ne): "

if /i "%confirm%"=="ano" (
    echo.
    echo Resetuji databazi...
    call npx prisma db push --force-reset
    echo.
    echo Databaze byla resetovana.
) else (
    echo.
    echo Reset zrusen.
)
echo.
pause

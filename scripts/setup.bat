@echo off
cd /d "%~dp0\.."
echo ====================================
echo   Ucetni Program - Instalace
====================================
echo.

echo [1/4] Instaluji zavislosti...
call npm install
if %errorlevel% neq 0 (
    echo CHYBA: Nepodadilo se nainstalovat zavislosti!
    pause
    exit /b 1
)
echo.

echo [2/4] Generuji Prisma Client...
call npx prisma generate
if %errorlevel% neq 0 (
    echo CHYBA: Nepodadilo se vygenerovat Prisma Client!
    pause
    exit /b 1
)
echo.

echo [3/5] Vytvarim databazove tabulky...
call npx prisma db push
if %errorlevel% neq 0 (
    echo CHYBA: Nepodadilo se vytvorit tabulky!
    echo Zkontroluj DATABASE_URL v .env souboru a ze PostgreSQL bezi.
    pause
    exit /b 1
)
echo.

echo [4/5] Instaluji STORNO system a ON-COMMIT cislovani...
call npx tsx scripts/setup-storno.ts
if %errorlevel% neq 0 (
    echo CHYBA: Nepodadilo se nainstalovat STORNO system!
    pause
    exit /b 1
)
echo.

echo [5/5] Hotovo!
echo.
echo ====================================
echo   Instalace uspesne dokoncena!
====================================
echo.
echo Spust aplikaci pomoci: npm run dev
echo Nebo pouzij: scripts\start.bat
echo.
pause

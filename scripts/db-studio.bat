@echo off
cd /d "%~dp0\.."
echo ====================================
echo   Prisma Studio - Sprava databaze
echo ====================================
echo.
echo Prisma Studio bezi na: http://localhost:5555
echo.
echo Pro zastaveni stiskni Ctrl+C
echo.
call npx prisma studio

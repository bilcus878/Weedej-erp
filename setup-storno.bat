@echo off
echo ========================================
echo SETUP STORNO SYSTEMU + ON-COMMIT CISLOVANI
echo ========================================
echo.
echo Tento skript:
echo - Vytvori tabulku DocumentSeries
echo - Prida storno pole do Receipts a DeliveryNotes
echo - Smaze starou DocumentNumber tabulku
echo.
echo Pouziva databazi z .env souboru (zadne heslo!)
echo.
pause

echo.
echo Instaluji STORNO system...
echo.

npx tsx scripts/setup-storno.ts

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo HOTOVO! STORNO system nainstalovany.
    echo ========================================
    echo.
    echo Co ted:
    echo 1. Pouzij Reset DB tlacitko v Nastaveni
    echo 2. Vytvor testovaci prijemky/vydejky
    echo 3. Zkus je stornovat misto mazani
    echo.
    echo Cisla NIKDY nepreskoci, i kdyz vytvoreni selze!
) else (
    echo.
    echo ========================================
    echo CHYBA! Instalace selhala.
    echo ========================================
)

echo.
pause

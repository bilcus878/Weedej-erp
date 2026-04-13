@echo off
echo ========================================
echo RESET DATABAZE (zachova produkty)
echo ========================================
echo.
echo POZOR: Toto smaze VSECHNA data krome:
echo - Produktu (Products)
echo - Kategorii (Categories)
echo.
echo Budou smazany:
echo - Zakaznici (Customers)
echo - Dodavatele (Suppliers)
echo - Objednavky (PurchaseOrders)
echo - Prijemky (Receipts)
echo - Vydejky (DeliveryNotes)
echo - Faktury (Transactions, ReceivedInvoices)
echo - Sklad (InventoryItems)
echo - Rezervace (Reservations)
echo.
set /p confirm="Opravdu chces resetovat databazi? (ano/ne): "
if /i not "%confirm%"=="ano" (
    echo Reset zrusen.
    pause
    exit /b
)

echo.
echo Resetuji databazi...
echo.

REM Spust Prisma skript pro reset
npx tsx scripts\reset-db.ts

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo HOTOVO! Databaze byla uspesne resetovana.
    echo ========================================
) else (
    echo.
    echo ========================================
    echo CHYBA! Reset databaze selhal.
    echo ========================================
)

echo.
pause

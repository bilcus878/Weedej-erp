@echo off
echo Vytvarim Prisma migraci...
npx prisma migrate dev --name add_document_number_tracking
pause

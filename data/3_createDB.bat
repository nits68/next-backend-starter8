@echo off
setlocal
rem Uj adatbazis letrehozasa. A nevet futtataskor kerdezi meg.
rem A createdb bekeri a postgres felhasznalo jelszavat (az initdb-nel megadott jelszo).

set PGBIN=c:\pgsql\bin

set "DBNAME="
set /p DBNAME="Az uj adatbazis neve: "

if "%DBNAME%"=="" (
  echo.
  echo Nem adtal meg nevet, kilepes.
  pause
  exit /b 1
)

echo.
echo A(z) "%DBNAME%" adatbazis letrehozasa...
%PGBIN%\createdb.exe -h localhost -p 5432 -U postgres -E UTF8 "%DBNAME%"

if errorlevel 1 (
  echo.
  echo Nem sikerult letrehozni. Fut a szerver? Letezik mar ilyen nevu adatbazis?
) else (
  echo.
  echo Kesz: %DBNAME%
  echo A .env-ben a kapcsolat igy nez ki (a jelszót írjad át a megadottra):
  echo   DATABASE_URL="postgresql://postgres:jelszo@localhost:5432/%DBNAME%"
)
pause

@echo off
set PGBIN=c:\pgsql\bin
set PGDATA=c:\pgdata
set PGLOG=c:\pgsql\postgres.log
echo A PostgreSQL inditasa...
powershell -NoProfile -Command "Start-Process -FilePath '%PGBIN%\pg_ctl.exe' -ArgumentList '-D','%PGDATA%','-l','%PGLOG%','start' -WindowStyle Hidden"

rem Varakozas, amig a szerver fogadni tudja a kapcsolatokat (legfeljebb kb. 15 masodperc):
for /l %%i in (1,1,15) do (
  %PGBIN%\pg_ctl.exe -D %PGDATA% status >nul 2>&1
  if not errorlevel 1 goto ready
  >nul ping -n 2 127.0.0.1
)

echo.
echo A szerver nem indult el idoben. A naplo (%PGLOG%) vege:
echo.
powershell -NoProfile -Command "Get-Content '%PGLOG%' -Tail 15"
echo.
pause
exit /b 1

:ready
echo.
%PGBIN%\pg_ctl.exe -D %PGDATA% status
echo.
echo A szerver fut, ez az ablak bezarhato. Leallitas: a stopPostgres scripttel.
pause

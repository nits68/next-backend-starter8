@echo off
rem A pgAdmin 4 grafikus felulet inditasa. A "start" miatt kulon processzkent indul,
rem ezert ez az ablak rogton bezarhato (a pgAdmin fut tovabb).
rem
rem A pgAdmin elso inditasa lassu (sajat webkiszolgalot indit), legy turelemmel.
rem Kapcsolodas: Host localhost, Port 5432, Username postgres, a jelszo az initdb-nel megadott.

set PGADMIN="c:\pgsql\pgAdmin 4\runtime\pgAdmin4.exe"

if not exist %PGADMIN% (
  echo Nem talalhato: %PGADMIN%
  echo Ellenorizd a pgAdmin telepitesi helyet, es ird at a PGADMIN valtozot!
  pause
  exit /b 1
)

echo A pgAdmin 4 inditasa...
start "" %PGADMIN%

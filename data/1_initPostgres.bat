if not exist "c:\pgdata\" c:\pgsql\bin\initdb.exe -D c:\pgdata -U postgres -W -E UTF8 -A scram-sha-256
pause

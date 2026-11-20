@echo off
cd /d "%~dp0backend"
echo Starting AttendOS Backend Server...
if exist ".venv\Scripts\python.exe" (
    .venv\Scripts\python.exe run.py
) else (
    echo Virtual environment not found. Running with global python...
    python run.py
)
pause

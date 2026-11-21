@echo off
setlocal
cd /d "%~dp0"
if not exist "River_Valley_Family_Adventure_OFFLINE.html" (
  echo Missing offline game file. Extract all files from the ZIP first.
  pause
  exit /b 1
)
start "" "River_Valley_Family_Adventure_OFFLINE.html"

@echo off
setlocal

set NODE_EXE=%ProgramFiles%\nodejs\node.exe
if exist "%NODE_EXE%" goto run
set NODE_EXE=%ProgramFiles(x86)%\nodejs\node.exe
if exist "%NODE_EXE%" goto run

echo Node.js was not found. Please install Node.js or add it to PATH.
exit /b 1

:run
set ELECTRON_RUN_AS_NODE=
set VITE_JS=%~dp0..\node_modules\vite\bin\vite.js
set WAIT_ON_JS=%~dp0..\node_modules\wait-on\bin\wait-on
set ELECTRON_JS=%~dp0..\node_modules\electron\cli.js

start "vite" "%NODE_EXE%" "%VITE_JS%" --port 5173 --strictPort
"%NODE_EXE%" "%WAIT_ON_JS%" http://localhost:5173
"%NODE_EXE%" "%ELECTRON_JS%" .

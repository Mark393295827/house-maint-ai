@echo off
setlocal
CHCP 65001 > nul

echo ==========================================
echo   House Maint AI - 项目一键启动脚本
echo ==========================================

echo.
set /p install="[1/2] 是否需要安装/更新依赖（npm install）? (y/n, 默认 n): "
set /p initdb="[2/2] 是否需要初始化数据库（npm run init-db）? (y/n, 默认 n): "

echo.
echo ------------------------------------------
echo 正在启动后端服务...
if /i "%install%"=="y" (
    if /i "%initdb%"=="y" (
        start "House Maint AI - Backend" cmd /c "cd server && echo 正在安装依赖... && npm install && echo 正在初始化数据库... && npm run init-db && echo 正在启动开发服务器... && npm run dev || pause"
    ) else (
        start "House Maint AI - Backend" cmd /c "cd server && echo 正在安装依赖... && npm install && echo 正在启动开发服务器... && npm run dev || pause"
    )
) else (
    if /i "%initdb%"=="y" (
        start "House Maint AI - Backend" cmd /c "cd server && echo 正在初始化数据库... && npm run init-db && echo 正在启动开发服务器... && npm run dev || pause"
    ) else (
        start "House Maint AI - Backend" cmd /c "cd server && echo 正在启动开发服务器... && npm run dev || pause"
    )
)

echo 正在启动前端服务...
if /i "%install%"=="y" (
    start "House Maint AI - Frontend" cmd /c "echo 正在安装依赖... && npm install && echo 正在启动开发服务器... && npm run dev || pause"
) else (
    start "House Maint AI - Frontend" cmd /c "echo 正在启动开发服务器... && npm run dev || pause"
)

echo.
echo ------------------------------------------
echo 所有服务已在独立窗口中启动。
echo 前端地址: http://localhost:5173
echo 后端地址: http://localhost:3001
echo.
echo 请保留窗口直到您想停止服务。
echo.
pause

@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ==============================================
echo   桌球同好地圖 - 推送更新到 GitHub Pages
echo ==============================================
echo.
git add -A
git commit -m "feat: 新增後台管理系統 (admin.html)、支援新增修改刪除與地圖同步"
echo.
echo 正在推送到 GitHub...
git push origin main
echo.
echo ==============================================
echo  推送完成！請等待 1~2 分鐘 GitHub Pages 重新部署生效。
echo ==============================================
pause

# WSL 端口转发设置脚本
# 需要以管理员身份运行 PowerShell

Write-Host "🔧 配置 WSL 端口转发..." -ForegroundColor Yellow

# 获取 WSL IP 地址
$wslIP = (wsl hostname -I).Trim()
Write-Host "📍 WSL IP 地址: $wslIP" -ForegroundColor Green

# 删除旧的端口转发规则（如果存在）
Write-Host "🧹 清理旧的端口转发规则..." -ForegroundColor Yellow
netsh interface portproxy delete v4tov4 listenport=80 | Out-Null
netsh interface portproxy delete v4tov4 listenport=8080 | Out-Null

# 添加新的端口转发规则
Write-Host "➕ 添加新的端口转发规则..." -ForegroundColor Yellow
netsh interface portproxy add v4tov4 listenport=8080 listenaddress=0.0.0.0 connectport=8080 connectaddress=$wslIP

# 配置防火墙规则
Write-Host "🔥 配置防火墙规则..." -ForegroundColor Yellow
New-NetFirewallRule -DisplayName "WSL Coffee Shop 8080" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue

# 显示当前端口转发规则
Write-Host "📋 当前端口转发规则:" -ForegroundColor Cyan
netsh interface portproxy show all

Write-Host "✅ 端口转发配置完成!" -ForegroundColor Green
Write-Host "🌐 现在可以通过以下地址访问:" -ForegroundColor Blue
Write-Host "   - http://localhost:8080" -ForegroundColor White
Write-Host "   - http://$(hostname):8080" -ForegroundColor White
Write-Host "   - http://你的IP地址:8080" -ForegroundColor White

Write-Host "`n💡 提示:" -ForegroundColor Yellow
Write-Host "   - 如果无法访问，请检查 Windows 防火墙设置" -ForegroundColor White
Write-Host "   - 重启 WSL 后可能需要重新运行此脚本" -ForegroundColor White 
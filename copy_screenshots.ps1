# Copy 2.0 UI Screenshots to project assets
# Run: powershell -ExecutionPolicy Bypass -File copy_screenshots.ps1

$src = "C:\Users\高杰\Desktop\House Maint AI 设计和商业计划\展示图片\2.0UI"
$dst = "c:\Users\高杰\house-maint-ai\assets\screenshots"

# User/ToB UI
Copy-Item "$src\用户ToB UI\ScreenShot_2026-03-16_101509_487.jpg" "$dst\user_dashboard.jpg" -Force
Copy-Item "$src\用户ToB UI\ScreenShot_2026-03-16_101559_994.jpg" "$dst\user_login.jpg" -Force
Copy-Item "$src\用户ToB UI\ScreenShot_2026-03-16_101635_380.jpg" "$dst\ai_diagnosis_chat.jpg" -Force
Copy-Item "$src\用户ToB UI\ScreenShot_2026-03-16_102053_109.jpg" "$dst\worker_matching.jpg" -Force
Copy-Item "$src\用户ToB UI\ScreenShot_2026-03-16_103207_796.jpg" "$dst\openclaw_sim.jpg" -Force
Copy-Item "$src\用户ToB UI\ScreenShot_2026-03-16_104131_698.jpg" "$dst\case_library.jpg" -Force
Copy-Item "$src\用户ToB UI\ScreenShot_2026-03-16_104352_663.jpg" "$dst\worker_ai_matching.jpg" -Force
Copy-Item "$src\用户ToB UI\yonghu.jpg" "$dst\showcase_landing.jpg" -Force

# Worker/Blue-collar UI
Copy-Item "$src\维修蓝领 UI\ScreenShot_2026-03-16_101429_856.jpg" "$dst\worker_service_request.jpg" -Force
Copy-Item "$src\维修蓝领 UI\ScreenShot_2026-03-16_101619_682.jpg" "$dst\worker_login.jpg" -Force
Copy-Item "$src\维修蓝领 UI\ScreenShot_2026-03-16_101712_647.jpg" "$dst\worker_registration.jpg" -Force
Copy-Item "$src\维修蓝领 UI\ScreenShot_2026-03-16_101817_616.jpg" "$dst\knowledge_base.jpg" -Force
Copy-Item "$src\维修蓝领 UI\ScreenShot_2026-03-16_101837_346.jpg" "$dst\user_profile.jpg" -Force
Copy-Item "$src\维修蓝领 UI\ScreenShot_2026-03-16_101905_811.jpg" "$dst\maintenance_calendar.jpg" -Force
Copy-Item "$src\维修蓝领 UI\ScreenShot_2026-03-16_102010_656.jpg" "$dst\worker_leads.jpg" -Force

# Backend Operations (Automation + Agent) UI
Copy-Item "$src\后端运维（自动化+Agent)UI\ScreenShot_2026-03-16_102256_453.jpg" "$dst\agent_swarm.jpg" -Force
Copy-Item "$src\后端运维（自动化+Agent)UI\ScreenShot_2026-03-16_102315_641.jpg" "$dst\property_portfolio.jpg" -Force
Copy-Item "$src\后端运维（自动化+Agent)UI\ScreenShot_2026-03-16_102336_955.jpg" "$dst\ticket_management.jpg" -Force
Copy-Item "$src\后端运维（自动化+Agent)UI\ScreenShot_2026-03-16_102350_289.jpg" "$dst\worker_directory.jpg" -Force
Copy-Item "$src\后端运维（自动化+Agent)UI\ScreenShot_2026-03-16_102421_367.jpg" "$dst\analytics_dashboard.jpg" -Force
Copy-Item "$src\后端运维（自动化+Agent)UI\ScreenShot_2026-03-16_102515_055.jpg" "$dst\mission_control_v2.jpg" -Force

# Marketing/Showcase
Copy-Item "$src\网站营销宣传\ScreenShot_2026-03-16_102603_366.jpg" "$dst\showcase_hero.jpg" -Force
Copy-Item "$src\网站营销宣传\ScreenShot_2026-03-16_102623_525.jpg" "$dst\showcase_features.jpg" -Force
Copy-Item "$src\网站营销宣传\ScreenShot_2026-03-16_102711_600.jpg" "$dst\showcase_demo.jpg" -Force
Copy-Item "$src\网站营销宣传\ScreenShot_2026-03-16_102735_697.jpg" "$dst\showcase_stats.jpg" -Force

Write-Host "All 25 screenshots copied successfully!" -ForegroundColor Green
Get-ChildItem $dst -Filter "*.jpg" | Format-Table Name, Length -AutoSize

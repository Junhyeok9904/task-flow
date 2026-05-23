# PowerShell script to automate Brave "Send to Device" for Task-Flow

# [설정] 전송할 모바일 기기 이름의 첫 글자 
# - 'i': iPhone/iPad 등으로 점프 (기본값)
# - '': 목록의 첫 번째 기기에 바로 전송
$DeviceKey = "i"

$wshell = New-Object -ComObject Wscript.Shell;
$success = $false

# Loop up to 10 times (5 seconds max) to wait for the Brave window title to change to "Task-Flow"
for ($i = 0; $i -lt 10; $i++) {
    # Check if there is a Brave process window with "Task-Flow" in its title
    $braveWindows = Get-Process brave -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like "*Task-Flow*" }
    if ($braveWindows) {
        # Focus the specific window containing Task-Flow
        if ($wshell.AppActivate("Task-Flow")) {
            $success = $true
            break
        }
    }
    Start-Sleep -Milliseconds 500
}

if ($success) {
    # Wait for the browser window to settle
    Start-Sleep -Seconds 1.5
    
    # 1. Send Shift+F10 to open the context menu on the page
    $wshell.SendKeys("+{F10}")
    Start-Sleep -Milliseconds 450
    
    # 2. Send 'd' (Mnemonic shortcut for "기기로 전송(D)" in Korean Brave)
    $wshell.SendKeys("d")
    Start-Sleep -Milliseconds 450
    
    # 3. Send Right Arrow to enter the sub-menu listing synced devices
    $wshell.SendKeys("{RIGHT}")
    Start-Sleep -Milliseconds 450
    
    # 4. 특정 기기 단축키 입력 (예: 'i'를 누르면 iPhone으로 시작하는 기기 선택)
    if ($DeviceKey -ne "") {
        $wshell.SendKeys($DeviceKey)
        Start-Sleep -Milliseconds 450
    }
    
    # 5. Send Enter to select the device and send
    $wshell.SendKeys("{ENTER}")
    
    Write-Host "[O] Auto-sent Task-Flow URL to your mobile device!"
} else {
    Write-Host "[X] Could not detect Task-Flow window in Brave Browser. Keyboard macro aborted for safety."
}

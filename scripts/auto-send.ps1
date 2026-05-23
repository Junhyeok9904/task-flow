# PowerShell script to automate Brave "Send to Device" for Task-Flow

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
    
    # 4. Send Enter to select the first device in the list
    $wshell.SendKeys("{ENTER}")
    
    Write-Host "[O] Auto-sent Task-Flow URL to your mobile device!"
} else {
    Write-Host "[X] Could not detect Task-Flow window in Brave Browser. Keyboard macro aborted for safety."
}

[CmdletBinding(SupportsShouldProcess)]
param(
    [string]$ChromeProfilePath = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default",
    [switch]$ForceCloseChrome
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $ScriptDir) { $ScriptDir = $PSScriptRoot }
Set-Location -Path $ScriptDir

$bookmarksFile = Join-Path -Path $ChromeProfilePath -ChildPath "Bookmarks"

if (-not (Test-Path -Path $bookmarksFile)) {
    throw [System.IO.FileNotFoundException]"Chrome bookmarks file not found at: $bookmarksFile"
}

# Check if Chrome is running
$chromeProcesses = Get-Process -Name "chrome" -ErrorAction SilentlyContinue
if (@($chromeProcesses).Count -gt 0) {
    if ($ForceCloseChrome) {
        Write-Warning "Stopping running Chrome processes to apply bookmarks cleanly..."
        Stop-Process -Name "chrome" -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    } else {
        Write-Warning "Chrome is currently running. Chrome caches bookmarks in memory and may overwrite manual disk updates upon closing."
        Write-Warning "Recommendation: Use Chrome native import: chrome://bookmarks -> 3 dots menu -> Import bookmarks -> Select Antigravity_Index_Bookmarks.html"
    }
}

# Create timestamped backup
$dateStamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$backupFile = "$bookmarksFile.bak.$dateStamp"
Copy-Item -Path $bookmarksFile -Destination $backupFile -Force
Write-Verbose "Created Chrome Bookmarks backup at: $backupFile"

# Read bookmarks json
$rawJson = Get-Content -Path $bookmarksFile -Raw -Encoding UTF8
$bookmarksObj = $rawJson | ConvertFrom-Json

# Find highest ID
$script:nextId = 100
function Find-MaxId ($node) {
    if ($null -ne $node.id) {
        $idNum = [int]$node.id
        if ($idNum -ge $script:nextId) {
            $script:nextId = $idNum + 1
        }
    }
    if ($null -ne $node.children) {
        foreach ($child in $node.children) {
            Find-MaxId -node $child
        }
    }
}

Find-MaxId -node $bookmarksObj.roots.bookmark_bar
Find-MaxId -node $bookmarksObj.roots.other
Find-MaxId -node $bookmarksObj.roots.synced

function Get-NextId {
    $script:nextId++
    return [string]($script:nextId - 1)
}

function Get-ChromeTimestamp {
    $epoch = [DateTime]::new(1601, 1, 1, 0, 0, 0, [DateTimeKind]::Utc)
    $now = [DateTime]::UtcNow
    $diff = $now - $epoch
    return [string][int64]($diff.TotalMilliseconds * 10000)
}

# Load project catalog
$catalogJsonPath = Join-Path -Path $ScriptDir -ChildPath "projects-data.json"
if (-not (Test-Path -Path $catalogJsonPath)) {
    throw "projects-data.json missing. Run generate-bookmarks.js first."
}

# Read catalog
$catalog = Get-Content -Path $catalogJsonPath -Raw -Encoding UTF8 | ConvertFrom-Json

$nowTimestamp = Get-ChromeTimestamp

# Build Main Folder Node
$mainFolder = [PSCustomObject]@{
    date_added     = $nowTimestamp
    date_last_used = "0"
    date_modified  = $nowTimestamp
    guid           = [Guid]::NewGuid().ToString()
    id             = Get-NextId
    name           = "Antigravity Index Files"
    type           = "folder"
    children       = [System.Collections.ArrayList]::new()
}

# Add Direct Hub Launchers
$hubs = @(
    [PSCustomObject]@{ Name = "Chrome Tab and Bar Hub"; Url = "file:///G:/My%20Drive/Antigravity/Projects/chrome%20tab%20and%20bar/index.html" },
    [PSCustomObject]@{ Name = "Projects Index Hub"; Url = "file:///G:/My%20Drive/Antigravity/Projects/index%20folder/index.html" },
    [PSCustomObject]@{ Name = "3D Art Gallery Studio"; Url = "file:///G:/My%20Drive/Antigravity/Projects/index%20folder/3d-gallery-studio.html" },
    [PSCustomObject]@{ Name = "Choogle Search Engine"; Url = "file:///G:/My%20Drive/Antigravity/Projects/Choogle/index.html" }
)

foreach ($hub in $hubs) {
    [void]$mainFolder.children.Add([PSCustomObject]@{
        date_added     = $nowTimestamp
        date_last_used = "0"
        guid           = [Guid]::NewGuid().ToString()
        id             = Get-NextId
        name           = $hub.Name
        type           = "url"
        url            = $hub.Url
    })
}

# Group projects into subfolders
$grouped = $catalog.projects | Group-Object -Property category
foreach ($group in $grouped) {
    $folderPrefix = switch ($group.Name) {
        "Cybersecurity & IT"     { "01 Cybersecurity and IT" }
        "Games & Simulation"     { "02 Games and Simulation" }
        "AI & Agent Systems"     { "03 AI and Agent Systems" }
        "Web Apps & Media"       { "04 Web Apps and Media" }
        "Productivity & Finance" { "05 Productivity and Finance" }
        Default                  { $group.Name }
    }

    $subFolder = [PSCustomObject]@{
        date_added     = $nowTimestamp
        date_last_used = "0"
        date_modified  = $nowTimestamp
        guid           = [Guid]::NewGuid().ToString()
        id             = Get-NextId
        name           = $folderPrefix
        type           = "folder"
        children       = [System.Collections.ArrayList]::new()
    }

    foreach ($item in $group.Group) {
        [void]$subFolder.children.Add([PSCustomObject]@{
            date_added     = $nowTimestamp
            date_last_used = "0"
            guid           = [Guid]::NewGuid().ToString()
            id             = Get-NextId
            name           = $item.name
            type           = "url"
            url            = $item.url
        })
    }

    [void]$mainFolder.children.Add($subFolder)
}

# Remove existing Antigravity Index Files folder if already present
$existingList = [System.Collections.ArrayList]::new()
foreach ($child in $bookmarksObj.roots.bookmark_bar.children) {
    if ($child.name -ne "Antigravity Index Files" -and $child.name -ne "Antigravity Projects") {
        [void]$existingList.Add($child)
    }
}
[void]$existingList.Add($mainFolder)
$bookmarksObj.roots.bookmark_bar.children = $existingList

# Save back to file (Strict UTF-8 WITHOUT BOM for Google Chrome)
$updatedJson = $bookmarksObj | ConvertTo-Json -Depth 25
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllText($bookmarksFile, $updatedJson, $utf8NoBom)

$count = @($catalog.projects).Count
Write-Host "Successfully injected 'Antigravity Index Files' ($count project index bookmarks) into Chrome Bookmarks Bar!" -ForegroundColor Green
Write-Host "Backup saved at: $backupFile" -ForegroundColor Cyan

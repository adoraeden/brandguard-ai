$ErrorActionPreference = "Stop"

$backupName = "brandguard-before-round3-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".dump"
$desktopPath = [Environment]::GetFolderPath("Desktop")
$backupPath = Join-Path $desktopPath $backupName

$pgDumpCommand = Get-Command pg_dump -ErrorAction SilentlyContinue
$pgRestoreCommand = Get-Command pg_restore -ErrorAction SilentlyContinue

if (-not $pgDumpCommand -or -not $pgRestoreCommand) {
    $postgresBin = Join-Path $env:ProgramFiles "PostgreSQL\18\bin"
    $pgDumpCandidate = Join-Path $postgresBin "pg_dump.exe"
    $pgRestoreCandidate = Join-Path $postgresBin "pg_restore.exe"

    if ((Test-Path $pgDumpCandidate) -and (Test-Path $pgRestoreCandidate)) {
        $pgDumpPath = $pgDumpCandidate
        $pgRestorePath = $pgRestoreCandidate
    }
    else {
        throw "PostgreSQL 18 command-line tools were not found. Install PostgreSQL 18 with Command Line Tools, or add pg_dump.exe and pg_restore.exe to PATH, then run this script again."
    }
}
else {
    $pgDumpPath = $pgDumpCommand.Source
    $pgRestorePath = $pgRestoreCommand.Source
}

$pgDumpVersion = & $pgDumpPath --version
if ($pgDumpVersion -notmatch "\\s(\d+)\\.") {
    throw "Could not determine the pg_dump version: $pgDumpVersion"
}
if ([int]$Matches[1] -lt 18) {
    throw "The Render database is PostgreSQL 18. Install/use pg_dump 18 or newer. Detected: $pgDumpVersion"
}

Write-Host "Using $pgDumpVersion"
Write-Host "This creates a read-only backup. It does not change the Render database."
$secureUrl = Read-Host "Paste the Render EXTERNAL database URL (input is hidden)" -AsSecureString
$bstr = [IntPtr]::Zero
$databaseUrl = $null

try {
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureUrl)
    $databaseUrl = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)

    & $pgDumpPath --format=custom --no-owner --no-privileges --file $backupPath $databaseUrl
    if ($LASTEXITCODE -ne 0) {
        throw "pg_dump failed with exit code $LASTEXITCODE. No deployment or migration should be attempted."
    }

    & $pgRestorePath --list $backupPath | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "The backup archive could not be verified with pg_restore. Do not proceed with deployment."
    }

    $backup = Get-Item $backupPath
    if ($backup.Length -le 0) {
        throw "The backup file is empty. Do not proceed with deployment."
    }

    Write-Host ""
    Write-Host "Verified backup created successfully:" -ForegroundColor Green
    Write-Host $backup.FullName
    Write-Host ("Size: {0:N0} bytes" -f $backup.Length)
    Write-Host "Keep this file safe. Do not upload or send the database URL."
}
finally {
    if ($bstr -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
    $databaseUrl = $null
    if ($secureUrl) {
        $secureUrl.Dispose()
    }
}

# Deploy ce-mozambique public site via FTPS using local credentials.
# Credentials file: .ftp-credentials.json (gitignored)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$CredPath = Join-Path $ProjectRoot ".ftp-credentials.json"

if (-not (Test-Path $CredPath)) {
  Write-Error "Missing $CredPath - create it with server, username, password, and remoteDir."
}

$cred = Get-Content $CredPath -Raw | ConvertFrom-Json
$required = @("server", "username", "password", "remoteDir")
foreach ($key in $required) {
  if (-not $cred.$key) { Write-Error "Missing '$key' in .ftp-credentials.json" }
}

$port = if ($cred.port) { [int]$cred.port } else { 21 }
$protocol = if ($cred.protocol) { $cred.protocol.ToLower() } else { "ftps" }
$remoteDir = $cred.remoteDir.TrimEnd("/") + "/"

$excludePatterns = @(
  ".git", ".github", ".ftp-credentials", ".ftp-credentials.json",
  "scripts/deploy-ftps.ps1"
)

function Should-Exclude([string]$RelativePath) {
  $normalized = $RelativePath -replace "\\", "/"
  if ($normalized -match "^assets/[^/]+\.(JPG|jpg|jpeg|png)$" -and $normalized -notmatch "^assets/web/") {
    return $true
  }
  foreach ($pattern in $excludePatterns) {
    if ($normalized -like "*$pattern*") { return $true }
  }
  return $false
}

$files = Get-ChildItem -Path $ProjectRoot -Recurse -File | Where-Object {
  $rel = $_.FullName.Substring($ProjectRoot.Length + 1)
  -not (Should-Exclude $rel)
}

$curl = Join-Path $env:WINDIR "System32\curl.exe"
if (-not (Test-Path $curl)) { Write-Error "curl.exe not found" }

Write-Host "Deploying $($files.Count) files to ${protocol}://$($cred.server):$port$remoteDir"

$uploaded = 0
foreach ($file in $files) {
  $rel = $file.FullName.Substring($ProjectRoot.Length + 1) -replace "\\", "/"
  $remotePath = ($remoteDir + $rel) -replace "//+", "/"
  $encodedPath = ($remotePath -split "/" | ForEach-Object { [uri]::EscapeDataString($_) }) -join "/"
  $remoteUrl = "$protocol" + "://$($cred.server):$port/$encodedPath"

  $args = @(
    "--silent", "--show-error", "--fail",
    "--connect-timeout", "45",
    "--max-time", "180",
    "-T", $file.FullName,
    "--user", "$($cred.username):$($cred.password)",
    $remoteUrl
  )

  if ($protocol -eq "ftps") {
    $args += "--ssl-reqd", "--ftp-pasv"
  } elseif ($protocol -eq "ftp") {
    $args += "--ftp-pasv"
  } else {
    Write-Error "Unsupported protocol '$protocol'. Use 'ftp' or 'ftps'."
  }

  $maxAttempts = 4
  for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
    & $curl @args
    if ($LASTEXITCODE -eq 0) { break }
    if ($attempt -lt $maxAttempts) {
      Write-Host "  retry $attempt/$($maxAttempts - 1) for $rel (exit $LASTEXITCODE)"
      Start-Sleep -Seconds (3 * $attempt)
    }
  }

  if ($LASTEXITCODE -ne 0) {
    Write-Error "Upload failed for $rel (exit $LASTEXITCODE)"
  }

  $uploaded++
  Write-Host "  [$uploaded/$($files.Count)] $rel"
}

Write-Host "Deploy complete - $uploaded files uploaded."
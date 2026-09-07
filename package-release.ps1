# N-WEIS: Packaging & Distribution Script for SIH 2026 Submission
param(
    [string]$OutputFile = "nweis-sih2026-v1.0.0.zip"
)

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " N-WEIS: Packaging Standalone Release Archive for SIH 2026" -ForegroundColor Cyan
Write-Host " Target Archive: $OutputFile" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

$baseDir = $PSScriptRoot
$tempStageDir = Join-Path $baseDir "release_stage"
$zipPath = Join-Path $baseDir $OutputFile

if (Test-Path $tempStageDir) {
    Remove-Item -Recurse -Force $tempStageDir
}
if (Test-Path $zipPath) {
    Remove-Item -Force $zipPath
}

New-Item -ItemType Directory -Path $tempStageDir | Out-Null

$filesToCopy = @(
    "server-nweis.mjs",
    "test-nweis.mjs",
    "simulate-stream.mjs",
    "package.json",
    ".env.example",
    "README.md",
    "Dockerfile",
    ".dockerignore",
    "docker-compose.yml",
    "test-api.ps1",
    "test-push.sh"
)

$dirsToCopy = @(
    "public",
    "docs",
    "specs"
)

Write-Host "`nStaging release files..." -ForegroundColor Yellow
foreach ($f in $filesToCopy) {
    $src = Join-Path $baseDir $f
    if (Test-Path $src) {
        Copy-Item -Path $src -Destination $tempStageDir
        Write-Host "   + $f" -ForegroundColor Green
    }
}

foreach ($d in $dirsToCopy) {
    $src = Join-Path $baseDir $d
    if (Test-Path $src) {
        $dest = Join-Path $tempStageDir $d
        Copy-Item -Path $src -Destination $dest -Recurse
        Write-Host "   + $d/" -ForegroundColor Green
    }
}

Write-Host "`nCompressing release archive..." -ForegroundColor Yellow
Compress-Archive -Path "$tempStageDir\*" -DestinationPath $zipPath -CompressionLevel Optimal

# Cleanup stage
Remove-Item -Recurse -Force $tempStageDir

$zipInfo = Get-Item $zipPath
$sizeKb = [Math]::Round($zipInfo.Length / 1024, 2)
$sizeMb = [Math]::Round($zipInfo.Length / (1024 * 1024), 2)

Write-Host "`n================================================================" -ForegroundColor Cyan
Write-Host " [SUCCESS] N-WEIS Distribution Archive Packaged!" -ForegroundColor Green
Write-Host " Archive: $zipPath" -ForegroundColor Green
Write-Host " Size: $sizeKb KB ($sizeMb MB)" -ForegroundColor Green
Write-Host " Ready for upload to Smart India Hackathon 2026 Portal." -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan

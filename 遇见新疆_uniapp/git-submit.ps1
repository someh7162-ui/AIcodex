param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$CommitParts
)

$ErrorActionPreference = 'Stop'

$RemoteUrl = 'https://github.com/someh7162-ui/XjtravelApp.git'
$TargetBranch = 'main'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Get-RepoRoot {
    param([string]$StartPath)

    $current = Get-Item -LiteralPath $StartPath
    while ($current) {
        if (Test-Path -LiteralPath (Join-Path $current.FullName '.git')) {
            return $current.FullName
        }
        $current = $current.Parent
    }
    throw 'Error: current folder is not inside a git repository.'
}

function Get-RelativePath {
    param(
        [string]$BasePath,
        [string]$TargetPath
    )

    $baseUri = [Uri]((Resolve-Path -LiteralPath $BasePath).Path.TrimEnd('\') + '\')
    $targetUri = [Uri]((Resolve-Path -LiteralPath $TargetPath).Path.TrimEnd('\') + '\')
    $relativeUri = $baseUri.MakeRelativeUri($targetUri)
    return [Uri]::UnescapeDataString($relativeUri.ToString()).TrimEnd('/')
}

function Run-Git {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments,
        [string]$WorkingDirectory = $ScriptDir,
        [switch]$CaptureOutput
    )

    Push-Location -LiteralPath $WorkingDirectory
    try {
        if ($CaptureOutput) {
            $output = & git @Arguments 2>&1
            if ($LASTEXITCODE -ne 0) {
                throw ($output -join [Environment]::NewLine)
            }
            return ($output -join [Environment]::NewLine).Trim()
        }

        & git @Arguments
        if ($LASTEXITCODE -ne 0) {
            throw "git command failed in `"$WorkingDirectory`": git $($Arguments -join ' ')"
        }
    }
    finally {
        Pop-Location
    }
}

$RepoRoot = Get-RepoRoot -StartPath $ScriptDir
$RelPath = Get-RelativePath -BasePath $RepoRoot -TargetPath $ScriptDir

if ([string]::IsNullOrWhiteSpace($RelPath)) {
    throw 'Error: this script must be placed in the project subfolder.'
}

$RelPath = $RelPath.TrimEnd('/')
$CommitMessage = ($CommitParts -join ' ').Trim()
if ([string]::IsNullOrWhiteSpace($CommitMessage)) {
    $CommitMessage = 'chore: update XjtravelApp ' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
}

$hasChanges = & git -C $RepoRoot status --short -- $RelPath
if (-not $hasChanges) {
    Write-Host "No changes found in $RelPath"
    exit 0
}

$stagedFiles = & git -C $RepoRoot diff --cached --name-only
$outsideFiles = @()
foreach ($file in $stagedFiles) {
    if (-not [string]::IsNullOrWhiteSpace($file) -and $file -ne $RelPath -and -not $file.StartsWith("$RelPath/")) {
        $outsideFiles += $file
    }
}

if ($outsideFiles.Count -gt 0) {
    Write-Host "Error: there are already staged changes outside $RelPath"
    $outsideFiles | ForEach-Object { Write-Host "  - $_" }
    Write-Host 'Please commit or unstage those files first, then run this script again.'
    exit 1
}

Write-Host "Staging project files: $RelPath"
Run-Git -WorkingDirectory $RepoRoot -Arguments @('add', '--', $RelPath)

& git -C $RepoRoot diff --cached --quiet -- $RelPath
if ($LASTEXITCODE -eq 0) {
    Write-Host "No committable changes found in $RelPath"
    exit 0
}

Write-Host 'Creating commit in parent repository...'
Run-Git -WorkingDirectory $RepoRoot -Arguments @('commit', '-m', $CommitMessage)

Write-Host "Building subtree split for $RelPath..."
$splitSha = Run-Git -WorkingDirectory $RepoRoot -Arguments @('subtree', 'split', "--prefix=$RelPath") -CaptureOutput
if ([string]::IsNullOrWhiteSpace($splitSha)) {
    throw 'Error: failed to create subtree split.'
}

Write-Host "Pushing to $RemoteUrl ($TargetBranch) ..."
Run-Git -WorkingDirectory $RepoRoot -Arguments @('push', $RemoteUrl, "$splitSha`:refs/heads/$TargetBranch")

Write-Host 'Done.'

param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$CommitParts
)

$ErrorActionPreference = 'Stop'

[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)

$RemoteUrl = 'https://github.com/someh7162-ui/XjtravelApp.git'
$TargetBranch = 'main'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

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
            $stdoutFile = [System.IO.Path]::GetTempFileName()
            try {
                & git @Arguments 1> $stdoutFile
                if ($LASTEXITCODE -ne 0) {
                    throw "git command failed in `"$WorkingDirectory`": git $($Arguments -join ' ')"
                }

                $output = Get-Content -LiteralPath $stdoutFile -Encoding UTF8
                return ($output -join [Environment]::NewLine).Trim()
            }
            finally {
                Remove-Item -LiteralPath $stdoutFile -ErrorAction SilentlyContinue
            }
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

function Clear-DirectoryContents {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,
        [string[]]$Exclude = @()
    )

    Get-ChildItem -LiteralPath $Path -Force | Where-Object {
        $Exclude -notcontains $_.Name
    } | Remove-Item -Recurse -Force
}

function Sync-SubfolderToTempRepo {
    param(
        [Parameter(Mandatory = $true)]
        [string]$SourcePath,
        [Parameter(Mandatory = $true)]
        [string]$TempRepoPath,
        [Parameter(Mandatory = $true)]
        [string]$RemoteUrl,
        [Parameter(Mandatory = $true)]
        [string]$TargetBranch,
        [Parameter(Mandatory = $true)]
        [string]$CommitMessage
    )

    Run-Git -WorkingDirectory $TempRepoPath -Arguments @('init', '--initial-branch', $TargetBranch)
    Run-Git -WorkingDirectory $TempRepoPath -Arguments @('remote', 'add', 'origin', $RemoteUrl)

    & git -C $TempRepoPath fetch origin $TargetBranch '--depth=1'
    $fetchExitCode = $LASTEXITCODE
    if ($fetchExitCode -eq 0) {
        Run-Git -WorkingDirectory $TempRepoPath -Arguments @('checkout', '-B', $TargetBranch, "origin/$TargetBranch")
    }
    else {
        Write-Host "Remote branch $TargetBranch does not exist yet. A new branch will be created."
    }

    Clear-DirectoryContents -Path $TempRepoPath -Exclude @('.git')

    Get-ChildItem -LiteralPath $SourcePath -Force | ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination $TempRepoPath -Recurse -Force
    }

    Run-Git -WorkingDirectory $TempRepoPath -Arguments @('add', '-A')
    & git -C $TempRepoPath diff --cached --quiet
    if ($LASTEXITCODE -eq 0) {
        Write-Host 'Remote snapshot is already up to date.'
        return
    }

    Run-Git -WorkingDirectory $TempRepoPath -Arguments @('commit', '-m', $CommitMessage)
    Run-Git -WorkingDirectory $TempRepoPath -Arguments @('push', 'origin', "HEAD:refs/heads/$TargetBranch")
}

$RepoRoot = Run-Git -WorkingDirectory $ScriptDir -Arguments @('rev-parse', '--show-toplevel') -CaptureOutput
$RelPath = Run-Git -WorkingDirectory $ScriptDir -Arguments @('rev-parse', '--show-prefix') -CaptureOutput

if ([string]::IsNullOrWhiteSpace($RelPath)) {
    throw 'Error: this script must be placed in the project subfolder.'
}

$RelPath = $RelPath.TrimEnd('/')
$CommitMessage = ($CommitParts -join ' ').Trim()
if ([string]::IsNullOrWhiteSpace($CommitMessage)) {
    $userInput = Read-Host 'Enter commit message (press Enter for default)'
    $CommitMessage = $userInput.Trim()
}

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

$tempRepoPath = Join-Path ([System.IO.Path]::GetTempPath()) ('xjtravelapp-publish-' + [System.Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $tempRepoPath | Out-Null

try {
    Write-Host "Publishing $RelPath to $RemoteUrl ($TargetBranch) ..."
    Sync-SubfolderToTempRepo -SourcePath $ScriptDir -TempRepoPath $tempRepoPath -RemoteUrl $RemoteUrl -TargetBranch $TargetBranch -CommitMessage $CommitMessage
}
finally {
    Remove-Item -LiteralPath $tempRepoPath -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host 'Done.'

<#
.SYNOPSIS
  Set repo default branch to stag and optionally delete remote main (GitHub Step 1).

.DESCRIPTION
  Uses the GitHub REST API. Create a classic PAT with `repo` scope, or a fine-grained
  token with Administration: Read and write on this repository.

  Usage:
    $env:GITHUB_TOKEN = "ghp_xxxxxxxxxxxx"
    .\scripts\set-github-default-branch.ps1
    .\scripts\set-github-default-branch.ps1 -DeleteRemoteMain
#>
param(
  [string] $Owner = "Shlok0095",
  [string] $Repo = "ShadowAssist",
  [string] $DefaultBranch = "stag",
  [switch] $DeleteRemoteMain
)

$ErrorActionPreference = "Stop"
$token = $env:GITHUB_TOKEN
if (-not $token) {
  Write-Error "Set GITHUB_TOKEN to a PAT with repo admin access (see script header)."
}

$headers = @{
  Authorization          = "Bearer $token"
  Accept                 = "application/vnd.github+json"
  "X-GitHub-Api-Version" = "2022-11-28"
}

$base = "https://api.github.com/repos/$Owner/$Repo"

Write-Host "Setting default branch to '$DefaultBranch'..."
Invoke-RestMethod -Uri $base -Method Patch -Headers $headers -Body (@{ default_branch = $DefaultBranch } | ConvertTo-Json) | Out-Null
Write-Host "OK: default branch is now '$DefaultBranch'."

if ($DeleteRemoteMain) {
  Write-Host "Deleting remote branch 'main'..."
  try {
    Invoke-RestMethod -Uri "$base/git/refs/heads/main" -Method Delete -Headers $headers | Out-Null
    Write-Host "OK: remote 'main' removed."
  } catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
      Write-Host "Remote 'main' already absent (404)."
    } else {
      throw
    }
  }
} else {
  Write-Host "Skip deleting main (pass -DeleteRemoteMain to remove it after default is stag)."
}

Write-Host ""
Write-Host "Next (local clone): git fetch origin; git remote set-head origin -a"

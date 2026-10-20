$ErrorActionPreference = "Stop"

# 以脚本位置确定项目路径，支持从其他目录启动
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$buildRoot = [IO.Path]::GetFullPath((Join-Path $projectRoot "dist"))
$packageRoot = [IO.Path]::GetFullPath((Join-Path $projectRoot "deploy/fc"))
$packageBuildRoot = [IO.Path]::GetFullPath((Join-Path $packageRoot "dist"))
$releaseRoot = [IO.Path]::GetFullPath((Join-Path $projectRoot "releases"))
$archivePath = [IO.Path]::GetFullPath((Join-Path $releaseRoot "niyun-zhitan-fc.zip"))

# 检查 Path 是否位于 Parent 内，越界时按 Label 提示错误
function Assert-ChildPath([string]$Path, [string]$Parent, [string]$Label) {
  $prefix = $Parent.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
  if (!$Path.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) {
    throw "$Label escaped its expected parent directory: $Path"
  }
}

Assert-ChildPath $packageRoot $projectRoot "FC package directory"
Assert-ChildPath $packageBuildRoot $packageRoot "FC build directory"
Assert-ChildPath $releaseRoot $projectRoot "Release directory"
Assert-ChildPath $archivePath $releaseRoot "FC archive"

Push-Location $projectRoot
try {
  # 检查并构建源码，成功后再更新部署文件
  npm run check
  if ($LASTEXITCODE -ne 0) { throw "npm run check failed." }
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "npm run build failed." }

  # 清空部署目录中的旧页面，再复制新构建结果
  if (Test-Path -LiteralPath $packageBuildRoot) {
    Remove-Item -LiteralPath $packageBuildRoot -Recurse -Force
  }
  New-Item -ItemType Directory -Path $packageBuildRoot -Force | Out-Null
  Copy-Item -Path (Join-Path $buildRoot "*") -Destination $packageBuildRoot -Recurse -Force
  Copy-Item -LiteralPath (Join-Path $projectRoot "server.js") -Destination (Join-Path $packageRoot "server.js") -Force

  $packageServerRoot = Join-Path $packageRoot "server"
  if (Test-Path -LiteralPath $packageServerRoot) {
    Remove-Item -LiteralPath $packageServerRoot -Recurse -Force
  }
  Copy-Item -LiteralPath (Join-Path $projectRoot "server") -Destination $packageServerRoot -Recurse -Force

  # 将运行依赖随部署包上传
  $packageNodeModules = Join-Path $packageRoot "node_modules"
  if (Test-Path -LiteralPath $packageNodeModules) {
    Remove-Item -LiteralPath $packageNodeModules -Recurse -Force
  }
  Push-Location $packageRoot
  try {
    # 按锁文件安装运行依赖
    npm ci --omit=dev --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw "npm ci in deploy/fc failed." }
  } finally {
    Pop-Location
  }
  Assert-ChildPath $packageNodeModules $packageRoot "FC node_modules"

  New-Item -ItemType Directory -Path $releaseRoot -Force | Out-Null
  # 使用正斜杠写入压缩包路径，兼容 FC 的 Linux 环境
  Add-Type -AssemblyName System.IO.Compression
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  if (Test-Path -LiteralPath $archivePath) {
    Remove-Item -LiteralPath $archivePath -Force
  }
  $archive = [IO.Compression.ZipFile]::Open($archivePath, [IO.Compression.ZipArchiveMode]::Create)
  try {
    $entryFiles = @()
    $entryDirectories = @(
      (Join-Path $packageRoot "server"),
      (Join-Path $packageRoot "node_modules"),
      $packageBuildRoot
    )
    foreach ($directory in $entryDirectories) {
      $entryFiles += Get-ChildItem -LiteralPath $directory -Recurse -File | ForEach-Object { $_.FullName }
    }
    $entryFiles += @(
      (Join-Path $packageRoot "server.js"),
      (Join-Path $packageRoot "package.json"),
      (Join-Path $packageRoot "package-lock.json")
    )
    foreach ($file in $entryFiles) {
      Assert-ChildPath $file $packageRoot "FC archive file"
      $entryName = $file.Substring($packageRoot.TrimEnd([IO.Path]::DirectorySeparatorChar).Length + 1) -replace '\\', '/'
      [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $file, $entryName, [IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
  } finally {
    $archive.Dispose()
  }

  # 检查运行文件是否齐全，并排除密钥和开发资料
  $archive = [IO.Compression.ZipFile]::OpenRead($archivePath)
  try {
    $names = $archive.Entries.FullName
    $required = @(
      "server.js", "server/db.js", "package.json", "package-lock.json", "dist/index.html",
      "node_modules/dotenv/package.json", "node_modules/mysql2/package.json",
      "dist/assets/courses/course-recap.mp4", "dist/assets/courses/course-recap-poster.jpg"
    )
    $missing = $required | Where-Object { $names -notcontains $_ }
    $unexpected = $names | Where-Object { $_ -match '(^|/)(\.env($|\.)|\.git/|docs/)' }
    if ($missing.Count) { throw "FC archive is missing: $($missing -join ', ')" }
    if ($unexpected.Count) { throw "FC archive contains unexpected files: $($unexpected -join ', ')" }
  } finally {
    $archive.Dispose()
  }

  Write-Host "FC deployment archive created: $archivePath"
} finally {
  Pop-Location
}

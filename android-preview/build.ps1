param([string]$Sdk = "$env:LOCALAPPDATA\Android\Sdk")
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot
$build = Join-Path $root 'artifacts\android-build-v02'
$tools = Join-Path $Sdk 'build-tools\35.0.0'
$platform = Join-Path $Sdk 'platforms\android-35\android.jar'
New-Item -ItemType Directory -Force $build | Out-Null
$stage = Join-Path $build ("work-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force (Join-Path $stage 'generated') | Out-Null
function Check { if ($LASTEXITCODE -ne 0) { throw "Android build command failed: $LASTEXITCODE" } }
Push-Location $root
try {
  & "$tools\aapt.exe" package -f -m -M android-preview/AndroidManifest.xml -S android-preview/res -I $platform -J "$stage\generated" -F "$stage\base.apk"; Check
  $sources = @(Get-ChildItem android-preview/src, "$stage\generated" -Recurse -Filter *.java | ForEach-Object FullName)
  javac -encoding UTF-8 -source 8 -target 8 -classpath $platform -d "$stage\classes" @sources; Check
  $classes = @(Get-ChildItem "$stage\classes" -Recurse -Filter *.class | ForEach-Object FullName)
  & "$tools\d8.bat" --min-api 26 --lib $platform --output $stage @classes; Check
  Copy-Item "$stage\base.apk" "$stage\unsigned.apk"
  jar uf "$stage\unsigned.apk" -C $stage classes.dex; Check
  & "$tools\zipalign.exe" -f 4 "$stage\unsigned.apk" "$build\aligned.apk"; Check
  Write-Output "Unsigned APK ready: $build\aligned.apk. Sign with apksigner using your own local signing configuration; never commit signing keys."
} finally { Pop-Location }

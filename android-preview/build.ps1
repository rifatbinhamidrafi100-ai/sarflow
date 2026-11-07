param([string]$Sdk = "$env:LOCALAPPDATA\Android\Sdk")
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot
$build = Join-Path $root 'artifacts\android-build'
$tools = Join-Path $Sdk 'build-tools\35.0.0'
$platform = Join-Path $Sdk 'platforms\android-35\android.jar'
New-Item -ItemType Directory -Force $build | Out-Null
function Check { if ($LASTEXITCODE -ne 0) { throw "Android build command failed: $LASTEXITCODE" } }
Push-Location $root
try {
  & "$tools\aapt.exe" package -f -M android-preview/AndroidManifest.xml -S android-preview/res -I $platform -F "$build\base.apk"; Check
  javac -source 8 -target 8 -classpath $platform -d "$build\classes" android-preview/src/org/sarflow/preview/MainActivity.java; Check
  $classes = @(Get-ChildItem "$build\classes" -Recurse -Filter *.class | ForEach-Object FullName)
  & "$tools\d8.bat" --min-api 26 --lib $platform --output $build @classes; Check
  Copy-Item "$build\base.apk" "$build\unsigned.apk"
  jar uf "$build\unsigned.apk" -C $build classes.dex; Check
  & "$tools\zipalign.exe" -f 4 "$build\unsigned.apk" "$build\aligned.apk"; Check
  Write-Output "Unsigned APK ready: $build\aligned.apk. Sign with apksigner using your own local signing configuration; never commit signing keys."
} finally { Pop-Location }

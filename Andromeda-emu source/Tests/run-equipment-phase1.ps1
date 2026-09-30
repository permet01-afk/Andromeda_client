param([Parameter(Mandatory=$true)][string]$OutputDirectory, [switch]$CapturePackets)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$repoRoot = Split-Path -Parent $projectRoot
$testOutput = [IO.Path]::GetFullPath($OutputDirectory)
if ($testOutput.StartsWith($repoRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Choose an output directory outside the repository.'
}
$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio/Installer/vswhere.exe'
$msbuild = & $vswhere -latest -products * -requires Microsoft.Component.MSBuild -find 'MSBuild/**/Bin/MSBuild.exe' | Select-Object -First 1
if (!$msbuild) { throw 'MSBuild with .NET Framework reference assemblies is required.' }
$compiler = Join-Path (Split-Path $msbuild) 'Roslyn/csc.exe'
New-Item -ItemType Directory -Force -Path $testOutput | Out-Null
& $msbuild (Join-Path $projectRoot 'Andromeda Emulator.csproj') /t:Build /p:Configuration=Release "/p:OutputPath=$testOutput/bin/" "/p:IntermediateOutputPath=$testOutput/obj/" /v:minimal /nologo
if ($LASTEXITCODE) { throw 'Emulator build failed.' }
& $compiler /nologo /target:exe "/out:$testOutput/bin/EquipmentPhase1Tests.exe" "/reference:$testOutput/bin/Andromeda Emulator.exe" /reference:System.Data.dll (Join-Path $PSScriptRoot 'EquipmentPhase1Tests.cs')
if ($LASTEXITCODE) { throw 'Test compilation failed.' }
if ($CapturePackets) {
    & (Join-Path $testOutput 'bin/EquipmentPhase1Tests.exe') (Join-Path $testOutput 'assertions.txt') (Join-Path $testOutput 'observer-packets.txt')
} else {
    & (Join-Path $testOutput 'bin/EquipmentPhase1Tests.exe') (Join-Path $testOutput 'assertions.txt')
}
if ($LASTEXITCODE) { throw 'Equipment tests failed.' }

# Compile the production persistence methods with a simulated SQL transport.
# No production seam or database initialization is needed for concurrency/failure tests.
$characterSource = Get-Content -LiteralPath (Join-Path $projectRoot 'Game/Characters/CharacterInfo.cs') -Raw
$methodNames = @('ReadAmmoInt64', 'GetAmmoConsumeDelta', 'ApplyPositiveAmmoDelta', 'MarkAmmoClientUpdateIfNeeded',
    'TryConsumePrimaryLaserColumn', 'FlushPendingPrimaryAmmoToDb', 'FlushPendingPrimaryAmmoToDbCore')
$methodBodies = foreach ($methodName in $methodNames) {
    $match = [regex]::Match($characterSource, '(?m)^        (?:private|public) (?:static )?\w+ ' + $methodName + '\(')
    if (!$match.Success) { throw "Production method not found: $methodName" }
    $brace = $characterSource.IndexOf('{', $match.Index)
    $depth = 1
    $cursor = $brace + 1
    while ($depth -gt 0 -and $cursor -lt $characterSource.Length) {
        if ($characterSource[$cursor] -eq '{') { $depth++ }
        if ($characterSource[$cursor] -eq '}') { $depth-- }
        $cursor++
    }
    $characterSource.Substring($match.Index, $cursor - $match.Index)
}
$fixture = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'EquipmentAmmoPersistenceTests.cs') -Raw
$generated = Join-Path $testOutput 'EquipmentAmmoPersistenceTests.generated.cs'
$fixture.Replace('/*PRODUCTION_METHODS*/', ($methodBodies -join "`r`n")) | Set-Content -LiteralPath $generated -Encoding utf8
& $compiler /nologo /target:exe "/out:$testOutput/bin/EquipmentAmmoPersistenceTests.exe" /reference:System.Data.dll $generated
if ($LASTEXITCODE) { throw 'Persistence fixture compilation failed.' }
& (Join-Path $testOutput 'bin/EquipmentAmmoPersistenceTests.exe')
if ($LASTEXITCODE) { throw 'Persistence tests failed.' }

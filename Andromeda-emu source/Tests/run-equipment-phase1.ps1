param([Parameter(Mandatory=$true)][string]$OutputDirectory, [switch]$CapturePackets, [switch]$PersistenceOnly, [string]$EmulatorPath)
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
New-Item -ItemType Directory -Force -Path (Join-Path $testOutput 'bin') | Out-Null
if (!$PersistenceOnly) {
if ($EmulatorPath) {
    $providedAssembly = [IO.Path]::GetFullPath($EmulatorPath)
    if (!(Test-Path -LiteralPath $providedAssembly -PathType Leaf)) { throw 'Provided emulator assembly is missing.' }
    Copy-Item -LiteralPath $providedAssembly -Destination (Join-Path $testOutput 'bin/Andromeda Emulator.exe')
    Get-ChildItem -LiteralPath (Split-Path -Parent $providedAssembly) -Filter '*.dll' | Copy-Item -Destination (Join-Path $testOutput 'bin')
} else {
& $msbuild (Join-Path $projectRoot 'Andromeda Emulator.csproj') /t:Build /p:Configuration=Release "/p:OutputPath=$testOutput/bin/" "/p:IntermediateOutputPath=$testOutput/obj/" /v:minimal /nologo
if ($LASTEXITCODE) { throw 'Emulator build failed.' }
}
& $compiler /nologo /target:exe "/out:$testOutput/bin/EquipmentPhase1Tests.exe" "/reference:$testOutput/bin/Andromeda Emulator.exe" /reference:System.Data.dll (Join-Path $PSScriptRoot 'EquipmentPhase1Tests.cs')
if ($LASTEXITCODE) { throw 'Test compilation failed.' }
if ($CapturePackets) {
    & (Join-Path $testOutput 'bin/EquipmentPhase1Tests.exe') (Join-Path $testOutput 'assertions.txt') (Join-Path $testOutput 'observer-packets.txt')
} else {
    & (Join-Path $testOutput 'bin/EquipmentPhase1Tests.exe') (Join-Path $testOutput 'assertions.txt')
}
if ($LASTEXITCODE) { throw 'Equipment tests failed.' }
& $compiler /nologo /target:exe /main:EquipmentAmmoRuntimeBoundaryTests "/out:$testOutput/bin/EquipmentAmmoRuntimeBoundaryTests.exe" "/reference:$testOutput/bin/Andromeda Emulator.exe" /reference:System.Data.dll /reference:System.Web.Extensions.dll /reference:Microsoft.CSharp.dll (Join-Path $PSScriptRoot 'EquipmentAmmoRuntimeBoundaryTests.cs') (Join-Path $PSScriptRoot 'EquipmentPhase1Tests.cs')
if ($LASTEXITCODE) { throw 'Ammo runtime boundary test compilation failed.' }
& (Join-Path $testOutput 'bin/EquipmentAmmoRuntimeBoundaryTests.exe') | Tee-Object -FilePath (Join-Path $testOutput 'EquipmentAmmoRuntimeBoundaryTests.result.txt')
if ($LASTEXITCODE) { throw 'Ammo runtime boundary tests failed.' }
}

# Compile the production persistence methods with a simulated SQL transport.
# No production seam or database initialization is needed for concurrency/failure tests.
$characterSource = Get-Content -LiteralPath (Join-Path $projectRoot 'Game/Characters/CharacterInfo.cs') -Raw
$methodNames = @('ReadAmmoInt64', 'GetAmmoConsumeDelta', 'ApplyPositiveAmmoDelta', 'MarkAmmoClientUpdateIfNeeded',
    'TryConsumePrimaryLaserColumn', 'FlushPendingPrimaryAmmoToDb', 'FlushPendingPrimaryAmmoToDbCore',
    'TryConsumeColumn', 'TryConsumeRocketAmmo', 'TryConsumeLauncherRocketAmmo', 'TryConsumeExplosiveAmmo',
    'FlushPendingSecondaryAmmoToDb', 'FlushPendingSecondaryAmmoToDbCore', 'TryConsumeLaserAmmo',
    'IsAmmoCreditColumn', 'GetAmmoCreditCap', 'CanApplyAmmoCredit', 'AddPersistedAmmoCredit', 'PersistAmmoCredit', 'PersistAmmoCredits',
    'CloseAmmoConsumption', 'RefreshAmmoFromDbIfHigher', 'RefreshAmmoFromDbIfHigherCore',
    'RefreshQuestRewardData', 'RefreshQuestRewardDataCore')
function Get-ProductionMethodBody([string]$Source, [string]$MethodName) {
    $match = [regex]::Match($Source, '(?m)^        (?:private|public) (?:static )?\w+ ' + $MethodName + '\(')
    if (!$match.Success) { throw "Production method not found: $MethodName" }
    $brace = $Source.IndexOf('{', $match.Index)
    $depth = 1
    $cursor = $brace + 1
    while ($depth -gt 0 -and $cursor -lt $Source.Length) {
        if ($Source[$cursor] -eq '{') { $depth++ }
        if ($Source[$cursor] -eq '}') { $depth-- }
        $cursor++
    }
    $Source.Substring($match.Index, $cursor - $match.Index)
}
$methodBodies = foreach ($methodName in $methodNames) { Get-ProductionMethodBody $characterSource $methodName }
$lifecycleSource = Get-Content -LiteralPath (Join-Path $projectRoot 'Game/Characters/ShipLifecycleService.cs') -Raw
$ownerFence = Get-ProductionMethodBody $lifecycleSource 'OwnerFence'
$experienceSourcePath = Join-Path $projectRoot 'Game/Characters/ExperienceSystem.cs'
$experienceSource = Get-Content -LiteralPath $experienceSourcePath -Raw
$fixture = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'EquipmentAmmoPersistenceTests.cs') -Raw
$generated = Join-Path $testOutput 'EquipmentAmmoPersistenceTests.generated.cs'
$fixture.Replace('/*PRODUCTION_METHODS*/', ($methodBodies -join "`r`n")).Replace('/*PRODUCTION_OWNER_FENCE*/', $ownerFence).Replace('/*PRODUCTION_EXPERIENCE_SYSTEM*/', $experienceSource) | Set-Content -LiteralPath $generated -Encoding utf8
& $compiler /nologo /target:exe "/out:$testOutput/bin/EquipmentAmmoPersistenceTests.exe" /reference:System.Data.dll $generated
if ($LASTEXITCODE) { throw 'Persistence fixture compilation failed.' }
$provenance = [ordered]@{
    kind = 'EXACT_PRODUCTION_METHOD_EXTRACTION_SIMULATED_SQL'
    character_source_sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $projectRoot 'Game/Characters/CharacterInfo.cs')).Hash
    lifecycle_source_sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $projectRoot 'Game/Characters/ShipLifecycleService.cs')).Hash
    experience_source_sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $experienceSourcePath).Hash
    fixture_source_sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $PSScriptRoot 'EquipmentAmmoPersistenceTests.cs')).Hash
    generated_source_sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $generated).Hash
    extracted_character_methods = $methodNames
    extracted_lifecycle_methods = @('OwnerFence')
    database_initialized = $false
    credit_statement_callback_simulated = $true
    payment_authorization_tested = $false
    test_exit = $null
}
if (!$PersistenceOnly) {
    $provenance.compiled_runtime_assembly_sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $testOutput 'bin/Andromeda Emulator.exe')).Hash
    $provenance.phase1_fixture_sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $PSScriptRoot 'EquipmentPhase1Tests.cs')).Hash
    $provenance.runtime_boundary_fixture_sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $PSScriptRoot 'EquipmentAmmoRuntimeBoundaryTests.cs')).Hash
}
& (Join-Path $testOutput 'bin/EquipmentAmmoPersistenceTests.exe') | Tee-Object -FilePath (Join-Path $testOutput 'EquipmentAmmoPersistenceTests.result.txt')
$provenance.test_exit = $LASTEXITCODE
$provenance | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $testOutput 'EquipmentAmmoPersistenceTests.provenance.json') -Encoding utf8
if ($LASTEXITCODE) { throw 'Persistence tests failed.' }

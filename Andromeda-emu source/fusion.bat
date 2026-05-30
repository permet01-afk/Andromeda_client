@echo off
setlocal EnableDelayedExpansion

:: --- CONFIGURATION ---
set "OUTFILE=code_complet.txt"
:: Extensions à scanner (ajoutes-en si besoin)
set "EXTENSIONS=*.java *.cs *.php *.js *.xml *.json *.sql *.as"

:: --- NETTOYAGE PREALABLE ---
if exist "%OUTFILE%" del "%OUTFILE%"
echo Fusion en cours... Merci de patienter.

:: --- BOUCLE DE RECHERCHE ---
:: On parcourt tous les fichiers correspondant aux extensions
for /R %%f in (%EXTENSIONS%) do (
    set "SKIP=0"
    
    :: --- FILTRAGE DES DOSSIERS INUTILES ---
    echo "%%f" | findstr /I "\\bin\\ \\obj\\ \\.git\\ \\lib\\ \\dist\\ \\build\\ \\node_modules\\" >nul
    if !errorlevel! EQU 0 set "SKIP=1"
    
    :: Si le fichier n'est pas dans un dossier exclu, on l'ajoute
    if !SKIP! EQU 0 (
        echo Ajout de : %%~nxf
        
        echo. >> "%OUTFILE%"
        echo ======================================================== >> "%OUTFILE%"
        echo FICHIER : %%f >> "%OUTFILE%"
        echo ======================================================== >> "%OUTFILE%"
        type "%%f" >> "%OUTFILE%"
        echo. >> "%OUTFILE%"
    )
)

echo.
echo ==========================================
echo   TERMINÉ ! Fichier cree : %OUTFILE%
echo ==========================================
pause
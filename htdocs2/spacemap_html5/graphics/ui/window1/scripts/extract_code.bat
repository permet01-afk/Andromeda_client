@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

:: Nom du fichier de sortie
set "output=FULL_CODE_AS.txt"

:: Supprime le fichier s'il existe deja pour eviter les doublons
if exist "%output%" del "%output%"

echo Extraction du code de tous les fichiers .as en cours...
echo Cela inclut les sous-dossiers...
echo.

:: Boucle sur tous les fichiers .as (recursif avec /R)
for /R %%f in (*.as) do (
    echo Traitement de : %%~nxf
    
    :: Ecrit une entete claire pour separer les fichiers
    echo. >> "%output%"
    echo ====================================================================== >> "%output%"
    echo FICHIER : %%~nxf >> "%output%"
    echo CHEMIN  : %%f >> "%output%"
    echo ====================================================================== >> "%output%"
    echo. >> "%output%"
    
    :: Copie le contenu du fichier
    type "%%f" >> "%output%"
    
    echo. >> "%output%"
)

echo.
echo --------------------------------------------------------
echo TERMINE !
echo Tout le code a ete fusionne dans : %output%
echo --------------------------------------------------------
pause
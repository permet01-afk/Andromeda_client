@echo off
setlocal enabledelayedexpansion

REM Nom du fichier de sortie
set "outputFile=arborescence_window1_complete.txt"

REM Supprimer l'ancien fichier de sortie s'il existe
if exist "%outputFile%" del "%outputFile%"

echo ================================================================================= >> "%outputFile%"
echo ARBORESCENCE DÉTAILLÉE DU DOSSIER SPRITES (WINDOW1.SWF) >> "%outputFile%"
echo ================================================================================= >> "%outputFile%"

REM Lancer la fonction récursive à partir du répertoire actuel
call :ListDir "%CD%" "" "%outputFile%"

echo. >> "%outputFile%"
echo ================================================================================= >> "%outputFile%"
echo TERMINÉ. Veuillez copier le contenu du fichier ci-dessous. >> "%outputFile%"
echo ================================================================================= >> "%outputFile%"

REM Ouvre le fichier dans le bloc-notes pour que l'utilisateur puisse copier le contenu.
start notepad "%outputFile%"
endlocal
goto :eof

:ListDir
    set "targetDir=%~1"
    set "prefix=%~2"
    set "outputFile=%~3"
    
    REM Lister les fichiers .png dans le répertoire actuel
    set "fileList="
    for %%f in ("%targetDir%\*.png") do (
        if defined fileList (
            set "fileList=!fileList!, %%~nxf"
        ) else (
            set "fileList=%%~nxf"
        )
    )
    
    REM Afficher le contenu des fichiers s'il y en a
    if defined fileList (
        echo !prefix!├── Fichiers: !fileList! >> "%outputFile%"
    )

    REM Stocker les noms de dossiers pour assurer le bon ordre d'affichage
    set "subDirs="
    for /d %%d in ("%targetDir%\*") do (
        set "subDirs=!subDirs! "%%d""
    )

    REM Parcourir les sous-dossiers
    set "dirCount=0"
    for %%d in (!subDirs!) do (
        set /a "dirCount+=1"
        
        REM Nouveau préfixe : utiliser "│   " pour les branches futures ou "    " pour la dernière branche.
        set "newPrefix=!prefix!│   "
        
        REM Afficher le dossier actuel
        echo !prefix!├── Dossier: %%~nxd >> "%outputFile%"
        
        REM Appel récursif au sous-dossier
        call :ListDir "%%d" "!newPrefix!" "%outputFile%"
    )
goto :eof
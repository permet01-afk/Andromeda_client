@echo off
rem Crée un fichier texte avec l'arborescence complète du dossier courant
tree "%cd%" /f /a > "arborescence_dossier.txt"

echo Arborescence créée dans le fichier "arborescence_dossier.txt".
pause
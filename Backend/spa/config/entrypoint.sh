#!/bin/bash

npx tsc


npm start &

while inotifywait -r -e modify,create,delete /usr/src/app/Frontend; do
	npx tailwindcss -i ./Frontend/css/style.css -o ./Frontend/css/output.css
    echo "Changement détecté ! Redémarrage du service..."
	npx tailwindcss -i ./style.css -o ./output.css
    npx tsc  # Ou relancer le processus concerné
done &

while inotifywait -r -e modify,create,delete /usr/src/app/Backend; do
    echo "Changement détecté ! Redémarrage du serveur..."
	kill $(pgrep -f "node")
    npm start & # Ou relancer le processus concerné
done
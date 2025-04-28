#!/bin/bash

npx tsc
# chown -R spa:spa /usr/src/app/Frontend

npx tailwindcss -i ./Frontend/css/style.css -o ./Frontend/css/output.css

# Prod
# npm start 

npm start &

while inotifywait -r -e modify,create,delete /usr/src/app/Frontend/templates; do
    echo "Changement détecté ! Redémarrage du service..."
    npx tailwindcss -i ./Frontend/css/style.css -o ./Frontend/css/output.css
    npx tsc  # Ou relancer le processus concerné
done &

while inotifywait -r -e modify,create,delete /usr/src/app/Frontend; do
    echo "Changement détecté ! Redémarrage du service..."
    npx tailwindcss -i ./Frontend/css/style.css -o ./Frontend/css/output.css
done &

while inotifywait -r -e modify,create,delete /usr/src/app/Frontend/ts; do
    echo "Changement détecté ! Redémarrage du service..."
    npx tsc  # Ou relancer le processus concerné
done &

while inotifywait -r -e modify,create,delete /usr/src/app/Backend; do
    echo "Changement détecté ! Redémarrage du serveur..."
	kill $(pgrep -f "node")
    npm start & # Ou relancer le processus concerné
done

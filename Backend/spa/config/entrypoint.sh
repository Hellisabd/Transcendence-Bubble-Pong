#!/bin/bash

npx tsc

chown -R spa:spa /usr/src/app/Frontend/avatar

npm start &


while inotifywait -r -e modify,create,delete /usr/src/app/Frontend/ts; do
    echo "Changement détecté ! Redémarrage du service..."
    npx tsc  # Ou relancer le processus concerné
done &

while inotifywait -r -e modify,create,delete /usr/src/app/Backend; do
    echo "Changement détecté ! Redémarrage du serveur..."
	kill $(pgrep -f "node")
    npm start & # Ou relancer le processus concerné
done
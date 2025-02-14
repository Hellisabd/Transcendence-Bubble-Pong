#!/bin/bash

npx tsc

npm start &

while inotifywait -r -e modify,create,delete /usr/src/app/Frontend; do
    echo "Changement détecté ! Redémarrage du service..."
    npx tsc
done
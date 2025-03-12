npm start &

while inotifywait -r -e modify,create,delete /usr/src/app/Backend/js; do
    echo "Changement détecté ! Redémarrage du serveur..."
	kill $(pgrep -f "node")
    npm start & # Ou relancer le processus concerné
done
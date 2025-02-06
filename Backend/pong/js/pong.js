const fastify = require("fastify")({ logger: true });
fastify.register(require("@fastify/websocket"));

let gameState = {
    ball: { x: 500, y: 250 },
    paddles: { player1: { y: 200 }, player2: { y: 200 } },
    score: { player1: 0, player2: 0 }
};

const clients = new Set();  // Liste des connexions WebSocket

// Gestion de WebSocket
fastify.register(async function (fastify) {
    fastify.get("/ws", { websocket: true }, (connection, req) => {
        clients.add(connection);
        console.log("Nouvelle connexion WebSocket !");
        
        // Envoi de l'état initial
        connection.socket.send(JSON.stringify({ type: "state", data: gameState }));

        connection.socket.on("message", (message) => {
            const data = JSON.parse(message);

            if (data.type === "move") {
                const { player, move } = data;
                if (player === "player1") {
                    gameState.paddles.player1.y += move === "up" ? -10 : 10;
                } else if (player === "player2") {
                    gameState.paddles.player2.y += move === "up" ? -10 : 10;
                }

                // Diffuser l'état mis à jour à tous les clients
                clients.forEach(client => {
                    client.socket.send(JSON.stringify({ type: "state", data: gameState }));
                });
            }
        });

        connection.socket.on("close", () => {
            clients.delete(connection);
            console.log("Connexion WebSocket fermée.");
        });
    });
});

const start = async () => {
    try {
        await fastify.listen({ port: 4000, host: "0.0.0.0" });
        console.log("🎮 Pong WebSocket Server running on port 4000");
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();

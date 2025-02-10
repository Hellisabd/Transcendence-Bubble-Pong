const fastify = require("fastify")({ logger: true });
fastify.register(require("@fastify/websocket"));

const clients = new Set();

fastify.register(async function (fastify) {
    fastify.get("/ws/pong", { websocket: true }, (connection, req) => {
        clients.add(connection);
        console.log("Nouvelle connexion WebSocket !");

        let gameState = {
            ball: { x: 500, y: 250 },
            paddles: { player1: { y: 200 }, player2: { y: 200 } },
            score: { player1: 0, player2: 0 }
        };
        
        const move = 10;

        connection.socket.on("message", (message) => {
            const data = JSON.parse(message.toString());
            console.log("Message reçu :", data);

            if (data.player === "player1") {
                if (data.move === "up" && gameState.paddles.player1.y > 0) {
                    gameState.paddles.player1.y -= move;
                    console.log("p1.y: ", gameState.paddles.player1.y)
                }
                else if (data.move === "down" && gameState.paddles.player1.y < 400) {
                    gameState.paddles.player1.y += move;
                    console.log("p1.y: ", gameState.paddles.player1.y)
                }
            }
            if (data.player === "player2") {
                if (data.move === "up" && gameState.paddles.player2.y > 0) {
                    gameState.paddles.player2.y -= move;
                    console.log("p2.y: ", gameState.paddles.player2.y)
                }
                else if (data.move === "down" && gameState.paddles.player2.y < 400) {
                    gameState.paddles.player2.y += move;
                    console.log("p2.y: ", gameState.paddles.player2.y)
                }
            }
            
            clients.forEach(client => {
                    client.socket.send(JSON.stringify({ gameState }));
                });
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
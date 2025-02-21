const fastify = require("fastify")({ logger: true });
fastify.register(require("@fastify/websocket"));

let i = 0;

let waitingClient = {};

let history = {};

let end_lobby = 0;

let count_game = 0;

let tournamentQueue = {};

let tournamentsUsernames = [];

const clientsWaiting = new Set();

fastify.register(async function (fastify) {
    let username1 = 0;
    let username2 = 0;
    fastify.get("/ws/matchmaking/pong", { websocket: true }, (connection, req) => { 
        clientsWaiting.add(connection);
        console.log("Nouvelle connexion WebSocket sur Waiting !");
        connection.socket.on("close", () => {
            clientsWaiting.clear();
            waitingClient = {};
            i = 0;
            console.log("Connexion WebSocket Waiting fermée.");
        });
        connection.socket.on("message", (message) => {
            const data = JSON.parse(message.toString());
            if (i == 0) {
                waitingClient[0] = data.username;
                username1 = data.username;
                i++;
            } else if (i == 1) {
                if (data.username == username1)
                    return ;
                waitingClient[1] = data.username;
                username2 = data.username;
                i++;
            }
            if (i == 2) {
                i = 0;
                const lobbyKey = `${username1}${username2}`;
                console.log("lobby: ", lobbyKey); 
                clientsWaiting.forEach(clientsWaiting => {
                    i++;
                    clientsWaiting.socket.send(JSON.stringify({ 
                        success: true,
                        player1: username1,
                        player2: username2,
                        player_id: i,
                        "lobbyKey": lobbyKey
                    }));
                });
                clientsWaiting.clear();
                waitingClient = {};
                i = 0;
            }
        });
    })
    fastify.get("/ws/matchmaking/tournament", { websocket: true }, (connection, req) => {
        console.log("Nouvelle connexion WebSocket sur Tournament !");
        connection.socket.on("message", (message) => {
            const data = JSON.parse(message.toString());
            if (data.init) {
                tournamentQueue[data.username] = connection;
                tournamentsUsernames.push(data.username);
                console.log("pusshing : ", data.username);
                if (tournamentsUsernames.length == 4) {
                    console.log("Launch tournament : game 1");
                    count_game++;
                    launchTournament(tournamentsUsernames[0], tournamentsUsernames[1], tournamentsUsernames[2], tournamentsUsernames[3]);
                }
            }
            if (data.endgame) {
                end_lobby++;
                console.log("data: ", data);
                if (count_game == 1 && end_lobby == 4) {
                    history[data.username] = data.history;
                    console.log("game 2");

                    launchTournament(tournamentsUsernames[0], tournamentsUsernames[2], tournamentsUsernames[1], tournamentsUsernames[3])
                    count_game++;
                    end_lobby = 0; 
                } 
                else if (end_lobby == 4 && count_game == 2) {
                    console.log("game 3");
                    history[data.username] = data.history;
                    launchTournament(tournamentsUsernames[0], tournamentsUsernames[3], tournamentsUsernames[1], tournamentsUsernames[2])
                    end_lobby = 0;
                    count_game++;
                }
                else if (count_game == 3 && end_lobby == 4) {
                    console.log("end tournament");
                    history[data.username] = data.history;
                    count_game = 0;
                    end_lobby = 0;
                    for (let i = 0; i < 4; i++) {
                        tournamentQueue[tournamentsUsernames[i]].socket.send(JSON.stringify({end_tournament : true}));
                    }
                    history = {};
                    tournamentQueue = {};
                    tournamentsUsernames = [];
                }
            }
        });
    })
});

function launchTournament(user1, user2, user3, user4) {
    let users = [user1, user2, user3, user4];
    let lobbyKey = null;
    let username1 = null;
    let username2 = null;
    const lobbyKeypart1 = `${user1}${user2}`;
    const lobbyKeypart2 = `${user3}${user4}`;
    console.log(`tournamentQueue.length: ${tournamentQueue.length}`);
    for (let i = 0; i < users.length; i++) {
        if (i <= 1) {
            lobbyKey = lobbyKeypart1;
            username1 = user1;
            username2 = user2;
        }
        else {
            lobbyKey = lobbyKeypart2;
            username1 = user3;
            username2 = user4;
        }
        tournamentQueue[users[i]].socket.send(JSON.stringify({
                success: true, 
                player1: username1,
                player2: username2,
                player_id: i % 2 + 1, // for format 0 or 1
                "lobbyKey": lobbyKey
            }));
    }
}

const start = async () => {
    try {
        await fastify.listen({ port: 4020, host: "0.0.0.0" });
        console.log("Matchmaking WebSocket Server running on port 4020");
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
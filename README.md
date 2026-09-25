*This project has been created as part of the 42 curriculum by amirloup, bgrosjea, ahans, gdoumer.*

# Transcendence — Bubble Pong

## Description

**Bubble Pong** is a real-time online gaming platform, the final project of the 42 Common Core. Players create an account, add friends, and play against each other online, alone or in tournaments. Every match is stored and shown on a personal dashboard.

The platform offers two games:

- **Pong**, the classic, played online between two remote players;
- **Bubble Ping**, our own second game, with bonuses (extra paddles, shields), playable online or in a **solo mode** where the player chases a high score.

The whole application runs in Docker containers split into services (front, games, users, matchmaking) behind an NGINX reverse proxy in HTTPS, and starts with a single command.

### Key features

- Accounts with hashed passwords, optional **two-factor authentication** (TOTP), and sessions based on **JWT** in `HttpOnly`, `Secure` cookies.
- Profiles with avatars, a **friends system** (requests, accept, decline) and **online status**.
- **Real-time online games** over WebSockets, with the game logic running on the server.
- **Matchmaking** for 1v1 games and **4-player tournaments**, for both games.
- **Match history and statistics** on a dashboard, and a high score for the solo mode.
- **Monitoring** with Prometheus and Grafana (disabled by default, see below).

## Instructions

### Prerequisites

- **Docker** and **Docker Compose** (`docker compose` or `docker-compose`; the Makefile uses whichever is installed)
- **make**
- `sudo` rights for the first run: the Makefile adds `127.0.0.1 transcendence` to `/etc/hosts`
- **Google Chrome** (latest stable version)

### Configuration

Create a `.env` file at the root of the repository. It is ignored by Git. Replace the values with your own secrets:

```sh
DB_FILE=/usr/src/app/dataBase/core.db   # SQLite database, inside the containers
USER_ID=1001                             # user and group running the Node.js services
GROUP_ID=1001
COOKIE_SECRET=change-me                  # secret for the cookie plugin
JWT_SECRET=change-me                     # signs the JWTs

# Only needed if the monitoring services are enabled
GF_SECURITY_ADMIN_USER=change-me
GF_SECURITY_ADMIN_PASSWORD=change-me
GF_SERVER_PROTOCOL=https
```

### Run

```sh
git clone https://github.com/Hellisabd/Transcendence-Bubble-Pong.git
cd Transcendence-Bubble-Pong
# create the .env file (see above)
make build      # builds the images and starts every container
```

Then open <https://transcendence:8000> (or <https://localhost:8000>). The certificate is self-signed, so the browser asks you to accept it first. Plain HTTP on port `8080` is redirected to HTTPS.

| Command | Effect |
|---|---|
| `make build` | Builds the images, then starts the stack |
| `make` | Starts the stack without rebuilding |
| `make clean` | Stops the containers |
| `make fclean` | Stops the containers and removes the volumes (database included) |
| `make hardclean` | Removes **every** Docker container and image on the machine |

The Prometheus and Grafana services are commented out in `docker-compose.yml`. Uncomment them to run the monitoring stack.

## Team Information

Formal roles (Product Owner, Project Manager, Tech Lead) were not assigned explicitly. The team worked together and decisions were taken as a group. In practice, responsibilities were split as follows:

| Member | De facto role | Responsibilities |
|---|---|---|
| **amirloup** (Antoine Mirloup) | Developer, game lead | Game logic and rendering (Pong, Bubble Ping, solo mode), waiting rooms, dashboard, matchmaking, Docker setup |
| **bgrosjea** (Basile Grosjean) | Developer, back-end lead | Back-end architecture, API gateway, users service, authentication (JWT, 2FA), matchmaking, friends and social features, Docker and Makefile |
| **ahans** (Allan Hans) | Developer, front-end | Interface and styling with Tailwind CSS: navigation bar, sidebar, pages, social views |
| **gdoumer** (Guillaume Doumer) | Developer, DevOps | Monitoring (Prometheus, Grafana, nginx-exporter), NGINX configuration, login and users service |

## Project Management

- **Organisation:** the team worked together twice a week. For about a month, only amirloup and bgrosjea were working on the project, and they carried the core of the back end and the games during that period.
- **Design:** before coding, the team drew wireframes of every page (home page with the friends sidebar, game selection with normal and tournament modes, game page with the next match, tournament results, dashboard, settings). They served as the shared plan for the interface.
- **Task tracking:** Trello.
- **Communication:** Discord.
- **Git:** one branch per feature (`2fa`, `iaPong`, `backsoloping`, `front_ahans`, `gdoumer`…), merged into `main`.

## Technical Stack

| Layer | Technologies |
|---|---|
| Front end | TypeScript, EJS templates, Tailwind CSS, HTML5 canvas for the games |
| Back end | Node.js with **Fastify**, `@fastify/websocket` for real time, `@fastify/view` to render the EJS pages |
| Database | **SQLite** (`better-sqlite3`) |
| Security | `bcrypt` for passwords, JWT in `HttpOnly`, `Secure` cookies, `otplib` for TOTP 2FA, HTTPS (TLS 1.2 / 1.3) terminated by NGINX |
| Infrastructure | Docker, Docker Compose, NGINX reverse proxy |
| Monitoring | Prometheus, Grafana, nginx-exporter |

**Why these choices:**

- **Fastify** is fast, light, and has official plugins for WebSockets, cookies and templates, which covers everything the services need.
- **SQLite** needs no separate database server: one file, owned by the users service, is enough for the data volume of the project.
- **Microservices**: each game runs in its own container, so a crash or a heavy load in one game does not affect the rest of the platform. The front-end service (`spa`) is the only entry point behind NGINX and forwards requests to the other services over internal Docker networks.
- **Server-side game logic**: the games were first written in the browser, then moved to the back end, so that the server is the only source of truth for the ball, the paddles and the score. Clients only send their inputs and draw the state they receive.

### Services

| Service | Role |
|---|---|
| `nginx` | HTTPS entry point (port `8000`), redirects HTTP (`8080`) |
| `spa` | Serves the pages and acts as the API gateway: authentication, sessions, proxy to the other services |
| `users` | Accounts, profiles, avatars, friends, 2FA secrets, match history (owns the SQLite database) |
| `matchmaking` | Waiting queues for 1v1 games and 4-player tournaments |
| `pong` | Server-side Pong games |
| `ping` | Server-side Bubble Ping games |
| `solo_ping` | Bubble Ping solo mode |

## Database Schema

The SQLite database is owned by the `users` service.

```
users                          friends
─────                          ───────
id            INTEGER  PK ◄─┬─ user_id    INTEGER  FK → users.id (ON DELETE CASCADE)
username      TEXT     UNIQUE └─ friend_id  INTEGER  FK → users.id (ON DELETE CASCADE)
email         TEXT     UNIQUE    status     TEXT     'pending' | 'accepted' | 'blocked'
password      TEXT     (bcrypt hash)
avatar_name   TEXT     default 'default.jpg'
secret        TEXT     2FA secret, NULL when 2FA is off
high_score    INTEGER  solo mode best score

match_history                             tournament_history
─────────────                             ──────────────────
id                 INTEGER  PK            id                  INTEGER  PK
player1_username   TEXT                   player1..4_username TEXT
player2_username   TEXT                   player1..4_score    INTEGER
winner_username    TEXT                   player1..4_ranking  INTEGER
looser_username    TEXT                   gametype            TEXT
player1/2_score    INTEGER
gametype           TEXT     'pong' | 'ping'
bounce, bonus counters (Bubble Ping statistics)
```

Friendships are the only foreign-key relation. Match and tournament histories reference players by their (unique) username.

## Features List

| Feature | Description | Members |
|---|---|---|
| Sign up and login | Account creation, `bcrypt`-hashed passwords, JWT session in an `HttpOnly` cookie | bgrosjea, gdoumer |
| Two-factor authentication | Optional TOTP (authenticator app), set up and removed from the settings | bgrosjea |
| Profile and settings | Change username, email, password and avatar | bgrosjea, amirloup |
| Friends and online status | Friend requests, accept or decline, friends list with live status over WebSocket | bgrosjea, ahans |
| Pong online | 1v1 Pong between two remote players, logic on the server | amirloup, bgrosjea |
| Bubble Ping | Second game, with bonuses, online 1v1 | amirloup, bgrosjea |
| Solo mode | Bubble Ping alone, with a saved high score | amirloup |
| Matchmaking | Queues that pair players for 1v1 games | bgrosjea, amirloup |
| Tournaments | 4-player tournaments for both games, with a final ranking | bgrosjea, amirloup |
| Dashboard and history | Match history, tournament results, statistics charts drawn on canvas (overall, Pong, Bubble Ping) and a solo-mode leaderboard | amirloup, bgrosjea |
| Interface | Single-page navigation, navigation bar, sidebar, Tailwind styling | ahans, amirloup |
| Mobile support | Responsive pages, resized game canvases, touch buttons to move the paddle | amirloup |
| Containers and HTTPS | Docker services, NGINX reverse proxy, TLS certificates | bgrosjea, amirloup, gdoumer |
| Monitoring | Prometheus metrics and Grafana dashboards | gdoumer |

## Modules

The project was evaluated in 2025 with version 16.0 of the subject (`en.subject.pdf`). In that version, 7 major modules are required for 100%, two minor modules count as one major, and every module beyond that counts as a bonus.

| Module | Type | How it was implemented | Members |
|---|---|---|---|
| Use a framework to build the back end (Fastify) | Major | Every service is a Fastify server | bgrosjea, amirloup |
| Use a front-end framework or toolkit (Tailwind CSS) | Minor | Tailwind for all the styling | ahans |
| Use a database for the back end (SQLite) | Minor | One SQLite database owned by the `users` service | bgrosjea |
| Standard user management | Major | Accounts, avatars, friends, online status, match history | bgrosjea |
| Remote players | Major | Online games over WebSockets, logic on the server | amirloup, bgrosjea |
| Add another game with user history and matchmaking | Major | Bubble Ping, with its own history, matchmaking and tournaments | amirloup, bgrosjea |
| User and game statistics dashboards | Minor | Dashboard with charts per game, match history and solo leaderboard | amirloup, bgrosjea |
| Two-factor authentication and JWT | Major | TOTP with `otplib`, JWT in `HttpOnly` cookies | bgrosjea |
| Designing the back end as microservices | Major | One container per service, internal Docker networks | bgrosjea, amirloup |
| Replace basic Pong with server-side Pong | Major | Game state computed on the server, clients only send inputs | amirloup, bgrosjea |
| Monitoring system | Minor | Prometheus and Grafana, with nginx-exporter | gdoumer |
| Support on all devices | Minor | Responsive Tailwind layout, canvases resized to the screen, on-screen touch buttons to play on phones and tablets | amirloup |

**Total:** 7 major modules and 5 minor modules, the equivalent of 9.5 major modules: 7 for the mandatory 100%, and the rest as bonus.

Bubble Ping has bonuses (extra paddles, shields), but they are not offered for Pong nor as an option, so the "Game customization options" module was not claimed.

## Individual Contributions

### amirloup — Antoine Mirloup

- Game logic and rendering of Pong, Bubble Ping and the solo mode, on the server and on the canvas.
- Waiting rooms, dashboard, and a large part of the matchmaking and tournaments.
- Mobile support: responsive pages and touch controls for the games.
- Docker Compose and NGINX configuration.
- **Challenge:** moving the games from the browser to the server without making them feel laggy. Only the inputs travel from the client, and the server sends back the full state on each tick.

### bgrosjea — Basile Grosjean

- Back-end architecture: the `spa` gateway that authenticates requests and forwards them to the other services, and the `users` service.
- Authentication: `bcrypt` passwords, JWT sessions in `HttpOnly` cookies, TOTP two-factor authentication.
- Friends system and online status in real time, social pages.
- Matchmaking and tournaments, and the server side of the games together with amirloup.
- Docker services, Makefile and TLS certificates.
- **Challenge:** making the containers talk to each other through APIs. Every request now goes through the gateway, which checks the session before calling the right service on its internal network.

### ahans — Allan Hans

- Interface and design with Tailwind CSS: navigation bar, sidebar, home page and social views.
- Front-end pieces of the login and of the game pages.

### gdoumer — Guillaume Doumer

- Monitoring: Prometheus, Grafana and nginx-exporter, with their own certificates.
- NGINX configuration, and parts of the login flow and of the users service.
- A prototype of an AI opponent for Pong (`iaPong` branch), which was not kept in the final version.

## Known Limitations

- The monitoring services are disabled by default in `docker-compose.yml`.
- `make hardclean` deletes every Docker container and image on the machine, not only those of the project.

## Resources

- [Fastify documentation](https://fastify.dev/docs/latest/) and its plugins (`@fastify/websocket`, `@fastify/view`, `@fastify/cookie`).
- [MDN — WebSockets API](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) and [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API).
- [RFC 7519 — JSON Web Token](https://www.rfc-editor.org/rfc/rfc7519) and [RFC 6238 — TOTP](https://www.rfc-editor.org/rfc/rfc6238).
- [SQLite documentation](https://www.sqlite.org/docs.html) and [better-sqlite3](https://github.com/WiseLibs/better-sqlite3).
- [Docker Compose documentation](https://docs.docker.com/compose/) and [NGINX documentation](https://nginx.org/en/docs/).
- [Prometheus](https://prometheus.io/docs/) and [Grafana](https://grafana.com/docs/) documentation.
- [Tailwind CSS documentation](https://tailwindcss.com/docs).

### Use of AI

The application (back end, games, front end, infrastructure) was written by the team, without AI-generated code. An AI assistant (Claude) was used to write this README from the subject, the source code and the Git history; its content was reviewed by the team.

## Credits

Special thanks to our programming consultant [@Xenhoxi](https://github.com/Xenhoxi).

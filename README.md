# Transcendence - Bubble Pong

---

## 👥 Contributors

- [@Antoinemirloup](https://github.com/antoinemirloup)
- [@Allan-boop](https://github.com/allan-boop)
- [@Kirotan](https://github.com/Kirotan)
- [@Hellisabd](https://github.com/Hellisabd)

---

## About

**Transcendence - Bubble Pong** is a full-stack web project developed by a team at 42, centered on creating a real-time web gaming platform. It is a modern, collaborative, and competitive application built with Node.js, Fastify, TypeScript, SQLite, Tailwind CSS, Docker, EJS, and more. The core of the platform is an online Pong game reimagined with exciting twists, complemented by a second bonus game for added fun.

---

##Access
- https://88.122.132.1:44422/. Have fun! 🎉

## Installation & Usage

```bash

git clone https://github.com/Hellisabd/Transcendence-Bubble-Pong.git
cd Transcendence-Bubble-Pong
echo > .env "DB_FILE=/usr/src/app/dataBase/core.db
USER_ID=1001
GROUP_ID=1001

COOKIE_SECRET=108
JWT_SECRET=10

GF_SECURITY_ADMIN_USER=admin
GF_SECURITY_ADMIN_PASSWORD=admin
GF_SERVER_PROTOCOL=https"
make build

```


---

### Requirements

* **Docker** – containerization platform
* **Docker Compose** – for orchestrating the multi-container setup

### Building & Running the Application

```bash
docker-compose up --build
```

This will build all necessary Docker images and start the containers (backend, frontend, database, etc.). Once the server is up and running, open [http://localhost:3000](http://localhost:3000) in your web browser to access the Bubble Pong platform.

---

## Main Project Instructions

* **Backend Node.js** – The server side is written in Node.js, all the containers except for the monitoring part.
* **Backend Server (Fastify)** – The server is built with Node.js using the Fastify framework and includes WebSocket support for real-time features.
* **Frontend (EJS & Tailwind)** – The client side uses EJS templates for server-side rendering, styled with Tailwind CSS, along with custom CSS and JavaScript for interactive elements.
* **Database & Metrics** – Uses a lightweight SQLite database for persistence, and integrates Prometheus/Grafana for collecting and visualizing application metrics.
* **Authentication** – Features a user authentication system with optional two-factor authentication (2FA) for enhanced security.
* **Real-Time Gameplay** – Implements an online Pong game with real-time matchmaking, friend system, player dashboard, and a ranking leaderboard to foster competition.
* **Additional Features** – Includes real-time notifications, and support remote matchs (online).
* **Bonus:** All bonus objectives were achieved, adding a second mini-game to the platform and a single-player **solo mode** for a different challenge.

---

## Architecture (High‑level)

* **Backend** – built with Fastify (Node.js) to provide RESTful API routes and handle WebSocket communication for real-time gameplay. It manages user sessions, socket connections, matchmaking logic, and game score updates (scoreboard).
* **Frontend** – uses EJS template rendering on the server and Tailwind CSS for design, combined with client-side TypeScript/JavaScript for interactivity. The frontend provides a dynamic dashboard UI and renders the Pong game (and bonus game) on an HTML5 canvas for live play.
* **Database** – implemented with SQLite and structured into tables for users, friendships, matches, statistics, and chat messages. This ensures persistent storage of player data, game results, and social interactions.
* **Monitoring** – integrates Prometheus for metrics export and Grafana for dashboards, allowing real-time monitoring of the Docker container performance and Node.js backend metrics. This setup helps track server health and performance in production.

---

## Notes

* This project was developed collaboratively by a team as part of the 42 school curriculum (group project).
* All bonus features were implemented to enrich the user experience, including the additional game mode (second game), a solo play mode, and advanced monitoring capabilities.
* The entire application is containerized with Docker (managed via Docker Compose) for easy deployment and consistency across different environments.
* Development was focused on real-time performance and a smooth user experience, ensuring responsive gameplay and intuitive, user-friendly interfaces.

---

###### Special Thanks

- [@Xenhoxi](https://github.com/Xenhoxi)

Enjoy!

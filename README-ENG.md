#NGINX-SHIELD

> **NGINX-SHIELD** is an advanced platform for security, monitoring and management of web applications and infrastructure, designed for cloud, containerized and on-premise environments. It integrates log analysis, automatic ban, whitelist, IP geolocation, notification and interactive dashboard.

---

## Architecture and Data Flow

NGINX-SHIELD is composed of:
- **Backend Python (FastAPI)**: Provides REST API, manages security logic, ban, whitelist, parsing log, email notification, IP geolocation and monitoring.
- **Frontend React/TypeScript**: Modern web dashboard for the visualization and management of bans, whitelist, log, configuration and system status.
- **Ausiliary service**: Log analysis (npm_analyzer.py), geolocation service (GeoIP-MAXLON).

The typical flusso:
1. The access and error logs are monitored and analyzed in real time.
2. Gli IP sospetti come identification process pattern, blacklist and customizable registry.
3. Gli IP malevoli are automatically banned (Fail2Ban, DB locale, notify email).
4. The dashboard shows statistics, events, minacce, whitelist, configuration and service status.

---

## Main Functions

- **Automatic IP Ban**: Analyze log, ban your Fail2Ban, save details in DB SQLite with geolocation information, email alert.
- **Manage Whitelist**: Dedicated database, automatic monitoring and updating, web interface for update/remozione.
- **Parsing and log analysis**: Support for Nginx log, proxy, errors, fallback, with customizable patterns.
- **Geolocalizzazione IP**: Local service, GeoIP database.
- **Notify email**: Automatic alert for ban, minacce, critical errors.
- **System Monitoring**: Service status, system log, real-time statistics, health check.
- **Dashboard web**: Visualization ban, whitelist, log, minacce, configuration, map, graphics and live management.
- **Advanced configuration**: Configuration file for local parameters, security, email, pattern log, jail Fail2Ban.
- **Support Docker**: Deploy containerized, build script.

---

## Main Modules

- `backend/` — REST API, ban/whitelist logic, monitoring, security, token management, TOTP sessions, email configuration.
- `functions/` — Support modules: ban manager, log writer, pattern matcher, file monitor, mail notifier, signal handler, ecc.
- `geolocate/` — GeoIP service, reti database, ASN lookup, web API for IP info.
- `src/` — Frontend React: dashboard, page, UI components, hooks, API management, data visualization.
- `data/` — Local configurations, database ban/whitelist, pattern log, security file.
- `public/` — File statici web.

---

## Safety

- Automatic and manual IP ban with Fail2Ban and local DB.
- Persistent and monitored whitelist.
- Pattern and blacklist customizable by user-agent, attempts, URL.
- Notify email for critical events.
- API protection with JWT, TOTP, secure sessions.
- Detailed logging and audit trail.

---

## API and Web Interface

- REST API documentation (FastAPI) per ban, whitelist, log, configuration, system status.
- React Dashboard with: 
- Overview of minacce and statistics 
- Manage ban/unban 
- Manage whitelist 
- Visualization of log and pattern 
- Parameter configuration 
- Map geolocalizzazione minacce 
- Health check services

---

## Installation and Start

### Requirements
-Python 3.13+
- Node.js 20+
- Docker (optional, to deploy containerized)

### 1. Python backend and react front
```bash
pip install -r requirements.txt
npm install
npm run build
python start_build.py
```

### 2. (OPZIONALE) Deploy with Docker
```bash
docker compose up --build
```

---

## Configuration

- Modify i file in `data/conf/` per parameters locali, email, security.
- Personalize the registry in `patterns/` per log, ban, user-agent, attempts.
- Configure volume and variables in `docker-compose.yml` per log, persistent data, socket Fail2Ban.

---

## Rapid Start
1. Install the Python and Node.js modules.
2. Set i file in `data/conf/` and `patterns/`.
3. Avvia backend and frontend oppure uses Docker.
4. Access the web dashboard at `http://localhost:8000`.

---

## Deployment Docker

- https://hub.docker.com/r/maxlonplay/nginx-shield

---

## Support and Contribution

For problems, needs or contributions:
- Open an issue on GitHub
- Contact the maintainer
- Consult the documentation in each module and in the configuration file
- Contatta il maintainer
- Consulta la documentazione nei moduli e nei file di configurazione

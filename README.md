# NGINX-SHIELD

> **NGINX-SHIELD** è una piattaforma avanzata per la sicurezza, il monitoraggio e la gestione di applicazioni web e infrastrutture, pensata per ambienti cloud, containerizzati e on-premise. Integra analisi dei log, ban automatici, whitelist, geolocalizzazione IP, notifiche e dashboard interattiva.

---

## Architettura e Flusso Dati

NGINX-SHIELD è composto da:
- **Backend Python (FastAPI)**: Espone API REST, gestisce la logica di sicurezza, ban, whitelist, parsing log, notifiche email, geolocalizzazione IP e monitoraggio.
- **Frontend React/TypeScript**: Dashboard web moderna per la visualizzazione e gestione di ban, whitelist, log, configurazioni e stato sistema.
- **Servizi ausiliari**: Analizzatore log (npm_analyzer.py), servizio geolocalizzazione (GeoIP-MAXLON).

Il flusso tipico:
1. I log di accesso e errore vengono monitorati e analizzati in tempo reale.
2. Gli IP sospetti vengono identificati tramite pattern, blacklist e regole personalizzabili.
3. Gli IP malevoli vengono bannati automaticamente (Fail2Ban, DB locale, notifiche email).
4. La dashboard mostra statistiche, eventi, minacce, whitelist, configurazioni e stato dei servizi.

---

## Funzionalità Principali

- **Ban automatico IP**: Analisi log, ban su Fail2Ban, salvataggio dettagliato in DB SQLite con info geolocalizzazione, alert email.
- **Gestione Whitelist**: Database dedicato, monitoraggio e aggiornamento automatico, interfaccia web per aggiunta/rimozione.
- **Parsing e analisi log**: Supporto a log Nginx, proxy, errori, fallback, con pattern personalizzabili.
- **Geolocalizzazione IP**: Servizio locale, database GeoIP.
- **Notifiche email**: Alert automatici per ban, minacce, errori critici.
- **Monitoraggio sistema**: Stato servizi, log di sistema, statistiche in tempo reale, health check.
- **Dashboard web**: Visualizzazione ban, whitelist, log, minacce, configurazioni, mappe, grafici e gestione live.
- **Configurazione avanzata**: File di configurazione per parametri locali, sicurezza, email, pattern log, jail Fail2Ban.
- **Supporto Docker**: Deploy containerizzato, script di build.

---

## Moduli Principali

- `backend/` — API REST, logica ban/whitelist, monitoraggio, sicurezza, gestione token, sessioni TOTP, configurazioni email.
- `functions/` — Moduli di supporto: ban manager, log writer, pattern matcher, file monitor, mail notifier, signal handler, ecc.
- `geolocate/` — Servizio GeoIP, database reti, lookup ASN, API web per info IP.
- `src/` — Frontend React: dashboard, pagine, componenti UI, hooks, gestione API, visualizzazione dati.
- `data/` — Configurazioni locali, database ban/whitelist, pattern log, file di sicurezza.
- `public/` — File statici web.

---

## Sicurezza

- Ban automatico e manuale IP con Fail2Ban e DB locale.
- Whitelist persistente e monitorata.
- Pattern e blacklist personalizzabili per user-agent, intenti, URL.
- Notifiche email per eventi critici.
- Protezione API con JWT, TOTP, sessioni sicure.
- Logging dettagliato e audit trail.

---

## API e Interfaccia Web

- API REST documentate (FastAPI) per ban, whitelist, log, configurazioni, stato sistema.
- Dashboard React con:
  - Panoramica minacce e statistiche
  - Gestione ban/unban
  - Gestione whitelist
  - Visualizzazione log e pattern
  - Configurazione parametri
  - Mappa geolocalizzazione minacce
  - Health check servizi

---

## Installazione e Avvio

### Requisiti
- Python 3.8+
- Node.js 18+
- Docker (opzionale, per deploy containerizzato)

### 1. Backend Python
```bash
pip install -r requirements.txt
python start.py
```

### 2. Frontend React
```bash
npm install
npm run dev
```

### 3. Deploy con Docker
```bash
docker compose up --build
```

---

## Configurazione

- Modifica i file in `data/conf/` per parametri locali, email, sicurezza.
- Personalizza le regole in `patterns/` per log, ban, user-agent, intenti.
- Configura i volumi e le variabili in `docker-compose.yml` per log, dati persistenti, socket Fail2Ban.

---

## Avvio Rapido
1. Installa le dipendenze Python e Node.js.
2. Configura i file in `data/conf/` e `patterns/`.
3. Avvia backend e frontend oppure usa Docker.
4. Accedi alla dashboard web su `http://localhost:8080`.

---

## Deployment e Aggiornamenti

- Build immagini Docker con `build_docker_ngsh.sh`

---

## Supporto e Contributi

Per problemi, richieste o contributi:
- Apri una issue su GitHub
- Contatta il maintainer
- Consulta la documentazione nei moduli e nei file di configurazione

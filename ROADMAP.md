# 🗺️ Roadmap NGINX-SHIELD

## 📊 Stato Attuale (v0.4.4) - Produzione Ready

---

### ✅ Funzionalità Completate

#### 🛡️ Sicurezza Core
- [x] **Autenticazione multi-fattore (TOTP):** Include codici di backup crittografati.
- [x] **Ban automatici:** Analisi log NGINX e integrazione nativa con **Fail2Ban**.
- [x] **Pattern detection:** Identificazione automatica di User-Agent malevoli e URL pericolosi.
- [x] **Whitelist intelligente:** Protezione dedicata per IP fidati.

#### 🖥️ Dashboard & Gestione
- [x] **Frontend Moderno:** Interfaccia sviluppata in React/TypeScript.
- [x] **Gestione Ban:** Sistema avanzato di ban/unban con filtri e ricerca.
- [x] **Configurazione:** Gestione granulare dei codici di risposta HTTP.
- [x] **Monitoring:** Stato dei servizi monitorato in tempo reale.

#### 🏗️ Architettura
- [x] **Backend FastAPI:** Oltre 70 endpoint REST documentati.
- [x] **Database Segregati:** Archivi separati per gestione Auth e log Ban.
- [x] **Audit Trail:** Sistema di logging dettagliato per ogni azione.

---

### ⚠️ Aggionamenti Critici Necessari

#### 🔴 Priorità Alta - Sicurezza
* **Vulnerabilità Email:**
    * **Problema:** Password email attualmente salvata in chiaro in `data/conf/mail.conf`.
    * **Soluzione:** Implementare crittografia **Fernet** (standard già usato per i secret TOTP).
    * **Impatto:** Critico.

#### 🟡 Priorità Media - Funzionalità
* **Estensione Crittografia:** Proteggere tutti i restanti dati sensibili nel database.
* **Rate Limiting:** Implementazione di limiti di richiesta più granulari.
* **Threat Intelligence:** Sviluppo di una dashboard per l'analisi avanzata delle minacce.

---

### 🚧 In Sviluppo (Work in Progress)

#### 📱 Integrazione Telegram
> **Stato:** UI completata, backend in fase di implementazione. (Metodi attualmente simulati)

**Funzionalità UI Disponibili:**
* Configurazione Bot Token e Chat ID.
* Scelta frequenza notifiche: Real-time, Giornaliero, Settimanale.
* Interfaccia per controllo remoto.

**Comandi Bot Previsti:**
* `/ban [IP]` - Banna istantaneamente un indirizzo.
* `/unban [IP]` - Rimuove un ban esistente.
* `/list` - Elenco degli IP attualmente bloccati.
* `/stats` - Report rapido sullo stato del sistema.
* `/geoip` - Geolocalizza ip.

---

### 📅 Timeline Stimata

| Versione | Periodo | Deliverables |
| :--- | :--- | :--- |
| **v0.x.x** | Prima possibile | 🌍 Supporto multilingua UI (Previste: Inglese - Italiano - Spagnolo - Tedesco - Francese) |
| **v0.4.x** | 1-2 mesi | 🤦‍♂️ Fix usabilità: Sban automatico per IP in range CIDR bannato (non funziona come previsto attualmente) |
| **v0.4.x** | 1-2 mesi | 🔴 Fix critico: crittografia password email e salvataggio in db non piu in json file |
| **v0.5.x** | 2-3 mesi | 📱 Backend Telegram completo e funzionale |
| **v0.5.x** | 3-4 mesi | 🛡️ Estensione crittografia a tutti i dati sensibili |


---

### 🎯 Obiettivi Futuri

#### 🚀 Breve Termine (1-3 mesi)
* Risoluzione vulnerabilità critica email.
* Rilascio modulo Telegram.
* Miglioramento documentazione API (Swagger).

#### 📈 Medio Termine (3-6 mesi)
* Dashboard di Threat Intelligence avanzata.
* Integrazione con sistemi **SIEM** (es. ELK, Splunk).
* Supporto **Multi-tenant**.

#### 🔭 Lungo Termine (8+ mesi)
* **AI/Machine Learning:** Pattern detection predittivo automatizzato con motore AI allenato esclusivamente a tale scopo.
* Esposizione API pubbliche per integrazioni di terze parti.

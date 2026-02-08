import subprocess
import sqlite3
import requests
from datetime import datetime
from functions.debug_log import debug_log
from .mail_notifier import send_mail
from commons.country_codes import get_country_name
from typing import Dict, Any


def get_ip_info(ip: str, NPM_DEBUG_LOG: bool) -> Dict[str, Any]:
    try:
        url = f"http://localhost:8881/{ip}"
        response = requests.get(url, timeout=5)

        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                result = data.get("result", {})
                debug_log(
                    f"Informazioni IP {ip} ottenute con successo dal servizio locale.",
                    NPM_DEBUG_LOG,
                )

                country_code = result.get("country")
                country = get_country_name(country_code) if country_code else None

                return {
                    "network": result.get("network"),
                    "asn": result.get("asn"),
                    "organization": result.get("organization"),
                    "country": country,
                }
            else:
                debug_log(
                    f"Servizio geolocalizzazione ha restituito success=false per IP {ip}.",
                    NPM_DEBUG_LOG,
                )
        else:
            debug_log(
                f"Errore HTTP { response .status_code} dal servizio geolocalizzazione per IP {ip}.",
                NPM_DEBUG_LOG,
            )
    except requests.exceptions.Timeout:
        debug_log(
            f"Timeout nella richiesta di geolocalizzazione per IP {ip}.", NPM_DEBUG_LOG
        )
    except requests.exceptions.RequestException as e:
        debug_log(
            f"Errore nella richiesta di geolocalizzazione per IP {ip}: {e}",
            NPM_DEBUG_LOG,
        )
    except Exception as e:
        debug_log(
            f"Errore generico nella geolocalizzazione per IP {ip}: {e}", NPM_DEBUG_LOG
        )

    return {"network": None, "asn": None, "organization": None, "country": None}


def setup_db(db_file, NPM_DEBUG_LOG):
    try:
        conn = sqlite3.connect(db_file)
        c = conn.cursor()

        c.execute(
            """
            CREATE TABLE IF NOT EXISTS automatic_bans (
                id INTEGER PRIMARY KEY,
                ip TEXT NOT NULL,
                ban_timestamp TEXT NOT NULL,
                domain TEXT,
                user_agent TEXT,
                http_code TEXT,
                url TEXT,
                network TEXT,
                asn TEXT,
                organization TEXT,
                country TEXT
            )
        """
        )
        debug_log(
            "Tabella 'automatic_bans' verificata/creata con campi di geolocalizzazione.",
            NPM_DEBUG_LOG,
        )

        c.execute(
            """
            CREATE TABLE IF NOT EXISTS manual_bans (
                id INTEGER PRIMARY KEY,
                ip TEXT NOT NULL,
                reason TEXT NOT NULL,
                ban_timestamp TEXT NOT NULL,
                network TEXT,
                asn TEXT,
                organization TEXT,
                country TEXT
            )
        """
        )
        debug_log(
            "Tabella 'manual_bans' verificata/creata con campi di geolocalizzazione.",
            NPM_DEBUG_LOG,
        )

        conn.commit()
        conn.close()
        debug_log(
            f"Database SQLite '{db_file}' creato/aggiornato con successo.",
            NPM_DEBUG_LOG,
        )
    except Exception as e:
        debug_log(
            f"Errore nella creazione/aggiornamento del database: {e}", NPM_DEBUG_LOG
        )


def save_automatic_ban_to_db(
    ip, domain, user_agent, http_code, url, db_file, NPM_DEBUG_LOG
):
    try:
        conn = sqlite3.connect(db_file)
        c = conn.cursor()

        c.execute("SELECT ip FROM automatic_bans WHERE ip = ?", (ip,))
        existing_ip = c.fetchone()

        if existing_ip:
            debug_log(
                f"IP {ip} già presente nella tabella 'automatic_bans'. Nessun nuovo record aggiunto.",
                NPM_DEBUG_LOG,
            )
        else:

            ip_info = get_ip_info(ip, NPM_DEBUG_LOG)

            now = datetime.now().isoformat()
            c.execute(
                """
                INSERT INTO automatic_bans (ip, ban_timestamp, domain, user_agent, http_code, url, network, asn, organization, country)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    ip,
                    now,
                    domain,
                    user_agent,
                    http_code,
                    url,
                    ip_info["network"],
                    ip_info["asn"],
                    ip_info["organization"],
                    ip_info["country"],
                ),
            )
            conn.commit()
            debug_log(
                f"Ban automatico per IP {ip} aggiunto alla tabella 'automatic_bans' con info geo: {ip_info['organization']} ({ip_info['country']}).",
                NPM_DEBUG_LOG,
            )

        conn.close()
    except Exception as e:
        debug_log(
            f"Errore nel salvataggio del ban automatico per IP {ip}: {e}", NPM_DEBUG_LOG
        )


def ban_ip(ip, jail_name, NPM_DEBUG_LOG):
    AMBIENTE_TEST = "NO"

    if AMBIENTE_TEST == "SI":
        debug_log(
            f"IP: {ip}, Ambiente di test attivo: simulazione ban, nessuna azione eseguita",
            NPM_DEBUG_LOG,
        )
        return True

    try:
        result = subprocess.run(
            ["fail2ban-client", "set", jail_name, "banip", ip],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=10,
        )
        stdout = result.stdout.strip()
        stderr = result.stderr.strip()
        success = stdout == "1"

        if success:
            debug_log(
                f"IP: {ip}, Comando 'fail2ban-client' eseguito: Ban riuscito",
                NPM_DEBUG_LOG,
            )
        else:

            debug_log(
                f"IP: {ip}, Comando 'fail2ban-client' eseguito FALLITO. Return code: {result .returncode}, stdout: {stdout}, stderr: {stderr}",
                NPM_DEBUG_LOG,
            )

        return success
    except subprocess.TimeoutExpired:
        debug_log(
            f"IP: {ip}, TIMEOUT nell'esecuzione di fail2ban-client (superato 10 secondi). Verifica se fail2ban è responsivo.",
            NPM_DEBUG_LOG,
        )
        return False
    except FileNotFoundError:
        debug_log(
            f"IP: {ip}, ERRORE: fail2ban-client non trovato nel sistema. Verifica che fail2ban sia installato.",
            NPM_DEBUG_LOG,
        )
        return False
    except Exception as e:
        debug_log(
            f"IP: {ip}, ERRORE nell'esecuzione del comando ban: {e}", NPM_DEBUG_LOG
        )
        return False


def should_ban_ip(error_count, max_requests, is_banned):
    return error_count >= max_requests and not is_banned


def ban_and_reset(
    ip_manager,
    ip,
    jail_name,
    db_file,
    NPM_DEBUG_LOG,
    user_agent=None,
    domain=None,
    http_code=None,
    url=None,
):
    success = ban_ip(ip, jail_name, NPM_DEBUG_LOG)
    if success:
        save_automatic_ban_to_db(
            ip, domain, user_agent, http_code, url, db_file, NPM_DEBUG_LOG
        )

        with ip_manager.ip_data_lock:
            if ip in ip_manager.ip_data:

                del ip_manager.ip_data[ip]
                debug_log(f"IP {ip} rimosso dalla memoria dopo il ban.", NPM_DEBUG_LOG)

        debug_log(
            f"IP: {ip}, Ban eseguito con successo. Stato resettato e dati rimossi dalla memoria.",
            NPM_DEBUG_LOG,
        )
        send_mail(
            ip,
            jail_name,
            NPM_DEBUG_LOG,
            user_agent=user_agent,
            domain=domain,
            http_code=http_code,
            url=url,
        )
    return success

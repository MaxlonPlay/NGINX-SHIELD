import os
import threading
import ipaddress
import socket
import sqlite3
from datetime import datetime
from .debug_log import debug_log


class WhitelistManager:
    def __init__(self, db_path, npm_debug_log):
        self .db_path = db_path
        self .npm_debug_log = npm_debug_log
        self .whitelist_set = set()
        self .whitelist_lock = threading .Lock()
        self .static_whitelist_set = set()
        self .resolved_domain_ips = set()
        self .whitelisted_domains = set()
        self .db_mtime = 0
        self ._connect_db()

    def _connect_db(self):

        try:
            conn = sqlite3 .connect(self .db_path)
            cursor = conn .cursor()
            cursor .execute("""
                CREATE TABLE IF NOT EXISTS entries (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    type TEXT NOT NULL,
                    value TEXT NOT NULL UNIQUE,
                    description TEXT,
                    created TEXT
                )
            """)
            conn .commit()
            conn .close()
            debug_log(
                f"Connessione al DB '{
                    self .db_path}' stabilita e tabella 'entries' verificata.",
                self .npm_debug_log)
        except Exception as e:
            debug_log(
                f"Errore durante la connessione o creazione tabella DB: {e}",
                self .npm_debug_log)

    def update_whitelist(self):

        if not os .path .isfile(self .db_path):
            debug_log(
                f"File del database mancante: {
                    self .db_path}",
                self .npm_debug_log)
            return

        try:

            mtime = os .path .getmtime(self .db_path)
            if mtime == self .db_mtime:

                return
            self .db_mtime = mtime
            debug_log(
                f"DB '{
                    self .db_path}' modificato, ricarico la whitelist.",
                self .npm_debug_log)
        except Exception as e:
            debug_log(
                f"Errore ottenendo il tempo di modifica del DB: {e}",
                self .npm_debug_log)
            return

        new_static_set = set()
        new_domains = set()

        try:
            conn = sqlite3 .connect(self .db_path)
            cursor = conn .cursor()
            cursor .execute("SELECT type, value FROM entries")
            entries = cursor .fetchall()
            conn .close()

            for entry_type, value in entries:
                value = value .strip()
                if not value:
                    continue

                try:
                    entry_type = entry_type .lower()
                    if entry_type in ("ip", "cidr"):

                        net = ipaddress .ip_network(
                            value, strict=False)if '/' in value else ipaddress .ip_address(value)
                        new_static_set .add(net)
                        debug_log(
                            f"Whitelist entry IP/CIDR aggiunta dal DB: {value}",
                            self .npm_debug_log)
                    elif entry_type == "domain":
                        domain = value .lstrip("*.")
                        new_domains .add(domain)
                        debug_log(
                            f"Whitelist dominio aggiunto dal DB: {value}",
                            self .npm_debug_log)
                    else:
                        debug_log(
                            f"Tipo entry whitelist non riconosciuto dal DB: {entry_type}",
                            self .npm_debug_log)
                except Exception as e:
                    debug_log(
                        f"Errore parsing whitelist entry dal DB ({value}): {e}",
                        self .npm_debug_log)

            resolved_ips = set()
            for domain in new_domains:
                try:
                    ips = socket .gethostbyname_ex(domain)[2]
                    for ip in ips:
                        ip_obj = ipaddress .ip_address(ip)
                        resolved_ips .add(ip_obj)
                        debug_log(
                            f"Whitelist dominio '{domain}' risolto in IP: {ip}",
                            self .npm_debug_log)
                except Exception as e:
                    debug_log(
                        f"Impossibile risolvere dominio whitelist '{domain}': {e}",
                        self .npm_debug_log)

            with self .whitelist_lock:
                self .static_whitelist_set = new_static_set
                self .resolved_domain_ips .clear()
                self .resolved_domain_ips .update(resolved_ips)
                self .whitelisted_domains = new_domains
                self .whitelist_set .clear()
                self .whitelist_set .update(
                    self .static_whitelist_set | self .resolved_domain_ips)

            debug_log(
                f"Whitelist aggiornata dal DB, {
                    len(
                        self .whitelist_set)} voci caricate",
                self .npm_debug_log)

        except Exception as e:
            debug_log(
                f"Errore durante il caricamento della whitelist dal DB: {e}",
                self .npm_debug_log)

    def domain_refresh(self, interval=300, stop_event=None):
        debug_log(
            "Avviato aggiornamento periodico domini whitelist",
            self .npm_debug_log)

        while not stop_event .is_set():
            interrupted = stop_event .wait(interval)
            if interrupted:
                break

            if not self .whitelisted_domains:
                continue

            resolved_ips = set()
            for domain in list(self .whitelisted_domains):
                try:
                    ips = socket .gethostbyname_ex(domain)[2]
                    for ip in ips:
                        ip_obj = ipaddress .ip_address(ip)
                        resolved_ips .add(ip_obj)
                        debug_log(
                            f"(Agg. periodico) Dominio '{domain}' → {ip}",
                            self .npm_debug_log)
                except Exception as e:
                    debug_log(
                        f"(Agg. periodico) Errore risoluzione '{domain}': {e}",
                        self .npm_debug_log)

            with self .whitelist_lock:
                self .resolved_domain_ips .clear()
                self .resolved_domain_ips .update(resolved_ips)
                self .whitelist_set .clear()
                self .whitelist_set .update(
                    self .static_whitelist_set | self .resolved_domain_ips)

            debug_log(
                f"(Agg. periodico) Whitelist aggiornata con {
                    len(resolved_ips)} IP da domini",
                self .npm_debug_log)

    def whitelist_monitor(self, interval=60, stop_event=None):
        debug_log("Whitelist monitor avviato", self .npm_debug_log)
        while not stop_event .is_set():
            self .update_whitelist()
            if stop_event .wait(interval):
                break

    def is_whitelisted(self, ip_str):
        try:
            ip = ipaddress .ip_address(ip_str)
        except BaseException:
            return False

        with self .whitelist_lock:

            return any(
                ip in net if isinstance(net, (ipaddress .IPv4Network, ipaddress .IPv6Network))
                else ip == net for net in self .whitelist_set
            )

    def get_all_entries(self):
        try:
            conn = sqlite3 .connect(self .db_path)
            cursor = conn .cursor()
            cursor .execute(
                "SELECT id, type, value, description, created FROM entries")
            entries = cursor .fetchall()
            conn .close()
            return [{"id": row[0], "type": row[1], "value": row[2],
                     "description": row[3], "created": row[4]}for row in entries]
        except Exception as e:
            debug_log(
                f"Errore durante il recupero delle voci dal DB: {e}",
                self .npm_debug_log)
            return []

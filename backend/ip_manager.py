import sqlite3
import subprocess
import json
import ipaddress
import requests
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any
from pathlib import Path
from commons.country_codes import get_country_name


class BanManager:
    def __init__(self, db_file: str, config_file: str, debug_log_func=None):

        self.db_file = db_file
        self.config_file = config_file
        self.debug_log = debug_log_func or (
            lambda msg, log_enabled=True: (
                print(f"[DEBUG] {msg}") if log_enabled else None
            )
        )
        self.jail_name = self._load_jail_name()

    def _load_jail_name(self) -> str:

        try:
            with open(self.config_file, "r") as f:
                config_data = json.load(f)
                jail_name = config_data.get("jail_name", "npm-docker")
                self.debug_log(f"Jail name caricata: {jail_name}")
                return jail_name
        except (FileNotFoundError, json.JSONDecodeError) as e:
            self.debug_log(f"Errore nella lettura del file di configurazione: {e}")
            return "npm-docker"

    def _validate_ip(self, ip: str) -> bool:
        try:
            ipaddress.ip_network(ip, strict=False)
            return True
        except ValueError:
            return False

    def validate_ip_public(self, ip: str) -> bool:
        return self._validate_ip(ip)

    def _execute_fail2ban_command(self, command: str) -> Tuple[bool, str]:
        try:
            result = subprocess.run(
                command.split(), capture_output=True, text=True, timeout=30
            )
            success = result.returncode == 0
            output = result.stdout.strip() if success else result.stderr.strip()
            return success, output
        except subprocess.TimeoutExpired:
            return False, "Timeout esecuzione comando fail2ban"
        except Exception as e:
            return False, f"Errore esecuzione comando: {str(e)}"

    def get_ip_info(self, ip: str) -> Dict[str, Any]:
        try:
            url = f"http://localhost:8881/{ip}"
            response = requests.get(url, timeout=5)

            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    result = data.get("result", {})
                    self.debug_log(
                        f"Informazioni IP {ip} ottenute con successo dal servizio locale."
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
                    self.debug_log(
                        f"Servizio geolocalizzazione ha restituito success=false per IP {ip}."
                    )
            else:
                self.debug_log(
                    f"Errore HTTP {response .status_code} dal servizio geolocalizzazione per IP {ip}."
                )
        except requests.exceptions.Timeout:
            self.debug_log(f"Timeout nella richiesta di geolocalizzazione per IP {ip}.")
        except requests.exceptions.RequestException as e:
            self.debug_log(
                f"Errore nella richiesta di geolocalizzazione per IP {ip}: {e}"
            )
        except Exception as e:
            self.debug_log(f"Errore generico nella geolocalizzazione per IP {ip}: {e}")

        return {"network": None, "asn": None, "organization": None, "country": None}

    def setup_db(self) -> bool:
        try:
            conn = sqlite3.connect(self.db_file)
            c = conn.cursor()

            c.execute("""
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
            """)
            self.debug_log(
                "Tabella 'automatic_bans' verificata/creata con campi di geolocalizzazione."
            )

            c.execute("""
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
            """)
            self.debug_log(
                "Tabella 'manual_bans' verificata/creata con campi di geolocalizzazione."
            )

            conn.commit()
            conn.close()
            self.debug_log(
                f"Database SQLite '{self .db_file}' creato/aggiornato con successo."
            )
            return True
        except Exception as e:
            self.debug_log(f"Errore nella creazione/aggiornamento del database: {e}")
            return False

    def is_ip_banned_in_fail2ban(self, ip: str) -> bool:
        command = f"fail2ban-client status {self .jail_name}"
        success, output = self._execute_fail2ban_command(command)

        if not success:
            self.debug_log(f"Errore controllo stato jail: {output}")
            return False

        return ip in output

    def is_ip_banned_in_db(self, ip: str) -> Tuple[bool, Optional[str], Optional[str]]:

        try:
            conn = sqlite3.connect(self.db_file)
            c = conn.cursor()

            c.execute("SELECT ip, domain FROM automatic_bans WHERE ip = ?", (ip,))
            auto_result = c.fetchone()
            if auto_result:
                conn.close()
                return (
                    True,
                    "automatic",
                    f"Ban automatico per dominio: {auto_result[1] or 'N/A'}",
                )

            c.execute("SELECT ip, reason FROM manual_bans WHERE ip = ?", (ip,))
            manual_result = c.fetchone()
            if manual_result:
                conn.close()
                return True, "manual", manual_result[1]

            conn.close()
            return False, None, None

        except Exception as e:
            self.debug_log(f"Errore controllo IP nel database: {e}")
            return False, None, None

    def _is_ip_in_banned_cidr(self, ip: str) -> Tuple[bool, Optional[str], Optional[str]]:
        """Controlla se l'IP appartiene a un CIDR già bannato (solo manuale_bans)"""
        try:
            conn = sqlite3.connect(self.db_file)
            c = conn.cursor()

            c.execute("SELECT ip, reason FROM manual_bans WHERE ip LIKE '%/%'")
            cidrs = c.fetchall()
            conn.close()

            for cidr, reason in cidrs:
                try:
                    if ipaddress.ip_address(ip) in ipaddress.ip_network(cidr, strict=False):
                        self.debug_log(f"IP {ip} appartiene al CIDR bannato {cidr}")
                        return True, cidr, reason
                except ValueError:
                    continue

            return False, None, None

        except Exception as e:
            self.debug_log(f"Errore controllo IP in CIDR bannato: {e}")
            return False, None, None

    def ban_ip_manual(self, ip: str, reason: str) -> Dict[str, Any]:

        if not self._validate_ip(ip):
            return {
                "success": False,
                "message": f"Indirizzo IP non valido: {ip}",
                "error_type": "validation_error",
            }

        is_banned_db, ban_type, ban_reason = self.is_ip_banned_in_db(ip)
        if is_banned_db:
            return {
                "success": False,
                "message": f"IP {ip} già presente nei ban {ban_type}: {ban_reason}",
                "error_type": "already_banned",
                "existing_ban": {"type": ban_type, "reason": ban_reason},
            }

        is_in_cidr, cidr, cidr_reason = self._is_ip_in_banned_cidr(ip)
        if is_in_cidr:
            return {
                "success": False,
                "message": f"IP {ip} appartiene al CIDR {cidr} già bannato. Motivo del ban CIDR: {cidr_reason}",
                "error_type": "ip_in_banned_cidr",
                "existing_ban": {"type": "manual_cidr", "cidr": cidr, "reason": cidr_reason},
            }

        if self.is_ip_banned_in_fail2ban(ip):
            return {
                "success": False,
                "message": f"IP {ip} già bannato in fail2ban ma non nel database",
                "error_type": "fail2ban_conflict",
            }

        ban_command = f"fail2ban-client set {self .jail_name} banip {ip}"
        success, output = self._execute_fail2ban_command(ban_command)

        if not success:
            return {
                "success": False,
                "message": f"Errore durante il ban con fail2ban: {output}",
                "error_type": "fail2ban_error",
            }

        ip_info = self.get_ip_info(ip)

        try:
            conn = sqlite3.connect(self.db_file)
            c = conn.cursor()

            timestamp = datetime.now().isoformat()
            c.execute(
                """
                INSERT INTO manual_bans (ip, reason, ban_timestamp, network, asn, organization, country)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    ip,
                    reason,
                    timestamp,
                    ip_info["network"],
                    ip_info["asn"],
                    ip_info["organization"],
                    ip_info["country"],
                ),
            )

            conn.commit()
            conn.close()

            self.debug_log(
                f"Ban manuale per IP {ip} (motivo: {reason}) aggiunto alla tabella 'manual_bans' con info geo: {ip_info['organization']} ({ip_info['country']})."
            )

            return {
                "success": True,
                "message": f"IP {ip} bannato con successo",
                "data": {
                    "ip": ip,
                    "reason": reason,
                    "timestamp": timestamp,
                    "type": "manual",
                    "geo_info": ip_info,
                },
            }

        except Exception as e:

            unban_command = f"fail2ban-client set {self .jail_name} unbanip {ip}"
            self._execute_fail2ban_command(unban_command)

            self.debug_log(f"Errore nell'aggiunta del ban manuale per IP {ip}: {e}")
            return {
                "success": False,
                "message": f"Errore durante il salvataggio nel database: {str(e)}",
                "error_type": "database_error",
            }

    def unban_ip(self, ip: str, ban_type: str) -> Dict[str, Any]:

        if ban_type not in ["automatic", "manual"]:
            return {
                "success": False,
                "message": "Tipo di ban non valido. Deve essere 'automatic' o 'manual'",
                "error_type": "validation_error",
            }

        is_banned_db, existing_type, _ = self.is_ip_banned_in_db(ip)
        if not is_banned_db:
            return {
                "success": False,
                "message": f"IP/CIDR {ip} non trovato nei ban",
                "error_type": "not_found",
            }

        if existing_type != ban_type:
            return {
                "success": False,
                "message": f"IP/CIDR {ip} trovato nei ban {existing_type}, ma richiesto unban per {ban_type}",
                "error_type": "type_mismatch",
            }

        try:

            unban_command = f"fail2ban-client set {self .jail_name} unbanip {ip}"
            success, output = self._execute_fail2ban_command(unban_command)

            if not success:
                self.debug_log(f"Avviso: Errore rimozione da fail2ban: {output}")

            conn = sqlite3.connect(self.db_file)
            c = conn.cursor()

            table_name = f"{ban_type}_bans"
            c.execute(f"DELETE FROM {table_name} WHERE ip = ?", (ip,))

            if c.rowcount == 0:
                conn.close()
                return {
                    "success": False,
                    "message": f"IP/CIDR {ip} non trovato nella tabella {table_name}",
                    "error_type": "not_found",
                }

            conn.commit()
            conn.close()

            self.debug_log(f"IP/CIDR {ip} rimosso dai ban {ban_type} con successo")

            return {
                "success": True,
                "message": f"IP/CIDR {ip} rimosso dai ban con successo",
                "data": {"ip": ip, "type": ban_type, "removed_from_fail2ban": success},
            }

        except Exception as e:
            self.debug_log(f"Errore durante rimozione IP/CIDR {ip}: {e}")
            return {
                "success": False,
                "message": f"Errore durante la rimozione: {str(e)}",
                "error_type": "database_error",
            }

    def get_banned_ips(
        self,
        limit: int = 100,
        automatic_offset: int = 0,
        manual_offset: int = 0,
        search_query: str = "",
        export_mode: bool = False,
    ) -> Dict[str, Any]:

        try:
            conn = sqlite3.connect(self.db_file)
            c = conn.cursor()

            search_condition = ""
            search_params = []

            if search_query:
                search_lower = f"%{search_query .lower()}%"
                search_params_auto = [search_lower] * 10
                search_params_manual = [search_lower] * 7

            auto_query = """
                SELECT ip, ban_timestamp, domain, user_agent, http_code, url, network, asn, organization, country
                FROM automatic_bans
            """
            if search_query:
                auto_query += """
                    WHERE LOWER(ip) LIKE ? OR LOWER(domain) LIKE ? OR LOWER(user_agent) LIKE ?
                    OR LOWER(http_code) LIKE ? OR LOWER(url) LIKE ? OR LOWER(ban_timestamp) LIKE ?
                    OR LOWER(network) LIKE ? OR LOWER(asn) LIKE ? OR LOWER(organization) LIKE ?
                    OR LOWER(country) LIKE ?
                """

            if not export_mode:
                auto_query += " ORDER BY ban_timestamp DESC LIMIT ? OFFSET ?"
                auto_params = (
                    search_params_auto + [limit, automatic_offset]
                    if search_query
                    else [limit, automatic_offset]
                )
            else:
                auto_query += " ORDER BY ban_timestamp DESC"
                auto_params = search_params_auto if search_query else []
            c.execute(auto_query, auto_params)
            auto_results = c.fetchall()

            manual_query = """
                SELECT ip, reason, ban_timestamp, network, asn, organization, country
                FROM manual_bans
            """
            if search_query:
                manual_query += """
                    WHERE LOWER(ip) LIKE ? OR LOWER(reason) LIKE ? OR LOWER(ban_timestamp) LIKE ?
                    OR LOWER(network) LIKE ? OR LOWER(asn) LIKE ? OR LOWER(organization) LIKE ?
                    OR LOWER(country) LIKE ?
                """

            if not export_mode:
                manual_query += " ORDER BY ban_timestamp DESC LIMIT ? OFFSET ?"
                manual_params = (
                    search_params_manual + [limit, manual_offset]
                    if search_query
                    else [limit, manual_offset]
                )
            else:
                manual_query += " ORDER BY ban_timestamp DESC"
                manual_params = search_params_manual if search_query else []
            c.execute(manual_query, manual_params)
            manual_results = c.fetchall()

            auto_count_query = "SELECT COUNT(*) FROM automatic_bans"
            if search_query:
                auto_count_query += """ WHERE LOWER(ip) LIKE ? OR LOWER(domain) LIKE ? OR LOWER(user_agent) LIKE ?
                    OR LOWER(http_code) LIKE ? OR LOWER(url) LIKE ? OR LOWER(ban_timestamp) LIKE ?
                    OR LOWER(network) LIKE ? OR LOWER(asn) LIKE ? OR LOWER(organization) LIKE ?
                    OR LOWER(country) LIKE ?
                """
                c.execute(auto_count_query, search_params_auto)
            else:
                c.execute(auto_count_query)
            auto_total = c.fetchone()[0]

            manual_count_query = "SELECT COUNT(*) FROM manual_bans"
            if search_query:
                manual_count_query += """ WHERE LOWER(ip) LIKE ? OR LOWER(reason) LIKE ? OR LOWER(ban_timestamp) LIKE ?
                    OR LOWER(network) LIKE ? OR LOWER(asn) LIKE ? OR LOWER(organization) LIKE ?
                    OR LOWER(country) LIKE ?
                """
                c.execute(manual_count_query, search_params_manual)
            else:
                c.execute(manual_count_query)
            manual_total = c.fetchone()[0]

            conn.close()

            automatic_bans = []
            for row in auto_results:
                automatic_bans.append(
                    {
                        "ip": row[0],
                        "timestamp": row[1],
                        "type": "automatic",
                        "reason": f"Ban automatico per dominio: {row[2] or 'N/A'}",
                        "domain": row[2],
                        "userAgent": row[3],
                        "httpCode": (
                            int(row[4]) if row[4] and str(row[4]).isdigit() else None
                        ),
                        "urlPath": row[5],
                        "network": row[6],
                        "asn": row[7],
                        "organization": row[8],
                        "country": row[9],
                    }
                )

            manual_bans = []
            for row in manual_results:
                manual_bans.append(
                    {
                        "ip": row[0],
                        "reason": row[1],
                        "timestamp": row[2],
                        "type": "manual",
                        "network": row[3],
                        "asn": row[4],
                        "organization": row[5],
                        "country": row[6],
                    }
                )

            has_more_automatic = (
                (automatic_offset + limit) < auto_total if not export_mode else False
            )
            has_more_manual = (
                (manual_offset + limit) < manual_total if not export_mode else False
            )

            return {
                "success": True,
                "data": {
                    "automaticBans": automatic_bans,
                    "manualBans": manual_bans,
                    "hasMoreAutomatic": has_more_automatic,
                    "hasMoreManual": has_more_manual,
                    "totals": {
                        "automatic": auto_total,
                        "manual": manual_total,
                        "total": auto_total + manual_total,
                    },
                },
            }

        except Exception as e:
            self.debug_log(f"Errore durante recupero ban: {e}")
            return {
                "success": False,
                "message": f"Errore durante il recupero dei ban: {str(e)}",
                "error_type": "database_error",
            }

    def get_ban_stats(self) -> Dict[str, Any]:
        """Recupera statistiche sui ban."""
        try:
            conn = sqlite3.connect(self.db_file)
            c = conn.cursor()

            c.execute("SELECT COUNT(*) FROM automatic_bans")
            automatic_count = c.fetchone()[0]

            c.execute("SELECT COUNT(*) FROM manual_bans")
            manual_count = c.fetchone()[0]

            c.execute("""
                SELECT COUNT(*) FROM automatic_bans
                WHERE datetime(ban_timestamp) > datetime('now', '-1 day')
            """)
            automatic_recent = c.fetchone()[0]

            c.execute("""
                SELECT COUNT(*) FROM manual_bans
                WHERE datetime(ban_timestamp) > datetime('now', '-1 day')
            """)
            manual_recent = c.fetchone()[0]

            c.execute("""
                SELECT domain, COUNT(*) as count
                FROM automatic_bans
                WHERE domain IS NOT NULL
                GROUP BY domain
                ORDER BY count DESC
                LIMIT 5
            """)
            top_domains = [{"domain": row[0], "count": row[1]} for row in c.fetchall()]

            c.execute("""
                SELECT country, COUNT(*) as count FROM (
                    SELECT country FROM automatic_bans WHERE country IS NOT NULL
                    UNION ALL
                    SELECT country FROM manual_bans WHERE country IS NOT NULL
                ) GROUP BY country ORDER BY count DESC LIMIT 5
            """)
            top_countries = [
                {"country": row[0], "count": row[1]} for row in c.fetchall()
            ]

            conn.close()

            return {
                "success": True,
                "data": {
                    "total_bans": automatic_count + manual_count,
                    "automatic_bans": automatic_count,
                    "manual_bans": manual_count,
                    "recent_automatic": automatic_recent,
                    "recent_manual": manual_recent,
                    "top_domains": top_domains,
                    "top_countries": top_countries,
                    "jail_name": self.jail_name,
                },
            }

        except Exception as e:
            self.debug_log(f"Errore durante recupero statistiche: {e}")
            return {
                "success": False,
                "message": f"Errore durante il recupero delle statistiche: {str(e)}",
                "error_type": "database_error",
            }

    def get_fail2ban_status(self) -> Dict[str, Any]:
        command = f"fail2ban-client status {self .jail_name}"
        success, output = self._execute_fail2ban_command(command)

        if not success:
            return {
                "success": False,
                "message": f"Errore nel recupero stato fail2ban: {output}",
                "error_type": "fail2ban_error",
            }

        lines = output.split("\n")
        status_info = {
            "jail_name": self.jail_name,
            "active": "Status for the jail:" in output,
            "raw_output": output,
        }

        for line in lines:
            if "Currently failed:" in line:
                status_info["currently_failed"] = line.split(":")[1].strip()
            elif "Total failed:" in line:
                status_info["total_failed"] = line.split(":")[1].strip()
            elif "Currently banned:" in line:
                status_info["currently_banned"] = line.split(":")[1].strip()
            elif "Total banned:" in line:
                status_info["total_banned"] = line.split(":")[1].strip()

        return {"success": True, "data": status_info}

    def bulk_ban_ips_manual(self, ban_requests: List[Dict[str, str]]) -> Dict[str, Any]:

        if len(ban_requests) > 20:
            return {
                "success": False,
                "message": "Massimo 20 IP per richiesta bulk",
                "error_type": "validation_error",
            }

        results = []
        success_count = 0
        failed_count = 0

        for ban_request in ban_requests:
            ip = ban_request.get("ip", "").strip()
            reason = ban_request.get("reason", "").strip()

            if not ip or not reason:
                results.append(
                    {
                        "ip": ip,
                        "success": False,
                        "message": "IP e motivo sono obbligatori",
                        "error_type": "validation_error",
                    }
                )
                failed_count += 1
                continue

            result = self.ban_ip_manual(ip, reason)
            results.append(
                {
                    "ip": ip,
                    "success": result["success"],
                    "message": result["message"],
                    "data": result.get("data"),
                    "error_type": result.get("error_type"),
                }
            )

            if result["success"]:
                success_count += 1
            else:
                failed_count += 1

        self.debug_log(
            f"Ban multipli completati: {success_count} successo, {failed_count} falliti"
        )

        return {
            "success": True,
            "data": {
                "results": results,
                "summary": {
                    "total": len(ban_requests),
                    "success": success_count,
                    "failed": failed_count,
                },
            },
            "message": f"Ban multipli completati: {success_count} successo, {failed_count} falliti",
        }

    def get_all_banned_ips_for_export(self) -> Dict[str, Any]:

        return self.get_banned_ips(
            limit=50000,
            automatic_offset=0,
            manual_offset=0,
            search_query="",
            export_mode=True,
        )

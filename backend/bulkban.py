

import sqlite3
import ipaddress
import subprocess
import platform
import shutil
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any
from commons .country_codes import get_country_name


class BulkBanManager:

    def __init__(
            self,
            db_file: str,
            jail_name: str = "sshd",
            debug_log_func=None):

        self .db_file = db_file
        self .jail_name = jail_name
        self .debug_log = debug_log_func or (
            lambda msg, log_enabled=True: print(
                f"[DEBUG] {msg}")if log_enabled else None)
        self .fail2ban_available = self ._check_fail2ban_availability()
        self .is_windows = platform .system() == "Windows"

    def _check_fail2ban_availability(self) -> bool:
        return shutil .which("fail2ban-client") is not None

    def _validate_cidr(self, cidr: str) -> bool:
        try:
            ipaddress .ip_network(cidr, strict=False)
            return True
        except ValueError:
            return False

    def _execute_fail2ban_command(self, command: str) -> Tuple[bool, str, str]:

        if not self .fail2ban_available:
            platform_name = "Windows"if self .is_windows else "questo sistema"
            error_msg = f"fail2ban non è disponibile su {platform_name}. Il ban non sarà applicato dal firewall."
            return False, "", error_msg

        try:
            result = subprocess .run(
                command .split(),
                capture_output=True,
                text=True,
                timeout=30
            )
            success = result .returncode == 0
            stdout = result .stdout .strip()if result .stdout else ""
            stderr = result .stderr .strip()if result .stderr else ""
            return success, stdout, stderr
        except subprocess .TimeoutExpired:
            return False, "", "Timeout esecuzione comando fail2ban (superato 30 secondi)"
        except FileNotFoundError as e:
            return False, "", f"fail2ban-client non trovato nel sistema: {
                str(e)}"
        except Exception as e:
            return False, "", f"Errore esecuzione comando fail2ban: {str(e)}"

    def _ip_in_cidr(self, ip: str, cidr: str) -> bool:
        try:
            return ipaddress .ip_address(
                ip) in ipaddress .ip_network(cidr, strict=False)
        except ValueError:
            return False

    def ban_cidr(self, cidr: str, reason: str) -> Dict[str, Any]:

        if not self ._validate_cidr(cidr):
            return {
                "success": False,
                "message": f"CIDR non valido: {cidr}",
                "error_type": "validation_error"
            }

        try:
            conn = sqlite3 .connect(self .db_file)
            c = conn .cursor()
            c .execute("SELECT id FROM manual_bans WHERE ip = ?", (cidr,))
            if c .fetchone():
                conn .close()
                return {
                    "success": False,
                    "message": f"CIDR {cidr} già presente nei ban manuali",
                    "error_type": "already_banned"
                }
        except Exception as e:
            return {
                "success": False,
                "message": f"Errore nella verifica del database: {str(e)}",
                "error_type": "db_error"
            }
        finally:
            conn .close()

        firewall_warning = None
        firewall_error = None

        if self .fail2ban_available:

            ban_command = f"fail2ban-client set {self .jail_name} banip {cidr}"
            success, stdout, stderr = self ._execute_fail2ban_command(
                ban_command)

            if not success:

                error_detail = stderr if stderr else stdout
                return {
                    "success": False,
                    "message": f"Errore durante il ban con fail2ban: {error_detail}",
                    "error_type": "fail2ban_error",
                    "details": {
                        "command": ban_command,
                        "error": error_detail}}
            else:

                self .debug_log(f"fail2ban ha bannato {cidr}: {stdout}")
        else:

            firewall_warning = "Fail2ban non è disponibile su questo sistema. Il CIDR è stato registrato nel database ma non sarà applicato dal firewall. Verifica che fail2ban sia installato e in esecuzione."

        network = ipaddress .ip_network(cidr, strict=False)
        first_ip = str(network .network_address)

        ip_info = {
            'network': cidr,
            'asn': None,
            'organization': None,
            'country': None
        }

        try:
            conn = sqlite3 .connect(self .db_file)
            c = conn .cursor()

            timestamp = datetime .now().isoformat()
            c .execute("""
                INSERT INTO manual_bans (ip, reason, ban_timestamp, network, asn, organization, country)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (cidr, reason, timestamp, ip_info['network'], ip_info['asn'],
                  ip_info['organization'], ip_info['country']))

            conn .commit()
            conn .close()

            self .debug_log(
                f"Ban CIDR per {cidr} (motivo: {reason}) aggiunto alla tabella 'manual_bans'")

            message = f"CIDR {cidr} bannato con successo"
            if firewall_warning:
                message = f"{message}. {firewall_warning}"

            return {
                "success": True,
                "message": message,
                "warning": firewall_warning,
                "data": {
                    "cidr": cidr,
                    "reason": reason,
                    "timestamp": timestamp
                }
            }

        except Exception as e:
            self .debug_log(
                f"Errore nell'inserimento del CIDR nel database: {
                    str(e)}")
            return {
                "success": False,
                "message": f"Errore nell'inserimento del CIDR nel database: {
                    str(e)}",
                "error_type": "db_error"}

    def find_ips_in_cidr(
            self, cidr: str, ban_type: Optional[str] = None) -> Dict[str, Any]:

        if not self ._validate_cidr(cidr):
            return {
                "success": False,
                "message": f"CIDR non valido: {cidr}",
                "error_type": "validation_error",
                "ips_found": []
            }

        ips_in_cidr = []

        try:
            conn = sqlite3 .connect(self .db_file)
            c = conn .cursor()

            if ban_type in [None, "automatic"]:
                c .execute("SELECT id, ip FROM automatic_bans")
                for row_id, ip in c .fetchall():
                    if self ._ip_in_cidr(ip, cidr):
                        ips_in_cidr .append({
                            "id": row_id,
                            "ip": ip,
                            "type": "automatic"
                        })

            if ban_type in [None, "manual"]:
                c .execute(
                    "SELECT id, ip FROM manual_bans WHERE ip != ?", (cidr,))
                for row_id, ip in c .fetchall():
                    if self ._ip_in_cidr(ip, cidr):
                        ips_in_cidr .append({
                            "id": row_id,
                            "ip": ip,
                            "type": "manual"
                        })

            conn .close()

            return {
                "success": True,
                "message": f"Trovati {
                    len(ips_in_cidr)} IP appartenenti al CIDR {cidr}",
                "cidr": cidr,
                "ips_found": ips_in_cidr,
                "count": len(ips_in_cidr)}

        except Exception as e:
            self .debug_log(
                f"Errore nella ricerca degli IP nel CIDR: {
                    str(e)}")
            return {
                "success": False,
                "message": f"Errore nella ricerca: {str(e)}",
                "error_type": "db_error",
                "ips_found": []
            }

    def unban_ips_in_cidr(
            self, cidr: str, ip_ids: List[int]) -> Dict[str, Any]:

        if not self ._validate_cidr(cidr):
            return {
                "success": False,
                "message": f"CIDR non valido: {cidr}",
                "error_type": "validation_error"
            }

        unbanned_ips = []
        failed_ips = []

        try:
            conn = sqlite3 .connect(self .db_file)
            c = conn .cursor()

            ips_to_unban = []
            for ip_id in ip_ids:

                c .execute(
                    "SELECT ip FROM automatic_bans WHERE id = ?", (ip_id,))
                result = c .fetchone()
                if result:
                    ips_to_unban .append((result[0], "automatic", ip_id))
                    continue

                c .execute("SELECT ip FROM manual_bans WHERE id = ?", (ip_id,))
                result = c .fetchone()
                if result:
                    ips_to_unban .append((result[0], "manual", ip_id))

            conn .close()

            for ip, ban_type, ip_id in ips_to_unban:
                try:

                    unban_command = f"fail2ban-client set {
                        self .jail_name} unbanip {ip}"
                    success, stdout, stderr = self ._execute_fail2ban_command(
                        unban_command)

                    if not success:
                        error_detail = stderr if stderr else stdout
                        self .debug_log(
                            f"Avviso: Errore rimozione da fail2ban per IP {ip}: {error_detail}")

                    conn = sqlite3 .connect(self .db_file)
                    c = conn .cursor()

                    table_name = f"{ban_type}_bans"
                    c .execute(
                        f"DELETE FROM {table_name} WHERE id = ?", (ip_id,))
                    conn .commit()
                    conn .close()

                    unbanned_ips .append({
                        "ip": ip,
                        "type": ban_type,
                        "status": "unbanned"
                    })

                    self .debug_log(f"IP {ip} sbannato da {ban_type}_bans")

                except Exception as e:
                    self .debug_log(
                        f"Errore nello sbannamento di {ip}: {
                            str(e)}")
                    failed_ips .append({
                        "ip": ip,
                        "error": str(e)
                    })

            return {
                "success": True,
                "message": f"Sbannati {
                    len(unbanned_ips)} IP su {
                    len(ips_to_unban)}",
                "unbanned_ips": unbanned_ips,
                "failed_ips": failed_ips,
                "cidr": cidr}

        except Exception as e:
            self .debug_log(f"Errore nell'operazione di unban bulk: {str(e)}")
            return {
                "success": False,
                "message": f"Errore nell'operazione di unban: {str(e)}",
                "error_type": "operation_error"
            }

    def ban_multiple_cidrs(
            self, cidr_list: List[Dict[str, str]]) -> Dict[str, Any]:

        results = []
        successful = 0
        failed = 0

        for item in cidr_list:
            cidr = item .get('cidr', '').strip()
            reason = item .get('reason', 'Ban multiplo CIDR').strip()

            result = self .ban_cidr(cidr, reason)
            results .append({
                "cidr": cidr,
                "success": result['success'],
                "message": result['message']
            })

            if result['success']:
                successful += 1
            else:
                failed += 1

        return {
            "success": failed == 0,
            "message": f"Bannati {successful} CIDR, {failed} falliti",
            "successful": successful,
            "failed": failed,
            "results": results
        }

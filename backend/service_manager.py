import os
import json
from datetime import datetime
from typing import Dict, Any

SERVICE_COMMANDS_DIR = "service_commands"
VALID_SERVICES = ["backend", "frontend", "analyzer", "geolocate"]


class ServiceManager:

    def __init__(self):
        os .makedirs(SERVICE_COMMANDS_DIR, exist_ok=True)

    def request_restart(self, service_name: str) -> Dict[str, Any]:
        if service_name not in VALID_SERVICES:
            return {
                "success": False,
                "message": f"Servizio '{service_name}' sconosciuto. Servizi validi: {
                    ', '.join(VALID_SERVICES)}"}

        try:
            command_file = os .path .join(
                SERVICE_COMMANDS_DIR, f"{service_name}.restart")

            with open(command_file, "w", encoding="utf-8")as f:
                f .write(json .dumps({
                    "service": service_name,
                    "timestamp": datetime .now().isoformat(),
                    "command": "restart",
                    "status": "pending"
                }, indent=2))

            return {
                "success": True,
                "message": f"Restart richiesto per il servizio '{service_name}'. Il servizio verrà riavviato tra pochi secondi.",
                "service": service_name,
                "timestamp": datetime .now().isoformat()}

        except Exception as e:
            return {
                "success": False,
                "message": f"Errore durante la richiesta di restart: {str(e)}"
            }

    def get_restart_status(self, service_name: str) -> Dict[str, Any]:
        if service_name not in VALID_SERVICES:
            return {"success": False, "message": "Servizio sconosciuto"}

        try:
            command_file = os .path .join(
                SERVICE_COMMANDS_DIR, f"{service_name}.restart")

            if not os .path .exists(command_file):
                return {
                    "success": True,
                    "status": "ready",
                    "message": f"Servizio '{service_name}' è pronto per il restart"}

            with open(command_file, "r", encoding="utf-8")as f:
                data = json .load(f)

            return {
                "success": True,
                "status": data .get("status", "unknown"),
                "service": service_name,
                "timestamp": data .get("timestamp")
            }

        except Exception as e:
            return {
                "success": False,
                "message": f"Errore durante il recupero dello stato: {str(e)}"
            }

    def clear_restart_command(self, service_name: str) -> None:
        try:
            command_file = os .path .join(
                SERVICE_COMMANDS_DIR, f"{service_name}.restart")
            if os .path .exists(command_file):
                os .remove(command_file)
        except Exception:
            pass

    def has_pending_restart(self, service_name: str) -> bool:
        if service_name not in VALID_SERVICES:
            return False

        command_file = os .path .join(
            SERVICE_COMMANDS_DIR,
            f"{service_name}.restart")
        return os .path .exists(command_file)

    def get_all_pending_restarts(self) -> list:
        pending = []
        for service in VALID_SERVICES:
            if self .has_pending_restart(service):
                pending .append(service)
        return pending


service_manager = ServiceManager()

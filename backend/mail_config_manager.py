import json
import os
from typing import Dict, Any


class MailConfigManager:
    def __init__(self, config_path: str):
        self .config_path = config_path

        if not os .path .exists(self .config_path):
            default_config = {
                "enabled": False,
                "smtp_server": "smtp.gmail.com",
                "smtp_port": 587,
                "use_tls": True,
                "username": "",
                "password": "",
                "from": "",
                "to": "",
                "subject": "IP Bannato"
            }
            self ._save_config(default_config)

    def _load_config(self) -> Dict[str, Any]:
        with open(self .config_path, "r", encoding="utf-8")as f:
            return json .load(f)

    def _save_config(self, config: Dict[str, Any]):

        os .makedirs(os .path .dirname(self .config_path), exist_ok=True)
        with open(self .config_path, "w", encoding="utf-8")as f:
            json .dump(config, f, indent=2, ensure_ascii=False)

    def get_mail_config(self) -> Dict[str, Any]:
        return self ._load_config()

    def update_mail_config(self, new_config: Dict[str, Any]) -> Dict[str, Any]:

        required_fields = [
            "enabled", "smtp_server", "smtp_port", "use_tls",
            "username", "password", "from", "to", "subject"
        ]
        for field in required_fields:
            if field not in new_config:
                raise ValueError(
                    f"Campo mancante nella configurazione: {field}")

        self ._save_config(new_config)
        return {
            "success": True,
            "message": "Configurazione email aggiornata correttamente"}

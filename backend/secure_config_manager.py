import os
import json
from typing import Dict, Any, Optional
from .utils import log_manager


class SecureConfigManager:
    def __init__(self, config_path: str = "data/conf/secure.conf"):
        self.config_path = config_path
        self.default_config = {"SECURE_COOKIES": True, "LAST_MODIFIED": None}
        self._load_config()

    def _load_config(self) -> None:
        try:
            if os.path.exists(self.config_path):
                with open(self.config_path, "r", encoding="utf-8") as f:
                    loaded = json.load(f)
                    self.config = {**self.default_config, **loaded}
                    log_manager.log_operation(
                        "SecureConfig",
                        "config_loaded",
                        f"SECURE_COOKIES={self .config['SECURE_COOKIES']}",
                    )
            else:

                self.config = self.default_config.copy()
                self._save_config()
                log_manager.log_operation(
                    "SecureConfig",
                    "config_created",
                    f"SECURE_COOKIES={self .config['SECURE_COOKIES']}",
                )
        except Exception as e:
            log_manager.log_operation("SecureConfig", "error_loading_config", str(e))
            self.config = self.default_config.copy()

    def _save_config(self) -> None:
        try:

            os.makedirs(os.path.dirname(self.config_path), exist_ok=True)

            from datetime import datetime

            self.config["LAST_MODIFIED"] = datetime.utcnow().isoformat()

            with open(self.config_path, "w", encoding="utf-8") as f:
                json.dump(self.config, f, indent=2, ensure_ascii=False)

            log_manager.log_operation(
                "SecureConfig",
                "config_saved",
                f"SECURE_COOKIES={self .config['SECURE_COOKIES']}",
            )
        except Exception as e:
            log_manager.log_operation("SecureConfig", "error_saving_config", str(e))
            raise

    def get_config(self) -> Dict[str, Any]:
        return {
            "success": True,
            "config": {
                "SECURE_COOKIES": self.config.get("SECURE_COOKIES", True),
                "LAST_MODIFIED": self.config.get("LAST_MODIFIED"),
            },
        }

    def update_config(self, secure_cookies: bool) -> Dict[str, Any]:
        try:
            old_value = self.config.get("SECURE_COOKIES", True)
            self.config["SECURE_COOKIES"] = secure_cookies
            self._save_config()

            log_manager.log_operation(
                "SecureConfig",
                "config_updated",
                f"SECURE_COOKIES: {old_value} -> {secure_cookies}",
            )

            return {
                "success": True,
                "message": f"Configurazione aggiornata: SECURE_COOKIES={secure_cookies}",
                "config": {
                    "SECURE_COOKIES": secure_cookies,
                    "LAST_MODIFIED": self.config.get("LAST_MODIFIED"),
                },
            }
        except Exception as e:
            log_manager.log_operation("SecureConfig", "error_updating_config", str(e))
            return {
                "success": False,
                "message": f"Errore durante l'aggiornamento: {str(e)}",
            }

    def get_secure_cookies_enabled(self) -> bool:
        return self.config.get("SECURE_COOKIES", True)


secure_config_manager = SecureConfigManager()

import json
from pathlib import Path
from typing import Dict, Any, List

PROJECT_ROOT = Path(__file__).resolve().parent .parent
CONFIG_FILE_PATH = PROJECT_ROOT / "data"/"conf"/"conf.local"


class NpmConfigManager:
    def __init__(self):
        self ._config: Dict[str, Any] = {}
        self .load_config()

    def load_config(self):
        if not CONFIG_FILE_PATH .exists():
            self ._config = {
                "LOG_DIR": "/app/nginx-logs",
                "IGNORE_WHITELIST": False,
                "ENABLE_WHITELIST_LOG": True,
                "CODES_TO_ALLOW": [
                    101,
                    200,
                    201,
                    202,
                    204,
                    206,
                    302,
                    304,
                    413,
                    499],
                "MAX_REQUESTS": 3,
                "TIME_FRAME": 3600,
                "JAIL_NAME": "npm-docker"}
            self .save_config()
            return

        try:
            with open(CONFIG_FILE_PATH, 'r')as f:
                self ._config = json .load(f)
        except json .JSONDecodeError:
            print(
                f"Errore: Il file di configurazione {CONFIG_FILE_PATH} non è un JSON valido. Verrà usata la configurazione di default.")
            self ._config = {
                "LOG_DIR": "/app/nginx-logs",
                "IGNORE_WHITELIST": False,
                "ENABLE_WHITELIST_LOG": True,
                "CODES_TO_ALLOW": [
                    101,
                    200,
                    201,
                    202,
                    204,
                    206,
                    302,
                    304,
                    413,
                    499],
                "MAX_REQUESTS": 3,
                "TIME_FRAME": 3600,
                "JAIL_NAME": "npm-docker"}
            self .save_config()
        except Exception as e:
            print(f"Errore durante il caricamento della configurazione: {e}")
            self ._config = {
                "LOG_DIR": "/app/nginx-logs",
                "IGNORE_WHITELIST": False,
                "ENABLE_WHITELIST_LOG": True,
                "CODES_TO_ALLOW": [
                    101,
                    200,
                    201,
                    202,
                    204,
                    206,
                    302,
                    304,
                    413,
                    499],
                "MAX_REQUESTS": 3,
                "TIME_FRAME": 3600,
                "JAIL_NAME": "npm-docker"}
            self .save_config()

    def save_config(self):
        try:
            CONFIG_FILE_PATH .parent .mkdir(parents=True, exist_ok=True)
            with open(CONFIG_FILE_PATH, 'w')as f:
                json .dump(self ._config, f, indent=4)
        except Exception as e:
            print(f"Errore durante il salvataggio della configurazione: {e}")

    def get_config(self) -> Dict[str, Any]:
        return self ._config

    def update_config(self, new_settings: Dict[str, Any]):
        self ._config .update(new_settings)
        self .save_config()

    @property
    def LOG_DIR(self) -> str:
        return self ._config .get("LOG_DIR", "/app/nginx-logs")

    @property
    def IGNORE_WHITELIST(self) -> bool:
        return self ._config .get("IGNORE_WHITELIST", False)

    @property
    def ENABLE_WHITELIST_LOG(self) -> bool:
        return self ._config .get("ENABLE_WHITELIST_LOG", True)

    @property
    def CODES_TO_ALLOW(self) -> List[int]:
        return self ._config .get(
            "CODES_TO_ALLOW", [
                101, 200, 201, 202, 204, 206, 302, 304, 413, 499])

    @property
    def MAX_REQUESTS(self) -> int:
        return self ._config .get("MAX_REQUESTS", 3)

    @property
    def TIME_FRAME(self) -> int:
        return self ._config .get("TIME_FRAME", 3600)

    @property
    def JAIL_NAME(self) -> str:
        return self ._config .get("JAIL_NAME", "npm-docker")

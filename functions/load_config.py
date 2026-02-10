import os
import json
from functions.debug_log import debug_log


def load_config(CONFIG_PATH, NPM_DEBUG_LOG):
    REQUIRED_KEYS = [
        "LOG_DIR",
        "ENABLE_WHITELIST_LOG",
        "CODES_TO_ALLOW",
        "TIME_FRAME",
        "MAX_REQUESTS",
        "JAIL_NAME",
    ]

    DEFAULT_CONFIG = {
        "LOG_DIR": "/app/nginx-logs",
        "IGNORE_WHITELIST": False,
        "ENABLE_WHITELIST_LOG": True,
        "CODES_TO_ALLOW": [101, 200, 201, 202, 204, 206, 302, 304, 413, 499],
        "MAX_REQUESTS": 3,
        "TIME_FRAME": 3600,
        "JAIL_NAME": "npm-docker"
    }

    if not os.path.isfile(CONFIG_PATH):
        try:
            config_dir = os.path.dirname(CONFIG_PATH)
            os.makedirs(config_dir, exist_ok=True)
            
            with open(CONFIG_PATH, "w") as f:
                json.dump(DEFAULT_CONFIG, f, indent=2)
            
            debug_log(f"[INFO] File config creato automaticamente: {CONFIG_PATH}", NPM_DEBUG_LOG)
            debug_log(f"[INFO] Usando configurazione di default", NPM_DEBUG_LOG)
        except Exception as e:
            debug_log(f"[ERRORE] Impossibile creare file config: {e}", NPM_DEBUG_LOG)
            exit(f"[ERRORE FATALE] Impossibile creare file config: {e}")

    try:
        with open(CONFIG_PATH, "r") as f:
            config = json.load(f)
    except Exception as e:
        debug_log(f"[ERRORE] Errore caricando JSON config: {e}", NPM_DEBUG_LOG)
        exit(f"[ERRORE FATALE] Errore caricando JSON config: {e}")

    for bool_key in ["ENABLE_WHITELIST_LOG", "IGNORE_WHITELIST"]:
        if bool_key in config and not isinstance(config[bool_key], bool):
            val = str(config[bool_key]).lower()
            config[bool_key] = val == "true"

    if "CODES_TO_ALLOW" in config:
        if isinstance(config["CODES_TO_ALLOW"], list):
            config["CODES_TO_ALLOW"] = set(int(x) for x in config["CODES_TO_ALLOW"])
        else:
            debug_log(f"[ERRORE] 'CODES_TO_ALLOW' deve essere una lista", NPM_DEBUG_LOG)
            exit(f"[ERRORE FATALE] 'CODES_TO_ALLOW' deve essere una lista")

    for int_key in ["TIME_FRAME", "MAX_REQUESTS"]:
        if int_key in config:
            try:
                config[int_key] = int(config[int_key])
            except Exception:
                debug_log(f"[ERRORE] '{int_key}' deve essere un intero", NPM_DEBUG_LOG)
                exit(f"[ERRORE FATALE] '{int_key}' deve essere un intero")

    for key in REQUIRED_KEYS:
        if key not in config:
            debug_log(f"[ERRORE] Config: parametro mancante '{key}'", NPM_DEBUG_LOG)
            exit(f"[ERRORE FATALE] Parametro '{key}' mancante in {CONFIG_PATH}")

    debug_log("Config caricata con successo:", NPM_DEBUG_LOG)
    for k, v in config.items():
        debug_log(f"  {k} = {v}", NPM_DEBUG_LOG)

    return config

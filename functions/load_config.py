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

    if not os.path.isfile(CONFIG_PATH):
        debug_log(f"[ERRORE] File config non trovato: {CONFIG_PATH}", NPM_DEBUG_LOG)
        exit(f"[ERRORE FATALE] File config non trovato: {CONFIG_PATH}")

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

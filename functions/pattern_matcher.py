import re
from .debug_log import debug_log


def match_pattern(
        stringa,
        mapping,
        default,
        label="pattern",
        npm_debug_log=None):
    if not stringa:
        return None if "user agent" in label .lower()else default
    for pattern, descrizione in mapping .items():
        try:
            if re .search(pattern, stringa, re .IGNORECASE):
                return descrizione
        except re .error as e:
            if npm_debug_log:
                debug_log(
                    f"Regex non valida in {label}: {pattern} - Errore: {e}",
                    npm_debug_log)
    return default


def descrizione_intento(stringa, url_pattern_map, npm_debug_log=None):
    return match_pattern(
        stringa,
        url_pattern_map,
        "Non specificato",
        "URL_PATTERN",
        npm_debug_log)


def descrizione_user_agent(user_agent, user_agent_map, npm_debug_log=None):
    return match_pattern(
        user_agent,
        user_agent_map,
        "Non mappato/Sconosciuto",
        "USER_AGENT",
        npm_debug_log)


def descrizione_errore_nginx(linea, nginx_error_map, npm_debug_log=None):
    return match_pattern(
        linea,
        nginx_error_map,
        "Errore Nginx generico (non classificato)",
        "NGINX_ERROR",
        npm_debug_log)


def get_status_meaning(code, status_meaning_map):
    return status_meaning_map .get(str(code), "Sconosciuto")

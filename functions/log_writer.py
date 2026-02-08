import os
from datetime import datetime
from .pattern_matcher import (
    descrizione_intento,
    descrizione_user_agent,
    get_status_meaning,
)


def write_log(
    ip,
    http_code,
    domain,
    whitelist_manager,
    status_meaning_map,
    url_pattern_map,
    user_agent_map,
    log_file_normal,
    log_file_whitelisted,
    enable_whitelist_log,
    method=None,
    url=None,
    user_agent=None,
):
    """Log entry"""
    try:
        http_code_int = int(http_code)
        meaning = get_status_meaning(http_code_int, status_meaning_map)
    except Exception:
        http_code_int = http_code
        meaning = "Sconosciuto"

    timestamp = datetime.now().strftime("[%Y-%m-%d %H:%M:%S]")

    max_ua_len = 97
    max_url_len = 150

    ua_short = (
        (user_agent[:max_ua_len] + "...")
        if user_agent and len(user_agent) > max_ua_len
        else user_agent
    )
    url_short = (url[:max_url_len] + "...") if url and len(url) > max_url_len else url

    descr = descrizione_intento(url or "", url_pattern_map)

    entry_parts = [
        f"IP: {ip}",
        f"Codice HTTP: {http_code} ({meaning})",
        f"Dominio: {domain}",
    ]
    if method:
        entry_parts.append(f"Metodo: {method}")
    if url:
        entry_parts.append(f"URL: {url_short}")
    if descr:
        entry_parts.append(f"Intenzioni: {descr}")
    if ua_short:
        ua_descr = descrizione_user_agent(user_agent, user_agent_map)
        if ua_descr:
            entry_parts.append(f'User-Agent: "{ua_short}" ({ua_descr})')
        else:
            entry_parts.append(f'User-Agent: "{ua_short}"')

    entry = f"{timestamp} - " + ", ".join(entry_parts)

    if whitelist_manager.is_whitelisted(ip):
        if enable_whitelist_log:
            with open(log_file_whitelisted, "a") as log_file:
                log_file.write(entry + "\n")
    else:
        with open(log_file_normal, "a") as log_file:
            log_file.write(entry + "\n")


def log_event(message, banhammer_main_file):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_line = f"[{timestamp}] - {message}"
    try:
        with open(banhammer_main_file, "a") as f:
            f.write(log_line + "\n")
    except Exception as e:
        print(f"Errore scrittura log principale: {e}")

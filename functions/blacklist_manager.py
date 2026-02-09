import json
import re
from .debug_log import debug_log


def load_blacklists_once(user_agent_blacklist, intent_blacklist, npm_debug_log):
    user_agents_blacklist = set()
    intent_blacklist_set = set()

    try:
        with open(user_agent_blacklist, "r", encoding="utf-8") as ua_file:
            for line in ua_file:
                line = line.strip()
                if not line:
                    continue
                try:
                    data = json.loads(line)
                    pattern = data.get("pattern", "").lower()
                    if pattern:
                        user_agents_blacklist.add(pattern)
                except json.JSONDecodeError:
                    debug_log(f"Errore parsing JSON user agent: {line}", npm_debug_log)
        debug_log(
            f"Blacklist User-Agent caricata: {len(user_agents_blacklist)} voci",
            npm_debug_log,
        )
    except FileNotFoundError:
        user_agents_blacklist = set()
        debug_log("Blacklist User-Agent non trovata", npm_debug_log)

    try:
        with open(intent_blacklist, "r", encoding="utf-8") as intent_file:
            for line in intent_file:
                line = line.strip()
                if not line:
                    continue
                try:
                    data = json.loads(line)
                    pattern = data.get("pattern", "").lower()
                    if pattern:
                        intent_blacklist_set.add(pattern)
                except json.JSONDecodeError:
                    debug_log(f"Errore parsing JSON intent: {line}", npm_debug_log)
        debug_log(
            f"Blacklist Intenti caricata: {len(intent_blacklist_set)} voci",
            npm_debug_log,
        )
    except FileNotFoundError:
        intent_blacklist_set = set()
        debug_log("Blacklist Intenti non trovata", npm_debug_log)

    return user_agents_blacklist, intent_blacklist_set


def is_dangerous(user_agent_full, url, user_agents_blacklist, intent_blacklist_set):
    """
    Verifica se un user agent o URL sono pericolosi.
    """
    ua = user_agent_full.lower() if user_agent_full else ""
    url_lower = url.lower() if url else ""

    for bad_ua in user_agents_blacklist:
        try:
            if re.search(bad_ua, ua, re.IGNORECASE):
                return True
        except re.error:
            if bad_ua in ua:
                return True
    
    for bad_intent in intent_blacklist_set:
        try:
            if re.search(bad_intent, url_lower, re.IGNORECASE):
                return True
        except re.error:
            if bad_intent in url_lower:
                return True

    return False

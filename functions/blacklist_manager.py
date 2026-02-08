from .debug_log import debug_log


def load_blacklists_once(user_agent_blacklist, intent_blacklist, npm_debug_log):
    user_agents_blacklist = set()
    intent_blacklist_set = set()

    try:
        with open(user_agent_blacklist, "r") as ua_file:
            user_agents_blacklist = {
                line.strip().lower() for line in ua_file if line.strip()
            }
        debug_log(
            f"Blacklist User-Agent caricata: {len(user_agents_blacklist)} voci",
            npm_debug_log,
        )
    except FileNotFoundError:
        user_agents_blacklist = set()
        debug_log("Blacklist User-Agent non trovata", npm_debug_log)

    try:
        with open(intent_blacklist, "r") as intent_file:
            intent_blacklist_set = {
                line.strip().lower() for line in intent_file if line.strip()
            }
        debug_log(
            f"Blacklist Intenti caricata: {len(intent_blacklist_set)} voci",
            npm_debug_log,
        )
    except FileNotFoundError:
        intent_blacklist_set = set()
        debug_log("Blacklist Intenti non trovata", npm_debug_log)

    return user_agents_blacklist, intent_blacklist_set


def is_dangerous(user_agent_full, intent, user_agents_blacklist, intent_blacklist_set):
    ua = user_agent_full.lower() if user_agent_full else ""
    intent = intent.lower() if intent else ""

    ua_match = any(bad_ua in ua for bad_ua in user_agents_blacklist)
    intent_match = any(bad in intent for bad in intent_blacklist_set)

    return ua_match or intent_match

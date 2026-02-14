import json
import re
from functools import lru_cache
from .debug_log import debug_log


class DangerDetector:
    
    def __init__(self, user_agents_blacklist, intent_blacklist_set):
        self.ua_patterns = []
        self.ua_strings = []
        
        for pattern in user_agents_blacklist:
            try:
                compiled = re.compile(pattern, re.IGNORECASE)
                self.ua_patterns.append(compiled)
            except re.error:
                self.ua_strings.append(pattern)
        
        self.intent_patterns = []
        self.intent_strings = []
        
        for pattern in intent_blacklist_set:
            try:
                compiled = re.compile(pattern, re.IGNORECASE)
                self.intent_patterns.append(compiled)
            except re.error:
                self.intent_strings.append(pattern)
    
    @lru_cache(maxsize=10000)
    def is_dangerous(self, user_agent_full, url):

        ua = user_agent_full.lower() if user_agent_full else ""
        url_lower = url.lower() if url else ""
        
        for pattern in self.ua_patterns:
            if pattern.search(ua):
                return True
        
        for bad_ua in self.ua_strings:
            if bad_ua in ua:
                return True
        
        for pattern in self.intent_patterns:
            if pattern.search(url_lower):
                return True
        
        for bad_intent in self.intent_strings:
            if bad_intent in url_lower:
                return True
        
        return False
    
    def get_stats(self):
        return {
            'ua_regex_patterns': len(self.ua_patterns),
            'ua_string_patterns': len(self.ua_strings),
            'intent_regex_patterns': len(self.intent_patterns),
            'intent_string_patterns': len(self.intent_strings),
            'cache_info': self.is_dangerous.cache_info()._asdict()
        }


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

    detector = DangerDetector(user_agents_blacklist, intent_blacklist_set)
    
    stats = detector.get_stats()
    debug_log(
        f"DangerDetector inizializzato - UA: {stats['ua_regex_patterns']} regex + "
        f"{stats['ua_string_patterns']} stringhe, Intent: {stats['intent_regex_patterns']} "
        f"regex + {stats['intent_string_patterns']} stringhe",
        npm_debug_log
    )
    
    return detector


def is_dangerous(user_agent_full, url, user_agents_blacklist, intent_blacklist_set):
    """
    DEPRECATA: nuova -> DangerDetector.is_dangerous()
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
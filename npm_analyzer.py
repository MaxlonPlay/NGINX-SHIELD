import os
import sys
import time
import signal
import threading
import re
from datetime import datetime
from concurrent .futures import ThreadPoolExecutor
from queue import Queue, Empty
from functools import lru_cache
from collections import deque

from functions .debug_log import debug_log
from functions .load_config import load_config
from functions .load_pattern_file import load_pattern_file
from functions .whitelist_manager import WhitelistManager
from functions .pattern_matcher import get_status_meaning
from functions .log_writer import log_event
from functions .ip_manager import IPDataManager, start_memory_cleanup_thread
from functions .ban_manager import should_ban_ip, ban_and_reset, setup_db
from functions .file_monitor import tail_file, monitor_pattern
from functions .blacklist_manager import load_blacklists_once, is_dangerous
from functions .signal_handler import handle_signal


APPLICATION_ROOT = os .path .dirname(os .path .abspath(__file__))


CONFIG_FILE = os .path .join(APPLICATION_ROOT, "data", "conf", "conf.local")
WHITELIST_DB_PATH = os .path .join(
    APPLICATION_ROOT, "data", "db", "whitelist.db")


ANALYSIS_LOG_DIR = os .path .join(APPLICATION_ROOT, "log")
os .makedirs(ANALYSIS_LOG_DIR, exist_ok=True)


LOG_FILE_WHITELISTED = os .path .join(ANALYSIS_LOG_DIR, "whitelisted.log")
LOG_FILE_WHITELISTED_PROXY = os .path .join(
    ANALYSIS_LOG_DIR, "proxy-host-error-whitelist.log")
NPM_DEBUG_LOG = os .path .join(ANALYSIS_LOG_DIR, "npm_debug.log")
SUSPICIOUS_IP_LOG = os .path .join(ANALYSIS_LOG_DIR, "banhammer.log")


BLOCKLIST_DB_PATH = os .path .join(
    APPLICATION_ROOT, "data", "db", "banned_ips.db")


PATTERN_DEFINITION_DIR = os .path .join(APPLICATION_ROOT, "patterns")
URL_PATTERN_PATH = os .path .join(PATTERN_DEFINITION_DIR, "url.pattern")
STATUS_MEANING_PATH = os .path .join(
    PATTERN_DEFINITION_DIR,
    "status_http.pattern")
NGINX_ERROR_PATTERN_PATH = os .path .join(
    PATTERN_DEFINITION_DIR, "nginx_error.pattern")
USER_AGENT_PATTERN_PATH = os .path .join(
    PATTERN_DEFINITION_DIR, "user_agent.pattern")


THREAT_INTELLIGENCE_DIR = os .path .join(APPLICATION_ROOT, "dangerous")
MALICIOUS_USER_AGENTS = os .path .join(
    THREAT_INTELLIGENCE_DIR,
    "user_agents.dangerous")
MALICIOUS_INTENTS = os .path .join(
    THREAT_INTELLIGENCE_DIR,
    "intentions.dangerous")


NUM_WORKERS = min(32, (os .cpu_count() or 1)*4)
BAN_BATCH_SIZE = 10
BAN_BATCH_TIMEOUT = 0.5
LOG_BATCH_SIZE = 50
LOG_BATCH_TIMEOUT = 1.0
CACHE_SIZE = 10000


TAIL_PROCESS_HANDLERS = []
MONITORING_THREADS = []
SHUTDOWN_SIGNAL = threading .Event()
monitored_files = set()


ban_queue = Queue(maxsize=1000)
log_queue = Queue(maxsize=5000)


ban_lock = threading .Lock()
log_write_lock = threading .Lock()
stats_lock = threading .Lock()


processing_stats = {
    'lines_processed': 0,
    'bans_executed': 0,
    'cache_hits': 0,
    'cache_misses': 0,
    'start_time': time .time()
}

debug_log("=== NPM ANALYZER v3.0 - AVVIATO ===", NPM_DEBUG_LOG)
debug_log(f"Worker threads configurati: {NUM_WORKERS}", NPM_DEBUG_LOG)
debug_log(
    f"Ban batch size: {BAN_BATCH_SIZE}, timeout: {BAN_BATCH_TIMEOUT}s",
    NPM_DEBUG_LOG)
debug_log(
    f"Log batch size: {LOG_BATCH_SIZE}, timeout: {LOG_BATCH_TIMEOUT}s",
    NPM_DEBUG_LOG)


config = load_config(CONFIG_FILE, NPM_DEBUG_LOG)

LOG_DIR = config["LOG_DIR"]
FALLBACK_LOG = os .path .join(LOG_DIR, "fallback_access.log")
DEFAULT_LOG = os .path .join(LOG_DIR, "default-host_access.log")
PROXY_PATTERN = os .path .join(LOG_DIR, "proxy-host-*_access.log")

ENABLE_WHITELIST_LOG = config["ENABLE_WHITELIST_LOG"]
CODES_TO_ALLOW = config["CODES_TO_ALLOW"]
TIME_FRAME = config["TIME_FRAME"]
MAX_REQUESTS = config["MAX_REQUESTS"]
JAIL_NAME = config["JAIL_NAME"]


STATUS_MEANING_MAP = load_pattern_file(STATUS_MEANING_PATH, NPM_DEBUG_LOG)
NGINX_ERROR_MAP = load_pattern_file(NGINX_ERROR_PATTERN_PATH, NPM_DEBUG_LOG)
USER_AGENT_MAP = load_pattern_file(USER_AGENT_PATTERN_PATH, NPM_DEBUG_LOG)
URL_PATTERN_MAP = load_pattern_file(URL_PATTERN_PATH, NPM_DEBUG_LOG)


whitelist_manager = WhitelistManager(WHITELIST_DB_PATH, NPM_DEBUG_LOG)


ip_manager = IPDataManager(TIME_FRAME, MAX_REQUESTS, NPM_DEBUG_LOG)


user_agents_blacklist, intent_blacklist_set = load_blacklists_once(
    MALICIOUS_USER_AGENTS, MALICIOUS_INTENTS, NPM_DEBUG_LOG
)


DANGEROUS_INTENTS_KEYWORDS = {
    'shell', 'backdoor', 'webshell', 'c99', 'r57', 'b374k',
    'exploit', 'injection', 'xss', 'rce', 'lfi', 'rfi', 'sqli',
    'upload', 'web shell', 'file upload',
    'phpmyadmin', 'wordpress', 'wp-admin', 'wp-login',
    'admin panel', 'admin login', 'login panel',
    'cpanel', 'plesk', 'webmin',
    'sql dump', 'backup.sql', 'database dump', 'config.php',
    'configuration', '.env', 'credential', 'password',
    'cgi-bin', 'git', 'svn', '.git', 'composer.json',
    'phpinfo', 'test.php', 'info.php'
}


FALLBACK_REGEX = re .compile(
    r'^(\d+\.\d+\.\d+\.\d+) - - \[[^\]]+\] "(.*?)" (\d{3}) \d+ "-" "([^"]*)"$')
DEFAULT_REGEX = re .compile(
    r'^(\d+\.\d+\.\d+\.\d+) - - \[[^\]]+\] "(.*?)" (\d{3}) \d+ "-" "([^"]*)"$')
REQUEST_REGEX = re .compile(r'(\w+)\s+([^\s]+)\s+HTTP/[\d.]"?')
PROXY_CODE_REGEX = re .compile(r'\s(\d{3})\s')
PROXY_DOMAIN_REGEX = re .compile(r'\bhttps? (\S+)')
PROXY_IP_REGEX = re .compile(r'\[Client\s([\d.:a-fA-F]+)\]')
PROXY_METHOD_URL_REGEX = re .compile(
    r'\] - \d{3} \d{3} - (\w+) https? [^ ]+ \"([^\"]+)\"')
PROXY_METHOD_URL_REGEX_ALT = re .compile(r'- (\w+) https? [^ ]+ \"([^\"]+)\"')
PROXY_UA_REGEX = re .compile(r'"([^"]+)"')

debug_log("Regex precompilate per parsing ottimizzato", NPM_DEBUG_LOG)


@lru_cache(maxsize=CACHE_SIZE)
def cached_intent_check(text_lower):
    """Cache per check intent pericolosi - evita controlli ripetuti"""
    result = any(
        keyword in text_lower for keyword in DANGEROUS_INTENTS_KEYWORDS)
    if result:
        update_stats('cache_hits')
    else:
        update_stats('cache_misses')
    return result


@lru_cache(maxsize=CACHE_SIZE)
def cached_pattern_match(text, pattern_type):
    from functions .pattern_matcher import descrizione_intento, descrizione_user_agent

    if pattern_type == 'url':
        return descrizione_intento(text, URL_PATTERN_MAP)
    elif pattern_type == 'ua':
        return descrizione_user_agent(text, USER_AGENT_MAP)
    return "Unknown"


def update_stats(stat_name, increment=1):
    with stats_lock:
        processing_stats[stat_name] = processing_stats .get(
            stat_name, 0)+increment


def get_stats_summary():
    with stats_lock:
        elapsed = time .time()-processing_stats['start_time']
        lines_per_sec = processing_stats['lines_processed'] / \
            elapsed if elapsed > 0 else 0
        cache_total = processing_stats['cache_hits'] + \
            processing_stats['cache_misses']
        cache_hit_rate = (
            processing_stats['cache_hits'] /
            cache_total *
            100)if cache_total > 0 else 0

        return {
            'uptime_seconds': elapsed,
            'lines_processed': processing_stats['lines_processed'],
            'lines_per_second': lines_per_sec,
            'bans_executed': processing_stats['bans_executed'],
            'cache_hit_rate': cache_hit_rate,
            'cache_hits': processing_stats['cache_hits'],
            'cache_misses': processing_stats['cache_misses']
        }


def batch_ban_processor():

    ban_batch = []
    last_batch_time = time .time()

    debug_log("Batch ban processor avviato", NPM_DEBUG_LOG)

    while not SHUTDOWN_SIGNAL .is_set():
        try:

            try:
                ban_data = ban_queue .get(timeout=0.1)
                ban_batch .append(ban_data)
            except Empty:
                pass

            current_time = time .time()
            should_process = (
                len(ban_batch) >= BAN_BATCH_SIZE or (
                    ban_batch and (
                        current_time -
                        last_batch_time) > BAN_BATCH_TIMEOUT))

            if should_process and ban_batch:

                with ban_lock:
                    for ban_data in ban_batch:
                        ip, jail, db_path, log, ua, domain, code, url = ban_data
                        try:
                            ban_and_reset(
                                ip_manager,
                                ip,
                                jail,
                                db_path,
                                log,
                                user_agent=ua,
                                domain=domain,
                                http_code=code,
                                url=url)
                            update_stats('bans_executed')
                        except Exception as e:
                            debug_log(
                                f"Errore ban IP {ip}: {e}", NPM_DEBUG_LOG)

                debug_log(
                    f"Batch ban eseguito: {
                        len(ban_batch)} IP processati",
                    NPM_DEBUG_LOG)
                ban_batch .clear()
                last_batch_time = current_time

        except Exception as e:
            debug_log(
                f"Errore critico nel batch ban processor: {e}",
                NPM_DEBUG_LOG)
            time .sleep(0.1)

    if ban_batch:
        debug_log(
            f"Flush finale ban batch: {
                len(ban_batch)} IP",
            NPM_DEBUG_LOG)
        with ban_lock:
            for ban_data in ban_batch:
                ip, jail, db_path, log, ua, domain, code, url = ban_data
                try:
                    ban_and_reset(
                        ip_manager,
                        ip,
                        jail,
                        db_path,
                        log,
                        user_agent=ua,
                        domain=domain,
                        http_code=code,
                        url=url)
                except Exception as e:
                    debug_log(f"Errore flush ban IP {ip}: {e}", NPM_DEBUG_LOG)

    debug_log("Batch ban processor terminato", NPM_DEBUG_LOG)


def batch_log_writer():

    log_batch = deque(maxlen=500)
    last_write_time = time .time()

    debug_log("Batch log writer avviato", NPM_DEBUG_LOG)

    while not SHUTDOWN_SIGNAL .is_set():
        try:
            try:
                log_entry = log_queue .get(timeout=0.1)
                log_batch .append(log_entry)
            except Empty:
                pass

            current_time = time .time()
            should_write = (
                len(log_batch) >= LOG_BATCH_SIZE or (
                    log_batch and (
                        current_time -
                        last_write_time) > LOG_BATCH_TIMEOUT))

            if should_write and log_batch:
                with log_write_lock:
                    try:
                        with open(SUSPICIOUS_IP_LOG, 'a', buffering=8192)as f:
                            for entry in log_batch:
                                f .write(entry + "\n")
                    except Exception as e:
                        debug_log(
                            f"Errore scrittura batch log: {e}",
                            NPM_DEBUG_LOG)

                log_batch .clear()
                last_write_time = current_time

        except Exception as e:
            debug_log(
                f"Errore critico nel batch log writer: {e}",
                NPM_DEBUG_LOG)
            time .sleep(0.1)

    if log_batch:
        debug_log(
            f"Flush finale log batch: {
                len(log_batch)} entries",
            NPM_DEBUG_LOG)
        with log_write_lock:
            try:
                with open(SUSPICIOUS_IP_LOG, 'a')as f:
                    for entry in log_batch:
                        f .write(entry + "\n")
            except Exception as e:
                debug_log(f"Errore flush log: {e}", NPM_DEBUG_LOG)

    debug_log("Batch log writer terminato", NPM_DEBUG_LOG)


def stats_reporter():
    debug_log("Stats reporter avviato", NPM_DEBUG_LOG)

    while not SHUTDOWN_SIGNAL .is_set():
        if SHUTDOWN_SIGNAL .wait(300):
            break

        stats = get_stats_summary()
        debug_log("=== STATISTICHE PERFORMANCE ===", NPM_DEBUG_LOG)
        debug_log(f"Uptime: {stats['uptime_seconds']:.1f}s", NPM_DEBUG_LOG)
        debug_log(
            f"Linee processate: {
                stats['lines_processed']}",
            NPM_DEBUG_LOG)
        debug_log(
            f"Throughput: {
                stats['lines_per_second']:.2f} linee/sec",
            NPM_DEBUG_LOG)
        debug_log(f"Ban eseguiti: {stats['bans_executed']}", NPM_DEBUG_LOG)
        debug_log(
            f"Cache hit rate: {
                stats['cache_hit_rate']:.1f}%",
            NPM_DEBUG_LOG)
        debug_log(
            f"Cache info: {
                cached_intent_check .cache_info()}",
            NPM_DEBUG_LOG)

    debug_log("Stats reporter terminato", NPM_DEBUG_LOG)


def process_and_check_ban_optimized(
        ip,
        code,
        domain,
        method,
        url,
        intent,
        user_agent_full,
        user_agent_desc):


    if whitelist_manager .is_whitelisted(ip):
        return

    meaning = get_status_meaning(code, STATUS_MEANING_MAP)

    intent_lower = intent .lower()if intent else ""
    url_lower = url .lower()if url else ""

    is_dangerous_intent = cached_intent_check(
        intent_lower)if intent_lower else False
    is_dangerous_url = cached_intent_check(url_lower)if url_lower else False

    error_count, is_banned = ip_manager .update_ip_data(
        ip, code, CODES_TO_ALLOW)

    base_log = (
        f"IP: {ip}, Codice HTTP: {code} ({meaning}), Dominio: {domain}, "
        f"Metodo: {method}, URL: {url}, Intenzioni: {intent}, "
        f"User-Agent: \"{user_agent_full}\" ({user_agent_desc}), "
        f"Errori: {error_count}"
    )

    if is_banned:
        return

    if is_dangerous_intent or is_dangerous_url:
        debug_log(
            f"IP: {ip}, INTENT PERICOLOSO. BAN IMMEDIATO.",
            NPM_DEBUG_LOG)

        ban_queue .put((ip, JAIL_NAME, BLOCKLIST_DB_PATH, NPM_DEBUG_LOG,
                        user_agent_full, domain, code, url))
        log_queue .put(
            base_log +
            " [BAN IMMEDIATO - INTENT PERICOLOSO DA PATTERN]")
        return

    if is_dangerous(
            user_agent_full,
            intent,
            user_agents_blacklist,
            intent_blacklist_set):
        debug_log(f"IP: {ip}, BLACKLIST. BAN IMMEDIATO.", NPM_DEBUG_LOG)
        ban_queue .put((ip, JAIL_NAME, BLOCKLIST_DB_PATH, NPM_DEBUG_LOG,
                        user_agent_full, domain, code, url))
        log_queue .put(base_log + " [BAN IMMEDIATO - BLACKLIST]")
        return

    log_queue .put(base_log)

    if should_ban_ip(error_count, MAX_REQUESTS, is_banned):
        debug_log(f"IP: {ip}, Superato limite. BAN in corso...", NPM_DEBUG_LOG)
        ban_queue .put((ip, JAIL_NAME, BLOCKLIST_DB_PATH, NPM_DEBUG_LOG,
                        user_agent_full, domain, code, url))
        log_queue .put(base_log + " [BAN - LIMITE RICHIESTE SUPERATO]")


def parse_fallback_line_optimized(line):
    m = FALLBACK_REGEX .match (line)
    if not m:
        return None

    ip = m .group(1)
    request = m .group(2)
    http_code = int(m .group(3))
    user_agent = m .group(4)

    method = "-"
    url = "-"

    req_match = REQUEST_REGEX .match (request)
    if req_match:
        method = req_match .group(1)
        url = req_match .group(2)
    else:
        url = request

    domain = "FALLBACK_DOMAIN"

    if whitelist_manager .is_whitelisted(ip):
        if ENABLE_WHITELIST_LOG:
            timestamp = datetime .now().strftime('[%Y-%m-%d %H:%M:%S]')
            intent = cached_pattern_match(url, 'url')
            ua_desc = cached_pattern_match(user_agent, 'ua')
            entry = (
                f"{timestamp} - IP: {ip}, Codice HTTP: {http_code}, Dominio: {domain}, "
                f"Metodo: {method}, URL: {url}, Intenzioni: {intent}, "
                f'User-Agent: "{user_agent}" ({ua_desc})'
            )
            with open(LOG_FILE_WHITELISTED, 'a')as log_file:
                log_file .write(entry + "\n")
        return None

    intent = cached_pattern_match(url, 'url')
    ua_desc = cached_pattern_match(user_agent, 'ua')

    return (ip, http_code, domain, method, url, intent, user_agent, ua_desc)


def parse_default_line_optimized(line):
    m = DEFAULT_REGEX .match (line)
    if not m:
        return None

    ip = m .group(1)
    request = m .group(2)
    http_code = int(m .group(3))
    user_agent = m .group(4)

    method = "-"
    url = "-"

    req_match = REQUEST_REGEX .match (request)
    if req_match:
        method = req_match .group(1)
        url = req_match .group(2)
    else:
        url = request

    domain = "BYPASS_DOMAIN"

    if whitelist_manager .is_whitelisted(ip):
        if ENABLE_WHITELIST_LOG:
            timestamp = datetime .now().strftime('[%Y-%m-%d %H:%M:%S]')
            intent = cached_pattern_match(url, 'url')
            ua_desc = cached_pattern_match(user_agent, 'ua')
            entry = (
                f"{timestamp} - IP: {ip}, Codice HTTP: {http_code}, Dominio: {domain}, "
                f"Metodo: {method}, URL: {url}, Intenzioni: {intent}, "
                f'User-Agent: "{user_agent}" ({ua_desc})'
            )
            with open(LOG_FILE_WHITELISTED, 'a')as log_file:
                log_file .write(entry + "\n")
        return None

    intent = cached_pattern_match(url, 'url')
    ua_desc = cached_pattern_match(user_agent, 'ua')

    return (ip, http_code, domain, method, url, intent, user_agent, ua_desc)


def parse_proxy_line_optimized(line):
    code_match = PROXY_CODE_REGEX .search(line)
    domain_match = PROXY_DOMAIN_REGEX .search(line)
    ip_match = PROXY_IP_REGEX .search(line)
    method_url_match = PROXY_METHOD_URL_REGEX .search(line)
    if not method_url_match:
        method_url_match = PROXY_METHOD_URL_REGEX_ALT .search(line)

    user_agent_match = PROXY_UA_REGEX .findall(line)
    user_agent = user_agent_match[-2]if len(user_agent_match) >= 2 else None

    if not (ip_match and code_match):
        return None

    ip = ip_match .group(1)
    http_code = int(code_match .group(1))
    method = method_url_match .group(1)if method_url_match else None
    url = method_url_match .group(2)if method_url_match else None
    domain = domain_match .group(1)if domain_match else "NON RILEVATO"

    if whitelist_manager .is_whitelisted(ip):
        if ENABLE_WHITELIST_LOG:
            timestamp = datetime .now().strftime('[%Y-%m-%d %H:%M:%S]')
            intent = cached_pattern_match(url or '', 'url')
            ua_desc = cached_pattern_match(
                user_agent, 'ua')if user_agent else "N/A"
            entry = (
                f"{timestamp} - IP: {ip}, Codice HTTP: {http_code}, Dominio: {domain}, "
                f"Metodo: {method}, URL: {url}, Intenzioni: {intent}, "
                f'User-Agent: "{user_agent}" ({ua_desc})'
            )
            with open(LOG_FILE_WHITELISTED, 'a')as log_file:
                log_file .write(entry + "\n")
        return None

    intent = cached_pattern_match(url or '', 'url')
    ua_desc = cached_pattern_match(
        user_agent, 'ua')if user_agent else "Sconosciuto"

    return (
        ip,
        http_code,
        domain,
        method or "GET",
        url or "/",
        intent,
        user_agent or "Unknown",
        ua_desc)


def process_fallback():
    def callback(line):
        update_stats('lines_processed')
        result = parse_fallback_line_optimized(line)
        if result:
            process_and_check_ban_optimized(*result)

    tail_file(
        FALLBACK_LOG,
        callback,
        SHUTDOWN_SIGNAL,
        TAIL_PROCESS_HANDLERS,
        NPM_DEBUG_LOG)


def process_default():
    def callback(line):
        update_stats('lines_processed')
        result = parse_default_line_optimized(line)
        if result:
            process_and_check_ban_optimized(*result)

    tail_file(
        DEFAULT_LOG,
        callback,
        SHUTDOWN_SIGNAL,
        TAIL_PROCESS_HANDLERS,
        NPM_DEBUG_LOG)


def process_proxy():
    def callback(line):
        update_stats('lines_processed')
        result = parse_proxy_line_optimized(line)
        if result:
            process_and_check_ban_optimized(*result)

    threading .Thread(
        target=monitor_pattern,
        args=(
            PROXY_PATTERN,
            callback,
            SHUTDOWN_SIGNAL,
            monitored_files,
            MONITORING_THREADS,
            TAIL_PROCESS_HANDLERS,
            NPM_DEBUG_LOG
        ),
        daemon=True
    ).start()


def process_proxy_errors():
    from functions .log_parsers import parse_proxy_error_log

    ERROR_PATTERN = os .path .join(LOG_DIR, "proxy-host-*_error.log")

    def callback(line):
        parse_proxy_error_log(
            line, whitelist_manager, LOG_FILE_WHITELISTED_PROXY,
            None, ENABLE_WHITELIST_LOG, NGINX_ERROR_MAP
        )

    threading .Thread(
        target=monitor_pattern,
        args=(
            ERROR_PATTERN,
            callback,
            SHUTDOWN_SIGNAL,
            monitored_files,
            MONITORING_THREADS,
            TAIL_PROCESS_HANDLERS,
            NPM_DEBUG_LOG
        ),
        daemon=True
    ).start()


if __name__ == "__main__":

    signal .signal(
        signal .SIGINT,
        lambda s, f: handle_signal(
            s, f, SHUTDOWN_SIGNAL, TAIL_PROCESS_HANDLERS,
            MONITORING_THREADS, NPM_DEBUG_LOG
        )
    )
    signal .signal(
        signal .SIGTERM,
        lambda s, f: handle_signal(
            s, f, SHUTDOWN_SIGNAL, TAIL_PROCESS_HANDLERS,
            MONITORING_THREADS, NPM_DEBUG_LOG
        )
    )

    setup_db(BLOCKLIST_DB_PATH, NPM_DEBUG_LOG)

    whitelist_manager .update_whitelist()

    threading .Thread(
        target=whitelist_manager .whitelist_monitor,
        args=(1, SHUTDOWN_SIGNAL),
        daemon=True
    ).start()

    threading .Thread(
        target=whitelist_manager .domain_refresh,
        args=(5, SHUTDOWN_SIGNAL),
        daemon=True
    ).start()

    start_memory_cleanup_thread(
        ip_manager, SHUTDOWN_SIGNAL, MONITORING_THREADS, NPM_DEBUG_LOG
    )

    debug_log("Avvio batch processors ottimizzati...", NPM_DEBUG_LOG)

    ban_processor_thread = threading .Thread(
        target=batch_ban_processor,
        name="ban_batch_processor",
        daemon=True
    )
    ban_processor_thread .start()
    MONITORING_THREADS .append(ban_processor_thread)

    log_writer_thread = threading .Thread(
        target=batch_log_writer,
        name="log_batch_writer",
        daemon=True
    )
    log_writer_thread .start()
    MONITORING_THREADS .append(log_writer_thread)

    stats_thread = threading .Thread(
        target=stats_reporter,
        name="stats_reporter",
        daemon=True
    )
    stats_thread .start()
    MONITORING_THREADS .append(stats_thread)

    debug_log("Avvio monitoring log files...", NPM_DEBUG_LOG)
    threading .Thread(target=process_fallback, daemon=True).start()
    threading .Thread(target=process_default, daemon=True).start()
    process_proxy()
    process_proxy_errors()

    debug_log(
        "=== SISTEMA OPERATIVO ===",
        NPM_DEBUG_LOG)
    debug_log(f"- {NUM_WORKERS} worker threads disponibili", NPM_DEBUG_LOG)
    debug_log("- Batch processing attivo per ban e log", NPM_DEBUG_LOG)
    debug_log("- Cache LRU attiva per pattern matching", NPM_DEBUG_LOG)
    debug_log("- Regex precompilate per parsing veloce", NPM_DEBUG_LOG)
    debug_log("- Stats reporting ogni 5 minuti", NPM_DEBUG_LOG)

    SHUTDOWN_SIGNAL .wait()

    debug_log("=== SHUTDOWN IN CORSO ===", NPM_DEBUG_LOG)

    final_stats = get_stats_summary()
    debug_log("=== STATISTICHE FINALI ===", NPM_DEBUG_LOG)
    debug_log(
        f"Uptime totale: {
            final_stats['uptime_seconds']:.1f}s",
        NPM_DEBUG_LOG)
    debug_log(
        f"Linee processate: {
            final_stats['lines_processed']}",
        NPM_DEBUG_LOG)
    debug_log(
        f"Throughput medio: {
            final_stats['lines_per_second']:.2f} linee/sec",
        NPM_DEBUG_LOG)
    debug_log(
        f"Ban totali eseguiti: {
            final_stats['bans_executed']}",
        NPM_DEBUG_LOG)
    debug_log(
        f"Cache hit rate: {
            final_stats['cache_hit_rate']:.1f}%",
        NPM_DEBUG_LOG)

    debug_log("Stop event rilevato, uscita dal main thread", NPM_DEBUG_LOG)
    sys .exit(0)

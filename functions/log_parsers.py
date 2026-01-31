import re
from datetime import datetime
from .pattern_matcher import descrizione_errore_nginx


def parse_log_line(line):
    pattern = (
        r"IP: ([0-9.]+), "
        r"Codice HTTP: (\d+)[^,]*, "
        r"Dominio: ([^,]+), "
        r"Metodo: ([A-Z]+), "
        r"URL: ([^,]+), "
        r"Intenzioni: ([^,]+), "
        r'User-Agent: "(.*?)" \((.*?)\)'
    )

    match = re .search(pattern, line)
    if match:
        ip = match .group(1)
        code = int(match .group(2))
        domain = match .group(3)
        method = match .group(4)
        url = match .group(5)
        intent = match .group(6)
        user_agent_full = match .group(7)
        user_agent_desc = match .group(8)

        return ip, code, domain, method, url, intent, user_agent_full, user_agent_desc

    return None, None, None, None, None, None, None, None


def parse_fallback_log(line, write_log_func):
    m = re .match (
        r'\[[^\]]+\] (\d{3}) - (\w+) (https?) (\S+) "([^"]+)" \[Client ([^\]]+)\].*?"([^"]+)"',
        line)
    if not m:
        return

    http_code = m .group(1)
    method = m .group(2)
    protocol = m .group(3)
    domain = m .group(4)
    url = m .group(5)
    ip = m .group(6)
    user_agent = m .group(7)

    write_log_func(
        ip,
        http_code,
        domain,
        method=method,
        url=url,
        user_agent=user_agent)


def parse_default_log(line, write_log_func):
    m = re .match (
        r'^(\d+\.\d+\.\d+\.\d+) - - \[[^\]]+\] "(.*?)" (\d{3}) \d+ "-" "([^"]*)"$',
        line)
    if not m:
        return

    ip = m .group(1)
    request = m .group(2)
    http_code = m .group(3)
    user_agent = m .group(4)

    method = "-"
    url = "-"

    req_match = re .match (r'(\w+)\s+([^\s]+)\s+HTTP/[\d.]"?', request)
    if req_match:
        method = req_match .group(1)
        url = req_match .group(2)
    else:
        url = request

    domain = "BYPASS_DOMAIN"

    write_log_func(
        ip,
        http_code,
        domain,
        method=method,
        url=url,
        user_agent=user_agent)


def parse_proxy_log(line, write_log_func):
    code_match = re .search(r'\s(\d{3})\s', line)
    domain_match = re .search(r'\bhttps? (\S+)', line)
    ip_match = re .search(r'\[Client\s([\d.:a-fA-F]+)\]', line)
    method_url_match = re .search(
        r'\] - \d{3} \d{3} - (\w+) https? [^ ]+ \"([^\"]+)\"', line)
    if not method_url_match:
        method_url_match = re .search(
            r'- (\w+) https? [^ ]+ \"([^\"]+)\"', line)

    user_agent_match = re .findall(r'"([^"]+)"', line)
    user_agent = user_agent_match[-2]if len(user_agent_match) >= 2 else None

    if ip_match and code_match:
        method = method_url_match .group(1)if method_url_match else None
        url = method_url_match .group(2)if method_url_match else None
        domain = domain_match .group(1)if domain_match else "NON RILEVATO"

        write_log_func(
            ip_match .group(1),
            code_match .group(1),
            domain,
            method=method,
            url=url,
            user_agent=user_agent,
        )


def parse_proxy_error_log(
        line,
        whitelist_manager,
        log_file_whitelisted_proxy,
        log_file_normal_proxy,
        enable_whitelist_log,
        nginx_error_map):
    level_match = re .search(r'\[(error|warn|notice|info|debug)\]', line)
    livello = f"[{level_match .group(1)}]"if level_match else "[unknown]"

    ip_match = re .search(r'client: ([\d.:a-fA-F]+)', line)
    server_match = re .search(r'server: ([^\s,]+)', line)
    request_match = re .search(r'request: "(.*?)"', line)
    upstream_match = re .search(r'upstream: "(.*?)"', line)

    ip = ip_match .group(1)if ip_match else "NON RILEVATO"
    domain = server_match .group(1)if server_match else "NON RILEVATO"
    descr = descrizione_errore_nginx(line, nginx_error_map)
    url = request_match .group(1)if request_match else "-"
    upstream = upstream_match .group(1)if upstream_match else "-"

    timestamp = datetime .now().strftime('[%Y-%m-%d %H:%M:%S]')
    entry = (
        f"{timestamp} - IP: {ip}, Livello log: {livello}, Dominio: {domain}, "
        f"URL: {url}, Upstream: {upstream}, Descrizione: {descr}"
    )

    if whitelist_manager .is_whitelisted(ip):
        if enable_whitelist_log and log_file_whitelisted_proxy:
            with open(log_file_whitelisted_proxy, 'a')as log_file:
                log_file .write(entry + "\n")
    else:

        if log_file_normal_proxy:
            with open(log_file_normal_proxy, 'a')as log_file:
                log_file .write(entry + "\n")

import random
import time
from datetime import datetime, timedelta
import os

LOG_FILE = "/app/nginx-logs/proxy-host-16_access.log"
DELAY_BETWEEN_LOGS = 0.05


USER_AGENTS = [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15 (Applebot/0.1; +http://www.apple.com/go/applebot)",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36",
    "python-requests/2.25.1",
    "curl/7.68.0",
    "Wget/1.20.3 (linux-gnu)",
    "Scrapy/2.5.0",
    "masscan/1.0",
    "nikto/2.1.6",
    "sqlmap/1.5",
    "Nuclei - Open-source project (github.com/projectdiscovery/nuclei)",
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/W.X.Y.Z Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
]


def generate_random_ip():
    ip_pools = [
        lambda: f"{
            random .randint(
                1,
                223)}.{
            random .randint(
                0,
                255)}.{
            random .randint(
                0,
                255)}.{
            random .randint(
                1,
                254)}",
        lambda: f"124.156.{
            random .randint(
                0,
                255)}.{
            random .randint(
                1,
                254)}",
        lambda: f"117.62.{
            random .randint(
                0,
                255)}.{
            random .randint(
                1,
                254)}",
        lambda: f"17.241.{
            random .randint(
                0,
                255)}.{
            random .randint(
                1,
                254)}",
    ]
    return random.choice(ip_pools)()


PATHS = [
    "/",
    "/robots.txt",
    "/admin",
    "/wp-admin",
    "/wp-login.php",
    "/phpMyAdmin",
    "/phpmyadmin",
    "/.env",
    "/.git/config",
    "/api/v1/users",
    "/login",
    "/admin/login",
    "/.well-known/security.txt",
    "/sitemap.xml",
    "/index.php",
    "/wp-content/plugins/",
    "/cgi-bin/test.cgi",
    "/shell.php",
    "/config.php",
    "/backup.sql",
]


HTTP_CODES = [
    (200, 40),
    (301, 20),
    (302, 5),
    (304, 5),
    (400, 5),
    (401, 5),
    (403, 10),
    (404, 15),
    (500, 3),
    (502, 2),
    (503, 2),
]


def weighted_choice(choices):
    total = sum(weight for _, weight in choices)
    r = random.uniform(0, total)
    upto = 0
    for choice, weight in choices:
        if upto + weight >= r:
            return choice
        upto += weight
    return choices[0][0]


METHODS = ["GET", "POST", "HEAD", "PUT", "DELETE", "OPTIONS"]


PROTOCOLS = ["http", "https"]


DOMAINS = ["test.com"]


def generate_log_line():

    now = datetime.now()
    timestamp = now.strftime("%d/%b/%Y:%H:%M:%S +0000")

    http_code = weighted_choice(HTTP_CODES)

    method = random.choices(METHODS, weights=[70, 15, 5, 3, 3, 4])[0]

    protocol = random.choice(PROTOCOLS)

    domain = random.choice(DOMAINS)

    path = random.choice(PATHS)

    client_ip = generate_random_ip()

    if http_code == 301 or http_code == 302:
        length = random.randint(150, 200)
    elif http_code == 403:
        length = random.randint(1800, 2000)
    elif http_code == 404:
        length = random.randint(500, 800)
    elif http_code == 200:
        length = random.randint(1000, 50000)
    else:
        length = random.randint(100, 1000)

    if random.random() < 0.3:
        gzip = f"{random .uniform(1.5, 3.5):.2f}"
    else:
        gzip = "-"

    backend_ip = f"10.8.10.{random .randint(100, 120)}"

    user_agent = random.choice(USER_AGENTS)

    referrer = '"-"'

    log_line = (
        f'[{timestamp}] - - {http_code} - {method} {protocol} {domain} "{path}" '
        f"[Client {client_ip}] [Length {length}] [Gzip {gzip}] [Sent-to {backend_ip}] "
        f'"{user_agent}" {referrer}'
    )

    return log_line


def main():
    print(f"Generazione log in: {LOG_FILE}")
    print(f"Delay tra i log: {DELAY_BETWEEN_LOGS} secondi")
    print("Premi Ctrl+C per fermare\n")

    os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)

    try:
        with open(LOG_FILE, "a") as f:
            counter = 0
            while True:
                log_line = generate_log_line()
                f.write(log_line + "\n")
                f.flush()

                counter += 1
                print(f"[{counter}] {log_line}")

                time.sleep(DELAY_BETWEEN_LOGS)

    except KeyboardInterrupt:
        print(f"\n\nGenerati {counter} log. Terminato.")
    except PermissionError:
        print(f"\nERRORE: Permesso negato per scrivere in {LOG_FILE}")
        print("Prova a eseguire con sudo o controlla i permessi della directory")
    except Exception as e:
        print(f"\nERRORE: {e}")


if __name__ == "__main__":
    main()

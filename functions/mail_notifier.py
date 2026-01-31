import json
import os
import smtplib
from email .message import EmailMessage
from datetime import datetime
from .log_writer import log_event


def load_mail_config(base_dir=None, debug_log_path=None):
    base_dir = base_dir or os .path .dirname(os .path .abspath(__file__))
    config_path = os .path .join(base_dir, "..", "data", "conf", "mail.conf")

    if not os .path .exists(config_path):
        if debug_log_path:
            log_event(
                f"File di configurazione mail non trovato: {config_path}",
                debug_log_path)
        return None

    try:
        with open(config_path, "r")as f:
            return json .load(f)
    except Exception as e:
        if debug_log_path:
            log_event(
                f"Errore caricamento configurazione mail: {e}",
                debug_log_path)
        return None


def send_mail(
        ip,
        jail_name,
        banhammer_main_file,
        user_agent=None,
        domain=None,
        http_code=None,
        url=None):
    config = load_mail_config()

    if not config or not config .get("enabled", False):
        return

    date_str = datetime .now().strftime("%Y-%m-%d %H:%M:%S")

    html_content = f"""
    <html>
    <head>
      <style>
        body {{
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f9f9fb;
          color: #333;
          margin: 0; padding: 20px;
        }}
        .container {{
          max-width: 600px;
          margin: auto;
          background-color: #fff;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          padding: 30px;
          border: 1px solid #e0e0e0;
        }}
        h2 {{
          color: #d32f2f;
          margin-bottom: 20px;
          font-weight: 700;
          font-size: 24px;
        }}
        table {{
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }}
        th, td {{
          text-align: left;
          padding: 12px 15px;
          border-bottom: 1px solid #e0e0e0;
        }}
        th {{
          background-color: #f5f5f5;
          font-weight: 600;
          color: #555;
        }}
        p {{
          font-size: 16px;
          line-height: 1.5;
          margin-top: 0;
          margin-bottom: 15px;
        }}
        .footer {{
          font-size: 12px;
          color: #999;
          text-align: center;
          border-top: 1px solid #eee;
          padding-top: 10px;
          margin-top: 20px;
        }}
        a.button {{
          display: inline-block;
          padding: 10px 20px;
          background-color: #d32f2f;
          color: #fff !important;
          border-radius: 4px;
          text-decoration: none;
          font-weight: 600;
          margin-top: 10px;
          transition: background-color 0.3s ease;
        }}
        a.button:hover {{
          background-color: #b71c1c;
        }}
      </style>
    </head>
    <body>
      <div class="container">
        <h2>⚠️ IP Bannato dal Sistema di Sicurezza</h2>
        <p>È stato bannato il seguente indirizzo IP per comportamento sospetto o violazioni:</p>
        <table>
          <tr><th>Campo</th><th>Dettaglio</th></tr>
          <tr><td>IP</td><td>{ip}</td></tr>
          <tr><td>Jail</td><td>{jail_name}</td></tr>
          <tr><td>Dominio</td><td>{domain or 'N/D'}</td></tr>
          <tr><td>User-Agent</td><td>{user_agent or 'N/D'}</td></tr>
          <tr><td>URL</td><td>{url or 'N/D'}</td></tr>
          <tr><td>Codice HTTP</td><td>{http_code or 'N/D'}</td></tr>
          <tr><td>Data</td><td>{date_str}</td></tr>
        </table>
        <p>Ti consigliamo di verificare il traffico associato a questo IP e di prendere le azioni necessarie.</p>

        <a href="https://www.google.com/search?q={ip}" class="button" target="_blank" rel="noopener noreferrer">Cerca IP su Google</a>
        <a href="https://ipinfo.io/{ip}" class="button" target="_blank" rel="noopener noreferrer" style="background-color:#1976d2; margin-left:10px;">ipinfo.io</a>
        <a href="https://www.abuseipdb.com/check/{ip}" class="button" target="_blank" rel="noopener noreferrer" style="background-color:#f44336; margin-left:10px;">AbuseIPDB</a>

        <div class="footer">
          <p>Mail generata automaticamente dal sistema di sicurezza Fail2Ban.</p>
        </div>
      </div>
    </body>
    </html>
    """

    msg = EmailMessage()
    msg .set_content(
        f"IP bannato: {ip}\nJail: {jail_name}\nDominio: {
            domain or 'N/D'}\nUser Agent: {
            user_agent or 'N/D'}\nCodice HTTP: {
            http_code or 'N/D'}\nURL: {
            url or 'N/D'}\nData: {date_str}")
    msg .add_alternative(html_content, subtype='html')

    msg["Subject"] = config .get("subject", "IP bannato")
    msg["From"] = config .get("from")
    msg["To"] = ", ".join(config .get("to", []))

    try:
        with smtplib .SMTP(config["smtp_server"], config["smtp_port"])as server:
            if config .get("use_tls", False):
                server .starttls()
            server .login(config["username"], config["password"])
            server .send_message(msg)
            log_event(
                f"Email inviata per IP bannato {ip}",
                banhammer_main_file)
    except Exception as e:
        log_event(f"Errore invio email per IP {ip}: {e}", banhammer_main_file)

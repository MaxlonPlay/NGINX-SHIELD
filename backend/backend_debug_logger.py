

import os
from datetime import datetime
from typing import Any, Dict, Optional


class DebugLogger:

    def __init__(self):
        self .log_file = self .get_log_file()

    @staticmethod
    def get_log_file():
        base_dir = os .path .dirname(os .path .abspath(__file__))
        log_dir = os .path .join(os .path .dirname(base_dir), 'data', 'log')
        os .makedirs(log_dir, exist_ok=True)
        return os .path .join(log_dir, 'backend_debug.log')

    def write(self, message: str):
        try:
            with open(self .log_file, 'a', encoding='utf-8')as f:
                f .write(message + '\n')
        except Exception as e:
            print(f"Errore scrittura debug log: {e}")

    def debug(self, category: str, message: str,
              details: Optional[Dict[str, Any]] = None):
        timestamp = datetime .now().strftime('%Y-%m-%d %H:%M:%S')
        log_line = f"[{timestamp}] [DEBUG] [{category}] {message}"

        if details:
            details_str = " | ".join([f"{k}={v}"for k, v in details .items()])
            log_line += f" | {details_str}"

        self .write(log_line)

    def token(self, message: str, details: Optional[Dict[str, Any]] = None):
        self .debug("TOKEN", message, details)

    def auth(self, message: str, details: Optional[Dict[str, Any]] = None):
        self .debug("AUTH", message, details)

    def api(self, message: str, details: Optional[Dict[str, Any]] = None):
        self .debug("API", message, details)

    def database(self, message: str, details: Optional[Dict[str, Any]] = None):
        self .debug("DATABASE", message, details)

    def security(self, message: str, details: Optional[Dict[str, Any]] = None):
        self .debug("SECURITY", message, details)

    def error(self, category: str, message: str, error: Exception = None):
        timestamp = datetime .now().strftime('%Y-%m-%d %H:%M:%S')
        error_msg = str(error)if error else ""
        log_line = f"[{timestamp}] [ERROR] [{category}] {message}"

        if error_msg:
            log_line += f" | {error_msg}"

        self .write(log_line)

    def whitelist(self, message: str,
                  details: Optional[Dict[str, Any]] = None):
        self .debug("WHITELIST", message, details)

    def ban(self, message: str, details: Optional[Dict[str, Any]] = None):
        self .debug("BAN", message, details)

    def pattern(self, message: str, details: Optional[Dict[str, Any]] = None):
        self .debug("PATTERN", message, details)

    def totp(self, message: str, details: Optional[Dict[str, Any]] = None):
        self .debug("TOTP", message, details)


debug_logger = DebugLogger()

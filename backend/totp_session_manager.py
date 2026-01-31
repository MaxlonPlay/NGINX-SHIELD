

import time
import threading
from typing import Dict, Optional, Any
from datetime import datetime, timedelta


class TOTPSessionManager:

    SETUP_TIMEOUT_SECONDS = 15 * 60

    def __init__(self):
        self .sessions: Dict[str, Dict[str, Any]] = {}
        self .lock = threading .Lock()
        self ._start_cleanup_thread()

    def _start_cleanup_thread(self):
        def cleanup():
            while True:
                time .sleep(60)
                self ._cleanup_expired_sessions()

        thread = threading .Thread(target=cleanup, daemon=True)
        thread .start()

    def _cleanup_expired_sessions(self):
        with self .lock:
            now = time .time()
            expired_users = [
                username for username, session in self .sessions .items()
                if now - session["timestamp"] > self .SETUP_TIMEOUT_SECONDS
            ]

            for username in expired_users:
                print(
                    f"[TOTP_SESSION] Setup scaduto per {username}, rimosso dalla memoria")
                del self .sessions[username]

    def create_setup_session(
            self,
            username: str,
            secret: str,
            qr_code: str) -> None:
        with self .lock:
            self .sessions[username] = {
                "secret": secret,
                "qr_code": qr_code,
                "timestamp": time .time()
            }
            print(
                f"[TOTP_SESSION] Setup session creata per {username}, scade tra {
                    self .SETUP_TIMEOUT_SECONDS}s")

    def get_setup_session(self, username: str) -> Optional[Dict[str, str]]:
        with self .lock:
            if username not in self .sessions:
                print(
                    f"[TOTP_SESSION] Setup session non trovata per {username}")
                return None

            session = self .sessions[username]
            now = time .time()

            if now - session["timestamp"] > self .SETUP_TIMEOUT_SECONDS:
                print(f"[TOTP_SESSION] Setup session scaduta per {username}")
                del self .sessions[username]
                return None

            print(
                f"[TOTP_SESSION] Setup session trovata per {username}, valida per altri {
                    self .SETUP_TIMEOUT_SECONDS - (
                        now - session['timestamp']):.0f}s")
            return session

    def confirm_setup_session(self, username: str) -> bool:
        with self .lock:
            if username in self .sessions:
                del self .sessions[username]
                print(
                    f"[TOTP_SESSION] Setup session confermata e rimossa per {username}")
                return True
            else:
                print(
                    f"[TOTP_SESSION] Setup session non trovata per {username} (forse già confermata o scaduta)")
                return False

    def cancel_setup_session(self, username: str) -> bool:
        with self .lock:
            if username in self .sessions:
                del self .sessions[username]
                print(
                    f"[TOTP_SESSION] Setup session cancellata per {username}")
                return True
            return False


totp_session_manager = TOTPSessionManager()

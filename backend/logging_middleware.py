import json
import time
from datetime import datetime
from typing import Callable, Any
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import os
import jwt


class CompleteLosggingMiddleware(BaseHTTPMiddleware):

    def __init__(self, app):
        super().__init__(app)
        self.log_file = self.get_log_file()

    @staticmethod
    def get_log_file():

        base_dir = os.path.dirname(os.path.abspath(__file__))
        log_dir = os.path.join(os.path.dirname(base_dir), "data", "log")
        os.makedirs(log_dir, exist_ok=True)
        return os.path.join(log_dir, "backend_api.log")

    def write_log(self, message: str):
        try:
            with open(self.log_file, "a", encoding="utf-8") as f:
                f.write(message + "\n")
        except Exception as e:
            print(f"Errore scrittura log: {e}")

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()

        await self.log_request_basic(request)

        try:
            response = await call_next(request)
            status_code = response.status_code
        except Exception as e:
            error_msg = f"[{datetime .now().strftime('%Y-%m-%d %H:%M:%S')}] [BACKEND] [API] ERRORE durante elaborazione: {type(e).__name__}: {str(e)}"
            self.write_log(error_msg)
            print(f"MIDDLEWARE ERROR: {error_msg}")
            raise

        duration = time.time() - start_time
        await self.log_response(request, response, duration, status_code)

        return response

    async def log_request_basic(self, request: Request):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        method = request.method
        path = request.url.path
        client_ip = request.client.host if request.client else "unknown"

        query_params = dict(request.query_params) if request.query_params else {}

        auth_header = request.headers.get("authorization", "none")
        content_type = request.headers.get("content-type", "none")

        username = "anonymous"
        token = None

        if auth_header != "none" and auth_header.startswith("Bearer "):
            token = auth_header.replace("Bearer ", "").strip()

        if not token:
            for cookie_name in ["access_token", "token"]:
                if cookie_name in request.cookies:
                    token = request.cookies[cookie_name]
                    break

        if token:
            try:
                decoded = jwt.decode(token, options={"verify_signature": False})
                username = decoded.get("sub", "unknown")
            except Exception as e:
                username = "unknown"

        log_parts = [f"RICHIESTA: {method} {path}", f"CLIENT: {client_ip}"]

        if username != "anonymous":
            log_parts.append(f"USER: {username}")

        if query_params:
            log_parts.append(f"QUERY: {json .dumps(query_params)}")

        if auth_header != "none":
            log_parts.append(f"AUTH: {auth_header[:20]}...")

        if content_type != "none":
            log_parts.append(f"TYPE: {content_type}")

        log_line = " | ".join(log_parts)
        self.write_log(f"[{timestamp}] [BACKEND] [API] {log_line}")

    async def log_response(
        self, request: Request, response: Response, duration: float, status_code: int
    ):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        method = request.method
        path = request.url.path

        username = None
        token = None

        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.replace("Bearer ", "").strip()

        if not token:
            for cookie_name in ["access_token", "token"]:
                if cookie_name in request.cookies:
                    token = request.cookies[cookie_name]
                    break

        if token:
            try:
                decoded = jwt.decode(token, options={"verify_signature": False})
                username = decoded.get("sub")
            except BaseException:
                pass

        if 200 <= status_code < 300:
            status_label = "SUCCESS"
        elif 300 <= status_code < 400:
            status_label = "REDIRECT"
        elif 400 <= status_code < 500:
            status_label = "CLIENT_ERROR"
        else:
            status_label = "SERVER_ERROR"

        log_parts = [
            f"[{timestamp}] [BACKEND] [API] RISPOSTA: {method} {path}",
            f"STATUS: {status_code} {status_label}",
        ]

        if username:
            log_parts.append(f"USER: {username}")

        log_parts.append(f"TEMPO: {duration:.3f}s")

        log_line = " | ".join(log_parts)
        self.write_log(log_line)

    @staticmethod
    def sanitize_sensitive_data(data: Any, depth: int = 0) -> Any:
        sensitive_keys = [
            "password",
            "pwd",
            "passwd",
            "token",
            "access_token",
            "refresh_token",
            "secret",
            "api_key",
            "apikey",
            "authorization",
            "credentials",
            "totp_secret",
            "backup_codes",
            "email",
        ]

        if isinstance(data, dict):
            sanitized = {}
            for key, value in data.items():
                if key.lower() in sensitive_keys:
                    sanitized[key] = "[REDACTED]"
                else:
                    sanitized[key] = CompleteLosggingMiddleware.sanitize_sensitive_data(
                        value, depth + 1
                    )
            return sanitized
        elif isinstance(data, list):
            return [
                CompleteLosggingMiddleware.sanitize_sensitive_data(item, depth + 1)
                for item in data
            ]
        else:
            return data

from datetime import datetime
from fastapi import HTTPException
from fastapi.responses import JSONResponse
from typing import Any, Dict, Callable
from functools import wraps
import inspect
import bcrypt
import secrets
import re


class SecurityUtils:
    @staticmethod
    def hash_password(password: str) -> str:
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
        return hashed.decode("utf-8")

    @staticmethod
    def verify_password(password: str, hashed: str) -> bool:
        try:
            return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
        except ValueError:
            return False

    @staticmethod
    def is_strong_password(password: str) -> bool:
        """
        Verifica se una password rispetta i requisiti di sicurezza.
        Requisiti:
        - Almeno 8 caratteri
        - Almeno una maiuscola
        - Almeno una minuscola
        - Almeno un numero
        - Almeno un carattere speciale
        """
        if len(password) < 8:
            return False
        if not re.search(r"[A-Z]", password):
            return False
        if not re.search(r"[a-z]", password):
            return False
        if not re.search(r"[0-9]", password):
            return False
        if not re.search(r"[^A-Za-z0-9]", password):
            return False
        return True

    @staticmethod
    def generate_secure_token(length: int = 16) -> str:
        """Genera un token sicuro casuale"""
        return secrets.token_urlsafe(length)

    @staticmethod
    def generate_jwt_secret() -> str:
        return secrets.token_urlsafe(64)

    @staticmethod
    def encrypt_data(data: str) -> str:
        from cryptography.fernet import Fernet
        import base64
        import hashlib

        salt = b"nginx-shield-totp-secret-salt"
        key = base64.urlsafe_b64encode(hashlib.sha256(salt).digest())
        cipher = Fernet(key)
        encrypted = cipher.encrypt(data.encode())
        return encrypted.decode()

    @staticmethod
    def decrypt_data(encrypted_data: str) -> str:
        from cryptography.fernet import Fernet
        import base64
        import hashlib

        try:
            salt = b"nginx-shield-totp-secret-salt"
            key = base64.urlsafe_b64encode(hashlib.sha256(salt).digest())
            cipher = Fernet(key)
            decrypted = cipher.decrypt(encrypted_data.encode())
            return decrypted.decode()
        except Exception as e:
            print(f"Errore decrittografia: {e}")
            return encrypted_data


class ValidationUtils:
    @staticmethod
    def validate_username(username: str) -> Dict[str, Any]:
        if not username or len(username.strip()) == 0:
            return {"valid": False, "message": "Username non può essere vuoto"}

        if len(username) < 3:
            return {
                "valid": False,
                "message": "Username deve essere almeno 3 caratteri",
            }

        if len(username) > 50:
            return {"valid": False, "message": "Username non può superare 50 caratteri"}

        if not re.match(r"^[a-zA-Z0-9_-]+$", username):
            return {
                "valid": False,
                "message": "Username può contenere solo lettere, numeri, underscore e trattini",
            }

        return {"valid": True, "message": "Username valido"}

    @staticmethod
    def validate_password_requirements(password: str) -> Dict[str, Any]:
        errors = []

        if len(password) < 8:
            errors.append("Almeno 8 caratteri")
        if not re.search(r"[A-Z]", password):
            errors.append("Almeno una lettera maiuscola")
        if not re.search(r"[a-z]", password):
            errors.append("Almeno una lettera minuscola")
        if not re.search(r"[0-9]", password):
            errors.append("Almeno un numero")
        if not re.search(r"[^A-Za-z0-9]", password):
            errors.append("Almeno un carattere speciale")

        if errors:
            return {
                "valid": False,
                "message": f"Password non valida. Requisiti mancanti: {', '.join(errors)}",
            }

        return {"valid": True, "message": "Password valida"}


class LogManager:
    @staticmethod
    def log_operation(
        operation: str, username: str = None, details: str = None
    ) -> None:
        timestamp = datetime.now()
        user_info = f" da utente '{username}'" if username else ""
        detail_info = f" - {details}" if details else ""
        print(f"[{timestamp}] {operation}{user_info}{detail_info}")

    @staticmethod
    def log_error(operation: str, error: Exception, username: str = None) -> None:
        timestamp = datetime.now()
        user_info = f" da utente '{username}'" if username else ""
        print(f"[{timestamp}] Errore durante {operation}{user_info}: {error}")

    @staticmethod
    def log_auth_event(
        event_type: str, username: str = None, success: bool = True, details: str = None
    ) -> None:
        timestamp = datetime.now()
        status = "riuscito" if success else "fallito"
        user_info = f" per utente '{username}'" if username else ""
        detail_info = f" - {details}" if details else ""
        print(f"[{timestamp}] {event_type} {status}{user_info}{detail_info}")

    @staticmethod
    def log_security_event(
        event_type: str, details: str = None, severity: str = "INFO"
    ) -> None:
        timestamp = datetime.now()
        detail_info = f" - {details}" if details else ""
        print(f"[{timestamp}] SECURITY [{severity}] {event_type}{detail_info}")


class ResponseManager:
    @staticmethod
    def create_success_response(
        data: Any = None,
        message: str = "Operazione completata con successo",
        extra_fields: Dict[str, Any] = None,
    ) -> Dict[str, Any]:
        response = {
            "success": True,
            "message": message,
            "timestamp": datetime.now().isoformat(),
        }

        if data is not None:
            response["data"] = data

        if extra_fields:
            response.update(extra_fields)

        return response

    @staticmethod
    def create_error_response(
        message: str = "Operazione fallita",
        error_code: str = None,
        extra_fields: Dict[str, Any] = None,
    ) -> Dict[str, Any]:
        response = {
            "success": False,
            "message": message,
            "timestamp": datetime.now().isoformat(),
        }

        if error_code:
            response["error_code"] = error_code

        if extra_fields:
            response.update(extra_fields)

        return response

    @staticmethod
    def create_auth_error_response(
        message: str = "Accesso non autorizzato",
    ) -> HTTPException:
        return HTTPException(
            status_code=401, detail=message, headers={"WWW-Authenticate": "Bearer"}
        )

    @staticmethod
    def create_validation_error_response(message: str) -> HTTPException:
        return HTTPException(status_code=400, detail=message)


class DatabaseUtils:
    @staticmethod
    def safe_database_operation(
        operation_name: str, operation_func: Callable, *args, **kwargs
    ) -> Any:
        try:
            return operation_func(*args, **kwargs)
        except Exception as e:
            LogManager.log_error(f"Operazione database: {operation_name}", e)
            raise HTTPException(
                status_code=500,
                detail=f"Errore interno del server durante {operation_name.lower()}",
            )


def handle_endpoint_exceptions(operation_name: str):
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            try:

                username = None
                for arg in kwargs.values():
                    if isinstance(arg, dict) and "username" in arg:
                        username = arg["username"]
                        break

                result = await func(*args, **kwargs)
                LogManager.log_operation(f"{operation_name} completato", username)
                return result

            except HTTPException:
                raise
            except Exception as e:
                LogManager.log_error(operation_name, e, username)
                raise HTTPException(
                    status_code=500,
                    detail=f"Errore interno del server durante {operation_name .lower()}",
                )

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            try:

                username = None
                for arg in kwargs.values():
                    if isinstance(arg, dict) and "username" in arg:
                        username = arg["username"]
                        break

                result = func(*args, **kwargs)
                LogManager.log_operation(f"{operation_name} completato", username)
                return result

            except HTTPException:
                raise
            except Exception as e:
                LogManager.log_error(operation_name, e, username)
                raise HTTPException(
                    status_code=500,
                    detail=f"Errore interno del server durante {operation_name.lower()}",
                )

        if inspect.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper

    return decorator


log_manager = LogManager()
response_manager = ResponseManager()
security_utils = SecurityUtils()
validation_utils = ValidationUtils()
database_utils = DatabaseUtils()

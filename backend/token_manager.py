

from fastapi import HTTPException, Request, Response, Depends, status
from fastapi .security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from .utils import security_utils, log_manager
from .backend_debug_logger import debug_logger
import os


SECRET_KEY = security_utils .generate_jwt_secret()
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30


security = HTTPBearer(auto_error=False)


def get_secure_cookies_config() -> tuple:
    try:
        from .secure_config_manager import secure_config_manager
        secure_cookies = secure_config_manager .get_secure_cookies_enabled()
        samesite_policy = "none"if secure_cookies else "lax"
        return secure_cookies, samesite_policy
    except Exception:

        secure_cookies = os .getenv("SECURE_COOKIES", "true").lower() == "true"
        samesite_policy = "none"if secure_cookies else "lax"
        return secure_cookies, samesite_policy


class TokenManager:

    def __init__(self):
        self .secret_key = SECRET_KEY
        self .algorithm = ALGORITHM
        self .access_token_expire_minutes = ACCESS_TOKEN_EXPIRE_MINUTES

    def create_access_token(
            self,
            data: dict,
            expires_delta: Optional[timedelta] = None) -> str:
        to_encode = data .copy()
        expire = datetime .utcnow(
        )+(expires_delta or timedelta(minutes=self .access_token_expire_minutes))
        to_encode .update({"exp": expire})
        return jwt .encode(
            to_encode,
            self .secret_key,
            algorithm=self .algorithm)

    def create_access_token_for_user(self, username: str) -> Dict[str, Any]:
        try:
            access_token = self .create_access_token(data={"sub": username})
            return {
                "success": True,
                "access_token": access_token,
                "token_type": "bearer",
                "message": "Token creato con successo"
            }
        except Exception as e:
            print(f"Errore nella creazione del token: {e}")
            return {
                "success": False,
                "message": f"Errore nella creazione del token: {str(e)}"
            }

    def decode_access_token(self, token: str) -> Optional[dict]:
        try:
            payload = jwt .decode(
                token, self .secret_key, algorithms=[
                    self .algorithm])
            debug_logger .token(
                "Token decodificato con successo", {
                    "username": payload .get("sub"), "expires_in_seconds": payload .get(
                        "exp", 0)-datetime .utcnow().timestamp()})
            return payload
        except JWTError as e:
            debug_logger .token(
                "Errore nella decodifica token", {
                    "error": str(e)})
            return None

    def authenticate_and_create_token(
            self, auth_result: Dict[str, Any]) -> Dict[str, Any]:

        if not auth_result["authenticated"]:
            return {"success": False, "message": "Credenziali non valide"}

        username = auth_result["username"]
        updated_at = auth_result["updated_at"]

        token_data = {"sub": username}

        if updated_at:
            if isinstance(updated_at, datetime):
                token_data["updated_at_credentials"] = updated_at .isoformat()
            else:
                token_data["updated_at_credentials"] = updated_at
        else:
            token_data["updated_at_credentials"] = datetime .utcnow().isoformat()

        token = self .create_access_token(data=token_data)

        return {
            "success": True,
            "message": "Login riuscito",
            "requires_password_change": auth_result["requires_password_change"],
            "is_first_login": auth_result["is_first_login"],
            "access_token": token,
            "token_type": "bearer"}

    def create_token_for_updated_credentials(
            self,
            username: str,
            is_first_login: bool = False,
            requires_password_change: bool = False) -> str:
        token_payload = {
            "sub": username,
            "is_first_login": is_first_login,
            "requires_password_change": requires_password_change,
            "updated_at_credentials": datetime .utcnow().isoformat()
        }
        return self .create_access_token(data=token_payload)

    @staticmethod
    def extract_token_from_request(
        request: Request,
        credentials: Optional[HTTPAuthorizationCredentials] = None
    ) -> Optional[str]:

        token = request .cookies .get("sid")

        if not token and credentials:
            token = credentials .credentials

        return token

    def set_token_cookie(
            self,
            response: Response,
            token: str,
            max_age: int = None) -> None:
        if max_age is None:
            max_age = self .access_token_expire_minutes * 60

        secure_cookies, samesite_policy = get_secure_cookies_config()

        response .set_cookie(
            key="sid",
            value=token,
            httponly=True,
            secure=secure_cookies,
            samesite=samesite_policy,
            max_age=max_age,
            path="/"
        )

    @staticmethod
    def delete_token_cookie(response: Response) -> None:

        secure_cookies, samesite_policy = get_secure_cookies_config()

        response .set_cookie(
            key="sid",
            value="",
            httponly=True,
            secure=secure_cookies,
            samesite=samesite_policy,
            max_age=0,
            path="/"
        )

    def validate_and_refresh_token(
        self,
        request: Request,
        response: Response,
        credentials: Optional[HTTPAuthorizationCredentials] = None
    ) -> Dict[str, Any]:

        credentials_exception = HTTPException(
            status_code=status .HTTP_401_UNAUTHORIZED,
            detail="Accesso non autorizzato",
            headers={"WWW-Authenticate": "Bearer"},
        )

        token = TokenManager .extract_token_from_request(request, credentials)

        cookie_token = request .cookies .get("sid")
        debug_logger .token("Tentativo estrazione token", {
            "cookie_present": bool(cookie_token),
            "header_present": bool(credentials),
            "token_found": bool(token)
        })

        if not token:
            debug_logger .token("Token non trovato nella richiesta - 401")
            raise credentials_exception

        payload = self .decode_access_token(token)
        if payload is None:
            debug_logger .token("Token non valido o scaduto - 401")
            raise credentials_exception

        username = payload .get("sub")
        exp = payload .get("exp")
        now = datetime .utcnow().timestamp()

        if username is None or exp is None:
            debug_logger .token("Payload incompleto - 401", {
                "username": username,
                "exp": exp
            })
            raise credentials_exception

        seconds_left = exp - now
        if seconds_left < 30:
            debug_logger .token("Token prossimo alla scadenza, emetto nuovo token", {
                "username": username, "seconds_left": seconds_left})
            new_access_token = self .create_access_token(
                data={"sub": username})

            self .set_token_cookie(response, new_access_token)

            response .headers["X-New-Access-Token"] = new_access_token
        else:
            debug_logger .token("Token valido", {
                "username": username,
                "seconds_left": seconds_left
            })

        return {"username": username, **payload}

    def check_token_status(self, request: Request) -> Dict[str, Any]:
        token = request .cookies .get("sid")
        if not token:
            debug_logger .token("Nessun token nei cookie")
            return {"authenticated": False, "reason": "no_token"}

        payload = self .decode_access_token(token)
        if payload is None:
            debug_logger .token("Token non valido nei cookie")
            return {"authenticated": False, "reason": "invalid_token"}

        exp = payload .get("exp")
        now = datetime .utcnow().timestamp()

        if exp and exp > now:
            debug_logger .token("Token valido nei cookie", {
                "username": payload .get("sub"),
                "expires_in_seconds": exp - now
            })
            return {
                "authenticated": True,
                "username": payload .get("sub"),
                "expires_at": exp
            }
        else:
            debug_logger .token("Token scaduto nei cookie")
            return {"authenticated": False, "reason": "expired_token"}


def get_current_user_and_refresh_token(
    request: Request,
    response: Response,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Dict[str, Any]:
    return token_manager .validate_and_refresh_token(
        request, response, credentials)


token_manager = TokenManager()

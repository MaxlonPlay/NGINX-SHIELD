from fastapi import HTTPException
from pydantic import BaseModel
import os
from datetime import datetime
from typing import Dict, Any, Optional, Generator
from sqlalchemy import create_engine, Column, String, DateTime, Boolean, Text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.exc import SQLAlchemyError
from contextlib import contextmanager
import pyotp
import qrcode
import io
import base64
from .utils import security_utils, validation_utils
from .backend_debug_logger import debug_logger

Base = declarative_base()


class DBCredentials(Base):
    __tablename__ = "credentials"
    id = Column(
        String,
        primary_key=True,
        default=lambda: security_utils.generate_secure_token(16),
    )
    username = Column(String, nullable=False, unique=True, index=True)
    password_hash = Column(String, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow)
    requires_password_change = Column(Boolean, default=True, nullable=False)

    totp_enabled = Column(Boolean, default=False, nullable=False)
    totp_secret = Column(Text, nullable=True)
    totp_activated_at = Column(DateTime, nullable=True)
    backup_codes = Column(Text, nullable=True)

    def __repr__(self):
        return f"<DBCredentials(username='{self .username}', requires_password_change={self .requires_password_change}, totp_enabled={self .totp_enabled})>"


class LoginRequest(BaseModel):
    username: str
    password: str


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_username: str
    new_password: str


class TOTPSetupRequest(BaseModel):
    current_password: str


class TOTPToggleRequest(BaseModel):
    current_password: str
    enable: bool
    totp_code: Optional[str] = None


class AuthManager:
    def __init__(self, db_path: str = "sqlite:///./data/db/auth.db"):
        self.db_path = db_path
        self.default_username = "admin_shield"
        self.default_password = "nginxshield"
        self.app_name = "NginxShield"

        file_path = self.db_path.replace("sqlite:///", "")
        os.makedirs(os.path.dirname(file_path), exist_ok=True)

        self.engine = create_engine(
            self.db_path, connect_args={"check_same_thread": False}
        )
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(
            autocommit=False, autoflush=False, bind=self.engine
        )

    @contextmanager
    def get_db_session(self) -> Generator[Session, None, None]:
        db = self.SessionLocal()
        try:
            yield db
        finally:
            db.close()

    def hash_password(self, password: str) -> str:
        return security_utils.hash_password(password)

    def verify_password(self, password: str, hashed: str) -> bool:
        return security_utils.verify_password(password, hashed)

    def encrypt_sensitive_data(self, data: str) -> str:
        return security_utils.encrypt_data(data)

    def decrypt_sensitive_data(self, encrypted_data: str) -> str:
        return security_utils.decrypt_data(encrypted_data)

    def verify_credentials(self, username: str, password: str) -> Dict[str, Any]:

        with self.get_db_session() as db:
            try:
                debug_logger.auth("Tentativo autenticazione", {"username": username})

                stored_credentials = (
                    db.query(DBCredentials)
                    .filter(DBCredentials.username == username)
                    .first()
                )

                if not stored_credentials:
                    if (
                        username == self.default_username
                        and password == self.default_password
                        and self.is_first_login()
                    ):
                        debug_logger.auth(
                            "Autenticazione con credenziali di default (primo login)",
                            {"username": username},
                        )
                        return {
                            "authenticated": True,
                            "requires_password_change": True,
                            "requires_totp": False,
                            "totp_enabled": False,
                            "is_first_login": True,
                            "username": username,
                            "updated_at": datetime.utcnow(),
                        }
                    else:
                        debug_logger.auth(
                            "Fallimento: credenziali non trovate nel DB e default non valide",
                            {"username": username},
                        )
                        return {
                            "authenticated": False,
                            "requires_password_change": False,
                            "requires_totp": False,
                            "totp_enabled": False,
                            "is_first_login": self.is_first_login(),
                            "username": None,
                            "updated_at": None,
                            "error": "Credenziali non valide",
                        }
                else:
                    if not self.verify_password(
                        password, stored_credentials.password_hash
                    ):
                        debug_logger.auth(
                            "Fallimento: password non valida", {"username": username}
                        )
                        return {
                            "authenticated": False,
                            "requires_password_change": False,
                            "requires_totp": False,
                            "totp_enabled": stored_credentials.totp_enabled,
                            "is_first_login": False,
                            "username": None,
                            "updated_at": None,
                            "error": "Password non valida",
                        }

                    debug_logger.auth(
                        "Password verificata",
                        {
                            "username": username,
                            "totp_enabled": stored_credentials.totp_enabled,
                        },
                    )

                    if stored_credentials.totp_enabled:
                        debug_logger.auth(
                            "TOTP abilitato - richiesta verifica in secondo passaggio",
                            {"username": username},
                        )
                        return {
                            "authenticated": False,
                            "requires_password_change": stored_credentials.requires_password_change,
                            "requires_totp": True,
                            "totp_enabled": True,
                            "is_first_login": False,
                            "username": stored_credentials.username,
                            "updated_at": stored_credentials.updated_at,
                            "error": "Codice TOTP richiesto",
                        }

                    return {
                        "authenticated": True,
                        "requires_password_change": stored_credentials.requires_password_change,
                        "requires_totp": False,
                        "totp_enabled": False,
                        "is_first_login": False,
                        "username": stored_credentials.username,
                        "updated_at": stored_credentials.updated_at,
                    }

            except Exception as e:
                print(f"Errore durante la verifica delle credenziali: {e}")
                raise HTTPException(
                    status_code=500,
                    detail="Errore interno del server durante la verifica credenziali",
                )

    def setup_totp(self, username: str, current_password: str) -> Dict[str, Any]:

        with self.get_db_session() as db:
            try:
                print(f"[SETUP_TOTP_AUTH] Cercando utente: {username}")
                user = (
                    db.query(DBCredentials)
                    .filter(DBCredentials.username == username)
                    .first()
                )
                print(f"[SETUP_TOTP_AUTH] Utente trovato: {user is not None}")

                if not user:
                    return {"success": False, "message": "Utente non trovato"}

                print(f"[SETUP_TOTP_AUTH] Verificando password...")
                if not self.verify_password(current_password, user.password_hash):
                    return {"success": False, "message": "Password corrente errata"}

                print(f"[SETUP_TOTP_AUTH] Generando secret TOTP...")
                secret = pyotp.random_base32()
                print(f"[SETUP_TOTP_AUTH] Secret generato: {secret[:10]}...")

                print(f"[SETUP_TOTP_AUTH] Creando TOTP URI...")
                totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
                    name=username, issuer_name=self.app_name
                )
                print(f"[SETUP_TOTP_AUTH] URI creato: {totp_uri[:50]}...")

                print(f"[SETUP_TOTP_AUTH] Generando QR code...")
                qr = qrcode.QRCode(version=1, box_size=10, border=5)
                qr.add_data(totp_uri)
                qr.make(fit=True)

                qr_image = qr.make_image(fill_color="black", back_color="white")
                print(f"[SETUP_TOTP_AUTH] QR image creato")

                print(f"[SETUP_TOTP_AUTH] Convertendo QR in base64...")
                buffer = io.BytesIO()
                qr_image.save(buffer, format="PNG")
                qr_base64 = base64.b64encode(buffer.getvalue()).decode()
                print(f"[SETUP_TOTP_AUTH] QR base64 creato: {len(qr_base64)} bytes")

                from .totp_session_manager import totp_session_manager

                qr_code_data_uri = f"data:image/png;base64,{qr_base64}"
                totp_session_manager.create_setup_session(
                    username, secret, qr_code_data_uri
                )
                print(
                    f"[SETUP_TOTP_AUTH] Setup TOTP temporaneo creato in memoria per {username}"
                )

                return {
                    "success": True,
                    "secret": secret,
                    "qr_code": qr_code_data_uri,
                    "message": "TOTP configurato temporaneamente. Inserisci il codice dall'app per confermare entro 15 minuti.",
                }

            except Exception as e:
                print(f"[SETUP_TOTP_AUTH] ECCEZIONE: {type(e).__name__}: {e}")
                import traceback

                traceback.print_exc()
                return {
                    "success": False,
                    "message": f"Errore interno durante la configurazione TOTP: {str(e)}",
                }

    def confirm_totp_setup(
        self, username: str, current_password: Optional[str], totp_code: str
    ) -> Dict[str, Any]:

        from .totp_session_manager import totp_session_manager

        with self.get_db_session() as db:
            try:
                print(f"[CONFIRM_TOTP_AUTH] Cercando utente: {username}")
                user = (
                    db.query(DBCredentials)
                    .filter(DBCredentials.username == username)
                    .first()
                )
                print(f"[CONFIRM_TOTP_AUTH] Utente trovato: {user is not None}")

                if not user:
                    return {"success": False, "message": "Utente non trovato"}

                print(
                    f"[CONFIRM_TOTP_AUTH] Cercando setup session temporanea per {username}..."
                )
                setup_session = totp_session_manager.get_setup_session(username)

                if not setup_session:
                    print(f"[CONFIRM_TOTP_AUTH] Setup session non trovata o scaduta!")
                    return {
                        "success": False,
                        "message": "Setup TOTP non trovato o scaduto. Riprova dal setup.",
                    }

                secret = setup_session["secret"]
                print(
                    f"[CONFIRM_TOTP_AUTH] Secret recuperato dalla memoria: {secret[:10]}..."
                )

                print(f"[CONFIRM_TOTP_AUTH] Verificando codice TOTP: {totp_code}")
                totp = pyotp.TOTP(secret)

                import time

                now_timestamp = int(time.time())
                print(f"[CONFIRM_TOTP_AUTH] Codici TOTP validi (±1 finestra):")
                print(f"  - Precedente: {totp .at(now_timestamp - 30)}")
                print(f"  - Attuale: {totp .at(now_timestamp)}")
                print(f"  - Prossimo: {totp .at(now_timestamp + 30)}")

                if not totp.verify(totp_code, valid_window=1):
                    print(f"[CONFIRM_TOTP_AUTH] Codice TOTP non valido!")
                    print(f"[CONFIRM_TOTP_AUTH] Secret utilizzato: {secret}")
                    print(f"[CONFIRM_TOTP_AUTH] Codice ricevuto: {totp_code}")
                    return {"success": False, "message": "Codice TOTP non valido"}

                print(f"[CONFIRM_TOTP_AUTH] Codice TOTP valido! Salvando nel DB...")

                user.totp_secret = self.encrypt_sensitive_data(secret)
                user.totp_enabled = True
                user.totp_activated_at = datetime.utcnow()

                print(f"[CONFIRM_TOTP_AUTH] Generando backup codes...")
                backup_codes = self.generate_backup_codes()
                user.backup_codes = self.encrypt_sensitive_data(backup_codes)

                db.add(user)
                db.commit()
                print(f"[CONFIRM_TOTP_AUTH] TOTP attivato e salvato nel DB")

                totp_session_manager.confirm_setup_session(username)

                return {
                    "success": True,
                    "message": "TOTP attivato con successo",
                    "backup_codes": backup_codes.split(","),
                }

            except Exception as e:
                print(f"[CONFIRM_TOTP_AUTH] ECCEZIONE: {type(e).__name__}: {e}")
                import traceback

                traceback.print_exc()
                return {
                    "success": False,
                    "message": f"Errore interno durante la conferma TOTP: {str(e)}",
                }

    def disable_totp(
        self, username: str, current_password: str, totp_code: str
    ) -> Dict[str, Any]:
        with self.get_db_session() as db:
            try:

                user = (
                    db.query(DBCredentials)
                    .filter(DBCredentials.username == username)
                    .first()
                )

                if not user:
                    return {"success": False, "message": "Utente non trovato"}

                if not self.verify_password(current_password, user.password_hash):
                    return {"success": False, "message": "Password corrente errata"}

                if not user.totp_enabled:
                    return {"success": False, "message": "TOTP non è attivo"}

                totp_result = self.verify_totp_code(username, totp_code)
                if not totp_result.get("success"):

                    return {
                        "success": False,
                        "message": totp_result.get("message", "Codice TOTP non valido"),
                    }

                user.totp_enabled = False
                user.totp_secret = None
                user.totp_activated_at = None
                user.backup_codes = None

                db.add(user)
                db.commit()

                return {
                    "success": True,
                    "message": "Autenticazione a due fattori disabilitata con successo",
                }

            except Exception as e:
                print(f"Errore durante la disabilitazione TOTP: {e}")
                import traceback

                traceback.print_exc()
                return {
                    "success": False,
                    "message": "Errore interno durante la disabilitazione TOTP",
                }

    def generate_backup_codes(self, count: int = 10) -> str:
        codes = []
        for _ in range(count):

            import secrets
            import string

            code = "".join(
                secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8)
            )
            codes.append(code)
        return ",".join(codes)

    def get_totp_status(self, username: str) -> Dict[str, Any]:
        with self.get_db_session() as db:
            try:
                user = (
                    db.query(DBCredentials)
                    .filter(DBCredentials.username == username)
                    .first()
                )

                if not user:
                    return {"success": False, "message": "Utente non trovato"}

                return {
                    "success": True,
                    "totp_enabled": user.totp_enabled,
                    "totp_configured": user.totp_secret is not None,
                    "activated_at": (
                        user.totp_activated_at.isoformat()
                        if user.totp_activated_at
                        else None
                    ),
                    "has_backup_codes": user.backup_codes is not None,
                }

            except Exception as e:
                print(f"Errore durante il recupero stato TOTP: {e}")
                return {
                    "success": False,
                    "message": "Errore interno durante il recupero stato TOTP",
                }

    def verify_totp_code(self, username: str, totp_code: str) -> Dict[str, Any]:

        with self.get_db_session() as db:
            try:
                print(f"[VERIFY_TOTP_CODE] Verificando codice TOTP per {username}")
                user = (
                    db.query(DBCredentials)
                    .filter(DBCredentials.username == username)
                    .first()
                )

                if not user:
                    return {"success": False, "message": "Utente non trovato"}

                if not user.totp_enabled:
                    return {
                        "success": False,
                        "message": "TOTP non abilitato per questo utente",
                    }

                if not user.totp_secret:
                    return {"success": False, "message": "TOTP non configurato"}

                secret = self.decrypt_sensitive_data(user.totp_secret)
                totp = pyotp.TOTP(secret)

                if not totp.verify(totp_code, valid_window=1):
                    print(f"[VERIFY_TOTP_CODE] Codice TOTP non valido per {username}")
                    return {"success": False, "message": "Codice TOTP non valido"}

                print(f"[VERIFY_TOTP_CODE] Codice TOTP valido per {username}")
                return {"success": True, "message": "Codice TOTP verificato"}

            except Exception as e:
                print(f"[VERIFY_TOTP_CODE] Errore: {e}")
                import traceback

                traceback.print_exc()
                return {
                    "success": False,
                    "message": f"Errore durante la verifica TOTP: {str(e)}",
                }

    def verify_backup_codes(
        self, username: str, provided_codes: list
    ) -> Dict[str, Any]:

        with self.get_db_session() as db:
            try:
                print(
                    f"[VERIFY_BACKUP_CODES] Verificando {len(provided_codes)} codici per {username}"
                )

                user = (
                    db.query(DBCredentials)
                    .filter(DBCredentials.username == username)
                    .first()
                )

                if not user:
                    return {"success": False, "message": "Utente non trovato"}

                if not user.backup_codes:
                    return {
                        "success": False,
                        "message": "Nessun codice di backup disponibile",
                    }

                try:
                    decrypted_codes_str = self.decrypt_sensitive_data(user.backup_codes)
                    stored_codes = decrypted_codes_str.split(",")
                except Exception as e:
                    print(f"[VERIFY_BACKUP_CODES] Errore nella decrittazione: {e}")
                    return {
                        "success": False,
                        "message": "Errore durante la verifica dei codici",
                    }

                if len(provided_codes) != 10:
                    return {
                        "success": False,
                        "message": f"Sono richiesti esattamente 10 codici, ne hai forniti {len(provided_codes)}",
                    }

                cleaned_provided = [code.strip().upper() for code in provided_codes]
                cleaned_stored = [code.strip().upper() for code in stored_codes]

                for i, provided_code in enumerate(cleaned_provided):
                    if provided_code not in cleaned_stored:
                        print(
                            f"[VERIFY_BACKUP_CODES] Codice {i + 1} non valido: {provided_code}"
                        )
                        return {
                            "success": False,
                            "message": f"Codice {i + 1} non valido",
                        }

                print(
                    f"[VERIFY_BACKUP_CODES] Tutti e 10 i codici sono validi per {username}"
                )

                import string
                import random

                new_password = "".join(
                    random.choices(string.ascii_letters + string.digits, k=12)
                )
                print(f"[VERIFY_BACKUP_CODES] Nuova password generata: {new_password}")

                user.password_hash = self.hash_password(new_password)

                user.backup_codes = None

                user.totp_enabled = False
                user.totp_secret = None

                db.add(user)
                db.commit()
                print(
                    f"[VERIFY_BACKUP_CODES] Password cambiata, TOTP disabilitato, codici rimossi per {username}"
                )

                return {
                    "success": True,
                    "message": "Codici di backup verificati. Account ripristinato.",
                    "new_password": new_password,
                    "requires_password_change": True,
                }

            except Exception as e:
                print(f"[VERIFY_BACKUP_CODES] Errore: {e}")
                import traceback

                traceback.print_exc()
                return {
                    "success": False,
                    "message": f"Errore durante la verifica dei codici: {str(e)}",
                }

    def regenerate_backup_codes(
        self, username: str, current_password: str, totp_code: str
    ) -> Dict[str, Any]:
        with self.get_db_session() as db:
            try:
                user = (
                    db.query(DBCredentials)
                    .filter(DBCredentials.username == username)
                    .first()
                )

                if not user:
                    return {"success": False, "message": "Utente non trovato"}

                if not self.verify_password(current_password, user.password_hash):
                    return {"success": False, "message": "Password corrente errata"}

                if not user.totp_enabled:
                    return {"success": False, "message": "TOTP non è attivo"}

                if not self.verify_totp_code(username, totp_code):
                    return {"success": False, "message": "Codice TOTP non valido"}

                backup_codes = self.generate_backup_codes()
                user.backup_codes = self.encrypt_sensitive_data(backup_codes)

                db.add(user)
                db.commit()

                return {
                    "success": True,
                    "message": "Codici di backup rigenerati con successo",
                    "backup_codes": backup_codes.split(","),
                }

            except Exception as e:
                print(f"Errore durante la rigenerazione codici di backup: {e}")
                return {
                    "success": False,
                    "message": "Errore interno durante la rigenerazione codici di backup",
                }

    def update_credentials(
        self,
        old_username: str,
        current_password: str,
        new_username: str,
        new_password: str,
    ) -> Dict[str, Any]:
        with self.get_db_session() as db:
            user = (
                db.query(DBCredentials)
                .filter(DBCredentials.username == old_username)
                .first()
            )

            if not user:
                if (
                    old_username == self.default_username
                    and current_password == self.default_password
                    and self.is_first_login()
                ):

                    validation_result = validation_utils.validate_password_requirements(
                        new_password
                    )
                    if not validation_result["valid"]:
                        return {
                            "success": False,
                            "message": validation_result["message"],
                        }

                    username_validation = validation_utils.validate_username(
                        new_username
                    )
                    if not username_validation["valid"]:
                        return {
                            "success": False,
                            "message": username_validation["message"],
                        }

                    if (
                        db.query(DBCredentials)
                        .filter(DBCredentials.username == new_username)
                        .first()
                    ):
                        return {
                            "success": False,
                            "message": "Il nuovo username è già in uso.",
                        }

                    new_user = DBCredentials(
                        username=new_username,
                        password_hash=self.hash_password(new_password),
                        requires_password_change=False,
                        updated_at=datetime.utcnow(),
                        totp_enabled=False,
                        totp_secret=None,
                    )

                    db.add(new_user)
                    db.commit()
                    db.refresh(new_user)

                    return {
                        "success": True,
                        "message": "Credenziali create con successo per il primo login.",
                        "updated_user": {
                            "username": new_user.username,
                            "updated_at": new_user.updated_at,
                            "requires_password_change": new_user.requires_password_change,
                            "totp_enabled": new_user.totp_enabled,
                        },
                    }
                else:
                    return {
                        "success": False,
                        "message": "Utente non trovato o credenziali di default non valide.",
                    }

            if not self.verify_password(current_password, user.password_hash):
                return {"success": False, "message": "Password corrente errata."}

            update_data = {}

            if new_password:
                validation_result = validation_utils.validate_password_requirements(
                    new_password
                )
                if not validation_result["valid"]:
                    return {"success": False, "message": validation_result["message"]}
                if self.verify_password(new_password, user.password_hash):
                    return {
                        "success": False,
                        "message": "La nuova password non può essere uguale alla precedente.",
                    }
                update_data["password_hash"] = self.hash_password(new_password)
                update_data["requires_password_change"] = False

            if new_username and new_username != old_username:
                username_validation = validation_utils.validate_username(new_username)
                if not username_validation["valid"]:
                    return {"success": False, "message": username_validation["message"]}
                if (
                    db.query(DBCredentials)
                    .filter(DBCredentials.username == new_username)
                    .first()
                ):
                    return {
                        "success": False,
                        "message": "Il nuovo username è già in uso.",
                    }
                update_data["username"] = new_username

            if not update_data:
                return {
                    "success": True,
                    "message": "Nessuna credenziale da aggiornare o nessuna modifica rilevata.",
                }

            for key, value in update_data.items():
                setattr(user, key, value)
            user.updated_at = datetime.utcnow()

            db.add(user)
            db.commit()
            db.refresh(user)

            return {
                "success": True,
                "message": "Credenziali aggiornate con successo.",
                "updated_user": {
                    "username": user.username,
                    "updated_at": user.updated_at,
                    "requires_password_change": user.requires_password_change,
                    "totp_enabled": user.totp_enabled,
                },
            }

    def is_strong_password(self, password: str) -> bool:
        return security_utils.is_strong_password(password)

    def get_auth_status(self) -> Dict[str, Any]:
        with self.get_db_session() as db:
            try:
                stored_credentials = db.query(DBCredentials).first()
                if not stored_credentials:
                    return {
                        "logged_in": False,
                        "is_first_login": True,
                        "requires_password_change": True,
                        "totp_enabled": False,
                    }
                else:
                    return {
                        "logged_in": False,
                        "is_first_login": False,
                        "requires_password_change": stored_credentials.requires_password_change,
                        "totp_enabled": stored_credentials.totp_enabled,
                    }
            except SQLAlchemyError as e:
                print(f"Errore DB nel recupero stato autenticazione: {e}")
                raise HTTPException(
                    status_code=500,
                    detail="Errore interno del server nel recupero stato autenticazione",
                )

    def authenticate_custom(
        self, username: str, password: str, totp_code: Optional[str] = None
    ) -> bool:
        result = self.verify_credentials(username, password, totp_code)
        return result["authenticated"]

    def credentials_exist(self) -> bool:
        with self.get_db_session() as db:
            return db.query(DBCredentials).first() is not None

    def is_first_login(self) -> bool:
        with self.get_db_session() as db:
            return db.query(DBCredentials).first() is None

    def get_user_info(self, username: str) -> Optional[Dict[str, Any]]:
        with self.get_db_session() as db:
            user = (
                db.query(DBCredentials)
                .filter(DBCredentials.username == username)
                .first()
            )
            if user:
                return {
                    "username": user.username,
                    "last_password_update": (
                        user.updated_at.isoformat() if user.updated_at else None
                    ),
                    "requires_password_change": user.requires_password_change,
                    "totp_enabled": user.totp_enabled,
                    "totp_activated_at": (
                        user.totp_activated_at.isoformat()
                        if user.totp_activated_at
                        else None
                    ),
                }
            return None


auth_manager = AuthManager()

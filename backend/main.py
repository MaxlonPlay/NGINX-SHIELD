from fastapi import FastAPI, HTTPException, Query, Depends, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List, Dict, Any
from .ip_manager import BanManager
from .bulkban import BulkBanManager
from pydantic import BaseModel, validator
import os
import logging


from .auth_manager import (
    auth_manager,
    LoginRequest,
    PasswordChangeRequest,
    TOTPSetupRequest,
)
from .token_manager import token_manager, get_current_user_and_refresh_token, security
from .utils import log_manager, response_manager, handle_endpoint_exceptions
from .whitelist.manager import whitelist_manager
from .whitelist.models import WhitelistEntry
from .npm_conf import NpmConfigManager
from .system_monitor import system_monitor
from .mail_config_manager import MailConfigManager
from .secure_config_manager import secure_config_manager
from .service_manager import service_manager
from .request_counter import count_file_lines
from .log_manager_api import LogManagerAPI
from .pattern_manager import pattern_manager
from .logging_middleware import CompleteLosggingMiddleware

logging.getLogger("uvicorn").setLevel(logging.WARNING)
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


mail_config_path = "data/conf/mail.conf"
mail_manager = MailConfigManager(mail_config_path)


log_dir = os.path.join(os.path.dirname(BASE_DIR), "data", "log")
log_manager_api = LogManagerAPI(log_dir=log_dir)

app = FastAPI(
    title="NGINX Shield",
    version="0.4.4",
    description="NGINX Shield è un sistema avanzato di gestione e sicurezza per server proxy NGINX. Automatizza il blocco degli IP malevoli tramite analisi intelligenti dei log e regole personalizzabili, offrendo una protezione attiva, dinamica e facilmente gestibile.",
    contact={
        "name": "MaxlonPlay",
        "url": "https://github.com/MaxlonPlay",
    },
    license_info={
        "name": "Distribuito sotto licenza GNU General Public License v3.0",
        "url": "https://www.gnu.org/licenses/gpl-3.0.html#license-text",
    },
    terms_of_service="https://www.gnu.org/licenses/gpl-3.0.html#license-text",
)

config_manager = NpmConfigManager()


origins = []

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*", "X-New-Access-Token"],
)


app.add_middleware(CompleteLosggingMiddleware)


class RemoveWhitelistEntry(BaseModel):
    type: str
    value: str


class UpdateWhitelistEntry(BaseModel):
    type: str
    value: str
    description: str


class ConfigUpdate(BaseModel):
    LOG_DIR: str = "/app/nginx-logs"
    IGNORE_WHITELIST: bool = False
    ENABLE_WHITELIST_LOG: bool = True
    CODES_TO_ALLOW: List[int] = [101, 200, 201, 202, 204, 206, 302, 304, 413, 499]
    MAX_REQUESTS: int = 3
    TIME_FRAME: int = 3600
    JAIL_NAME: str = "npm-docker"


class TOTPSetupResponse(BaseModel):
    success: bool
    message: str
    secret: Optional[str] = None
    qr_code: Optional[str] = None


class TOTPStatusResponse(BaseModel):
    success: bool
    totp_enabled: bool
    totp_configured: bool
    activated_at: Optional[str] = None
    has_backup_codes: bool


class BackupCodesResponse(BaseModel):
    success: bool
    message: str
    backup_codes: Optional[List[str]] = None


class TOTPSetupRequest(BaseModel):
    current_password: str
    username: Optional[str] = None


class TOTPConfirmRequest(BaseModel):
    totp_code: str


class TOTPLoginVerifyRequest(BaseModel):
    username: str
    totp_code: str


class TOTPLoginVerifyBackupCodesRequest(BaseModel):
    username: str
    backup_codes: List[str]


class TOTPDisableRequest(BaseModel):
    current_password: str
    totp_code: str


class BackupCodesRequest(BaseModel):
    username: str | None = None
    current_password: str
    totp_code: str


class ManualBanRequest(BaseModel):
    ip: str
    reason: str

    @validator("ip")
    def validate_ip(cls, v):
        if not v or not v.strip():
            raise ValueError("IP address è obbligatorio")
        return v.strip()

    @validator("reason")
    def validate_reason(cls, v):
        if not v or not v.strip():
            raise ValueError("Motivo del ban è obbligatorio")
        if len(v.strip()) < 3:
            raise ValueError("Il motivo deve essere di almeno 3 caratteri")
        return v.strip()


class CIDRBanRequest(BaseModel):
    cidr: str
    reason: str

    @validator("cidr")
    def validate_cidr(cls, v):
        if not v or not v.strip():
            raise ValueError("CIDR è obbligatorio")
        return v.strip()

    @validator("reason")
    def validate_reason(cls, v):
        if not v or not v.strip():
            raise ValueError("Motivo del ban è obbligatorio")
        return v.strip()


class CIDRCheckRequest(BaseModel):
    cidr: str

    @validator("cidr")
    def validate_cidr(cls, v):
        if not v or not v.strip():
            raise ValueError("CIDR è obbligatorio")
        return v.strip()


class UnbanRequest(BaseModel):
    ip: str
    type: str

    @validator("type")
    def validate_type(cls, v):
        if v not in ["automatic", "manual"]:
            raise ValueError('Tipo deve essere "automatic" o "manual"')
        return v


class MailConfigUpdate(BaseModel):
    enabled: bool
    smtp_server: str
    smtp_port: int
    use_tls: bool
    username: EmailStr
    password: str
    from_: EmailStr
    to: List[EmailStr]
    subject: str


DB_FILE = os.getenv(
    "DB_FILE", os.path.join(BASE_DIR, "..", "data", "db", "banned_ips.db")
)
CONFIG_FILE = os.path.join(BASE_DIR, "..", "data", "conf", "conf.local")


ban_manager = BanManager(
    db_file=DB_FILE, config_file=CONFIG_FILE, debug_log_func=log_manager.log_operation
)


bulk_ban_manager = BulkBanManager(
    db_file=DB_FILE,
    jail_name=ban_manager.jail_name,
    debug_log_func=log_manager.log_operation,
)


@app.on_event("startup")
async def startup_event():
    """Inizializza il database al startup"""
    setup_success = ban_manager.setup_db()
    if setup_success:
        log_manager.log_operation("Database inizializzato con successo", "system")
    else:
        log_manager.log_operation("Errore nell'inizializzazione del database", "system")


@app.get("/api/bans", summary="🔒 Lista IP bannati", tags=["Bans"])
@handle_endpoint_exceptions("recupero lista IP bannati")
def get_banned_ips(
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    limit: int = Query(
        10, ge=1, le=100, description="Numero massimo di risultati per tipo"
    ),
    automatic_offset: int = Query(0, ge=0, description="Offset per ban automatici"),
    manual_offset: int = Query(0, ge=0, description="Offset per ban manuali"),
    search: Optional[str] = Query(None, description="Query di ricerca"),
):
    """🔒 PROTETTO - Recupera la lista degli IP bannati con paginazione e ricerca"""
    current_user = get_current_user_and_refresh_token(request, response, credentials)

    result = ban_manager.get_banned_ips(
        limit=limit,
        automatic_offset=automatic_offset,
        manual_offset=manual_offset,
        search_query=search or "",
    )

    if not result["success"]:
        log_manager.log_operation(
            "Errore recupero lista IP bannati",
            current_user.get("username"),
            result.get("message", "Errore sconosciuto"),
        )
        raise HTTPException(
            status_code=500,
            detail=result.get("message", "Errore interno durante il recupero dei ban"),
        )

    log_manager.log_operation(
        "Lista IP bannati recuperata",
        current_user.get("username"),
        f"Limit: {limit}, Auto offset: {automatic_offset}, Manual offset: {manual_offset}, Search: '{search or 'N/A'}'",
    )

    return response_manager.create_success_response(
        data=result["data"], message="Lista IP bannati recuperata con successo"
    )


@app.post("/api/bans/manual", summary="🔒 Ban IP manuale", tags=["Bans"])
@handle_endpoint_exceptions("ban IP manuale")
def ban_ip_manual(
    ban_request: ManualBanRequest,
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """🔒 PROTETTO - Banna manualmente un IP/CIDR"""
    current_user = get_current_user_and_refresh_token(request, response, credentials)

    result = ban_manager.ban_ip_manual(ban_request.ip, ban_request.reason)

    if not result["success"]:
        log_manager.log_operation(
            "Tentativo ban IP/CIDR manuale fallito",
            current_user.get("username"),
            f"IP/CIDR: {ban_request.ip}, Motivo: {ban_request.reason}, Errore: {result.get('message')}",
        )

        error_type = result.get("error_type", "unknown")
        if error_type == "validation_error":
            status_code = 400
        elif error_type == "already_banned":
            status_code = 409
        elif error_type == "fail2ban_conflict":
            status_code = 409
        elif error_type == "fail2ban_error":
            status_code = 502
        else:
            status_code = 500

        raise HTTPException(status_code=status_code, detail=result["message"])

    log_manager.log_operation(
        "IP/CIDR bannato manualmente",
        current_user.get("username"),
        f"IP/CIDR: {ban_request.ip}, Motivo: {ban_request.reason}, Geo: {result['data'].get('geo_info', {}).get('organization', 'N/A')} ({result['data'].get('geo_info', {}).get('country', 'N/A')})",
    )

    return response_manager.create_success_response(
        data=result["data"], message=result["message"]
    )


@app.delete("/api/bans", summary="🔒 Rimuovi ban IP/CIDR", tags=["Bans"])
@handle_endpoint_exceptions("rimozione ban IP/CIDR")
def unban_ip(
    ip: str = Query(..., description="Indirizzo IP o CIDR da sbannare"),
    ban_type: str = Query(
        ..., regex="^(automatic|manual)$", description="Tipo di ban da rimuovere"
    ),
    request: Request = None,
    response: Response = None,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """🔒 PROTETTO - Rimuove un IP/CIDR dai ban"""
    current_user = get_current_user_and_refresh_token(request, response, credentials)

    result = ban_manager.unban_ip(ip, ban_type)

    if not result["success"]:
        log_manager.log_operation(
            "Tentativo rimozione ban IP/CIDR fallito",
            current_user.get("username"),
            f"IP/CIDR: {ip}, Tipo: {ban_type}, Errore: {result.get('message')}",
        )

        error_type = result.get("error_type", "unknown")
        if error_type in ["validation_error", "type_mismatch"]:
            status_code = 400
        elif error_type == "not_found":
            status_code = 404
        else:
            status_code = 500

        raise HTTPException(status_code=status_code, detail=result["message"])

    log_manager.log_operation(
        "Ban IP/CIDR rimosso",
        current_user.get("username"),
        f"IP/CIDR: {ip}, Tipo: {ban_type}",
    )

    return response_manager.create_success_response(
        data=result["data"], message=result["message"]
    )


@app.get("/api/bans/stats", summary="🔒 Statistiche ban", tags=["Bans"])
@handle_endpoint_exceptions("recupero statistiche ban")
def get_ban_statistics(
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """🔒 PROTETTO - Recupera statistiche sui ban"""
    current_user = get_current_user_and_refresh_token(request, response, credentials)

    result = ban_manager.get_ban_stats()

    if not result["success"]:
        log_manager.log_operation(
            "Errore recupero statistiche ban",
            current_user.get("username"),
            result.get("message", "Errore sconosciuto"),
        )
        raise HTTPException(
            status_code=500,
            detail=result.get(
                "message", "Errore interno durante il recupero delle statistiche"
            ),
        )

    log_manager.log_operation(
        "Statistiche ban recuperate", current_user.get("username")
    )

    return response_manager.create_success_response(
        data=result["data"], message="Statistiche recuperate con successo"
    )


@app.get("/api/bans/counts", summary="🔒 Conteggi totali ban", tags=["Bans"])
@handle_endpoint_exceptions("recupero conteggi ban")
def get_ban_counts(
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """🔒 PROTETTO - Recupera i conteggi totali degli IP bannati"""
    current_user = get_current_user_and_refresh_token(request, response, credentials)

    result = ban_manager.get_ban_stats()

    if not result["success"]:
        log_manager.log_operation(
            "Errore recupero conteggi ban",
            current_user.get("username"),
            result.get("message", "Errore sconosciuto"),
        )
        raise HTTPException(
            status_code=500,
            detail=result.get(
                "message", "Errore interno durante il recupero dei conteggi"
            ),
        )

    data = result["data"]
    counts = {
        "total_automatic_bans": data["automatic_bans"],
        "total_manual_bans": data["manual_bans"],
        "total_bans": data["total_bans"],
    }

    log_manager.log_operation(
        "Conteggi ban recuperati",
        current_user.get("username"),
        f"Automatici: {counts['total_automatic_bans']}, Manuali: {counts['total_manual_bans']}",
    )

    return response_manager.create_success_response(
        data=counts, message="Conteggi recuperati con successo"
    )


@app.get("/api/bans/fail2ban-status", summary="🔒 Stato fail2ban", tags=["Bans"])
@handle_endpoint_exceptions("recupero stato fail2ban")
def get_fail2ban_status(
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """🔒 PROTETTO - Recupera lo stato di fail2ban"""
    current_user = get_current_user_and_refresh_token(request, response, credentials)

    result = ban_manager.get_fail2ban_status()

    if not result["success"]:
        log_manager.log_operation(
            "Errore recupero stato fail2ban",
            current_user.get("username"),
            result.get("message", "Errore sconosciuto"),
        )
        raise HTTPException(
            status_code=500,
            detail=result.get(
                "message", "Errore durante il recupero dello stato fail2ban"
            ),
        )

    log_manager.log_operation("Stato fail2ban recuperato", current_user.get("username"))

    return response_manager.create_success_response(
        data=result["data"], message="Stato fail2ban recuperato con successo"
    )


@app.get("/api/bans/check/{ip}", summary="🔒 Verifica stato ban IP", tags=["Bans"])
@handle_endpoint_exceptions("verifica stato ban IP")
def check_ip_ban_status(
    ip: str,
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """🔒 PROTETTO - Verifica se un IP è bannato"""
    current_user = get_current_user_and_refresh_token(request, response, credentials)

    is_banned_db, ban_type, ban_reason = ban_manager.is_ip_banned_in_db(ip)

    is_banned_f2b = ban_manager.is_ip_banned_in_fail2ban(ip)

    status_info = {
        "ip": ip,
        "banned_in_database": is_banned_db,
        "banned_in_fail2ban": is_banned_f2b,
        "ban_type": ban_type,
        "ban_reason": ban_reason,
        "status": "consistent" if is_banned_db == is_banned_f2b else "inconsistent",
    }

    log_manager.log_operation(
        "Verifica stato ban IP",
        current_user.get("username"),
        f"IP: {ip}, DB: {is_banned_db}, F2B: {is_banned_f2b}",
    )

    return response_manager.create_success_response(
        data=status_info, message=f"Stato ban per IP {ip} verificato"
    )


@app.get(
    "/api/bans/geo-info/{ip}", summary="🔒 Info geolocalizzazione IP", tags=["Bans"]
)
@handle_endpoint_exceptions("recupero info geolocalizzazione")
def get_ip_geo_info(
    ip: str,
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """🔒 PROTETTO - Recupera informazioni di geolocalizzazione per un IP"""
    current_user = get_current_user_and_refresh_token(request, response, credentials)

    if not ban_manager._validate_ip(ip):
        raise HTTPException(status_code=400, detail="Indirizzo IP non valido")

    geo_info = ban_manager.get_ip_info(ip)

    log_manager.log_operation(
        "Info geolocalizzazione IP recuperate",
        current_user.get("username"),
        f"IP: {ip}, Org: {geo_info.get('organization', 'N/A')}, Country: {geo_info.get('country', 'N/A')}",
    )

    return response_manager.create_success_response(
        data=geo_info, message=f"Informazioni geolocalizzazione per IP {ip} recuperate"
    )


@app.post("/api/bans/bulk-manual", summary="🔒 Ban multipli manuali", tags=["Bans"])
@handle_endpoint_exceptions("ban multipli manuali")
def bulk_ban_ips_manual(
    ban_requests: List[ManualBanRequest],
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """🔒 PROTETTO - Banna manualmente multipli IP"""
    current_user = get_current_user_and_refresh_token(request, response, credentials)

    if len(ban_requests) > 10:
        raise HTTPException(status_code=400, detail="Massimo 10 IP per richiesta bulk")

    results = []
    success_count = 0
    failed_count = 0

    for ban_request in ban_requests:
        result = ban_manager.ban_ip_manual(ban_request.ip, ban_request.reason)
        results.append(
            {
                "ip": ban_request.ip,
                "success": result["success"],
                "message": result["message"],
                "data": result.get("data"),
            }
        )

        if result["success"]:
            success_count += 1
        else:
            failed_count += 1

    log_manager.log_operation(
        "Ban multipli manuali eseguiti",
        current_user.get("username"),
        f"Totale: {len(ban_requests)}, Successo: {success_count}, Falliti: {failed_count}",
    )

    return response_manager.create_success_response(
        data={
            "results": results,
            "summary": {
                "total": len(ban_requests),
                "success": success_count,
                "failed": failed_count,
            },
        },
        message=f"Ban multipli completati: {success_count} successo, {failed_count} falliti",
    )


@app.post("/api/bans/cidr/check-ips", summary="🔒 Trova IP in CIDR", tags=["Bans"])
@handle_endpoint_exceptions("ricerca IP in CIDR")
def check_ips_in_cidr(
    request_data: CIDRCheckRequest,
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """🔒 PROTETTO - Trova tutti gli IP nel database che appartengono a un CIDR"""
    current_user = get_current_user_and_refresh_token(request, response, credentials)

    cidr = request_data.cidr

    result = bulk_ban_manager.find_ips_in_cidr(cidr)

    log_manager.log_operation(
        "Ricerca IP in CIDR",
        current_user.get("username"),
        f"CIDR: {cidr}, IP trovati: {result.get('count', 0)}",
    )

    return response_manager.create_success_response(
        data=result, message=result["message"]
    )


@app.post("/api/bans/cidr/unban-ips", summary="🔒 Sbanna IP in CIDR", tags=["Bans"])
@handle_endpoint_exceptions("sbannamento IP in CIDR")
def unban_ips_in_cidr(
    request_data: Dict[str, Any],
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """🔒 PROTETTO - Sbanna tutti gli IP appartenenti a un CIDR"""
    current_user = get_current_user_and_refresh_token(request, response, credentials)

    cidr = request_data.get("cidr", "").strip()
    ip_ids = request_data.get("ip_ids", [])

    if not cidr or not ip_ids:
        raise HTTPException(status_code=400, detail="CIDR e ip_ids sono obbligatori")

    result = bulk_ban_manager.unban_ips_in_cidr(cidr, ip_ids)

    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])

    log_manager.log_operation(
        "Sbannamento IP in CIDR",
        current_user.get("username"),
        f"CIDR: {cidr}, IP sbannati: {len(result.get('unbanned_ips', []))}",
    )

    return response_manager.create_success_response(
        data=result, message=result["message"]
    )


@app.post("/api/bans/cidr/ban-multiple", summary="🔒 Ban multipli CIDR", tags=["Bans"])
@handle_endpoint_exceptions("ban multipli CIDR")
def ban_multiple_cidrs(
    cidrs_request: Dict[str, List[Dict[str, str]]],
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """🔒 PROTETTO - Banna multipli CIDR"""
    current_user = get_current_user_and_refresh_token(request, response, credentials)

    cidr_list = cidrs_request.get("cidrs", [])

    if not cidr_list or len(cidr_list) == 0:
        raise HTTPException(status_code=400, detail="Lista CIDR è obbligatoria")

    if len(cidr_list) > 1000:
        raise HTTPException(status_code=400, detail="Massimo 10 CIDR per richiesta")

    result = bulk_ban_manager.ban_multiple_cidrs(cidr_list)

    log_manager.log_operation(
        "Ban multipli CIDR eseguiti",
        current_user.get("username"),
        f"Totale: {result['successful'] + result['failed']}, Successo: {result['successful']}, Falliti: {result['failed']}",
    )

    return response_manager.create_success_response(
        data=result, message=result["message"]
    )


@app.get("/api/bans/export", summary="🔒 Esporta lista ban", tags=["Bans"])
@handle_endpoint_exceptions("esportazione lista ban")
def export_banned_ips(
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    format: str = Query(
        "json", regex="^(json|csv)$", description="Formato di esportazione"
    ),
):
    """🔒 PROTETTO - Esporta la lista completa degli IP bannati"""
    current_user = get_current_user_and_refresh_token(request, response, credentials)

    result = ban_manager.get_banned_ips(
        limit=10000, automatic_offset=0, manual_offset=0, search_query=""
    )

    if not result["success"]:
        raise HTTPException(status_code=500, detail="Errore durante l'esportazione")

    data = result["data"]
    all_bans = data["automaticBans"] + data["manualBans"]

    if format == "csv":

        import io
        import csv

        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow(
            ["IP", "Tipo", "Timestamp", "Motivo", "Dominio", "Organizzazione", "Paese"]
        )

        for ban in all_bans:
            writer.writerow(
                [
                    ban["ip"],
                    ban["type"],
                    ban["timestamp"],
                    ban.get("reason", ""),
                    ban.get("domain", ""),
                    ban.get("organization", ""),
                    ban.get("country", ""),
                ]
            )

        csv_content = output.getvalue()
        output.close()

        log_manager.log_operation(
            "Lista ban esportata in CSV",
            current_user.get("username"),
            f"Totale ban: {len(all_bans)}",
        )

        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=banned_ips.csv"},
        )

    else:
        log_manager.log_operation(
            "Lista ban esportata in JSON",
            current_user.get("username"),
            f"Totale ban: {len(all_bans)}",
        )

        return response_manager.create_success_response(
            data={
                "bans": all_bans,
                "export_timestamp": datetime.now().isoformat(),
                "total_count": len(all_bans),
            },
            message=f"Esportazione completata: {len(all_bans)} ban",
        )


@app.get("/api/user-info", summary="🔒 Info utente corrente", tags=["Authentication"])
@handle_endpoint_exceptions("recupero info utente")
def get_user_info(
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """🔒 PROTETTO - Ritorna informazioni complete dell'utente incluso stato TOTP"""
    current_user = get_current_user_and_refresh_token(request, response, credentials)
    username = current_user.get("username")

    user_info = auth_manager.get_user_info(username)
    if not user_info:
        raise HTTPException(status_code=404, detail="Utente non trovato")

    totp_status = auth_manager.get_totp_status(username)
    if totp_status["success"]:
        user_info.update(
            {
                "totp_status": {
                    "enabled": totp_status["totp_enabled"],
                    "configured": totp_status["totp_configured"],
                    "activated_at": totp_status["activated_at"],
                    "has_backup_codes": totp_status["has_backup_codes"],
                }
            }
        )

    log_manager.log_operation(
        "Info utente recuperate",
        username,
        f"TOTP abilitato: {totp_status.get('totp_enabled', False)}",
    )

    return response_manager.create_success_response(
        data={"user": user_info}, message="Informazioni utente recuperate"
    )


@app.post("/api/login", tags=["Authentication"])
@handle_endpoint_exceptions("login")
def login(login_request: LoginRequest, response: Response):
    """Login con JWT e supporto TOTP - Imposta cookie httpOnly

    Flusso:
    1. Riceve username e password
    2. Se TOTP è abilitato → risponde con 422 + requires_totp=true (senza token)
    3. Se TOTP è disabilitato → risponde con 200 + token (login completato)
    4. Per completare il login con TOTP: usa /api/login/verify-totp
    """
    import json

    auth_result = auth_manager.verify_credentials(
        login_request.username, login_request.password
    )

    if auth_result.get("requires_totp"):
        log_manager.log_auth_event(
            "Login - TOTP richiesto",
            login_request.username,
            success=False,
            details="2FA necessaria",
        )
        raise HTTPException(
            status_code=422,
            detail=json.dumps(
                {
                    "message": "Autenticazione a due fattori richiesta",
                    "requires_totp": True,
                    "error": auth_result.get("error", "TOTP richiesto"),
                }
            ),
        )

    if not auth_result["authenticated"]:
        log_manager.log_auth_event(
            "Login",
            login_request.username,
            success=False,
            details=auth_result.get("error"),
        )
        raise HTTPException(
            status_code=401, detail=auth_result.get("error", "Credenziali non valide")
        )

    result = token_manager.authenticate_and_create_token(auth_result)

    if not result["success"]:
        log_manager.log_auth_event(
            "Login", login_request.username, success=False, details=result["message"]
        )
        raise HTTPException(status_code=500, detail=result["message"])

    token_manager.set_token_cookie(response, result["access_token"])

    log_manager.log_auth_event("Login", login_request.username, success=True)

    return response_manager.create_success_response(
        message=result["message"],
        extra_fields={
            "requires_password_change": result["requires_password_change"],
            "is_first_login": result["is_first_login"],
            "token_type": result["token_type"],
        },
    )


@app.post("/api/login/verify-totp", tags=["Authentication"])
@handle_endpoint_exceptions("verifica TOTP login")
def verify_totp_login(
    totp_verify_request: "TOTPLoginVerifyRequest", response: Response
):
    """Verifica il codice TOTP e completa il login"""

    result = auth_manager.verify_totp_code(
        totp_verify_request.username, totp_verify_request.totp_code
    )

    if not result["success"]:
        log_manager.log_auth_event(
            "Verifica TOTP",
            totp_verify_request.username,
            success=False,
            details=result.get("message"),
        )
        raise HTTPException(status_code=400, detail=result.get("message"))

    token_result = token_manager.create_access_token_for_user(
        totp_verify_request.username
    )

    if not token_result["success"]:
        log_manager.log_auth_event(
            "Verifica TOTP",
            totp_verify_request.username,
            success=False,
            details=token_result.get("message"),
        )
        raise HTTPException(status_code=500, detail=token_result.get("message"))

    token_manager.set_token_cookie(response, token_result["access_token"])

    log_manager.log_auth_event(
        "Verifica TOTP", totp_verify_request.username, success=True
    )

    return response_manager.create_success_response(
        message="TOTP verificato. Login completato.",
        extra_fields={
            "token_type": "bearer",
            "message": "Login completato con successo",
        },
    )


@app.post("/api/login/verify-backup-codes", tags=["Authentication"])
@handle_endpoint_exceptions("verifica backup codes login")
def verify_backup_codes_login(
    request: "TOTPLoginVerifyBackupCodesRequest", response: Response
):
    """Verifica i codici di backup e completa il login (accesso di recupero)"""

    result = auth_manager.verify_backup_codes(request.username, request.backup_codes)

    if not result["success"]:
        log_manager.log_auth_event(
            "Verifica Backup Codes",
            request.username,
            success=False,
            details=result.get("message"),
        )
        raise HTTPException(status_code=400, detail=result.get("message"))

    token_result = token_manager.create_access_token_for_user(request.username)

    if not token_result["success"]:
        log_manager.log_auth_event(
            "Verifica Backup Codes",
            request.username,
            success=False,
            details=token_result.get("message"),
        )
        raise HTTPException(status_code=500, detail=token_result.get("message"))

    token_manager.set_token_cookie(response, token_result["access_token"])

    log_manager.log_auth_event("Verifica Backup Codes", request.username, success=True)

    return response_manager.create_success_response(
        message="Backup codes verificati. Account ripristinato. Password temporanea generata.",
        extra_fields={
            "token_type": "bearer",
            "message": "Login completato con successo",
            "new_password": result.get("new_password"),
            "requires_password_change": result.get("requires_password_change", False),
            "totp_disabled": True,
        },
    )


@app.post("/api/logout", tags=["Authentication"])
@handle_endpoint_exceptions("logout")
def logout(response: Response):
    """Logout - Rimuove cookie httpOnly"""
    token_manager.delete_token_cookie(response)
    log_manager.log_auth_event("Logout", success=True)

    return response_manager.create_success_response(
        message="Logout eseguito con successo"
    )


@app.get("/api/auth-status", summary="Stato autenticazione", tags=["Authentication"])
@handle_endpoint_exceptions("recupero stato autenticazione")
def auth_status():
    """✅ PUBBLICO - Stato autenticazione del frontend"""
    status_info = auth_manager.get_auth_status()
    log_manager.log_operation(
        "Richiesta stato autenticazione", details=f"Stato: {status_info.get('status')}"
    )
    return status_info


@app.get("/api/token-status", tags=["Authentication"])
@handle_endpoint_exceptions("controllo token status")
def token_status(request: Request):
    """Verifica se il token nei cookie è valido"""
    return token_manager.check_token_status(request)


@app.post(
    "/api/totp/setup",
    response_model=TOTPSetupResponse,
    summary="🔒 Configura TOTP",
    tags=["TOTP"],
)
async def setup_totp(
    request_data: TOTPSetupRequest,
    request: Request,
    response: Response,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    """🔒 PROTETTO - Configura TOTP per l'utente corrente"""
    try:
        from .backend_debug_logger import debug_logger

        username = None

        try:
            current_user = get_current_user_and_refresh_token(
                request, response, credentials
            )
            username = current_user.get("username")
            debug_logger.totp("Username estratto dal token JWT", {"username": username})
        except Exception as e:
            debug_logger.totp(
                f"Token non valido, cerco username nel body: {str(e)[:100]}"
            )

        if not username:
            if request_data.username:
                username = request_data.username
                debug_logger.totp(
                    "Username estratto dal request body", {"username": username}
                )
            else:
                debug_logger.totp(
                    "Username non trovato né nel token né nel body - setup"
                )
                raise HTTPException(status_code=401, detail="Utente non autenticato")

        debug_logger.totp("Inizio configurazione TOTP", {"username": username})

        result = auth_manager.setup_totp(username, request_data.current_password)

        if not result["success"]:
            debug_logger.totp(
                f"Setup TOTP fallito: {result.get('message')}", {"username": username}
            )
            log_manager.log_operation(
                "Configurazione TOTP fallita",
                username,
                result.get("message", "Errore sconosciuto"),
            )
            raise HTTPException(status_code=400, detail=result["message"])

        debug_logger.totp("Setup TOTP riuscito", {"username": username})
        log_manager.log_operation("TOTP configurato - in attesa di conferma", username)

        return TOTPSetupResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Errore interno: {str(e)}")

    debug_logger.totp("Setup TOTP riuscito", {"username": username})
    log_manager.log_operation("TOTP configurato - in attesa di conferma", username)

    return TOTPSetupResponse(**result)


@app.post("/api/totp/confirm", summary="🔒 Conferma configurazione TOTP", tags=["TOTP"])
async def confirm_totp_setup(
    request_data: TOTPConfirmRequest,
    request: Request,
    response: Response,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    """🔒 PROTETTO - Conferma e attiva la configurazione TOTP"""
    try:
        from .backend_debug_logger import debug_logger

        try:
            current_user = get_current_user_and_refresh_token(
                request, response, credentials
            )
            username = current_user.get("username")
            debug_logger.totp("Username estratto dal token JWT", {"username": username})
        except Exception as e:
            debug_logger.totp(f"Token non valido: {str(e)[:100]}")
            raise HTTPException(status_code=401, detail="Utente non autenticato")

        if not username:
            debug_logger.totp("Username non trovato nel token - confirm")
            raise HTTPException(status_code=401, detail="Utente non autenticato")

        debug_logger.totp("Inizio conferma TOTP", {"username": username})

        result = auth_manager.confirm_totp_setup(username, None, request_data.totp_code)

        if not result["success"]:
            debug_logger.totp(
                f"Conferma TOTP fallita: {result.get('message')}",
                {"username": username},
            )
            log_manager.log_operation(
                "Conferma TOTP fallita",
                username,
                result.get("message", "Errore sconosciuto"),
            )
            raise HTTPException(status_code=400, detail=result["message"])

        debug_logger.totp("Conferma TOTP riuscita", {"username": username})
        log_manager.log_operation("TOTP attivato con successo", username)

        return response_manager.create_success_response(
            message=result["message"],
            extra_fields={"backup_codes": result.get("backup_codes", [])},
        )

    except HTTPException:
        raise
    except Exception as e:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Errore interno: {str(e)}")


@app.post("/api/totp/disable", summary="🔒 Disabilita TOTP", tags=["TOTP"])
@handle_endpoint_exceptions("disabilitazione TOTP")
async def disable_totp(
    request_data: TOTPDisableRequest,
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """🔒 PROTETTO - Disabilita TOTP per l'utente corrente"""
    try:
        current_user = get_current_user_and_refresh_token(
            request, response, credentials
        )
        username = current_user.get("username")

        if not username:
            from .backend_debug_logger import debug_logger

            debug_logger.totp("Username non trovato nel token - disable")
            raise HTTPException(status_code=401, detail="Utente non autenticato")
    except HTTPException as e:
        from .backend_debug_logger import debug_logger

        debug_logger.totp(f"Errore autenticazione disable: {e.detail}")
        raise

    from .backend_debug_logger import debug_logger

    debug_logger.totp("Inizio disabilitazione TOTP", {"username": username})

    result = auth_manager.disable_totp(
        username, request_data.current_password, request_data.totp_code
    )

    if not result["success"]:
        debug_logger.totp(
            f"Disabilitazione TOTP fallita: {result.get('message')}",
            {"username": username},
        )
        log_manager.log_operation(
            "Disabilitazione TOTP fallita",
            username,
            result.get("message", "Errore sconosciuto"),
        )
        raise HTTPException(status_code=400, detail=result["message"])

    debug_logger.totp("Disabilitazione TOTP riuscita", {"username": username})
    log_manager.log_operation("TOTP disabilitato con successo", username)

    return response_manager.create_success_response(message=result["message"])


@app.get(
    "/api/totp/status",
    response_model=TOTPStatusResponse,
    summary="🔒 Stato TOTP",
    tags=["TOTP"],
)
@handle_endpoint_exceptions("recupero stato TOTP")
async def get_totp_status(
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """🔒 PROTETTO - Recupera lo stato TOTP dell'utente corrente"""
    try:
        current_user = get_current_user_and_refresh_token(
            request, response, credentials
        )
        username = current_user.get("username")

        if not username:
            from .backend_debug_logger import debug_logger

            debug_logger.totp("Username non trovato nei token")
            raise HTTPException(status_code=401, detail="Utente non autenticato")
    except HTTPException as e:
        from .backend_debug_logger import debug_logger

        debug_logger.totp(f"Errore autenticazione: {e.detail}")
        raise

    result = auth_manager.get_totp_status(username)

    if not result["success"]:
        from .backend_debug_logger import debug_logger

        debug_logger.totp(
            f"Errore recupero TOTP status: {result.get('message')}",
            {"username": username},
        )
        log_manager.log_operation(
            "Errore recupero stato TOTP",
            username,
            result.get("message", "Errore sconosciuto"),
        )
        raise HTTPException(status_code=500, detail=result["message"])

    from .backend_debug_logger import debug_logger

    debug_logger.totp(
        "TOTP status recuperato",
        {
            "username": username,
            "totp_enabled": result["totp_enabled"],
            "totp_configured": result["totp_configured"],
        },
    )

    log_manager.log_operation("Stato TOTP recuperato", username)

    return TOTPStatusResponse(
        success=result["success"],
        totp_enabled=result["totp_enabled"],
        totp_configured=result["totp_configured"],
        activated_at=result["activated_at"],
        has_backup_codes=result["has_backup_codes"],
    )


@app.post(
    "/api/totp/regenerate-backup-codes",
    response_model=BackupCodesResponse,
    summary="🔒 Rigenera codici backup",
    tags=["TOTP"],
)
@handle_endpoint_exceptions("rigenerazione codici backup TOTP")
async def regenerate_backup_codes(
    request_data: BackupCodesRequest,
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """🔒 PROTETTO - Rigenera i codici di backup TOTP"""
    current_user = get_current_user_and_refresh_token(request, response, credentials)
    current_username = current_user.get("username")

    target_username = request_data.username or current_username

    if current_username != target_username and current_user.get("role") != "admin":
        log_manager.log_operation(
            "Tentativo non autorizzato di rigenerare codici backup di un altro utente",
            current_username,
            f"Tentato accesso ai codici di {target_username}",
        )
        raise HTTPException(
            status_code=403,
            detail="Non hai i permessi per rigenerare i codici di backup di questo utente",
        )

    result = auth_manager.regenerate_backup_codes(
        target_username, request_data.current_password, request_data.totp_code
    )

    if not result["success"]:
        log_manager.log_operation(
            "Rigenerazione codici backup fallita",
            target_username,
            result.get("message", "Errore sconosciuto"),
        )
        raise HTTPException(status_code=400, detail=result["message"])

    log_manager.log_operation(
        "Codici backup TOTP rigenerati",
        target_username,
        (
            f"Rigenerati da {current_username}"
            if current_username != target_username
            else "Autorigenerati"
        ),
    )

    return {
        "success": True,
        "message": result.get("message", "Codici di backup rigenerati con successo"),
        "backup_codes": result.get("backup_codes", []),
    }


@app.get(
    "/api/log-lines",
    summary="🔒 Conta le righe del file di log",
    tags=["Logs and info"],
)
@handle_endpoint_exceptions("conteggio righe log")
def get_log_line_count(
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """🔒 PROTETTO - Restituisce quante righe ci sono nel file di log analizzato"""

    current_user_from_token = get_current_user_and_refresh_token(
        request, response, credentials
    )
    username_from_token = current_user_from_token.get("username")

    log_file_path = os.path.join(BASE_DIR, "..", "data", "log", "npm_debug.log")

    line_count = count_file_lines(log_file_path)

    log_manager.log_operation(
        "Conteggio file di log",
        username_from_token,
        f"File: {log_file_path}, Totale righe: {line_count}",
    )

    return response_manager.create_success_response(
        message="Conteggio completato", data={"line_count": line_count}
    )


@app.post(
    "/api/update-credentials",
    summary="🔒 Aggiorna credenziali",
    tags=["Authentication"],
)
@handle_endpoint_exceptions("aggiornamento credenziali")
def update_credentials(
    request_data: PasswordChangeRequest,
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """🔒 PROTETTO - Aggiorna credenziali"""
    current_user_from_token = get_current_user_and_refresh_token(
        request, response, credentials
    )
    username_from_token = current_user_from_token.get("username")

    is_first = auth_manager.is_first_login()
    effective_username_to_update = (
        auth_manager.default_username if is_first else username_from_token
    )

    result = auth_manager.update_credentials(
        effective_username_to_update,
        request_data.current_password,
        request_data.new_username,
        request_data.new_password,
    )

    if not result["success"]:
        log_manager.log_auth_event(
            "Aggiornamento credenziali",
            username_from_token,
            success=False,
            details=result.get("message", "Errore sconosciuto"),
        )
        raise HTTPException(
            status_code=400,
            detail=result.get(
                "message", "Credenziali non valide o errore sconosciuto."
            ),
        )

    log_manager.log_auth_event(
        "Aggiornamento credenziali",
        f"{username_from_token} -> {request_data.new_username}",
        success=True,
    )

    token_manager.delete_token_cookie(response)

    new_access_token = token_manager.create_token_for_updated_credentials(
        username=request_data.new_username,
        is_first_login=False,
        requires_password_change=False,
    )

    token_manager.set_token_cookie(
        response, new_access_token, token_manager.access_token_expire_minutes * 60
    )

    return response_manager.create_success_response(
        message="Credenziali aggiornate con successo!",
        extra_fields={"requires_password_change": False, "is_first_login": False},
    )


@app.post(
    "/api/verify-credentials",
    summary="🔒 Verifica credenziali",
    tags=["Authentication"],
)
@handle_endpoint_exceptions("verifica credenziali")
def verify_credentials(
    creds: LoginRequest,
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """🔒 PROTETTO - Verifica credenziali"""
    current_user = get_current_user_and_refresh_token(request, response, credentials)

    if not auth_manager.authenticate_custom(creds.username, creds.password):
        log_manager.log_auth_event(
            "Verifica credenziali",
            creds.username,
            success=False,
            details=f"Richiesta da utente JWT: '{current_user.get('username')}'",
        )
        raise HTTPException(
            status_code=401, detail="Accesso non autorizzato: credenziali non valide"
        )

    log_manager.log_auth_event(
        "Verifica credenziali",
        creds.username,
        success=True,
        details=f"Richiesta da utente JWT: '{current_user.get('username')}'",
    )

    return response_manager.create_success_response(message="Credenziali valide")


@app.get(
    "/api/credentials-exist",
    summary="🔒 Controlla esistenza credenziali",
    tags=["Authentication"],
)
@handle_endpoint_exceptions("controllo esistenza credenziali")
def credentials_exist(
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """🔒 PROTETTO - Controlla esistenza credenziali"""
    current_user = get_current_user_and_refresh_token(request, response, credentials)

    exists = auth_manager.credentials_exist()
    is_first = auth_manager.is_first_login()

    log_manager.log_operation(
        "Controllo esistenza credenziali",
        current_user.get("username"),
        f"Esistono: {exists}, Primo login: {is_first}",
    )

    return {"exists": exists, "is_first_login": is_first}


@app.get(
    "/api/whitelist/entries", summary="🔒 Lists entries whitelist", tags=["Whitelist"]
)
@handle_endpoint_exceptions("recupero entries whitelist")
def get_whitelist_entries(
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    search: Optional[str] = Query(None),
):
    """🔒 PROTETTO - Lista entries whitelist"""
    current_user = get_current_user_and_refresh_token(request, response, credentials)

    entries = (
        whitelist_manager.search_entries(search)
        if search
        else whitelist_manager.get_entries()
    )

    log_manager.log_operation(
        "Richiesta elenco whitelist",
        current_user.get("username"),
        f"ricerca: '{search if search else 'N/A'}', trovate {len(entries)} entries",
    )

    return response_manager.create_success_response(
        extra_fields={"entries": entries, "total": len(entries)}
    )


@app.post(
    "/api/whitelist/entries", summary="🔒 Add entry whitelist", tags=["Whitelist"]
)
@handle_endpoint_exceptions("aggiunta entry whitelist")
def add_whitelist_entry(
    entry: WhitelistEntry,
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """🔒 PROTETTO - Aggiungi entry whitelist"""
    current_user = get_current_user_and_refresh_token(request, response, credentials)

    result = whitelist_manager.add_entry(entry)
    if not result["success"]:
        log_manager.log_operation(
            "Tentativo aggiunta entry whitelist fallito",
            current_user.get("username"),
            f"Tipo='{entry.type}', Valore='{entry.value}' - {result.get('message', 'Errore sconosciuto')}",
        )
        raise HTTPException(
            status_code=400,
            detail=result.get(
                "message", "Impossibile aggiungere l'entry alla whitelist"
            ),
        )

    log_manager.log_operation(
        "Entry whitelist aggiunta",
        current_user.get("username"),
        f"Tipo='{entry.type}', Valore='{entry.value}', Descrizione='{entry.description}'",
    )

    return result


@app.delete(
    "/api/whitelist/entries", summary="🔒 Remove entry whitelist", tags=["Whitelist"]
)
@handle_endpoint_exceptions("rimozione entry whitelist")
def remove_whitelist_entry(
    entry: RemoveWhitelistEntry,
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """🔒 PROTETTO - Rimuovi entry whitelist"""
    current_user = get_current_user_and_refresh_token(request, response, credentials)

    result = whitelist_manager.remove_entry(entry.type, entry.value)
    if not result["success"]:
        log_manager.log_operation(
            "Tentativo rimozione entry whitelist fallito",
            current_user.get("username"),
            f"Tipo='{entry.type}', Valore='{entry.value}' - {result.get('message', 'Errore sconosciuto')}",
        )
        raise HTTPException(
            status_code=404,
            detail=result.get("message", "Entry non trovata o impossibile rimuovere"),
        )

    log_manager.log_operation(
        "Entry whitelist rimossa",
        current_user.get("username"),
        f"Tipo='{entry.type}', Valore='{entry.value}'",
    )

    return result


@app.put(
    "/api/whitelist/entries", summary="🔒 Update entry whitelist", tags=["Whitelist"]
)
@handle_endpoint_exceptions("aggiornamento entry whitelist")
def update_whitelist_entry(
    entry: UpdateWhitelistEntry,
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """🔒 PROTETTO - Aggiorna entry whitelist"""
    current_user = get_current_user_and_refresh_token(request, response, credentials)

    result = whitelist_manager.update_entry(entry.type, entry.value, entry.description)
    if not result["success"]:
        log_manager.log_operation(
            "Tentativo aggiornamento entry whitelist fallito",
            current_user.get("username"),
            f"Tipo='{entry.type}', Valore='{entry.value}' - {result.get('message', 'Errore sconosciuto')}",
        )
        raise HTTPException(
            status_code=404,
            detail=result.get("message", "Entry non trovata o impossibile aggiornare"),
        )

    log_manager.log_operation(
        "Entry whitelist aggiornata",
        current_user.get("username"),
        f"Tipo='{entry.type}', Valore='{entry.value}', Nuova Descrizione='{entry.description}'",
    )

    return result


@app.get(
    "/api/whitelist/stats", summary="🔒 Get whitelist statistics", tags=["Whitelist"]
)
@handle_endpoint_exceptions("recupero statistiche whitelist")
def get_whitelist_stats(
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """🔒 PROTETTO - Statistiche whitelist"""
    current_user = get_current_user_and_refresh_token(request, response, credentials)

    stats = whitelist_manager.get_stats()
    log_manager.log_operation(
        "Richiesta statistiche whitelist", current_user.get("username")
    )

    return response_manager.create_success_response(extra_fields={"stats": stats})


@app.get(
    "/api/whitelist/metadata", summary="🔒 Get whitelist metadata", tags=["Whitelist"]
)
@handle_endpoint_exceptions("recupero metadata whitelist")
def get_whitelist_metadata(
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """🔒 PROTETTO - Metadata whitelist"""
    current_user = get_current_user_and_refresh_token(request, response, credentials)

    metadata = whitelist_manager.get_metadata()
    log_manager.log_operation(
        "Richiesta metadata whitelist", current_user.get("username")
    )

    return response_manager.create_success_response(extra_fields={"metadata": metadata})


@app.get(
    "/api/config",
    summary="🔒 Recupera la configurazione del sistema",
    tags=["Configuration"],
)
@handle_endpoint_exceptions("recupero configurazione")
async def get_system_config(
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """🔒 PROTETTO - Restituisce la configurazione attuale del sistema NGINX Shield."""
    current_user = get_current_user_and_refresh_token(request, response, credentials)

    log_manager.log_operation("Richiesta configurazione", current_user.get("username"))
    current_config = config_manager.get_config()

    return JSONResponse(content=current_config, status_code=200)


@app.post(
    "/api/config",
    summary="🔒 Aggiorna la configurazione del sistema",
    tags=["Configuration"],
)
@handle_endpoint_exceptions("aggiornamento configurazione")
async def update_system_config(
    new_settings: ConfigUpdate,
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """🔒 PROTETTO - Aggiorna la configurazione del sistema NGINX Shield con i nuovi valori forniti."""
    current_user = get_current_user_and_refresh_token(request, response, credentials)

    log_manager.log_operation(
        "Tentativo aggiornamento configurazione", current_user.get("username")
    )

    settings_dict = new_settings.model_dump()
    config_manager.update_config(settings_dict)

    log_manager.log_operation(
        "Configurazione aggiornata con successo", current_user.get("username")
    )

    return JSONResponse(
        content={"message": "Configurazione aggiornata con successo."}, status_code=200
    )


@app.get("/api/system/status", summary="🔒 Stato del sistema", tags=["System"])
@handle_endpoint_exceptions("recupero stato del sistema")
def get_system_status(
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    🔒 PROTETTO - Recupera lo stato in tempo reale del sistema, includendo:
    - **Uso CPU (%)**
    - **Uso RAM (%)**
    - **Temperatura CPU (°C)** (se disponibile)
    - **Stato dei servizi critici** (Nginx, Fail2Ban)
    """
    current_user = get_current_user_and_refresh_token(request, response, credentials)
    log_manager.log_operation(
        "Richiesta stato del sistema", current_user.get("username")
    )

    status_data = system_monitor.get_status()

    return response_manager.create_success_response(
        data=status_data, message="Stato del sistema recuperato con successo."
    )


@app.get("/api/system/history", summary="📊 Storico del sistema", tags=["System"])
@handle_endpoint_exceptions("recupero storico del sistema")
def get_system_history(
    hours: float = Query(
        1,
        ge=1,
        le=720,
        description="Numero di ore da visualizzare (default: 1 ora, max: 720=30 giorni)",
    ),
    request: Request = None,
    response: Response = None,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    🔒 PROTETTO - Recupera i dati storici del sistema dal CSV
    - **hours**: Numero di ore da visualizzare (default: 1 ora, max: 720 = 30 giorni)
    - Ritorna array di punti dati con timestamp, temperature, cpuUsage, ramUsage
    """
    from datetime import datetime, timedelta
    import csv
    import os

    current_user = get_current_user_and_refresh_token(request, response, credentials)
    log_manager.log_operation(
        "Richiesta storico sistema", current_user.get("username"), f"Ultime {hours} ore"
    )

    csv_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "data/log/system_status_log.csv",
    )

    if not os.path.exists(csv_path):
        raise HTTPException(status_code=404, detail="File storico non trovato")

    cutoff_time = datetime.utcnow() - timedelta(hours=hours)

    data_points = []
    try:
        with open(csv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:

                try:
                    timestamp = datetime.fromisoformat(
                        row["timestamp"].replace("Z", "+00:00")
                    )

                    if timestamp >= cutoff_time:
                        data_points.append(
                            {
                                "timestamp": row["timestamp"],
                                "temperature": float(row["temperature"]),
                                "cpuUsage": float(row["cpuUsage"]),
                                "ramUsage": float(row["ramUsage"]),
                            }
                        )
                except (ValueError, KeyError) as e:

                    continue
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Errore lettura file storico: {str(e)}"
        )

    return response_manager.create_success_response(
        data={"data_points": data_points, "hours": hours},
        message=f"Storico sistema recuperato: {len(data_points)} punti dati",
    )


@app.get("/api/health", summary="✅ Health Check", tags=["System"])
def health_check():
    """✅ PUBBLICO - Health check con informazioni di sicurezza"""
    from .secure_config_manager import secure_config_manager

    try:
        secure_cookies_enabled = secure_config_manager.get_secure_cookies_enabled()
    except Exception:
        secure_cookies_enabled = os.getenv("SECURE_COOKIES", "true").lower() == "true"

    log_manager.log_operation(
        "Health check richiesto", details="Servizio NGINX Shield: healthy"
    )

    return {
        "status": "healthy",
        "service": "NGINX Shield",
        "timestamp": datetime.now().isoformat(),
        "components": {"auth": "operational", "whitelist": "operational"},
        "security": {
            "secure_cookies_enabled": secure_cookies_enabled,
            "access_mode": "https_only" if secure_cookies_enabled else "http_allowed",
        },
    }


@app.get("/api/mail/config", summary="🔒 Recupera configurazione email", tags=["Mail"])
@handle_endpoint_exceptions("recupero configurazione email")
def get_mail_config(
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """🔒 PROTETTO - Recupera configurazione email"""
    current_user = get_current_user_and_refresh_token(request, response, credentials)

    try:
        config = mail_manager.get_mail_config()
        log_manager.log_operation(
            "Recuperata configurazione email", current_user.get("username")
        )
        return response_manager.create_success_response(extra_fields={"config": config})
    except Exception as e:
        log_manager.log_operation(
            "Errore durante il recupero della configurazione email",
            current_user.get("username"),
            str(e),
        )
        raise HTTPException(
            status_code=500,
            detail="Errore durante il recupero della configurazione email",
        )


@app.put("/api/mail/config", summary="🔒 Aggiorna configurazione email", tags=["Mail"])
@handle_endpoint_exceptions("aggiornamento configurazione email")
def update_mail_config(
    updated_config: MailConfigUpdate,
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """🔒 PROTETTO - Aggiorna configurazione email"""
    current_user = get_current_user_and_refresh_token(request, response, credentials)

    try:
        config_dict = updated_config.dict()
        config_dict["from"] = config_dict.pop("from_")

        result = mail_manager.update_mail_config(config_dict)
        log_manager.log_operation(
            "Configurazione email aggiornata", current_user.get("username")
        )
        return response_manager.create_success_response(extra_fields=result)
    except ValueError as ve:
        log_manager.log_operation(
            "Errore validazione configurazione email",
            current_user.get("username"),
            str(ve),
        )
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        log_manager.log_operation(
            "Errore aggiornamento configurazione email",
            current_user.get("username"),
            str(e),
        )
        raise HTTPException(
            status_code=500,
            detail="Errore durante l'aggiornamento della configurazione email",
        )


@app.get(
    "/api/logs/available",
    summary="🔒 Recupera lista di file log disponibili",
    tags=["Logs and info"],
)
@handle_endpoint_exceptions("recupero log disponibili")
def get_available_logs(
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """🔒 PROTETTO - Recupera lista di file log disponibili"""
    current_user = get_current_user_and_refresh_token(request, response, credentials)

    try:
        available_logs = log_manager_api.get_available_logs()
        log_manager.log_operation(
            "Recuperata lista log disponibili", current_user.get("username")
        )
        return response_manager.create_success_response(
            extra_fields={"available_logs": available_logs}
        )
    except Exception as e:
        log_manager.log_operation(
            "Errore recupero log disponibili", current_user.get("username"), str(e)
        )
        raise HTTPException(
            status_code=500, detail="Errore durante il recupero dei log disponibili"
        )


@app.get(
    "/api/logs",
    summary="🔒 Recupera logs con filtri e paginazione",
    tags=["Logs and info"],
)
@handle_endpoint_exceptions("recupero logs")
def get_logs(
    log_type: str = Query("npm_debug", description="Tipo di log da recuperare"),
    limit: Optional[int] = Query(
        1500, description="Numero massimo di log da ritornare (default: 1500)"
    ),
    offset: int = Query(0, description="Numero di log da saltare (paginazione)"),
    search: Optional[str] = Query(None, description="Stringa di ricerca nei log"),
    *,
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """🔒 PROTETTO - Recupera logs con filtri e paginazione

    Parametri:
    - log_type: Tipo di log (default: npm_debug)
    - limit: Numero massimo di risultati (default: 1500)
    - offset: Skip N risultati per paginazione (default: 0)
    - search: Filtra logs che contengono questo testo
    """
    current_user = get_current_user_and_refresh_token(request, response, credentials)

    try:
        result = log_manager_api.get_logs(
            log_type=log_type, limit=limit, offset=offset, search=search
        )

        log_manager.log_operation(
            f"Recuperati logs {log_type}",
            current_user.get("username"),
            f"limit={limit}, offset={offset}, search={search}",
        )

        return response_manager.create_success_response(extra_fields=result)
    except Exception as e:
        log_manager.log_operation(
            f"Errore recupero logs {log_type}", current_user.get("username"), str(e)
        )
        raise HTTPException(
            status_code=500, detail="Errore durante il recupero dei logs"
        )


@app.get(
    "/api/logs/stats",
    summary="🔒 Recupera statistiche su un file di log",
    tags=["Logs and info"],
)
@handle_endpoint_exceptions("recupero statistiche log")
def get_logs_stats(
    log_type: str = Query("npm_debug", description="Tipo di log"),
    *,
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """🔒 PROTETTO - Recupera statistiche su un file di log

    Ritorna:
    - exists: Se il file esiste
    - file_size_bytes: Dimensione in bytes
    - file_size_kb: Dimensione in KB
    - line_count: Numero di linee
    - last_modified: Data ultima modifica
    """
    current_user = get_current_user_and_refresh_token(request, response, credentials)

    try:
        stats = log_manager_api.get_logs_stats(log_type=log_type)
        log_manager.log_operation(
            f"Recuperate statistiche log {log_type}", current_user.get("username")
        )
        return response_manager.create_success_response(extra_fields=stats)
    except Exception as e:
        log_manager.log_operation(
            f"Errore recupero statistiche log {log_type}",
            current_user.get("username"),
            str(e),
        )
        raise HTTPException(
            status_code=500, detail="Errore durante il recupero delle statistiche"
        )


@app.get("/api/logs/search", summary="🔒 Ricerca nei logs", tags=["Logs and info"])
@handle_endpoint_exceptions("ricerca nei logs")
def search_logs(
    log_type: str = Query("npm_debug", description="Tipo di log da cercare"),
    query: str = Query("", description="Query di ricerca"),
    limit: int = Query(100, description="Numero massimo di risultati"),
    *,
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """🔒 PROTETTO - Ricerca nei logs

    Parametri:
    - log_type: Tipo di log (default: npm_debug)
    - query: Stringa da cercare (case-insensitive)
    - limit: Massimo numero di risultati (default: 100)
    """
    current_user = get_current_user_and_refresh_token(request, response, credentials)

    try:
        result = log_manager_api.search_logs(
            log_type=log_type, query=query, limit=limit
        )

        log_manager.log_operation(
            f"Ricerca nei logs {log_type}",
            current_user.get("username"),
            f"query='{query}', limit={limit}",
        )

        return response_manager.create_success_response(extra_fields=result)
    except Exception as e:
        log_manager.log_operation(
            f"Errore ricerca nei logs {log_type}", current_user.get("username"), str(e)
        )
        raise HTTPException(
            status_code=500, detail="Errore durante la ricerca nei logs"
        )


@app.get("/api/patterns", summary="🔒 Recupero pattern", tags=["Patterns"])
@handle_endpoint_exceptions("recupero pattern")
def get_patterns(
    pattern_type: str = Query(
        "all",
        description="Tipo di pattern: user_agent, url, dangerous_ua, dangerous_url, all",
    ),
    *,
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """🔒 PROTETTO - Recupera i pattern di rilevamento

    Parametri:
    - pattern_type: Tipo di pattern da recuperare (default: all)
    """
    current_user = get_current_user_and_refresh_token(request, response, credentials)

    try:
        patterns = pattern_manager.get_patterns(pattern_type)
        stats = pattern_manager.get_stats()

        log_manager.log_operation(
            "Recuperati pattern",
            current_user.get("username"),
            f"pattern_type={pattern_type}",
        )

        return response_manager.create_success_response(
            extra_fields={"patterns": patterns, "stats": stats}
        )
    except Exception as e:
        log_manager.log_operation(
            "Errore recupero pattern", current_user.get("username"), str(e)
        )
        raise HTTPException(
            status_code=500, detail="Errore durante il recupero dei pattern"
        )


@app.post("/api/patterns", summary="🔒 Aggiunta pattern", tags=["Patterns"])
@handle_endpoint_exceptions("aggiunta pattern")
def add_pattern(
    pattern_type: str = Query(
        ..., description="Tipo di pattern: user_agent, url, dangerous_ua, dangerous_url"
    ),
    pattern: str = Query(..., description="Pattern regex"),
    description: str = Query("", description="Descrizione del pattern"),
    *,
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """🔒 PROTETTO - Aggiunge un nuovo pattern

    Parametri:
    - pattern_type: Tipo di pattern da aggiungere
    - pattern: Pattern regex
    - description: Descrizione opzionale
    """
    current_user = get_current_user_and_refresh_token(request, response, credentials)

    try:
        result = pattern_manager.add_pattern(
            pattern_type=pattern_type, pattern=pattern, description=description
        )

        if not result.get("success"):
            log_manager.log_operation(
                f"Tentativo fallito aggiunta pattern {pattern_type}",
                current_user.get("username"),
                result.get("error"),
            )
            raise HTTPException(status_code=400, detail=result.get("error"))

        log_manager.log_operation(
            f"Pattern {pattern_type} aggiunto",
            current_user.get("username"),
            f"pattern={pattern}",
        )

        return response_manager.create_success_response(extra_fields=result)
    except HTTPException:
        raise
    except Exception as e:
        log_manager.log_operation(
            "Errore aggiunta pattern", current_user.get("username"), str(e)
        )
        raise HTTPException(
            status_code=500, detail="Errore durante l'aggiunta del pattern"
        )


@app.delete(
    "/api/patterns/{pattern_type}/{pattern_id}",
    summary="🔒 Rimozione pattern",
    tags=["Patterns"],
)
@handle_endpoint_exceptions("rimozione pattern")
def remove_pattern(
    pattern_type: str,
    pattern_id: str,
    *,
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """🔒 PROTETTO - Rimuove un pattern

    Parametri:
    - pattern_type: Tipo di pattern
    - pattern_id: ID del pattern da rimuovere
    """
    current_user = get_current_user_and_refresh_token(request, response, credentials)

    try:
        result = pattern_manager.remove_pattern(
            pattern_type=pattern_type, pattern_id=pattern_id
        )

        if not result.get("success"):
            log_manager.log_operation(
                f"Tentativo fallito rimozione pattern {pattern_type}",
                current_user.get("username"),
                result.get("error"),
            )
            raise HTTPException(status_code=400, detail=result.get("error"))

        log_manager.log_operation(
            f"Pattern {pattern_type} rimosso",
            current_user.get("username"),
            f"pattern_id={pattern_id}",
        )

        return response_manager.create_success_response(extra_fields=result)
    except HTTPException:
        raise
    except Exception as e:
        log_manager.log_operation(
            "Errore rimozione pattern", current_user.get("username"), str(e)
        )
        raise HTTPException(
            status_code=500, detail="Errore durante la rimozione del pattern"
        )


@app.put(
    "/api/patterns/{pattern_type}/{pattern_id}",
    summary="🔒 Aggiornamento pattern",
    tags=["Patterns"],
)
@handle_endpoint_exceptions("aggiornamento pattern")
def update_pattern(
    pattern_type: str,
    pattern_id: str,
    pattern: str = Query(..., description="Nuovo pattern regex"),
    description: str = Query("", description="Nuova descrizione"),
    *,
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """🔒 PROTETTO - Aggiorna un pattern esistente

    Parametri:
    - pattern_type: Tipo di pattern
    - pattern_id: ID del pattern da aggiornare
    - pattern: Nuovo pattern regex
    - description: Nuova descrizione
    """
    current_user = get_current_user_and_refresh_token(request, response, credentials)

    try:
        result = pattern_manager.update_pattern(
            pattern_type=pattern_type,
            pattern_id=pattern_id,
            pattern=pattern,
            description=description,
        )

        if not result.get("success"):
            log_manager.log_operation(
                f"Tentativo fallito aggiornamento pattern {pattern_type}",
                current_user.get("username"),
                result.get("error"),
            )
            raise HTTPException(status_code=400, detail=result.get("error"))

        log_manager.log_operation(
            f"Pattern {pattern_type} aggiornato",
            current_user.get("username"),
            f"pattern_id={pattern_id}",
        )

        return response_manager.create_success_response(extra_fields=result)
    except HTTPException:
        raise
    except Exception as e:
        log_manager.log_operation(
            "Errore aggiornamento pattern", current_user.get("username"), str(e)
        )
        raise HTTPException(
            status_code=500, detail="Errore durante l'aggiornamento del pattern"
        )


@app.get(
    "/api/patterns/stats", summary="🔒 Recupero statistiche pattern", tags=["Patterns"]
)
@handle_endpoint_exceptions("recupero statistiche pattern")
def get_pattern_stats(
    *,
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """🔒 PROTETTO - Recupera le statistiche sui pattern"""
    current_user = get_current_user_and_refresh_token(request, response, credentials)

    try:
        stats = pattern_manager.get_stats()

        log_manager.log_operation(
            "Recuperate statistiche pattern", current_user.get("username")
        )

        return response_manager.create_success_response(extra_fields={"stats": stats})
    except Exception as e:
        log_manager.log_operation(
            "Errore recupero statistiche pattern", current_user.get("username"), str(e)
        )
        raise HTTPException(
            status_code=500, detail="Errore durante il recupero delle statistiche"
        )


@app.get(
    "/api/secure-config",
    summary="🔒 Ottieni configurazione sicurezza",
    tags=["Secure Config"],
)
@handle_endpoint_exceptions("lettura configurazione sicurezza")
async def get_secure_config(
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """🔒 PROTETTO - Restituisce la configurazione di sicurezza (SECURE_COOKIES)"""
    try:
        current_user = get_current_user_and_refresh_token(
            request, response, credentials
        )
        username = current_user.get("username")

        result = secure_config_manager.get_config()
        log_manager.log_operation("Configurazione sicurezza letta", username)

        return response_manager.create_success_response(extra_fields=result)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Errore durante la lettura della configurazione: {str(e)}",
        )


@app.post(
    "/api/secure-config",
    summary="🔒 Aggiorna configurazione sicurezza",
    tags=["Secure Config"],
)
@handle_endpoint_exceptions("aggiornamento configurazione sicurezza")
async def update_secure_config(
    config_data: Dict[str, Any],
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """🔒 PROTETTO - Aggiorna la configurazione di sicurezza (SECURE_COOKIES)"""
    try:
        current_user = get_current_user_and_refresh_token(
            request, response, credentials
        )
        username = current_user.get("username")

        if "SECURE_COOKIES" not in config_data:
            raise HTTPException(status_code=400, detail="Campo SECURE_COOKIES mancante")

        secure_cookies = bool(config_data["SECURE_COOKIES"])
        result = secure_config_manager.update_config(secure_cookies)

        if not result["success"]:
            raise HTTPException(
                status_code=400, detail=result.get("message", "Errore aggiornamento")
            )

        log_manager.log_operation(
            "Configurazione sicurezza aggiornata",
            username,
            f"SECURE_COOKIES={secure_cookies}",
        )

        return response_manager.create_success_response(extra_fields=result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Errore durante l'aggiornamento: {str(e)}"
        )


@app.post(
    "/api/services/restart/{service_name}",
    summary="🔒 Riavvia un servizio",
    tags=["Service Management"],
)
@handle_endpoint_exceptions("restart servizio")
async def restart_service(
    service_name: str,
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """🔒 PROTETTO - Riavvia un servizio (backend, frontend, analyzer, geolocate)"""
    current_user = get_current_user_and_refresh_token(request, response, credentials)
    username = current_user.get("username")

    result = service_manager.request_restart(service_name)

    if not result["success"]:
        log_manager.log_operation(
            "Tentativo restart servizio fallito",
            username,
            f"Servizio: {service_name}, Errore: {result.get('message')}",
        )
        raise HTTPException(status_code=400, detail=result["message"])

    log_manager.log_operation(
        "Restart servizio richiesto", username, f"Servizio: {service_name}"
    )

    return response_manager.create_success_response(
        data=result, message=result["message"]
    )


@app.get(
    "/api/services/restart-status/{service_name}",
    summary="🔒 Stato restart servizio",
    tags=["Service Management"],
)
@handle_endpoint_exceptions("recupero stato restart")
async def get_restart_status(
    service_name: str,
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """🔒 PROTETTO - Verifica lo stato del restart di un servizio"""
    current_user = get_current_user_and_refresh_token(request, response, credentials)

    result = service_manager.get_restart_status(service_name)

    if not result["success"]:
        log_manager.log_operation(
            "Errore verificazione stato restart",
            current_user.get("username"),
            f"Servizio: {service_name}",
        )
        raise HTTPException(status_code=400, detail=result["message"])

    return response_manager.create_success_response(
        data=result, message="Stato del restart recuperato"
    )


@app.get(
    "/api/services/pending-restarts",
    summary="🔒 Restart in sospeso",
    tags=["Service Management"],
)
@handle_endpoint_exceptions("recupero restart in sospeso")
async def get_pending_restarts(
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """🔒 PROTETTO - Restituisce lista di servizi con restart in sospeso"""
    current_user = get_current_user_and_refresh_token(request, response, credentials)

    pending = service_manager.get_all_pending_restarts()

    log_manager.log_operation(
        "Recuperati restart in sospeso",
        current_user.get("username"),
        f"Servizi: {', '.join(pending)if pending else 'nessuno'}",
    )

    return response_manager.create_success_response(
        data={"pending_restarts": pending, "count": len(pending)},
        message=f"Trovati {len(pending)} restart in sospeso",
    )


dist_dir = os.path.join(os.path.dirname(BASE_DIR), "dist")
index_file = os.path.join(dist_dir, "index.html")


@app.get("/{full_path:path}", summary="Serve SPA frontend", tags=["Frontend"])
async def serve_spa(full_path: str):
    """Serve index.html per tutte le rotte non-API, permettendo a React Router di gestire il routing"""

    file_path = os.path.join(dist_dir, full_path)
    if os.path.isfile(file_path):
        return FileResponse(file_path)

    if os.path.isfile(index_file):
        return FileResponse(index_file)

    return {"detail": "Not Found"}


if os.path.exists(dist_dir):
    print(f"[OK] Frontend servito da {dist_dir}")
else:
    print(f"[WARNING] Attenzione: cartella dist non trovata in {dist_dir}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)

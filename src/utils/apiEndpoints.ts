interface EndpointDefinition {
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  description: string;
  authRequired: boolean;
  requestBody?: string;
  responseBody?: string;
  headers?: string[];
  queryParams?: string;
}

export const API_ENDPOINTS = {
  LOGIN: {
    path: "/login",
    method: "POST",
    description: "Effettua il login dell'utente e restituisce un token JWT.",
    authRequired: false,
    requestBody: "{ username: string; password: string }",
    responseBody:
      "{ success: boolean; message: string; requires_password_change: boolean; is_first_login: boolean; access_token: string; token_type: string }",
  } as EndpointDefinition,
  LOGOUT: {
    path: "/logout",
    method: "POST",
    description: "Effettua il logout (invalida il token sul frontend).",
    authRequired: false,
    responseBody: "{ success: boolean; message: string; timestamp: string }",
  } as EndpointDefinition,
  AUTH_STATUS: {
    path: "/auth-status",
    method: "GET",
    description:
      "Controlla lo stato di autenticazione attuale (es. primo accesso, cambio password richiesto).",
    authRequired: false,
    responseBody:
      "{ logged_in: boolean; is_first_login: boolean; requires_password_change: boolean }",
  } as EndpointDefinition,

  UPDATE_CREDENTIALS: {
    path: "/update-credentials",
    method: "POST",
    description: "Aggiorna le credenziali di accesso dell'utente.",
    authRequired: true,
    requestBody:
      "{ current_password: string; new_username: string; new_password: string }",
    responseBody: "{ success: boolean; message: string }",
  } as EndpointDefinition,
  VERIFY_CREDENTIALS: {
    path: "/verify-credentials",
    method: "POST",
    description:
      "Verifica un set di credenziali fornite per l'utente corrente.",
    authRequired: true,
    requestBody: "{ username: string; password: string }",
    responseBody: "{ success: boolean; message: string }",
  } as EndpointDefinition,
  CREDENTIALS_EXIST: {
    path: "/credentials-exist",
    method: "GET",
    description: "Verifica se esistono credenziali impostate nel backend.",
    authRequired: true,
    responseBody: "{ exists: boolean; is_first_login: boolean }",
  } as EndpointDefinition,
  USER_INFO: {
    path: "/user-info",
    method: "GET",
    description:
      "Restituisce il nome utente corrente e la data dell'ultima modifica password.",
    authRequired: true,
    responseBody:
      "{ success: boolean; user: { username: string; last_password_update: string } }",
  } as EndpointDefinition,

  GET_WHITELIST_ENTRIES: {
    path: "/whitelist/entries",
    method: "GET",
    description: "Ottiene tutte le entry della whitelist. Supporta la ricerca.",
    authRequired: true,
    queryParams: "search?: string (filtra le entry per valore o descrizione)",
    responseBody:
      "{ success: boolean; entries: WhitelistEntry[]; total: number; timestamp: string }",
  } as EndpointDefinition,
  ADD_WHITELIST_ENTRY: {
    path: "/whitelist/entries",
    method: "POST",
    description: "Aggiunge una nuova entry alla whitelist.",
    authRequired: true,
    requestBody:
      '{ type: "ip" | "cidr" | "domain"; value: string; description: string }',
    responseBody:
      "{ success: boolean; message: string; entry: WhitelistEntry }",
  } as EndpointDefinition,
  REMOVE_WHITELIST_ENTRY: {
    path: "/whitelist/entries",
    method: "DELETE",
    description: "Rimuove una entry specifica dalla whitelist.",
    authRequired: true,
    requestBody: '{ type: "ip" | "cidr" | "domain"; value: string }',
    responseBody: "{ success: boolean; message: string }",
  } as EndpointDefinition,
  UPDATE_WHITELIST_ENTRY: {
    path: "/whitelist/entries",
    method: "PUT",
    description:
      "Aggiorna la descrizione di una entry esistente nella whitelist.",
    authRequired: true,
    requestBody:
      '{ type: "ip" | "cidr" | "domain"; value: string; description: string }',
    responseBody: "{ success: boolean; message: string }",
  } as EndpointDefinition,
  GET_WHITELIST_STATS: {
    path: "/whitelist/stats",
    method: "GET",
    description:
      "Ottiene le statistiche aggregate sulla whitelist (numero di entry per tipo, etc.).",
    authRequired: true,
    responseBody:
      "{ success: boolean; stats: { total_entries: number; by_type: Record<string, number>; created: string; last_modified: string; version: string }; timestamp: string }",
  } as EndpointDefinition,
  GET_WHITELIST_METADATA: {
    path: "/whitelist/metadata",
    method: "GET",
    description:
      "Ottiene i metadata relativi al file della whitelist (data creazione, ultima modifica, versione).",
    authRequired: true,
    responseBody:
      "{ success: boolean; metadata: { created: string; last_modified: string; version: string }; timestamp: string }",
  } as EndpointDefinition,

  GET_SYSTEM_CONFIG: {
    path: "/config",
    method: "GET",
    description: "Recupera la configurazione attuale del sistema NGINX Shield.",
    authRequired: true,
    responseBody:
      "{ LOG_DIR: string; IGNORE_WHITELIST: boolean; ENABLE_WHITELIST_LOG: boolean; CODES_TO_ALLOW: number[]; MAX_REQUESTS: number; TIME_FRAME: number; JAIL_NAME: string }",
  } as EndpointDefinition,
  UPDATE_SYSTEM_CONFIG: {
    path: "/config",
    method: "POST",
    description:
      "Aggiorna la configurazione del sistema NGINX Shield con i nuovi valori forniti.",
    authRequired: true,
    requestBody:
      "{ LOG_DIR: string; IGNORE_WHITELIST: boolean; ENABLE_WHITELIST_LOG: boolean; CODES_TO_ALLOW: number[]; MAX_REQUESTS: number; TIME_FRAME: number; JAIL_NAME: string }",
    responseBody: "{ message: string }",
  } as EndpointDefinition,

  GET_MAIL_CONFIG: {
    path: "/mail/config",
    method: "GET",
    description: "Recupera la configurazione email corrente.",
    authRequired: true,
    responseBody:
      "{ success: boolean; config: { enabled: boolean; smtp_server: string; smtp_port: number; use_tls: boolean; username: string; password: string; from: string; to: string[]; subject: string } }",
  } as EndpointDefinition,
  UPDATE_MAIL_CONFIG: {
    path: "/mail/config",
    method: "PUT",
    description: "Aggiorna la configurazione email.",
    authRequired: true,
    requestBody:
      "{ enabled: boolean; smtp_server: string; smtp_port: number; use_tls: boolean; username: string; password: string; from_: string; to: string[]; subject: string }",
    responseBody: "{ success: boolean; message: string }",
  } as EndpointDefinition,

  GET_SYSTEM_STATUS: {
    path: "/system/status",
    method: "GET",
    description:
      "🔒 PROTETTO - Recupera lo stato in tempo reale del sistema, includendo uso CPU, RAM, temperatura e stato dei servizi critici.",
    authRequired: true,
    responseBody:
      "{ success: boolean; data: SystemStatusData; message: string }",
  } as EndpointDefinition,

  GET_AVAILABLE_LOGS: {
    path: "/logs/available",
    method: "GET",
    description: "🔒 PROTETTO - Recupera lista di file log disponibili",
    authRequired: true,
    responseBody:
      "{ success: boolean; available_logs: string[]; message: string }",
  } as EndpointDefinition,
  GET_LOGS: {
    path: "/logs",
    method: "GET",
    description: "🔒 PROTETTO - Recupera logs con filtri e paginazione",
    authRequired: true,
    queryParams:
      "log_type?: string (default: npm_debug), limit?: number, offset?: number (default: 0), search?: string",
    responseBody:
      "{ success: boolean; logs: string[]; total: number; limit: number; offset: number; search: string; message: string }",
  } as EndpointDefinition,
  GET_LOGS_STATS: {
    path: "/logs/stats",
    method: "GET",
    description: "🔒 PROTETTO - Recupera statistiche su un file di log",
    authRequired: true,
    queryParams: "log_type?: string (default: npm_debug)",
    responseBody:
      "{ success: boolean; file_size_bytes: number; file_size_kb: number; line_count: number; last_modified: string; message: string }",
  } as EndpointDefinition,
  SEARCH_LOGS: {
    path: "/logs/search",
    method: "GET",
    description: "🔒 PROTETTO - Ricerca nei logs",
    authRequired: true,
    queryParams:
      "log_type?: string (default: npm_debug), query: string, limit?: number (default: 100)",
    responseBody:
      "{ success: boolean; logs: string[]; total: number; message: string }",
  } as EndpointDefinition,

  HEALTH_CHECK: {
    path: "/health",
    method: "GET",
    description: "Verifica lo stato di salute del servizio API.",
    authRequired: false,
    responseBody:
      "{ status: string; service: string; timestamp: string; components: { auth: string; whitelist: string } }",
  } as EndpointDefinition,
};

export const getEndpointDetails = (
  endpointKey: keyof typeof API_ENDPOINTS,
): EndpointDefinition => {
  return API_ENDPOINTS[endpointKey];
};

export interface WhitelistEntry {
  type: string;
  value: string;
  description: string;
  created: string;
}

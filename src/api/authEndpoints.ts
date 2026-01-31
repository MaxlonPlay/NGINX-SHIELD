import { EndpointDefinition } from "./_types";

export const AUTH_ENDPOINTS = {
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
      "Controlla lo stato di autenticazione attuale (es. se è il primo accesso o se la password deve essere cambiata).",
    authRequired: true,
    responseBody:
      "{ logged_in: boolean; is_first_login: boolean; requires_password_change: boolean }",
  } as EndpointDefinition,
  TOKEN_STATUS: {
    path: "/token-status",
    method: "GET",
    description: "Verifica la validità del token JWT presente nei cookie.",
    authRequired: true,
    responseBody: "{ valid: boolean; username?: string; message: string }",
  } as EndpointDefinition,
  USER_INFO: {
    path: "/user-info",
    method: "GET",
    description:
      "Recupera le informazioni dell'utente attualmente autenticato.",
    authRequired: true,
    responseBody:
      "{ username: string; last_password_update: string; requires_password_change: boolean }",
  } as EndpointDefinition,
  UPDATE_CREDENTIALS: {
    path: "/update-credentials",
    method: "POST",
    description:
      "Consente all'utente di aggiornare le proprie credenziali (username e/o password).",
    authRequired: true,
    requestBody:
      "{ current_password: string; new_username?: string; new_password?: string }",
    responseBody:
      "{ success: boolean; message: string; is_first_login: boolean; requires_password_change: boolean }",
  } as EndpointDefinition,
  VERIFY_CREDENTIALS: {
    path: "/verify-credentials",
    method: "POST",
    description: "Verifica le credenziali fornite per un'operazione sensibile.",
    authRequired: true,
    requestBody: "{ username: string; password: string }",
    responseBody: "{ success: boolean; message: string }",
  } as EndpointDefinition,
  CREDENTIALS_EXIST: {
    path: "/credentials-exist",
    method: "GET",
    description:
      "Verifica se esistono credenziali nel database (utile per il setup iniziale).",
    authRequired: false,
    responseBody: "{ exists: boolean; is_first_login: boolean }",
  } as EndpointDefinition,
};

export const getAuthEndpointDetails = (
  endpointKey: keyof typeof AUTH_ENDPOINTS,
): EndpointDefinition => {
  return AUTH_ENDPOINTS[endpointKey];
};

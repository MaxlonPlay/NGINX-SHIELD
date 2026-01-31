import { EndpointDefinition } from "./_types";

export const CONFIG_ENDPOINTS = {
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
};

export const getConfigEndpointDetails = (
  endpointKey: keyof typeof CONFIG_ENDPOINTS,
): EndpointDefinition => {
  return CONFIG_ENDPOINTS[endpointKey];
};

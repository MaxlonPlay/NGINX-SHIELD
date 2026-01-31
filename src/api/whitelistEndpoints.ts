import { EndpointDefinition } from "./_types";

export const WHITELIST_ENDPOINTS = {
  GET_WHITELIST_ENTRIES: {
    path: "/whitelist/entries",
    method: "GET",
    description: "Recupera tutte le voci della whitelist.",
    authRequired: true,
    responseBody:
      "[{ id: string; ip_address: string; description: string; created_at: string; updated_at: string }]",
  } as EndpointDefinition,
  ADD_WHITELIST_ENTRY: {
    path: "/whitelist/entries",
    method: "POST",
    description: "Aggiunge una nuova voce alla whitelist.",
    authRequired: true,
    requestBody: "{ ip_address: string; description?: string }",
    responseBody:
      "{ success: boolean; message: string; entry?: WhitelistEntry }",
  } as EndpointDefinition,
  DELETE_WHITELIST_ENTRY: {
    path: "/whitelist/entries",
    method: "DELETE",
    description: "Elimina una voce specifica dalla whitelist tramite ID.",
    authRequired: true,
    queryParams: "entry_id",
    responseBody: "{ success: boolean; message: string }",
  } as EndpointDefinition,
  UPDATE_WHITELIST_ENTRY: {
    path: "/whitelist/entries",
    method: "PUT",
    description: "Aggiorna una voce esistente nella whitelist tramite ID.",
    authRequired: true,
    requestBody:
      "{ entry_id: string; ip_address?: string; description?: string }",
    responseBody:
      "{ success: boolean; message: string; entry?: WhitelistEntry }",
  } as EndpointDefinition,
  GET_WHITELIST_STATS: {
    path: "/whitelist/stats",
    method: "GET",
    description: "Recupera statistiche sulla whitelist (es. numero di voci).",
    authRequired: true,
    responseBody: "{ total_entries: number }",
  } as EndpointDefinition,
  GET_WHITELIST_METADATA: {
    path: "/whitelist/metadata",
    method: "GET",
    description:
      "Recupera metadati o configurazioni relative alla gestione della whitelist.",
    authRequired: true,
    responseBody: "{ enabled: boolean; last_update: string }",
  } as EndpointDefinition,
};

export const getWhitelistEndpointDetails = (
  endpointKey: keyof typeof WHITELIST_ENDPOINTS,
): EndpointDefinition => {
  return WHITELIST_ENDPOINTS[endpointKey];
};

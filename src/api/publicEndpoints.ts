import { EndpointDefinition } from "./_types";

export const PUBLIC_ENDPOINTS = {
  HEALTH_CHECK: {
    path: "/health",
    method: "GET",
    description: "Verifica lo stato di salute del servizio API.",
    authRequired: false,
    responseBody:
      "{ status: string; service: string; timestamp: string; components: { auth: string; whitelist: string } }",
  } as EndpointDefinition,
};

export const getPublicEndpointDetails = (
  endpointKey: keyof typeof PUBLIC_ENDPOINTS,
): EndpointDefinition => {
  return PUBLIC_ENDPOINTS[endpointKey];
};

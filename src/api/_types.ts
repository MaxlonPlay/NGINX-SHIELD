export interface EndpointDefinition {
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  description: string;
  authRequired: boolean;
  requestBody?: string;
  responseBody?: string;
  headers?: string[];
  queryParams?: string;
}

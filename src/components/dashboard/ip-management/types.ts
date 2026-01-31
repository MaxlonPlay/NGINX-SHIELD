export interface BanEntry {
  ip: string;
  reason: string;
  timestamp: string;
  type: "automatic" | "manual";
  httpCode?: number;
  domain?: string;
  urlPath?: string;
  userAgent?: string;
  network?: string;
  asn?: string;
  organization?: string;
  country?: string;
}

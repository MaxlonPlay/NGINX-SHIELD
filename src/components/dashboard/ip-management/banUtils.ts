import { BanEntry } from "./types";

export const getUniqueCIDRData = (bans: BanEntry[]) => {
  const cidrMap = new Map<
    string,
    { cidr: string; asn?: string; organization?: string; country?: string }
  >();
  bans.forEach((ban) => {
    const cidr =
      ban.network || `${ban.ip.split(".").slice(0, 3).join(".")}.0/24`;
    if (!cidrMap.has(cidr)) {
      cidrMap.set(cidr, {
        cidr,
        asn: ban.asn,
        organization: ban.organization,
        country: ban.country,
      });
    }
  });
  return Array.from(cidrMap.values());
};

export const createCIDRBanReason = (
  cidrData: {
    cidr: string;
    asn?: string;
    organization?: string;
    country?: string;
  },
  isMassBan: boolean = false,
): string => {
  const sanitize = (str: string | undefined): string | undefined => {
    if (!str) return str;

    return str
      .replace(/[^\w\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  let reason = isMassBan
    ? `Ban automatico di massa per CIDR ${cidrData.cidr}`
    : `Ban per CIDR ${cidrData.cidr}`;

  if (cidrData.asn) {
    const cleanAsn = sanitize(cidrData.asn);
    if (cleanAsn) reason += `, ASN: ${cleanAsn}`;
  }
  if (cidrData.organization) {
    const cleanOrg = sanitize(cidrData.organization);
    if (cleanOrg) reason += `, Org: ${cleanOrg}`;
  }
  if (cidrData.country) {
    const cleanCountry = sanitize(cidrData.country);
    if (cleanCountry) reason += `, Paese: ${cleanCountry}`;
  }

  if (reason.length > 200) {
    reason = reason.substring(0, 197) + "...";
  }

  return reason;
};

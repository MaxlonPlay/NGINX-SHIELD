import { BanEntry } from "./types";

export interface BanTranslations {
  banReasonSingle?: string;
  banReasonMass?: string;
  banReasonASN?: string;
  banReasonOrganization?: string;
  banReasonCountry?: string;
}

const defaultTranslations: BanTranslations = {
  banReasonSingle: "Ban per CIDR",
  banReasonMass: "Ban automatico di massa per CIDR",
  banReasonASN: "ASN",
  banReasonOrganization: "Org",
  banReasonCountry: "Paese",
};

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
  translations: BanTranslations = defaultTranslations,
): string => {
  const sanitize = (str: string | undefined): string | undefined => {
    if (!str) return str;

    return str
      .replace(/[^\w\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  const t = { ...defaultTranslations, ...translations };

  let reason = isMassBan
    ? `${t.banReasonMass} ${cidrData.cidr}`
    : `${t.banReasonSingle} ${cidrData.cidr}`;

  if (cidrData.asn) {
    const cleanAsn = sanitize(cidrData.asn);
    if (cleanAsn) reason += `, ${t.banReasonASN}: ${cleanAsn}`;
  }
  if (cidrData.organization) {
    const cleanOrg = sanitize(cidrData.organization);
    if (cleanOrg) reason += `, ${t.banReasonOrganization}: ${cleanOrg}`;
  }
  if (cidrData.country) {
    const cleanCountry = sanitize(cidrData.country);
    if (cleanCountry) reason += `, ${t.banReasonCountry}: ${cleanCountry}`;
  }

  if (reason.length > 200) {
    reason = reason.substring(0, 197) + "...";
  }

  return reason;
};

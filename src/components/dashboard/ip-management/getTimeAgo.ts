interface TimeAgoFormatter {
  (key: string, options?: { count?: number }): string;
}

const defaultTimeTranslations: Record<string, string> = {
  hoursAgo: "{count} ore fa",
  daysAgo: "{count} giorni fa",
};

const defaultFormatter = (
  key: string,
  options?: { count?: number },
): string => {
  const template = defaultTimeTranslations[key] || "";
  if (options?.count !== undefined) {
    return template.replace("{count}", options.count.toString());
  }
  return template;
};

export const getTimeAgo = (
  timestamp: string,
  formatter: TimeAgoFormatter = defaultFormatter,
): string => {
  const now = new Date();
  const banTime = new Date(timestamp);
  const diffMs = now.getTime() - banTime.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 24) return formatter("hoursAgo", { count: diffHours });
  return formatter("daysAgo", { count: diffDays });
};

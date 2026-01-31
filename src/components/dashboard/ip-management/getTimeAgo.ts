export const getTimeAgo = (timestamp: string): string => {
  const now = new Date();
  const banTime = new Date(timestamp);
  const diffMs = now.getTime() - banTime.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 24) return `${diffHours} ore fa`;
  return `${diffDays} giorni fa`;
};

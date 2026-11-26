export const formatExpiry = (seconds: number): string => {
  if (seconds < 60) return `${seconds} seconds`;

  const minutes = seconds / 60;
  if (Number.isInteger(minutes)) {
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  }
  return `about ${Math.ceil(minutes)} minutes`;
};

export const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

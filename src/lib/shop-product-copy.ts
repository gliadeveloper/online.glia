/** Strip markdown so list/header cards stay a short plain excerpt. */
export function productDescriptionExcerpt(description: string | null | undefined, max = 140) {
  if (!description?.trim()) return "";

  const plain = description
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

  if (plain.length <= max) return plain;
  return `${plain.slice(0, max).trimEnd()}…`;
}

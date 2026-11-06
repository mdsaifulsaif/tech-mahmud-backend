/**
 * Universal slug cleaner:
 * - Trims and converts to lowercase
 * - Replaces '&' with '-'
 * - Replaces any non-alphanumeric chars with a dash '-'
 * - Collapses multiple consecutive dashes into a single dash
 * - Trims leading and trailing dashes
 */
export function cleanSlug(text: string): string {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/&/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

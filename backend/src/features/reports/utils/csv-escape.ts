export function csvEscape(value: unknown) {
  const valueString = String(value ?? "");
  const safe = /^[=+@\-\t\r]/.test(valueString) ? `'${valueString}` : valueString;
  return `"${safe.replace(/"/g, '""')}"`;
}

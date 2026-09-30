const formatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

export function formatRupiah(value: number | string | bigint | null | undefined): string {
  const n = Number(value ?? 0);
  const safe = Number.isFinite(n) ? n : 0;
  return "Rp" + formatter.format(Math.round(safe));
}

export function formatNumber(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return formatter.format(Number.isFinite(n) ? n : 0);
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
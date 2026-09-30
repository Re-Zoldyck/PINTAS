export type BudgetInput = {
  budgetTotal: number;
  budgetUsed: number;
  budgetReserved: number;
};

export type BudgetView = {
  total: number;
  used: number; // sudah dibayar
  reserved: number; // disetujui, menunggu claim/pembayaran
  committed: number; // used + reserved
  remaining: number; // tersedia untuk alokasi baru
  pctUsed: number;
  pctReserved: number;
  pctCommitted: number;
  exhausted: boolean;
};

export function budgetView(c: BudgetInput): BudgetView {
  const total = Math.max(0, Number(c.budgetTotal) || 0);
  const used = Math.max(0, Number(c.budgetUsed) || 0);
  const reserved = Math.max(0, Number(c.budgetReserved) || 0);
  const committed = used + reserved;
  const remaining = Math.max(0, total - committed);
  const pct = (n: number) => (total > 0 ? Math.min(100, Math.round((n / total) * 1000) / 10) : 0);
  return {
    total,
    used,
    reserved,
    committed,
    remaining,
    pctUsed: pct(used),
    pctReserved: pct(reserved),
    pctCommitted: pct(committed),
    exhausted: total > 0 && remaining <= 0,
  };
}
export type PayoutRule = {
  ratePerThousandViews: number;
  feePerSubmission: number;
  maxPayoutPerSubmission: number; // 0 = tanpa batas per submission
};

/**
 * Nominal pembayaran = fee tetap per submission + (views / 1000 × tarif per 1.000 views),
 * dibatasi oleh maksimum per submission bila campaign menetapkannya.
 */
export function calculatePayout(rule: PayoutRule, views: number): number {
  const safeViews = Math.max(0, Math.floor(Number(views) || 0));
  const viewsPart = Math.floor((safeViews * Math.max(0, rule.ratePerThousandViews)) / 1000);
  let amount = Math.max(0, rule.feePerSubmission) + viewsPart;
  if (rule.maxPayoutPerSubmission > 0) {
    amount = Math.min(amount, rule.maxPayoutPerSubmission);
  }
  return Math.max(0, Math.floor(amount));
}

export function describePayoutRule(rule: PayoutRule, format: (n: number) => string): string {
  const parts: string[] = [];
  if (rule.feePerSubmission > 0) parts.push(`${format(rule.feePerSubmission)} per submission disetujui`);
  if (rule.ratePerThousandViews > 0) parts.push(`${format(rule.ratePerThousandViews)} per 1.000 views terverifikasi`);
  if (parts.length === 0) parts.push("Tidak ada pembayaran otomatis");
  if (rule.maxPayoutPerSubmission > 0) parts.push(`maks. ${format(rule.maxPayoutPerSubmission)} per submission`);
  return parts.join(" · ");
}
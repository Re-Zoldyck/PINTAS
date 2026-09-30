import { budgetView } from "./budgetView";

describe("budgetView", () => {
  it("computes committed, remaining and percentages", () => {
    const b = budgetView({ budgetTotal: 4000000, budgetUsed: 2800000, budgetReserved: 0 });
    expect(b.remaining).toBe(1200000);
    expect(b.pctUsed).toBe(70);
    expect(b.pctCommitted).toBe(70);
    expect(b.exhausted).toBe(false);
  });

  it("counts reserved allocations against the remaining budget", () => {
    const b = budgetView({ budgetTotal: 4000000, budgetUsed: 230000, budgetReserved: 520000 });
    expect(b.committed).toBe(750000);
    expect(b.remaining).toBe(3250000);
    expect(b.pctCommitted).toBe(18.8);
  });

  it("never goes negative and flags exhaustion", () => {
    const b = budgetView({ budgetTotal: 4000000, budgetUsed: 3500000, budgetReserved: 500000 });
    expect(b.remaining).toBe(0);
    expect(b.exhausted).toBe(true);
    expect(b.pctCommitted).toBe(100);
  });
});
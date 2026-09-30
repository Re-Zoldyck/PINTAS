import { calculatePayout } from "./payout";

describe("calculatePayout", () => {
  const rule = { ratePerThousandViews: 15000, feePerSubmission: 50000, maxPayoutPerSubmission: 400000 };

  it("adds the fixed fee and the proportional views component", () => {
    expect(calculatePayout(rule, 12000)).toBe(230000);
    expect(calculatePayout(rule, 0)).toBe(50000);
  });

  it("floors partial thousands and never returns negatives", () => {
    expect(calculatePayout(rule, 1999)).toBe(50000 + 29985);
    expect(calculatePayout(rule, -50)).toBe(50000);
  });

  it("caps at the per-submission maximum when set", () => {
    expect(calculatePayout(rule, 100000)).toBe(400000);
    expect(calculatePayout({ ...rule, maxPayoutPerSubmission: 0 }, 100000)).toBe(1550000);
  });
});
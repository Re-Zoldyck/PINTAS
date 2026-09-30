import superjson from "superjson";
import type { CampaignSummary, ClaimInfo, SubmissionSummary } from "../../helpers/pintasTypes";
import type { DisputeListItem } from "../disputes/list_GET.schema";

export type OwnerDashboard = {
  role: "owner";
  totalCampaigns: number;
  activeCampaigns: number;
  totalBudget: number;
  totalUsed: number;
  totalReserved: number;
  totalRemaining: number;
  pctUsed: number;
  totalCreators: number;
  totalSubmissions: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  totalPayments: number;
  pendingPayments: number;
  campaigns: CampaignSummary[];
  recentSubmissions: SubmissionSummary[];
};

export type CreatorDashboard = {
  role: "creator";
  availableCampaigns: number;
  joinedCampaigns: number;
  totalSubmissions: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  claimableCount: number;
  claimableAmount: number;
  totalEarning: number;
  totalClaimed: number;
  totalPaid: number;
  awaitingPayment: number;
  recentSubmissions: SubmissionSummary[];
  joined: CampaignSummary[];
  recentClaims: ClaimInfo[];
};

export type AdminDashboard = {
  role: "admin";
  pendingAi: number;
  needReview: number;
  awaitingConfirmation: number;
  disputesPending: number;
  claimPending: number;
  paymentPending: number;
  paymentPendingAmount: number;
  activeCampaigns: number;
  runningBudget: number;
  runningUsed: number;
  runningReserved: number;
  totalUsers: number;
  totalCreators: number;
  totalOwners: number;
  queue: SubmissionSummary[];
  recentDisputes: DisputeListItem[];
  recentClaims: ClaimInfo[];
};

export type OutputType = OwnerDashboard | CreatorDashboard | AdminDashboard;

export const getDashboardSummary = async (init?: RequestInit): Promise<OutputType> => {
  const result = await fetch(`/_api/dashboard/summary`, {
    method: "GET",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};
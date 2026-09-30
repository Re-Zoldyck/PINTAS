import { useQuery } from "@tanstack/react-query";
import { PINTAS_ROOT_KEY } from "./useCampaigns";
import { getDashboardSummary } from "../endpoints/dashboard/summary_GET.schema";

export function useDashboard() {
  return useQuery({
    queryKey: [...PINTAS_ROOT_KEY, "dashboard"],
    queryFn: () => getDashboardSummary(),
  });
}
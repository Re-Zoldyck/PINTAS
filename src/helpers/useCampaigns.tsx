import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCampaignsList, InputType as ListInput } from "../endpoints/campaigns/list_GET.schema";
import { getCampaignDetail } from "../endpoints/campaigns/detail_GET.schema";
import { postCampaignSave, InputType as SaveInput } from "../endpoints/campaigns/save_POST.schema";
import { postCampaignStatus, InputType as StatusInput } from "../endpoints/campaigns/status_POST.schema";
import { postCampaignParticipation, InputType as ParticipationInput } from "../endpoints/campaigns/participation_POST.schema";

export const PINTAS_ROOT_KEY = ["pintas"] as const;

export function useCampaignsList(params: ListInput = {}) {
  return useQuery({
    queryKey: [...PINTAS_ROOT_KEY, "campaigns", "list", params],
    queryFn: () => getCampaignsList(params),
    placeholderData: (prev) => prev,
  });
}

export function useCampaignDetail(id: number | null) {
  return useQuery({
    queryKey: [...PINTAS_ROOT_KEY, "campaigns", "detail", id],
    queryFn: () => getCampaignDetail({ id: id as number }),
    enabled: !!id && Number.isFinite(id),
  });
}

export function useSaveCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveInput) => postCampaignSave(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: PINTAS_ROOT_KEY }),
  });
}

export function useCampaignStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: StatusInput) => postCampaignStatus(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: PINTAS_ROOT_KEY }),
  });
}

export function useParticipation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ParticipationInput) => postCampaignParticipation(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: PINTAS_ROOT_KEY }),
  });
}
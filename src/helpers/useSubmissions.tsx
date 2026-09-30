import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PINTAS_ROOT_KEY } from "./useCampaigns";
import { getSubmissionsList, InputType as ListInput } from "../endpoints/submissions/list_GET.schema";
import { getSubmissionDetail } from "../endpoints/submissions/detail_GET.schema";
import { postSubmissionSave, InputType as SaveInput } from "../endpoints/submissions/save_POST.schema";
import { postDisputeCreate, InputType as DisputeInput } from "../endpoints/disputes/create_POST.schema";
import { getDisputesList, InputType as DisputesListInput } from "../endpoints/disputes/list_GET.schema";
import { postClaimCreate, InputType as ClaimInput } from "../endpoints/claims/create_POST.schema";
import { getClaimsList, InputType as ClaimsListInput } from "../endpoints/claims/list_GET.schema";

export function useSubmissionsList(params: ListInput = {}) {
  return useQuery({
    queryKey: [...PINTAS_ROOT_KEY, "submissions", "list", params],
    queryFn: () => getSubmissionsList(params),
    placeholderData: (prev) => prev,
  });
}

export function useSubmissionDetail(id: number | null) {
  return useQuery({
    queryKey: [...PINTAS_ROOT_KEY, "submissions", "detail", id],
    queryFn: () => getSubmissionDetail({ id: id as number }),
    enabled: !!id && Number.isFinite(id),
  });
}

export function useSaveSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveInput) => postSubmissionSave(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: PINTAS_ROOT_KEY }),
  });
}

export function useCreateDispute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DisputeInput) => postDisputeCreate(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: PINTAS_ROOT_KEY }),
  });
}

export function useDisputesList(params: DisputesListInput = {}) {
  return useQuery({
    queryKey: [...PINTAS_ROOT_KEY, "disputes", "list", params],
    queryFn: () => getDisputesList(params),
    placeholderData: (prev) => prev,
  });
}

export function useCreateClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ClaimInput) => postClaimCreate(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: PINTAS_ROOT_KEY }),
  });
}

export function useClaimsList(params: ClaimsListInput = {}) {
  return useQuery({
    queryKey: [...PINTAS_ROOT_KEY, "claims", "list", params],
    queryFn: () => getClaimsList(params),
    placeholderData: (prev) => prev,
  });
}
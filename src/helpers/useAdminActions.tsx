import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PINTAS_ROOT_KEY } from "./useCampaigns";
import { postAdminReviewSubmission, InputType as ReviewInput } from "../endpoints/admin/review_submission_POST.schema";
import { postAdminDecideDispute, InputType as DisputeInput } from "../endpoints/admin/decide_dispute_POST.schema";
import { postAdminConfirmPayment, InputType as PaymentInput } from "../endpoints/admin/confirm_payment_POST.schema";
import { getAdminUsers, InputType as UsersInput } from "../endpoints/admin/users_GET.schema";
import { postAdminUpdateUser, InputType as UpdateUserInput } from "../endpoints/admin/update_user_POST.schema";
import { getAdminAuditLogs, InputType as AuditInput } from "../endpoints/admin/audit_logs_GET.schema";

export function useReviewSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ReviewInput) => postAdminReviewSubmission(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: PINTAS_ROOT_KEY }),
  });
}

export function useDecideDispute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DisputeInput) => postAdminDecideDispute(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: PINTAS_ROOT_KEY }),
  });
}

export function useConfirmPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PaymentInput) => postAdminConfirmPayment(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: PINTAS_ROOT_KEY }),
  });
}

export function useAdminUsers(params: UsersInput = {}) {
  return useQuery({
    queryKey: [...PINTAS_ROOT_KEY, "admin", "users", params],
    queryFn: () => getAdminUsers(params),
    placeholderData: (prev) => prev,
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateUserInput) => postAdminUpdateUser(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: PINTAS_ROOT_KEY }),
  });
}

export function useAuditLogs(params: AuditInput = {}) {
  return useQuery({
    queryKey: [...PINTAS_ROOT_KEY, "admin", "audit", params],
    queryFn: () => getAdminAuditLogs(params),
    placeholderData: (prev) => prev,
  });
}
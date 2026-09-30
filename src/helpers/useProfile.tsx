import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PINTAS_ROOT_KEY } from "./useCampaigns";
import { getProfileMe } from "../endpoints/profile/me_GET.schema";
import { postProfileUpdate, InputType as UpdateInput } from "../endpoints/profile/update_POST.schema";
import { AUTH_QUERY_KEY } from "./useAuth";
import { User } from "./User";

export function useProfile() {
  return useQuery({
    queryKey: [...PINTAS_ROOT_KEY, "profile"],
    queryFn: () => getProfileMe(),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateInput) => postProfileUpdate(input),
    onSuccess: (data) => {
      qc.setQueryData<User | null>(AUTH_QUERY_KEY, (prev) =>
        prev ? { ...prev, displayName: data.profile.displayName } : prev
      );
      qc.invalidateQueries({ queryKey: PINTAS_ROOT_KEY });
    },
  });
}
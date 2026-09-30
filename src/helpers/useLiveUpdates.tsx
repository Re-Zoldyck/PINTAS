import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PINTAS_ROOT_KEY } from "./useCampaigns";
import type { User } from "./User";

const POLL_MS = 15_000;

/**
 * Keeps every PINTAS query fresh without a realtime socket: the whole PINTAS cache is
 * refetched on a fixed interval, when the tab regains focus, and when the browser comes
 * back online. Budget numbers, statuses and queues therefore update within seconds.
 */
export function useLiveUpdates(_user: User) {
  const queryClient = useQueryClient();
  useEffect(() => {
    const invalidate = () => queryClient.invalidateQueries({ queryKey: [...PINTAS_ROOT_KEY] });
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") invalidate();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") invalidate();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", invalidate);
    window.addEventListener("online", invalidate);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", invalidate);
      window.removeEventListener("online", invalidate);
    };
  }, [queryClient]);
}

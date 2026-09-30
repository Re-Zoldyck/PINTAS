export type RealtimeEvent = {
  type: string;
  entityType?: string;
  entityId?: number;
};

/**
 * Realtime fan-out is not available on Vercel serverless functions (no WebSocket
 * broker). The frontend keeps data fresh by polling (see useLiveUpdates), so this is a
 * no-op kept for API compatibility. Plug in Pusher/Ably here if you need push updates.
 */
export async function notifyRealtime(_opts: {
  userIds?: Array<number | null | undefined>;
  admins?: boolean;
  event: RealtimeEvent;
}): Promise<void> {
  return;
}

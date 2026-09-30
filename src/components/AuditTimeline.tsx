import React from "react";
import type { AuditEntry } from "../helpers/pintasTypes";
import { formatDateTime } from "../helpers/formatRupiah";
import styles from "./AuditTimeline.module.css";

const ACTION_LABEL: Record<string, string> = {
  submission_created: "Submission dibuat",
  submitted: "Dikirim oleh creator",
  ai_verification_started: "AI mulai memverifikasi",
  ai_verification_completed: "AI selesai memverifikasi",
  admin_approved: "Disetujui Admin",
  admin_approved_via_dispute: "Sanggahan diterima — disetujui Admin",
  admin_rejected: "Ditolak Admin",
  admin_rejected_via_dispute: "Sanggahan ditolak — ditolak Admin",
  budget_allocated: "Budget dialokasikan, siap claim",
  dispute_submitted: "Sanggahan diajukan",
  dispute_accepted: "Sanggahan diterima",
  dispute_rejected: "Sanggahan ditolak",
  claim_submitted: "Claim diajukan",
  claim_rejected: "Claim ditolak, kembali ke siap claim",
  payment_confirmed: "Pembayaran dikonfirmasi",
  payment_settled: "Pembayaran dicatat ke budget",
  campaign_created_draft: "Campaign dibuat (draft)",
  campaign_created_active: "Campaign dibuat & diaktifkan",
  campaign_published: "Campaign diaktifkan",
  campaign_updated: "Campaign diperbarui",
  campaign_completed: "Campaign diselesaikan",
  campaign_expired: "Campaign berakhir (periode habis)",
  budget_added: "Budget ditambah",
  budget_exhausted: "Budget habis — campaign selesai",
  creator_joined: "Creator bergabung",
  creator_rejoined: "Creator bergabung kembali",
  creator_stopped: "Creator berhenti",
  register: "Akun dibuat",
  profile_updated: "Profil diperbarui",
  user_updated_by_admin: "Akun diubah Admin",
};

export const auditActionLabel = (action: string): string => ACTION_LABEL[action] ?? action;

const ROLE_LABEL: Record<string, string> = { admin: "Admin", owner: "Owner", creator: "Creator", ai: "AI", system: "Sistem" };

export const AuditTimeline: React.FC<{ entries: AuditEntry[]; className?: string; showEntity?: boolean }> = ({ entries, className, showEntity }) => {
  if (entries.length === 0) {
    return <p className={styles.empty}>Belum ada riwayat.</p>;
  }
  return (
    <ol className={`${styles.timeline} ${className ?? ""}`}>
      {entries.map((e) => (
        <li key={e.id} className={`${styles.entry} ${styles[`role_${e.actorRole ?? "system"}`] ?? ""}`}>
          <span className={styles.dot} />
          <div className={styles.body}>
            <div className={styles.head}>
              <span className={styles.action}>{auditActionLabel(e.action)}</span>
              {e.toStatus && (
                <span className={styles.transition}>
                  {e.fromStatus ? `${e.fromStatus} → ` : ""}
                  {e.toStatus}
                </span>
              )}
            </div>
            <div className={styles.meta}>
              <span>{formatDateTime(e.createdAt)}</span>
              <span>·</span>
              <span>
                {e.actorName ?? ROLE_LABEL[e.actorRole ?? "system"] ?? "Sistem"}
                {e.actorName && e.actorRole ? ` (${ROLE_LABEL[e.actorRole] ?? e.actorRole})` : ""}
              </span>
              {showEntity && (
                <>
                  <span>·</span>
                  <span className={styles.entity}>
                    {e.entityType} #{e.entityId}
                  </span>
                </>
              )}
            </div>
            {e.detail && typeof e.detail === "object" && "note" in (e.detail as Record<string, unknown>) && (e.detail as Record<string, unknown>).note ? (
              <p className={styles.note}>{String((e.detail as Record<string, unknown>).note)}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
};
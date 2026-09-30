import React from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Image as ImageIcon } from "lucide-react";
import type { SubmissionDetail } from "../helpers/pintasTypes";
import {
  aiResultLabel,
  aiResultTone,
  claimStatusLabel,
  claimStatusTone,
  disputeStatusLabel,
  disputeStatusTone,
  platformLabel,
  submissionStatusHint,
  submissionStatusLabel,
  submissionStatusTone,
} from "../helpers/pintasLabels";
import { formatDateTime, formatNumber, formatRupiah } from "../helpers/formatRupiah";
import { describePayoutRule } from "../helpers/payout";
import { StatusBadge } from "./StatusBadge";
import { SectionCard, KeyValueList } from "./SectionCard";
import { AiCheckList } from "./AiCheckList";
import { BudgetProgress } from "./BudgetProgress";
import { AuditTimeline } from "./AuditTimeline";
import styles from "./SubmissionDetailView.module.css";

interface Props {
  submission: SubmissionDetail;
  viewer: "creator" | "owner" | "admin";
  actions?: React.ReactNode;
  sidePanel?: React.ReactNode;
  className?: string;
}

export const SubmissionDetailView: React.FC<Props> = ({ submission: s, viewer, actions, sidePanel, className }) => {
  const campaignLink =
    viewer === "creator" ? `/creator/campaigns/${s.campaignId}` : viewer === "owner" ? `/owner/campaigns/${s.campaignId}` : `/admin/campaigns/${s.campaignId}`;
  const c = s.campaign;

  return (
    <div className={`${styles.wrap} ${className ?? ""}`}>
      <header className={styles.header}>
        <div className={styles.headText}>
          <div className={styles.eyebrow}>
            <span className={styles.mono}>Submission {s.code}</span>
            <span>·</span>
            <Link to={campaignLink} className={styles.campaignLink}>
              {c.code} {c.name}
            </Link>
          </div>
          <h1 className={styles.title}>{s.title}</h1>
          <div className={styles.badges}>
            <StatusBadge tone={submissionStatusTone[s.status]}>{submissionStatusLabel[s.status]}</StatusBadge>
            {s.aiResult && (
              <StatusBadge tone={aiResultTone[s.aiResult]} dot={false}>
                AI: {aiResultLabel[s.aiResult]}
              </StatusBadge>
            )}
            {viewer !== "creator" && <span className={styles.creator}>Creator: {s.creatorName}</span>}
          </div>
          <p className={styles.hint}>{submissionStatusHint[s.status]}</p>
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </header>

      <div className={styles.grid}>
        <div className={styles.mainCol}>
          <SectionCard title="Konten & bukti">
            <KeyValueList
              items={[
                { label: "Platform", value: platformLabel[s.platform] },
                { label: "Akun", value: <span className={styles.mono}>@{s.accountHandle}</span> },
                {
                  label: "URL konten",
                  value: (
                    <a href={s.contentUrl} target="_blank" rel="noreferrer" className={styles.link}>
                      {s.contentUrl} <ExternalLink size={12} />
                    </a>
                  ),
                },
                { label: "Caption", value: s.caption ? <span className={styles.caption}>{s.caption}</span> : <em>Tidak ada</em> },
                {
                  label: "Hashtag",
                  value: s.hashtags.length ? (
                    <span className={styles.tags}>
                      {s.hashtags.map((t) => (
                        <span key={t} className={styles.tag}>
                          #{t}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <em>Tidak ada</em>
                  ),
                },
                {
                  label: "Views (bukti)",
                  value: (
                    <span className={styles.mono}>
                      {formatNumber(s.viewsClaimed)}
                      {s.verifiedViews !== null && s.verifiedViews !== s.viewsClaimed && ` · diverifikasi Admin: ${formatNumber(s.verifiedViews)}`}
                    </span>
                  ),
                },
                { label: "Watermark", value: s.watermarkApplied ? "Dinyatakan ada" : "Tidak ada" },
                { label: "Editing", value: s.editingConfirmed ? "Requirement editing dikonfirmasi creator" : "Belum dikonfirmasi" },
                ...(s.creatorNotes ? [{ label: "Catatan creator", value: s.creatorNotes }] : []),
                { label: "Dikirim", value: formatDateTime(s.submittedAt) },
              ]}
            />
            <div className={styles.proof}>
              <span className={styles.proofLabel}>
                <ImageIcon size={14} /> Screenshot bukti
              </span>
              {s.proofScreenshotUrl ? (
                <a href={s.proofScreenshotUrl} target="_blank" rel="noreferrer">
                  <img src={s.proofScreenshotUrl} alt={`Bukti submission ${s.code}`} className={styles.proofImage} />
                </a>
              ) : (
                <p className={styles.proofEmpty}>Tidak ada screenshot bukti dilampirkan.</p>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Hasil AI Verification"
            description={s.aiVerifiedAt ? `Diperiksa ${formatDateTime(s.aiVerifiedAt)} · mesin verifikasi berbasis aturan` : "Belum diverifikasi"}
          >
            {s.aiChecks && s.aiChecks.length > 0 ? (
              <>
                {s.aiSummary && (
                  <p className={`${styles.aiSummary} ${s.aiResult ? styles[`ai_${s.aiResult}`] : ""}`}>{s.aiSummary}</p>
                )}
                <AiCheckList checks={s.aiChecks} />
                <p className={styles.aiNote}>AI tidak memiliki keputusan final. Admin memberi konfirmasi akhir sebelum pembayaran.</p>
              </>
            ) : (
              <p className={styles.muted}>Submission belum dikirim untuk verifikasi.</p>
            )}
          </SectionCard>

          {s.dispute && (
            <SectionCard
              title="Sanggahan creator"
              actions={<StatusBadge tone={disputeStatusTone[s.dispute.status]}>{disputeStatusLabel[s.dispute.status]}</StatusBadge>}
            >
              <KeyValueList
                items={[
                  { label: "Diajukan", value: formatDateTime(s.dispute.createdAt) },
                  { label: "Alasan", value: <span className={styles.caption}>{s.dispute.reason}</span> },
                  {
                    label: "Bukti tambahan",
                    value: s.dispute.evidenceUrl ? (
                      <a href={s.dispute.evidenceUrl} target="_blank" rel="noreferrer" className={styles.link}>
                        Lihat bukti <ExternalLink size={12} />
                      </a>
                    ) : (
                      <em>Tidak ada</em>
                    ),
                  },
                  ...(s.dispute.resolvedAt
                    ? [
                        { label: "Diputuskan", value: `${formatDateTime(s.dispute.resolvedAt)}${s.dispute.adminName ? ` oleh ${s.dispute.adminName}` : ""}` },
                        { label: "Catatan Admin", value: s.dispute.adminNote ?? "—" },
                      ]
                    : []),
                ]}
              />
            </SectionCard>
          )}

          {(s.adminDecidedAt || s.adminNote) && (
            <SectionCard title="Keputusan Admin">
              <KeyValueList
                items={[
                  { label: "Waktu", value: `${formatDateTime(s.adminDecidedAt)}${s.adminName ? ` oleh ${s.adminName}` : ""}` },
                  { label: "Catatan", value: s.adminNote ?? "—" },
                  ...(s.calculatedAmount !== null
                    ? [
                        { label: "Perhitungan", value: <span className={styles.mono}>{formatRupiah(s.calculatedAmount)}</span> },
                        {
                          label: "Disetujui",
                          value: (
                            <span className={styles.mono}>
                              {formatRupiah(s.approvedAmount ?? 0)}
                              {s.approvedAmount !== null && s.calculatedAmount > s.approvedAmount && <span className={styles.capped}> (dibatasi sisa budget)</span>}
                            </span>
                          ),
                        },
                      ]
                    : []),
                ]}
              />
            </SectionCard>
          )}

          {s.claim && (
            <SectionCard
              title={`Claim ${s.claim.code}`}
              actions={<StatusBadge tone={claimStatusTone[s.claim.status]}>{claimStatusLabel[s.claim.status]}</StatusBadge>}
            >
              <KeyValueList
                items={[
                  { label: "Nominal", value: <span className={styles.mono}>{formatRupiah(s.claim.amount)}</span> },
                  { label: "Diajukan", value: formatDateTime(s.claim.createdAt) },
                  ...(s.claim.personal
                    ? [
                        { label: "Nama asli", value: s.claim.personal.realName },
                        { label: "Nomor HP", value: <span className={styles.mono}>{s.claim.personal.phone}</span> },
                        {
                          label: "Rekening",
                          value: (
                            <span className={styles.mono}>
                              {s.claim.personal.bankName} {s.claim.personal.bankAccountNumber} a.n. {s.claim.personal.bankAccountHolder}
                            </span>
                          ),
                        },
                      ]
                    : [{ label: "Data pembayaran", value: <em>Hanya dapat dilihat Admin dan creator</em> }]),
                  ...(s.claim.paidAt
                    ? [
                        { label: "Dibayar", value: `${formatDateTime(s.claim.paidAt)}${s.claim.adminName ? ` oleh ${s.claim.adminName}` : ""}` },
                        { label: "Referensi", value: <span className={styles.mono}>{s.claim.paymentReference ?? "—"}</span> },
                      ]
                    : []),
                  ...(s.claim.adminNote ? [{ label: "Catatan Admin", value: s.claim.adminNote }] : []),
                ]}
              />
            </SectionCard>
          )}

          <SectionCard title="Riwayat status (audit log)">
            <AuditTimeline entries={s.history} />
          </SectionCard>
        </div>

        <aside className={styles.sideCol}>
          {sidePanel}
          <SectionCard title="Pembayaran">
            <KeyValueList
              items={[
                { label: "Aturan", value: describePayoutRule(c, formatRupiah) },
                { label: "Estimasi", value: <span className={styles.mono}>{formatRupiah(s.estimatedPayout)}</span> },
                ...(s.approvedAmount !== null
                  ? [{ label: "Disetujui", value: <strong className={styles.mono}>{formatRupiah(s.approvedAmount)}</strong> }]
                  : []),
              ]}
            />
            <div className={styles.budget}>
              <span className={styles.budgetLabel}>Budget campaign</span>
              <BudgetProgress budgetTotal={c.budgetTotal} budgetUsed={c.budgetUsed} budgetReserved={c.budgetReserved} />
            </div>
          </SectionCard>
          <SectionCard title="Requirement campaign">
            <KeyValueList
              items={[
                { label: "Platform", value: platformLabel[c.requiredPlatform] },
                {
                  label: "Watermark",
                  value: c.watermarkRequired ? (
                    <span className={styles.wm}>
                      Wajib
                      {c.watermarkLogoUrl && <img src={c.watermarkLogoUrl} alt="Logo watermark" className={styles.wmLogo} />}
                    </span>
                  ) : (
                    "Tidak wajib"
                  ),
                },
                { label: "Min. views", value: c.minViews > 0 ? formatNumber(c.minViews) : "Tidak ada" },
                { label: "Duplikat", value: c.duplicatePolicy === "fail" ? "Ditandai FAIL" : "Ditandai NEED REVIEW" },
                { label: "Caption", value: c.requiredCaption ?? "Bebas" },
                { label: "Hashtag", value: c.requiredHashtags.length ? c.requiredHashtags.map((t) => "#" + t).join(" ") : "Bebas" },
                { label: "Editing", value: c.editingRequirement ?? "Bebas" },
              ]}
            />
          </SectionCard>
        </aside>
      </div>
    </div>
  );
};
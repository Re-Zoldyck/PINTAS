import React from "react";
import { Helmet } from "react-helmet";
import { Link, useParams } from "react-router-dom";
import { CalendarDays, Download, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { SectionCard, KeyValueList } from "../components/SectionCard";
import { BudgetProgress } from "../components/BudgetProgress";
import { SubmissionTable } from "../components/SubmissionTable";
import { Button } from "../components/Button";
import { Skeleton } from "../components/Skeleton";
import { EmptyState } from "../components/EmptyState";
import { TwoCol, Stack, InlineAlert, Mono } from "../components/Layouts";
import { useCampaignDetail, useParticipation } from "../helpers/useCampaigns";
import { campaignStatusLabel, campaignStatusTone, platformLabel } from "../helpers/pintasLabels";
import { formatDate, formatNumber, formatRupiah } from "../helpers/formatRupiah";
import { describePayoutRule } from "../helpers/payout";
import styles from "./creator.campaigns.$campaignId.module.css";

export default function CreatorCampaignDetailPage() {
  const { campaignId } = useParams();
  const id = Number(campaignId);
  const { data, isPending, error } = useCampaignDetail(id);
  const participation = useParticipation();

  if (error) {
    return <InlineAlert tone="error">{error.message}</InlineAlert>;
  }
  if (isPending || !data) {
    return (
      <Stack>
        <Skeleton className={styles.skeletonHead} />
        <Skeleton className={styles.skeletonBody} />
      </Stack>
    );
  }
  const c = data.campaign;
  const isActiveMember = c.myParticipation === "active";

  const act = (action: "join" | "leave") =>
    participation.mutate(
      { campaignId: c.id, action },
      {
        onSuccess: () => toast.success(action === "join" ? "Anda bergabung ke campaign ini" : "Anda berhenti dari campaign ini"),
        onError: (e) => toast.error(e.message),
      }
    );

  return (
    <>
      <Helmet>
        <title>{c.name} — PINTAS</title>
      </Helmet>
      <PageHeader
        eyebrow={
          <>
            <Link to="/creator/campaigns" className={styles.back}>
              Campaign
            </Link>
            <span>/</span>
            <Mono>{c.code}</Mono>
          </>
        }
        title={c.name}
        description={
          <span className={styles.metaRow}>
            <StatusBadge tone={campaignStatusTone[c.status]} size="sm">
              {campaignStatusLabel[c.status]}
            </StatusBadge>
            <span>oleh {c.ownerName}</span>
            <span>
              <CalendarDays size={14} /> {formatDate(c.startDate)} – {formatDate(c.endDate)}
            </span>
          </span>
        }
        actions={
          <>
            {c.status === "active" && !isActiveMember && (
              <Button onClick={() => act("join")} disabled={participation.isPending}>
                {c.myParticipation === "stopped" ? "Gabung lagi" : "Ambil campaign"}
              </Button>
            )}
            {c.status === "active" && isActiveMember && (
              <>
                <Button variant="ghost" onClick={() => act("leave")} disabled={participation.isPending}>
                  Berhenti
                </Button>
                <Button asChild>
                  <Link to={`/creator/submit?campaignId=${c.id}`}>
                    <PlusCircle size={16} /> Buat submission
                  </Link>
                </Button>
              </>
            )}
          </>
        }
      />

      {c.status !== "active" && <InlineAlert tone="warning">Campaign ini tidak sedang aktif. Submission baru tidak dapat dikirim, tetapi submission yang sudah disetujui tetap diproses.</InlineAlert>}

      <TwoCol>
        <Stack>
          <SectionCard title="Deskripsi & target">
            <p className={styles.description}>{c.description}</p>
            <KeyValueList
              items={[
                { label: "Target campaign", value: c.target },
                ...(c.targetViews ? [{ label: "Target views", value: formatNumber(c.targetViews) }] : []),
              ]}
            />
          </SectionCard>
          <SectionCard title="Requirement konten" description="Semua requirement diperiksa AI saat submission dikirim.">
            <KeyValueList
              items={[
                { label: "Platform / akun", value: c.requiredPlatform === "any" ? "Bebas — akun harus terdaftar di profil Anda" : `${platformLabel[c.requiredPlatform]} — pakai akun yang terdaftar di profil` },
                {
                  label: "Watermark",
                  value: c.watermarkRequired ? (
                    <span className={styles.wm}>
                      Wajib memakai logo resmi campaign
                      {c.watermarkLogoUrl && (
                        <>
                          <img src={c.watermarkLogoUrl} alt="Logo watermark" className={styles.wmLogo} />
                          <a href={c.watermarkLogoUrl} download className={styles.download}>
                            <Download size={14} /> Unduh logo PNG
                          </a>
                        </>
                      )}
                    </span>
                  ) : (
                    "Tidak wajib"
                  ),
                },
                { label: "Minimum views", value: c.minViews > 0 ? `${formatNumber(c.minViews)} views (harus dibuktikan screenshot)` : "Tidak ada minimum" },
                { label: "Duplicate / reupload", value: c.duplicatePolicy === "fail" ? "Konten yang pernah disubmit langsung FAIL" : "Konten yang pernah disubmit ditandai NEED REVIEW" },
                { label: "Caption", value: c.requiredCaption ? `Harus memuat: ${c.requiredCaption}` : "Bebas" },
                { label: "Hashtag", value: c.requiredHashtags.length ? c.requiredHashtags.map((t) => "#" + t).join(" ") : "Bebas" },
                { label: "Editing", value: c.editingRequirement ?? "Tidak ada ketentuan khusus" },
              ]}
            />
          </SectionCard>
          <SectionCard title="Submission saya di campaign ini" padded={false}>
            <SubmissionTable
              submissions={data.submissions}
              showCampaign={false}
              linkTo={(s) => `/creator/submissions/${s.id}`}
              emptyState={
                <EmptyState
                  title="Belum ada submission"
                  description={isActiveMember ? "Kirim konten pertama Anda untuk campaign ini." : "Ambil campaign ini untuk mulai mengirim konten."}
                  action={
                    isActiveMember && c.status === "active" ? (
                      <Button asChild size="sm">
                        <Link to={`/creator/submit?campaignId=${c.id}`}>Buat submission</Link>
                      </Button>
                    ) : undefined
                  }
                />
              }
            />
          </SectionCard>
        </Stack>
        <Stack>
          <SectionCard title="Aturan pembayaran">
            <p className={styles.rule}>{describePayoutRule(c, formatRupiah)}</p>
            <p className={styles.ruleNote}>
              Nominal dihitung dari views yang terbukti pada screenshot dan disetujui Admin. Pembayaran tidak dapat melebihi sisa budget campaign.
            </p>
          </SectionCard>
          <SectionCard title="Budget campaign (realtime)">
            <BudgetProgress budgetTotal={c.budgetTotal} budgetUsed={c.budgetUsed} budgetReserved={c.budgetReserved} variant="full" />
          </SectionCard>
          <SectionCard title="Aktivitas">
            <KeyValueList
              items={[
                { label: "Creator aktif", value: c.participantCount },
                { label: "Submission", value: c.submissionCount },
                { label: "Disetujui", value: c.approvedCount },
                { label: "Dibayarkan", value: formatRupiah(c.totalPaid) },
              ]}
            />
          </SectionCard>
        </Stack>
      </TwoCol>
    </>
  );
}
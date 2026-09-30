import React from "react";
import { CalendarDays, Users, FileCheck2, Wallet } from "lucide-react";
import type { OutputType as CampaignDetailData } from "../endpoints/campaigns/detail_GET.schema";
import { campaignStatusLabel, campaignStatusTone, platformLabel } from "../helpers/pintasLabels";
import { formatDate, formatDateTime, formatNumber, formatRupiah } from "../helpers/formatRupiah";
import { describePayoutRule } from "../helpers/payout";
import { PageHeader } from "./PageHeader";
import { StatusBadge } from "./StatusBadge";
import { SectionCard, KeyValueList } from "./SectionCard";
import { BudgetProgress } from "./BudgetProgress";
import { SubmissionTable } from "./SubmissionTable";
import { AuditTimeline } from "./AuditTimeline";
import { StatCard } from "./StatCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./Tabs";
import { DataTable, Column } from "./DataTable";
import { EmptyState } from "./EmptyState";
import { StatGrid, Stack, TwoCol, Mono } from "./Layouts";
import styles from "./CampaignDetailView.module.css";

type Participant = CampaignDetailData["participants"][number];

interface Props {
  data: CampaignDetailData;
  viewer: "owner" | "admin";
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
  className?: string;
}

export const CampaignDetailView: React.FC<Props> = ({ data, viewer, actions, eyebrow, className }) => {
  const c = data.campaign;
  const submissionLink = (id: number) => (viewer === "owner" ? `/owner/submissions/${id}` : `/admin/submissions/${id}`);

  const participantColumns: Column<Participant>[] = [
    { key: "name", header: "Creator", render: (p) => <span className={styles.name}>{p.creatorName}</span> },
    {
      key: "status",
      header: "Status",
      render: (p) => (
        <StatusBadge tone={p.status === "active" ? "success" : "neutral"} size="sm">
          {p.status === "active" ? "Aktif" : "Berhenti"}
        </StatusBadge>
      ),
    },
    { key: "joined", header: "Bergabung", hideOnMobile: true, render: (p) => <span className={styles.sub}>{formatDateTime(p.joinedAt)}</span> },
    { key: "subs", header: "Submission", align: "right", render: (p) => p.submissionCount },
    { key: "amount", header: "Disetujui", align: "right", render: (p) => <Mono>{formatRupiah(p.approvedAmount)}</Mono> },
  ];

  return (
    <div className={className}>
      <PageHeader
        eyebrow={
          <>
            {eyebrow}
            <Mono>{c.code}</Mono>
          </>
        }
        title={c.name}
        description={
          <span className={styles.metaRow}>
            <StatusBadge tone={campaignStatusTone[c.status]} size="sm">
              {campaignStatusLabel[c.status]}
            </StatusBadge>
            {viewer === "admin" && <span>Owner: {c.ownerName}</span>}
            <span>
              <CalendarDays size={14} /> {formatDate(c.startDate)} – {formatDate(c.endDate)}
            </span>
            <span>{platformLabel[c.requiredPlatform]}</span>
          </span>
        }
        actions={actions}
      />

      <Stack gap="lg">
        <SectionCard title="Budget realtime" description="Dialokasikan = disetujui Admin tapi belum dibayar. Sisa = dana yang masih bisa dialokasikan.">
          <BudgetProgress budgetTotal={c.budgetTotal} budgetUsed={c.budgetUsed} budgetReserved={c.budgetReserved} variant="full" />
        </SectionCard>

        <StatGrid>
          <StatCard label="Creator aktif" value={c.participantCount} icon={<Users size={16} />} />
          <StatCard label="Submission" value={c.submissionCount} icon={<FileCheck2 size={16} />} />
          <StatCard label="Disetujui" value={c.approvedCount} tone="success" />
          <StatCard label="Dibayarkan" value={formatRupiah(c.totalPaid)} icon={<Wallet size={16} />} tone="primary" />
        </StatGrid>

        <Tabs defaultValue="submissions">
          <TabsList>
            <TabsTrigger value="submissions">Submission ({data.submissions.length})</TabsTrigger>
            <TabsTrigger value="participants">Creator ({data.participants.length})</TabsTrigger>
            <TabsTrigger value="brief">Brief & requirement</TabsTrigger>
            <TabsTrigger value="activity">Aktivitas</TabsTrigger>
          </TabsList>
          <TabsContent value="submissions">
            <SubmissionTable
              submissions={data.submissions}
              showCampaign={false}
              showCreator
              linkTo={(s) => submissionLink(s.id)}
              emptyState={<EmptyState title="Belum ada submission" description="Submission creator akan muncul di sini setelah dikirim." />}
            />
          </TabsContent>
          <TabsContent value="participants">
            <DataTable
              columns={participantColumns}
              rows={data.participants}
              rowKey={(p) => p.creatorId}
              emptyState={<EmptyState title="Belum ada creator yang bergabung" />}
            />
            <p className={styles.privacyNote}>Data pribadi creator (nama asli, nomor HP, rekening) tidak ditampilkan di sini.</p>
          </TabsContent>
          <TabsContent value="brief">
            <TwoCol>
              <SectionCard title="Deskripsi & target">
                <p className={styles.description}>{c.description}</p>
                <KeyValueList
                  items={[
                    { label: "Target", value: c.target },
                    ...(c.targetViews ? [{ label: "Target views", value: formatNumber(c.targetViews) }] : []),
                    { label: "Aturan pembayaran", value: describePayoutRule(c, formatRupiah) },
                  ]}
                />
              </SectionCard>
              <SectionCard title="Requirement konten">
                <KeyValueList
                  items={[
                    { label: "Platform", value: platformLabel[c.requiredPlatform] },
                    {
                      label: "Watermark",
                      value: c.watermarkRequired ? (
                        <span className={styles.wm}>
                          Wajib {c.watermarkLogoUrl && <img src={c.watermarkLogoUrl} alt="Logo watermark" className={styles.wmLogo} />}
                        </span>
                      ) : (
                        "Tidak wajib"
                      ),
                    },
                    { label: "Min. views", value: c.minViews > 0 ? formatNumber(c.minViews) : "Tidak ada" },
                    { label: "Duplikat", value: c.duplicatePolicy === "fail" ? "FAIL" : "NEED REVIEW" },
                    { label: "Caption", value: c.requiredCaption ?? "Bebas" },
                    { label: "Hashtag", value: c.requiredHashtags.length ? c.requiredHashtags.map((t) => "#" + t).join(" ") : "Bebas" },
                    { label: "Editing", value: c.editingRequirement ?? "Bebas" },
                  ]}
                />
              </SectionCard>
            </TwoCol>
          </TabsContent>
          <TabsContent value="activity">
            <SectionCard>
              <AuditTimeline entries={data.activity} />
            </SectionCard>
          </TabsContent>
        </Tabs>
      </Stack>
    </div>
  );
};
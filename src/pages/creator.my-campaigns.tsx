import React from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { FolderHeart } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../components/PageHeader";
import { CampaignCard } from "../components/CampaignCard";
import { CardGrid, InlineAlert } from "../components/Layouts";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Skeleton } from "../components/Skeleton";
import { useCampaignsList, useParticipation } from "../helpers/useCampaigns";
import styles from "./creator.my-campaigns.module.css";

export default function CreatorMyCampaignsPage() {
  const { data, isPending, error } = useCampaignsList({ scope: "joined" });
  const participation = useParticipation();
  const campaigns = data?.campaigns ?? [];

  const act = (id: number, action: "join" | "leave") =>
    participation.mutate(
      { campaignId: id, action },
      {
        onSuccess: () => toast.success(action === "leave" ? "Anda berhenti dari campaign ini. Submission yang sudah disetujui tetap dibayar." : "Bergabung kembali."),
        onError: (e) => toast.error(e.message),
      }
    );

  return (
    <>
      <Helmet>
        <title>Campaign Saya — PINTAS</title>
      </Helmet>
      <PageHeader
        eyebrow="Campaign"
        title="Campaign saya"
        description="Campaign yang pernah Anda ambil. Anda bebas berhenti kapan saja; pembayaran tidak bergantung pada penyelesaian periode."
      />
      {error && <InlineAlert tone="error">Gagal memuat: {error.message}</InlineAlert>}
      {isPending ? (
        <CardGrid>
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className={styles.skeleton} />
          ))}
        </CardGrid>
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon={<FolderHeart size={28} />}
          title="Belum ada campaign yang diikuti"
          action={
            <Button asChild>
              <Link to="/creator/campaigns">Lihat campaign tersedia</Link>
            </Button>
          }
        />
      ) : (
        <CardGrid>
          {campaigns.map((c) => (
            <CampaignCard
              key={c.id}
              campaign={c}
              to={`/creator/campaigns/${c.id}`}
              footer={
                <>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/creator/campaigns/${c.id}`}>Detail & submission</Link>
                  </Button>
                  {c.status === "active" && c.myParticipation === "active" && (
                    <>
                      <Button asChild size="sm">
                        <Link to={`/creator/submit?campaignId=${c.id}`}>Buat submission</Link>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => act(c.id, "leave")} disabled={participation.isPending}>
                        Berhenti
                      </Button>
                    </>
                  )}
                  {c.status === "active" && c.myParticipation === "stopped" && (
                    <Button size="sm" variant="secondary" onClick={() => act(c.id, "join")} disabled={participation.isPending}>
                      Gabung lagi
                    </Button>
                  )}
                </>
              }
            />
          ))}
        </CardGrid>
      )}
    </>
  );
}
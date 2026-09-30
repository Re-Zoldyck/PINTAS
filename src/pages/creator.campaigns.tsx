import React, { useState } from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { Search, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../components/PageHeader";
import { CampaignCard } from "../components/CampaignCard";
import { CardGrid, Toolbar, InlineAlert } from "../components/Layouts";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Skeleton } from "../components/Skeleton";
import { useCampaignsList, useParticipation } from "../helpers/useCampaigns";
import styles from "./creator.campaigns.module.css";

export default function CreatorCampaignsPage() {
  const [q, setQ] = useState("");
  const { data, isPending, error } = useCampaignsList({ scope: "available" });
  const participation = useParticipation();

  const campaigns = (data?.campaigns ?? []).filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase()));

  const join = (id: number) => {
    participation.mutate(
      { campaignId: id, action: "join" },
      {
        onSuccess: () => toast.success("Berhasil bergabung ke campaign"),
        onError: (e) => toast.error(e.message),
      }
    );
  };

  return (
    <>
      <Helmet>
        <title>Campaign Tersedia — PINTAS</title>
      </Helmet>
      <PageHeader
        eyebrow="Campaign"
        title="Campaign tersedia"
        description="Campaign aktif yang bisa Anda ambil. Setiap konten yang dikirim dinilai sebagai submission terpisah."
      />
      <Toolbar>
        <div className={styles.search}>
          <Search size={16} className={styles.searchIcon} />
          <Input placeholder="Cari nama campaign…" value={q} onChange={(e) => setQ(e.target.value)} className={styles.searchInput} />
        </div>
      </Toolbar>
      {error && <InlineAlert tone="error">Gagal memuat campaign: {error.message}</InlineAlert>}
      {isPending ? (
        <CardGrid>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className={styles.skeleton} />
          ))}
        </CardGrid>
      ) : campaigns.length === 0 ? (
        <EmptyState icon={<Megaphone size={28} />} title="Belum ada campaign aktif" description="Campaign baru akan muncul di sini begitu Owner mengaktifkannya." />
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
                    <Link to={`/creator/campaigns/${c.id}`}>Lihat detail</Link>
                  </Button>
                  {c.myParticipation === "active" ? (
                    <Button asChild size="sm">
                      <Link to={`/creator/submit?campaignId=${c.id}`}>Buat submission</Link>
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => join(c.id)} disabled={participation.isPending}>
                      {c.myParticipation === "stopped" ? "Gabung lagi" : "Ambil campaign"}
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
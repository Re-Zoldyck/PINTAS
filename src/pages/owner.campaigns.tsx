import React, { useState } from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { PlusCircle, Megaphone } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { CampaignCard } from "../components/CampaignCard";
import { CardGrid, Toolbar, InlineAlert } from "../components/Layouts";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Skeleton } from "../components/Skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/Select";
import { useCampaignsList } from "../helpers/useCampaigns";
import { CampaignStatusArrayValues, type CampaignStatus } from "../helpers/schema";
import { campaignStatusLabel } from "../helpers/pintasLabels";
import styles from "./owner.campaigns.module.css";

export default function OwnerCampaignsPage() {
  const [status, setStatus] = useState<CampaignStatus | "__all">("__all");
  const { data, isPending, error } = useCampaignsList(status === "__all" ? {} : { status });
  const campaigns = data?.campaigns ?? [];

  return (
    <>
      <Helmet>
        <title>Campaign — PINTAS</title>
      </Helmet>
      <PageHeader
        eyebrow="Campaign"
        title="Campaign saya"
        description="Semua campaign yang Anda buat. Draft belum terlihat oleh creator."
        actions={
          <Button asChild>
            <Link to="/owner/campaigns/new">
              <PlusCircle size={16} /> Buat campaign
            </Link>
          </Button>
        }
      />
      <Toolbar>
        <Select value={status} onValueChange={(v) => setStatus(v as CampaignStatus | "__all")}>
          <SelectTrigger style={{ width: 220 }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Semua status</SelectItem>
            {CampaignStatusArrayValues.map((s) => (
              <SelectItem key={s} value={s}>
                {campaignStatusLabel[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Toolbar>
      {error && <InlineAlert tone="error">{error.message}</InlineAlert>}
      {isPending ? (
        <CardGrid>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className={styles.skeleton} />
          ))}
        </CardGrid>
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon={<Megaphone size={28} />}
          title="Belum ada campaign"
          description="Buat campaign pertama dengan budget minimal Rp4.000.000."
          action={
            <Button asChild>
              <Link to="/owner/campaigns/new">Buat campaign</Link>
            </Button>
          }
        />
      ) : (
        <CardGrid>
          {campaigns.map((c) => (
            <CampaignCard
              key={c.id}
              campaign={c}
              to={`/owner/campaigns/${c.id}`}
              footer={
                <>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/owner/campaigns/${c.id}`}>Detail & monitoring</Link>
                  </Button>
                  {c.status === "draft" && (
                    <Button asChild size="sm">
                      <Link to={`/owner/campaigns/${c.id}/edit`}>Lanjutkan draft</Link>
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
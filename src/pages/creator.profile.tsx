import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../components/PageHeader";
import { SectionCard, KeyValueList } from "../components/SectionCard";
import { Input } from "../components/Input";
import { Textarea } from "../components/Textarea";
import { Button } from "../components/Button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/Select";
import { Skeleton } from "../components/Skeleton";
import { TwoCol, Stack, InlineAlert } from "../components/Layouts";
import { useProfile, useUpdateProfile } from "../helpers/useProfile";
import { SocialPlatformArrayValues, type SocialPlatform } from "../helpers/schema";
import { platformLabel, roleLabel } from "../helpers/pintasLabels";
import { formatDate } from "../helpers/formatRupiah";
import styles from "./creator.profile.module.css";

type AccountRow = { platform: SocialPlatform; handle: string };

export default function CreatorProfilePage() {
  const { data, isPending, error } = useProfile();
  const update = useUpdateProfile();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (data && !loaded) {
      setDisplayName(data.profile.displayName);
      setBio(data.profile.bio ?? "");
      setAccounts(data.profile.socialAccounts.map((a) => ({ platform: a.platform, handle: a.handle })));
      setLoaded(true);
    }
  }, [data, loaded]);

  if (error) return <InlineAlert tone="error">{error.message}</InlineAlert>;
  if (isPending || !data) return <Skeleton className={styles.skeleton} />;
  const p = data.profile;

  const usedPlatforms = new Set(accounts.map((a) => a.platform));
  const addRow = () => {
    const free = SocialPlatformArrayValues.find((pl) => !usedPlatforms.has(pl));
    if (!free) return;
    setAccounts((prev) => [...prev, { platform: free, handle: "" }]);
  };

  const saveProfile = () => {
    update.mutate(
      { displayName, bio: bio || null, socialAccounts: accounts.filter((a) => a.handle.trim()) },
      {
        onSuccess: () => toast.success("Profil tersimpan"),
        onError: (e) => toast.error(e.message),
      }
    );
  };

  return (
    <>
      <Helmet>
        <title>Profil — PINTAS</title>
      </Helmet>
      <PageHeader eyebrow="Profil" title="Profil creator" description="Akun sosial yang terdaftar dipakai AI untuk memastikan konten berasal dari akun Anda." />
      <TwoCol>
        <Stack>
          <SectionCard title="Identitas publik">
            <div className={styles.field}>
              <label className={styles.label}>Nama tampilan</label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} disabled={update.isPending} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Bio singkat</label>
              <Textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Niche konten, jumlah pengikut, gaya…" disabled={update.isPending} />
            </div>
          </SectionCard>
          <SectionCard
            title="Akun sosial terdaftar"
            description="Satu akun per platform. Handle tanpa @."
            actions={
              <Button variant="outline" size="sm" onClick={addRow} disabled={update.isPending || usedPlatforms.size >= SocialPlatformArrayValues.length}>
                <Plus size={14} /> Tambah akun
              </Button>
            }
          >
            {accounts.length === 0 && <p className={styles.help}>Belum ada akun terdaftar. Submission tanpa akun terdaftar akan ditandai NEED REVIEW oleh AI.</p>}
            <div className={styles.accounts}>
              {accounts.map((a, i) => (
                <div key={i} className={styles.accountRow}>
                  <Select
                    value={a.platform}
                    onValueChange={(v) => setAccounts((prev) => prev.map((row, idx) => (idx === i ? { ...row, platform: v as SocialPlatform } : row)))}
                    disabled={update.isPending}
                  >
                    <SelectTrigger className={styles.platformSelect}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SocialPlatformArrayValues.map((pl) => (
                        <SelectItem key={pl} value={pl} disabled={pl !== a.platform && usedPlatforms.has(pl)}>
                          {platformLabel[pl]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={a.handle}
                    placeholder="namaakun"
                    onChange={(e) => setAccounts((prev) => prev.map((row, idx) => (idx === i ? { ...row, handle: e.target.value } : row)))}
                    disabled={update.isPending}
                  />
                  <Button variant="ghost" size="icon-sm" aria-label="Hapus akun" onClick={() => setAccounts((prev) => prev.filter((_, idx) => idx !== i))} disabled={update.isPending}>
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
            </div>
          </SectionCard>
          <div className={styles.actions}>
            <Button onClick={saveProfile} disabled={update.isPending}>
              <Save size={16} /> Simpan profil
            </Button>
          </div>
        </Stack>
        <SectionCard title="Akun">
          <KeyValueList
            items={[
              { label: "Email", value: p.email },
              { label: "Peran", value: roleLabel[p.role] },
              { label: "Bergabung", value: formatDate(p.createdAt) },
            ]}
          />
          <p className={styles.help}>Nama asli, nomor HP, dan rekening tidak disimpan di profil — hanya diminta saat claim pembayaran.</p>
        </SectionCard>
      </TwoCol>
    </>
  );
}
import React, { useState } from "react";
import { Helmet } from "react-helmet";
import { Search, Users } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../components/PageHeader";
import { DataTable, Column } from "../components/DataTable";
import { StatusBadge } from "../components/StatusBadge";
import { EmptyState } from "../components/EmptyState";
import { Input } from "../components/Input";
import { Switch } from "../components/Switch";
import { Toolbar, InlineAlert, Mono } from "../components/Layouts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/Select";
import { useAdminUsers, useUpdateUser } from "../helpers/useAdminActions";
import { useAuth } from "../helpers/useAuth";
import { useDebounce } from "../helpers/useDebounce";
import type { AdminUserItem } from "../endpoints/admin/users_GET.schema";
import { UserRoleArrayValues, type UserRole } from "../helpers/schema";
import { roleLabel } from "../helpers/pintasLabels";
import { formatDate, formatRupiah } from "../helpers/formatRupiah";
import styles from "./admin.users.module.css";

export default function AdminUsersPage() {
  const { authState } = useAuth();
  const me = authState.type === "authenticated" ? authState.user : null;
  const [role, setRole] = useState<UserRole | "__all">("__all");
  const [q, setQ] = useState("");
  const debouncedQ = useDebounce(q, 300);
  const { data, isPending, error } = useAdminUsers({ ...(role === "__all" ? {} : { role }), ...(debouncedQ ? { q: debouncedQ } : {}) });
  const update = useUpdateUser();

  const change = (u: AdminUserItem, patch: { isActive?: boolean; role?: UserRole }) =>
    update.mutate(
      { userId: u.id, ...patch },
      { onSuccess: () => toast.success(`Akun ${u.displayName} diperbarui`), onError: (e) => toast.error(e.message) }
    );

  const columns: Column<AdminUserItem>[] = [
    {
      key: "user",
      header: "Pengguna",
      render: (u) => (
        <div className={styles.cell}>
          <span className={styles.name}>{u.displayName}</span>
          <span className={styles.sub}>{u.email}</span>
        </div>
      ),
    },
    {
      key: "role",
      header: "Peran",
      render: (u) => (
        <Select value={u.role} onValueChange={(v) => change(u, { role: v as UserRole })} disabled={update.isPending || u.id === me?.id}>
          <SelectTrigger className={styles.roleSelect}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {UserRoleArrayValues.map((r) => (
              <SelectItem key={r} value={r}>
                {roleLabel[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      key: "active",
      header: "Aktif",
      render: (u) => (
        <div className={styles.activeCell}>
          <Switch checked={u.isActive} onCheckedChange={(v) => change(u, { isActive: v })} disabled={update.isPending || u.id === me?.id} />
          <StatusBadge tone={u.isActive ? "success" : "error"} size="sm">
            {u.isActive ? "Aktif" : "Nonaktif"}
          </StatusBadge>
        </div>
      ),
    },
    { key: "campaigns", header: "Campaign", align: "right", hideOnMobile: true, render: (u) => u.campaignCount },
    { key: "subs", header: "Submission", align: "right", hideOnMobile: true, render: (u) => u.submissionCount },
    { key: "paid", header: "Dibayar", align: "right", hideOnMobile: true, render: (u) => <Mono>{formatRupiah(u.paidTotal)}</Mono> },
    { key: "joined", header: "Bergabung", hideOnMobile: true, render: (u) => <span className={styles.sub}>{formatDate(u.createdAt)}</span> },
  ];

  return (
    <>
      <Helmet>
        <title>Pengguna — PINTAS</title>
      </Helmet>
      <PageHeader eyebrow="Pengguna" title="Manajemen pengguna" description="Kelola peran dan status akun Owner, Creator, dan Admin." />
      <Toolbar>
        <div className={styles.search}>
          <Search size={16} className={styles.searchIcon} />
          <Input placeholder="Cari nama atau email…" value={q} onChange={(e) => setQ(e.target.value)} className={styles.searchInput} />
        </div>
        <Select value={role} onValueChange={(v) => setRole(v as UserRole | "__all")}>
          <SelectTrigger style={{ width: 180 }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Semua peran</SelectItem>
            {UserRoleArrayValues.map((r) => (
              <SelectItem key={r} value={r}>
                {roleLabel[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Toolbar>
      {error && <InlineAlert tone="error">{error.message}</InlineAlert>}
      <DataTable columns={columns} rows={data?.users ?? []} rowKey={(u) => u.id} isLoading={isPending} emptyState={<EmptyState icon={<Users size={26} />} title="Tidak ada pengguna" />} />
    </>
  );
}
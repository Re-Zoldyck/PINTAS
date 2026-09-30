import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Megaphone,
  FolderHeart,
  FileCheck2,
  Wallet,
  UserRound,
  PlusCircle,
  Eye,
  PiggyBank,
  BadgeCheck,
  Bot,
  MessageSquareWarning,
  HandCoins,
  Users,
  ScrollText,
  LogOut,
  Menu,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../helpers/useAuth";
import { User } from "../helpers/User";
import { roleLabel } from "../helpers/pintasLabels";
import { useLiveUpdates } from "../helpers/useLiveUpdates";
import { ThemeModeSwitch } from "./ThemeModeSwitch";
import { Button } from "./Button";
import { Sheet, SheetContent, SheetTrigger } from "./Sheet";
import { Avatar, AvatarFallback } from "./Avatar";
import styles from "./AppShell.module.css";

type NavItem = { to: string; label: string; icon: React.ReactNode; end?: boolean };

const NAV: Record<User["role"], NavItem[]> = {
  creator: [
    { to: "/creator/dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
    { to: "/creator/campaigns", label: "Campaign Tersedia", icon: <Megaphone size={18} />, end: true },
    { to: "/creator/my-campaigns", label: "Campaign Saya", icon: <FolderHeart size={18} /> },
    { to: "/creator/submissions", label: "Submission Saya", icon: <FileCheck2 size={18} /> },
    { to: "/creator/payments", label: "Riwayat Pembayaran", icon: <Wallet size={18} /> },
    { to: "/creator/profile", label: "Profil", icon: <UserRound size={18} /> },
  ],
  owner: [
    { to: "/owner/dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
    { to: "/owner/campaigns", label: "Campaign", icon: <Megaphone size={18} />, end: true },
    { to: "/owner/campaigns/new", label: "Buat Campaign", icon: <PlusCircle size={18} /> },
    { to: "/owner/submissions", label: "Monitoring Submission", icon: <Eye size={18} /> },
    { to: "/owner/budget", label: "Monitoring Budget", icon: <PiggyBank size={18} /> },
    { to: "/owner/payments", label: "Monitoring Pembayaran", icon: <Wallet size={18} /> },
  ],
  admin: [
    { to: "/admin/dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
    { to: "/admin/campaigns", label: "Manajemen Campaign", icon: <Megaphone size={18} /> },
    { to: "/admin/submissions", label: "Verifikasi Submission", icon: <BadgeCheck size={18} /> },
    { to: "/admin/ai-review", label: "Review Hasil AI", icon: <Bot size={18} /> },
    { to: "/admin/disputes", label: "Sanggahan", icon: <MessageSquareWarning size={18} /> },
    { to: "/admin/claims", label: "Manajemen Claim", icon: <HandCoins size={18} /> },
    { to: "/admin/payments", label: "Konfirmasi Pembayaran", icon: <Wallet size={18} /> },
    { to: "/admin/users", label: "Pengguna", icon: <Users size={18} /> },
    { to: "/admin/audit-log", label: "Audit Log", icon: <ScrollText size={18} /> },
  ],
};

const LiveUpdatesBridge: React.FC<{ user: User }> = ({ user }) => {
  useLiveUpdates(user);
  return null;
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("") || "P";

const NavList: React.FC<{ items: NavItem[]; onNavigate?: () => void }> = ({ items, onNavigate }) => (
  <nav className={styles.nav} aria-label="Navigasi utama">
    {items.map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        onClick={onNavigate}
        className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
      >
        <span className={styles.navIcon}>{item.icon}</span>
        <span>{item.label}</span>
        <ChevronRight size={14} className={styles.navChevron} />
      </NavLink>
    ))}
  </nav>
);

export const AppShell: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  const { authState, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (authState.type !== "authenticated") {
    return <>{children}</>;
  }
  const user = authState.user;
  const items = NAV[user.role];

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const userBlock = (
    <div className={styles.userBlock}>
      <Avatar className={styles.avatar}>
        <AvatarFallback className={styles.avatarFallback}>{initials(user.displayName)}</AvatarFallback>
      </Avatar>
      <div className={styles.userMeta}>
        <span className={styles.userName}>{user.displayName}</span>
        <span className={styles.userRole}>{roleLabel[user.role]}</span>
      </div>
      <Button variant="ghost" size="icon-sm" className={styles.logoutButton} onClick={handleLogout} aria-label="Keluar">
        <LogOut size={16} />
      </Button>
    </div>
  );

  return (
    <>
      <LiveUpdatesBridge user={user} />
      <div className={`${styles.shell} ${className ?? ""}`}>
        <aside className={styles.sidebar}>
          <Link to={items[0].to} className={styles.brand}>
            <span className={styles.brandMark}>P</span>
            <span className={styles.brandName}>PINTAS</span>
          </Link>
          <span className={styles.roleTag}>Panel {roleLabel[user.role]}</span>
          <NavList items={items} />
          <div className={styles.sidebarFooter}>{userBlock}</div>
        </aside>

        <div className={styles.main}>
          <header className={styles.topbar}>
            <div className={styles.topbarLeft}>
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon-md" className={styles.menuButton} aria-label="Buka menu">
                    <Menu size={20} />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className={styles.sheet}>
                  <div className={styles.sheetBrand}>
                    <span className={styles.brandMark}>P</span>
                    <span className={styles.brandName}>PINTAS</span>
                  </div>
                  <span className={styles.roleTag}>Panel {roleLabel[user.role]}</span>
                  <NavList items={items} onNavigate={() => setOpen(false)} />
                  <div className={styles.sidebarFooter}>{userBlock}</div>
                </SheetContent>
              </Sheet>
              <Link to={items[0].to} className={styles.topbarBrand}>
                PINTAS
              </Link>
            </div>
            <div className={styles.topbarRight}>
              <span className={styles.topbarUser}>{user.displayName}</span>
              <ThemeModeSwitch />
            </div>
          </header>
          <main className={styles.content}>{children}</main>
        </div>
      </div>
    </>
  );
};
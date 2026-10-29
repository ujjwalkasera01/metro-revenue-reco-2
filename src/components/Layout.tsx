import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BarChart3, Bell, CalendarRange, ChevronDown, FileText, LayoutDashboard, LogOut, Menu, PhoneCall, ScrollText,
  Settings as SettingsIcon, ShieldCheck, Ticket as TicketIcon, TrainFront, Users, MapPin, Repeat,
} from 'lucide-react';
import { Sheet, SheetContent } from '@project/components/ui/sheet';
import { Button } from '@project/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@project/components/ui/dropdown-menu';
import { cn } from '@project/components/lib/utils';
import { OPEN_STATUSES, useStore } from '../lib/store';
import type { Role } from '../lib/types';
import { ROLE_INFO, fmtAgo, inr } from '../lib/format';
import { toast } from 'sonner';

const ROLES: Role[] = ['Station Team', 'AFC Team', 'Revenue Team', 'Finance Team', 'Administrator'];
const A: Role[] = ROLES;

export const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: A },
  { to: '/reconciliation', label: 'Reconciliation Monitor', icon: CalendarRange, roles: A },
  { to: '/tickets', label: 'Tickets', icon: TicketIcon, roles: A },
  { to: '/communications', label: 'Communication Center', icon: PhoneCall, roles: ['Station Team', 'Revenue Team', 'Administrator'] as Role[] },
  { to: '/reports', label: 'Revenue Reports', icon: FileText, roles: ['Revenue Team', 'Finance Team', 'Administrator'] as Role[] },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, roles: ['AFC Team', 'Revenue Team', 'Finance Team', 'Administrator'] as Role[] },
  { to: '/stations', label: 'Stations & SPOCs', icon: MapPin, roles: ['Station Team', 'AFC Team', 'Revenue Team', 'Administrator'] as Role[] },
  { to: '/audit', label: 'Audit Logs', icon: ScrollText, roles: ['AFC Team', 'Finance Team', 'Administrator'] as Role[] },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, roles: ['Revenue Team', 'Administrator'] as Role[] },
  { to: '/users', label: 'User Management', icon: Users, roles: ['Administrator'] as Role[] },
];

function SidebarBody({ onNav }: { onNav?: () => void }) {
  const { session, tickets } = useStore();
  const open = tickets.filter((t) => OPEN_STATUSES.includes(t.status)).length;
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="rounded-lg bg-sidebar-primary p-2 text-white"><TrainFront className="h-5 w-5" /></div>
        <div>
          <p className="text-sm font-bold text-white leading-tight">MetroRev</p>
          <p className="text-[11px] text-sidebar-foreground/70">Reconciliation & AI Ops</p>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {NAV.filter((n) => session && n.roles.includes(session.role)).map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} onClick={onNav}
            className={({ isActive }) => cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive ? 'bg-sidebar-accent text-white shadow-sm' : 'hover:bg-sidebar-accent/60 hover:text-white',
            )}>
            <n.icon className="h-4 w-4" />
            <span className="flex-1">{n.label}</span>
            {n.to === '/tickets' && <span className="num rounded-full bg-destructive px-1.5 text-[10px] text-white">{open}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="m-3 rounded-lg border border-sidebar-border bg-sidebar-accent/50 p-3 text-[11px]">
        <div className="flex items-center gap-1.5 font-semibold text-white"><ShieldCheck className="h-3.5 w-3.5 text-sidebar-primary" /> Demo environment</div>
        <p className="mt-1 text-sidebar-foreground/70">All data, calls and emails are simulated. No real systems connected.</p>
      </div>
    </div>
  );
}

function Notifications() {
  const { tickets, stationById } = useStore();
  const nav = useNavigate();
  const recent = tickets.filter((t) => t.status === 'Open' || t.status === 'Escalated').slice(0, 5);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {recent.length > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Alerts</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {recent.length === 0 && <p className="p-3 text-xs text-muted-foreground">You're all caught up.</p>}
        {recent.map((t) => (
          <DropdownMenuItem key={t.id} onClick={() => nav(`/tickets/${t.id}`)} className="flex-col items-start gap-0.5">
            <span className="text-xs font-semibold">{t.status === 'Escalated' ? 'Escalated' : 'New discrepancy'} · {t.id}</span>
            <span className="text-xs text-muted-foreground">{stationById(t.stationId).name} · {inr(t.amount)} · {fmtAgo(t.createdAt)}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ProfileMenu() {
  const { me, session, switchRole, logout } = useStore();
  const nav = useNavigate();
  if (!me || !session) return null;
  const initials = me.name.split(' ').map((p) => p[0]).join('');
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-lg border bg-card px-2 py-1.5 text-left hover:bg-muted">
          <span className={cn('flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white', ROLE_INFO[session.role].color)}>{initials}</span>
          <span className="hidden sm:block">
            <span className="block text-xs font-semibold leading-tight">{me.name}</span>
            <span className="block text-[11px] text-muted-foreground">{session.role}</span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          <p className="text-sm">{me.name}</p>
          <p className="text-xs font-normal text-muted-foreground">{me.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="flex items-center gap-1.5 text-xs text-muted-foreground"><Repeat className="h-3 w-3" /> Switch demo role</DropdownMenuLabel>
        {ROLES.map((r) => (
          <DropdownMenuItem key={r} onClick={() => { switchRole(r); nav('/'); toast.success(`Switched to ${r}`); }}>
            <span className={cn('mr-2 h-2 w-2 rounded-full', ROLE_INFO[r].color)} />
            {r}
            {r === session.role && <span className="ml-auto text-[10px] text-primary">Current</span>}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => { logout(); nav('/'); }} className="text-destructive">
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function Layout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 lg:block"><SidebarBody /></aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 border-0 p-0"><SidebarBody onNav={() => setOpen(false)} /></SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-card/90 px-4 backdrop-blur lg:px-8">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></Button>
          <div className="hidden text-xs text-muted-foreground md:block">
            Business date <span className="num font-semibold text-foreground">29 Oct 2026</span> · Last AFC sync <span className="font-semibold text-foreground">11:30 IST</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Notifications />
            <ProfileMenu />
          </div>
        </header>
        <main className="flex-1 px-4 py-6 lg:px-8"><Outlet /></main>
      </div>
    </div>
  );
}

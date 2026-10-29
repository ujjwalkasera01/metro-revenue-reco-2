import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from '@project/components/ui/sonner';
import { StoreProvider, useStore } from './lib/store';
import Layout, { NAV } from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ReconMonitor from './pages/ReconMonitor';
import Tickets from './pages/Tickets';
import TicketDetail from './pages/TicketDetail';
import CommCenter from './pages/CommCenter';
import Reports from './pages/Reports';
import Analytics from './pages/Analytics';
import Stations from './pages/Stations';
import AuditLogs from './pages/AuditLogs';
import SettingsPage from './pages/Settings';
import UsersPage from './pages/Users';
import { NoAccess } from './components/common';
import type { ReactElement } from 'react';

function Guard({ path, el }: { path: string; el: ReactElement }) {
  const { session } = useStore();
  const item = NAV.find((n) => n.to === path);
  if (item && session && !item.roles.includes(session.role)) return <NoAccess what={`open ${item.label}`} />;
  return el;
}

function Shell() {
  const { session } = useStore();
  if (!session) return <Login />;
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="reconciliation" element={<ReconMonitor />} />
        <Route path="tickets" element={<Tickets />} />
        <Route path="tickets/:id" element={<TicketDetail />} />
        <Route path="communications" element={<Guard path="/communications" el={<CommCenter />} />} />
        <Route path="reports" element={<Guard path="/reports" el={<Reports />} />} />
        <Route path="analytics" element={<Guard path="/analytics" el={<Analytics />} />} />
        <Route path="stations" element={<Guard path="/stations" el={<Stations />} />} />
        <Route path="audit" element={<Guard path="/audit" el={<AuditLogs />} />} />
        <Route path="settings" element={<Guard path="/settings" el={<SettingsPage />} />} />
        <Route path="users" element={<Guard path="/users" el={<UsersPage />} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Shell />
        <Toaster richColors position="top-right" />
      </BrowserRouter>
    </StoreProvider>
  );
}

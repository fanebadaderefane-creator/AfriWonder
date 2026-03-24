import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import OverviewPanel from '@/components/admin/OverviewPanel';
import UsersPanel from '@/components/admin/UsersPanel';
import FinancePanel from '@/components/admin/FinancePanel';
import ModerationPanel from '@/components/admin/ModerationPanel';
import AnalyticsPanel from '@/components/admin/AnalyticsPanel';
import SettingsPanel from '@/components/admin/SettingsPanel';
import AuditPanel from '@/components/admin/AuditPanel';
import LogisticsPanel from '@/components/admin/LogisticsPanel';
import AdsCampaignsPanel from '@/components/admin/AdsCampaignsPanel';
import VerificationsPanel from '@/components/admin/VerificationsPanel';
import EarlyAccessPanel from '@/components/admin/EarlyAccessPanel';
import MonetizationRequestsPanel from '@/components/admin/MonetizationRequestsPanel';
import MaliConnectPanel from '@/components/admin/MaliConnectPanel';
import AIEnginePanel from '@/components/admin/AIEnginePanel';
import BusinessIntelligencePanel from '@/components/admin/BusinessIntelligencePanel';
import SupportTicketsPanel from '@/components/admin/SupportTicketsPanel';

const SUPER_ADMIN_EMAIL = (import.meta.env.VITE_SUPER_ADMIN_EMAIL || 'fanebadaderefane@gmail.com').toLowerCase();
const ADMIN_ROLES = ['super_admin', 'admin', 'finance_admin', 'moderation_admin', 'support_admin', 'data_admin'];
const isAllowedAdmin = (u) => u?.email?.toLowerCase() === SUPER_ADMIN_EMAIL && ADMIN_ROLES.includes(u?.role);

function ActivePanel({ activeTab, user, onTabChange }) {
  switch (activeTab) {
    case 'overview':
      return <OverviewPanel onTabChange={onTabChange} />;
    case 'users':
      return <UsersPanel />;
    case 'finance':
      return <FinancePanel />;
    case 'monetization':
      return <MonetizationRequestsPanel />;
    case 'verifications':
      return <VerificationsPanel />;
    case 'campagnes':
      return <AdsCampaignsPanel />;
    case 'videos':
      return <ModerationPanel subTab="videos" />;
    case 'orders':
      return <ModerationPanel subTab="orders" />;
    case 'sellers':
      return <ModerationPanel subTab="sellers" />;
    case 'disputes':
      return <ModerationPanel subTab="disputes" />;
    case 'returns':
      return <ModerationPanel subTab="returns" />;
    case 'reports':
      return <ModerationPanel subTab="reports" />;
    case 'logistics':
      return <LogisticsPanel />;
    case 'analytics':
      return <AnalyticsPanel />;
    case 'audit':
      return <AuditPanel />;
    case 'earlyaccess':
      return <EarlyAccessPanel />;
    case 'maliconnect':
      return <MaliConnectPanel />;
    case 'ai-engine':
      return <AIEnginePanel />;
    case 'business-intelligence':
      return <BusinessIntelligencePanel />;
    case 'support-tickets':
      return <SupportTicketsPanel />;
    case 'settings':
      return <SettingsPanel userRole={user?.role} />;
    default:
      return <OverviewPanel />;
  }
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const getUser = async () => {
      try {
        const u = await api.auth.me();
        if (!u || !isAllowedAdmin(u)) {
          navigate('/Home');
          return;
        }
        setUser(u);
      } catch (e) {
        navigate('/Home');
      }
    };
    getUser();
  }, [navigate]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AdminLayout
      user={user}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
    >
      <ActivePanel activeTab={activeTab} user={user} onTabChange={setActiveTab} />
    </AdminLayout>
  );
}

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { MerchantDashboard } from './pages/MerchantDashboard';
import { ChatWorkspace } from './pages/ChatWorkspace';
import { CallingPage } from './pages/CallingPage';
import { OperationsConsole } from './pages/OperationsConsole';
import { SettlementInvestigationPage } from './pages/SettlementInvestigationPage';
import { ResolutionCallbackModal, CallbackEvent } from './components/ResolutionCallbackModal';
import { opsApi } from './services/api';
import { UserRole } from './types';
import { ShieldCheck, Heart } from 'lucide-react';

export const App: React.FC = () => {
  const [currentRole, setCurrentRole] = useState<UserRole>('MERCHANT');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat' | 'calling' | 'console' | 'investigation'>('dashboard');
  const [isResetting, setIsResetting] = useState(false);
  const [chatInitialQuery, setChatInitialQuery] = useState<string>('');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [callbackEvent, setCallbackEvent] = useState<CallbackEvent | null>(null);

  useEffect(() => {
    handleRoleChange('MERCHANT');
    checkHealth();
  }, []);

  const checkHealth = async () => {
    try {
      const res = await opsApi.getHealth();
      if (res.ok) {
        setHealthStatus(res.data);
      }
    } catch (e) {
      console.warn('Health check notice:', e);
    }
  };

  const handleRoleChange = async (role: UserRole) => {
    setCurrentRole(role);
    try {
      const res = await opsApi.demoLogin(role);
      if (res.ok) {
        localStorage.setItem('opssaathi_token', res.data.access_token);
        if (role === 'SUPPORT_AGENT' || role === 'SUPERVISOR') {
          setActiveTab('console');
        } else {
          setActiveTab('dashboard');
        }
      }
    } catch (err) {
      console.error('Role login failed:', err);
    }
  };

  const handleResetDemo = async () => {
    setIsResetting(true);
    try {
      const res = await opsApi.resetDemo();
      if (res.ok) {
        alert('Seeded demo scenario reset! Sharma Sweets has ₹15,000 captures and ₹9,000 settled batch.');
        window.location.reload();
      }
    } catch (err: any) {
      alert(`Reset failed: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  const handleOpenChatWithQuery = (query: string) => {
    setChatInitialQuery(query);
    setActiveTab('chat');
  };

  const handleSelectCase = (caseId?: string) => {
    if (caseId) setSelectedCaseId(caseId);
    setActiveTab('console');
  };

  return (
    <div className="min-h-screen bg-[#F4F7FB] flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
        onResetDemo={handleResetDemo}
        isResetting={isResetting}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab !== 'chat') setChatInitialQuery('');
        }}
      />

      {/* Main Page Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <MerchantDashboard
            onOpenChatWithQuery={handleOpenChatWithQuery}
            onOpenConsole={() => setActiveTab('console')}
            onOpenInvestigation={() => setActiveTab('investigation')}
          />
        )}

        {/* Settlement Investigation & Evidence Centre */}
        {activeTab === 'investigation' && (
          <SettlementInvestigationPage
            onOpenConsole={handleSelectCase}
            onOpenChatWithQuery={handleOpenChatWithQuery}
          />
        )}

        {activeTab === 'chat' && (
          <ChatWorkspace
            initialQuery={chatInitialQuery}
            onViewCase={handleSelectCase}
          />
        )}

        {/* Dedicated Voice Calling Page */}
        {activeTab === 'calling' && (
          <CallingPage
            onViewCase={handleSelectCase}
          />
        )}

        {activeTab === 'console' && (
          <OperationsConsole
            onSelectCase={setSelectedCaseId}
            selectedCaseId={selectedCaseId}
            onTriggerCallback={(evt) => setCallbackEvent(evt)}
            currentRole={currentRole}
          />
        )}
      </main>

      {/* Autonomous Resolution Callback Modal to Sharma Ji */}
      <ResolutionCallbackModal
        callbackEvent={callbackEvent}
        onClose={() => setCallbackEvent(null)}
        onCallCompleted={() => {
          handleRoleChange('MERCHANT');
          setActiveTab('dashboard');
        }}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 text-slate-500 text-xs py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <div className="flex items-baseline paytm-logo-text">
              <span className="text-xl font-extrabold text-[#002970]">pay</span>
              <span className="text-xl font-extrabold text-[#00BAF2]">tm</span>
              <span className="text-[10px] font-semibold text-rose-500 mx-1">❤️</span>
              <span className="text-sm font-bold text-[#002970]">OpsSaathi AI</span>
            </div>
            <span className="text-slate-400">|</span>
            <span>Paytm Build for India AI Hackathon 2026 • Team Two Bits</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 text-[11px] font-mono text-slate-400">
            <span>Deterministic Decimal Reconciler</span>
            <span>•</span>
            <span>Independent Verification Gate</span>
            <span>•</span>
            <span>Settlement: SYNTHETIC_DEMO</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;

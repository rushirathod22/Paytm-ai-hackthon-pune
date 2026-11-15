import React, { useState, useRef, useEffect } from 'react';
import {
  RotateCcw,
  User as UserIcon,
  ChevronDown,
  Bot,
  FileCheck2,
  Check,
  PhoneCall,
  Sparkles,
  Calculator
} from 'lucide-react';
import { UserRole } from '../types';

interface NavbarProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onResetDemo: () => void;
  isResetting: boolean;
  activeTab: 'dashboard' | 'chat' | 'calling' | 'console' | 'investigation';
  onTabChange: (tab: 'dashboard' | 'chat' | 'calling' | 'console' | 'investigation') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  onRoleChange,
  onResetDemo,
  isResetting,
  activeTab,
  onTabChange,
}) => {
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsRoleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const roles: { role: UserRole; title: string; subtitle: string; initial: string }[] = [
    {
      role: 'MERCHANT',
      title: 'Sharma Sweets & Chaat',
      subtitle: 'Merchant • MID: PAYTM_STAGE_MID_8819',
      initial: 'M',
    },
    {
      role: 'SUPPORT_AGENT',
      title: 'Rahul Verma',
      subtitle: 'Support Agent • Settlement Queue',
      initial: 'A',
    },
    {
      role: 'SUPERVISOR',
      title: 'Priya Iyer',
      subtitle: 'Operations Supervisor • Remediation Gate',
      initial: 'S',
    },
  ];

  const currentRoleInfo = roles.find((r) => r.role === currentRole) || roles[0];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 sm:h-20">
          {/* LEFT: Paytm Logo */}
          <div
            className="flex items-center space-x-2.5 cursor-pointer select-none shrink-0"
            onClick={() => onTabChange('dashboard')}
          >
            <div className="flex items-baseline paytm-logo-text">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#002970]">pay</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-[#00BAF2]">tm</span>
              <span className="text-xs font-semibold text-rose-500 mx-1">❤️</span>
              <span className="text-lg sm:text-xl font-bold text-[#002970] tracking-tight">OpsSaathi</span>
            </div>
            <span className="hidden md:inline-block bg-[#E8F8FE] text-[#002970] text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-[#00BAF2]/30 uppercase tracking-wide">
              for Business
            </span>
          </div>

          {/* CENTER: Navigation Links (Clean, No-Wrap, Paytm Style) */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-1.5 font-medium text-sm text-slate-700">
            <button
              onClick={() => onTabChange('dashboard')}
              className={`px-3.5 py-2 rounded-full transition-all whitespace-nowrap text-xs lg:text-sm font-semibold ${
                activeTab === 'dashboard'
                  ? 'text-[#002970] bg-[#E8F8FE]'
                  : 'hover:text-[#002970] hover:bg-slate-50'
              }`}
            >
              Merchant Workspace
            </button>

            {/* Investigation Centre Link */}
            <button
              onClick={() => onTabChange('investigation')}
              className={`px-3.5 py-2 rounded-full transition-all whitespace-nowrap text-xs lg:text-sm font-semibold flex items-center space-x-1.5 ${
                activeTab === 'investigation'
                  ? 'text-[#002970] bg-[#E8F8FE]'
                  : 'hover:text-[#002970] hover:bg-slate-50'
              }`}
            >
              <Calculator className="w-4 h-4 text-[#00BAF2]" />
              <span>Settlement Investigation</span>
            </button>

            <button
              onClick={() => onTabChange('chat')}
              className={`px-3.5 py-2 rounded-full transition-all whitespace-nowrap text-xs lg:text-sm font-semibold flex items-center space-x-1.5 ${
                activeTab === 'chat'
                  ? 'text-[#002970] bg-[#E8F8FE]'
                  : 'hover:text-[#002970] hover:bg-slate-50'
              }`}
            >
              <Bot className="w-4 h-4 text-[#00BAF2]" />
              <span>Ask OpsSaathi</span>
            </button>

            {/* Calling Page Link */}
            <button
              onClick={() => onTabChange('calling')}
              className={`px-3.5 py-2 rounded-full transition-all whitespace-nowrap text-xs lg:text-sm font-semibold flex items-center space-x-1.5 ${
                activeTab === 'calling'
                  ? 'text-[#002970] bg-[#E8F8FE]'
                  : 'hover:text-[#002970] hover:bg-slate-50'
              }`}
            >
              <PhoneCall className="w-4 h-4 text-emerald-600" />
              <span>Voice Calling</span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                AI Call
              </span>
            </button>

            <button
              onClick={() => onTabChange('console')}
              className={`px-3.5 py-2 rounded-full transition-all whitespace-nowrap text-xs lg:text-sm font-semibold flex items-center space-x-1.5 ${
                activeTab === 'console'
                  ? 'text-[#002970] bg-[#E8F8FE]'
                  : 'hover:text-[#002970] hover:bg-slate-50'
              }`}
            >
              <FileCheck2 className="w-4 h-4 text-[#002970]" />
              <span>Ops Console</span>
            </button>
          </nav>

          {/* RIGHT: Action Controls (Reset Button & Custom Account Dropdown) */}
          <div className="flex items-center space-x-2.5 sm:space-x-3 shrink-0">
            {/* Demo Reset Button */}
            <button
              onClick={onResetDemo}
              disabled={isResetting}
              title="Reset seeded demo scenario to clean initial state"
              className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 hover:text-[#002970] border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 px-3 sm:px-3.5 py-2 rounded-full transition-all shadow-xs whitespace-nowrap"
            >
              <RotateCcw className={`w-3.5 h-3.5 text-slate-500 ${isResetting ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Reset Demo</span>
            </button>

            {/* Unified Account / Role Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                className="flex items-center space-x-2 bg-[#002970] hover:bg-[#001f54] text-white pl-2 pr-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shadow-md shadow-[#002970]/10 cursor-pointer select-none whitespace-nowrap"
              >
                <div className="w-6 h-6 rounded-full bg-[#00BAF2] text-[#002970] font-bold flex items-center justify-center text-[11px] shrink-0">
                  {currentRoleInfo.initial}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-white text-xs font-bold leading-tight">
                    {currentRoleInfo.title.split(' ')[0]} {currentRoleInfo.title.split(' ')[1] || ''}
                  </span>
                  <span className="text-[10px] text-sky-200 font-normal leading-none hidden sm:inline">
                    {currentRole === 'MERCHANT' ? 'Merchant' : currentRole === 'SUPERVISOR' ? 'Supervisor' : 'Support'}
                  </span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-sky-200 transition-transform ${isRoleDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Floating Custom Dropdown Menu */}
              {isRoleDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200/80 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Switch Active Role
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Test merchant, support, or supervisor view
                    </p>
                  </div>

                  <div className="p-1 space-y-1">
                    {roles.map((r) => {
                      const isSelected = r.role === currentRole;
                      return (
                        <div
                          key={r.role}
                          onClick={() => {
                            onRoleChange(r.role);
                            setIsRoleDropdownOpen(false);
                          }}
                          className={`flex items-start space-x-3 p-2.5 rounded-xl cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-[#E8F8FE] text-[#002970]'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                              isSelected
                                ? 'bg-[#002970] text-white'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {r.initial}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold truncate">{r.title}</p>
                              {isSelected && <Check className="w-3.5 h-3.5 text-[#00BAF2] shrink-0" />}
                            </div>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">{r.subtitle}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="px-4 py-2 mt-1 border-t border-slate-100 bg-slate-50 text-[10px] text-slate-400 font-mono rounded-b-2xl flex items-center justify-between">
                    <span>Paytm Staging Scope</span>
                    <span className="font-bold text-emerald-600">Active Session</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        <div className="flex md:hidden items-center justify-around py-2.5 border-t border-slate-100 text-xs font-semibold text-slate-600">
          <button
            onClick={() => onTabChange('dashboard')}
            className={`py-1 px-2.5 rounded-full ${activeTab === 'dashboard' ? 'text-[#002970] bg-[#E8F8FE]' : ''}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => onTabChange('chat')}
            className={`py-1 px-2.5 rounded-full flex items-center space-x-1 ${activeTab === 'chat' ? 'text-[#002970] bg-[#E8F8FE]' : ''}`}
          >
            <Bot className="w-3.5 h-3.5 text-[#00BAF2]" />
            <span>Chat</span>
          </button>
          <button
            onClick={() => onTabChange('calling')}
            className={`py-1 px-2.5 rounded-full flex items-center space-x-1 ${activeTab === 'calling' ? 'text-emerald-700 bg-emerald-50' : ''}`}
          >
            <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
            <span>Call</span>
          </button>
          <button
            onClick={() => onTabChange('console')}
            className={`py-1 px-2.5 rounded-full ${activeTab === 'console' ? 'text-[#002970] bg-[#E8F8FE]' : ''}`}
          >
            Console
          </button>
        </div>
      </div>
    </header>
  );
};

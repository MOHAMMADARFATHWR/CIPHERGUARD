/**
 * CipherGuard 3D - Top Bar Component
 * Enforces the Universal Frontend Design Top Bar Contract (1 row, 3 zones, gap-8)
 * Supports 4 distinct authenticated roles: Sender, Receiver, Banker, and Hacker
 */

import React from 'react';
import { UserProfile, UserRole } from '../../types/security';
import {
  ShieldCheck,
  User,
  Activity,
  Flame,
  Wallet,
  LogIn,
  LogOut,
  ChevronDown,
  Sun,
  Moon,
  Sparkles,
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'overview' | 'customer' | 'receiver' | 'soc' | 'adversary' | 'architecture' | 'login';
  onSelectTab: (tab: 'overview' | 'customer' | 'receiver' | 'soc' | 'adversary' | 'architecture' | 'login') => void;
  currentUser: UserProfile;
  onOpenLogin: () => void;
  senderBalance: number;
  receiverBalance: number;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  onOpenInteractiveTour?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
  onOpenLogin,
  senderBalance,
  receiverBalance,
  theme = 'dark',
  onToggleTheme,
  onOpenInteractiveTour,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#080D18]/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-6 py-3.5">
        {/* Zone 1: Brand Title (Single text element wordmark) */}
        <button
          onClick={() => onSelectTab('overview')}
          className="flex items-center gap-2.5 text-left text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 hover:opacity-90 transition-opacity"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#35D6C5] to-[#4C8DFF] flex items-center justify-center text-slate-950 shadow-sm shadow-[#35D6C5]/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <span className="font-heading text-lg tracking-tight">CIPHERGUARD 3D</span>
        </button>

        {/* Zone 2: Navigation Links (single-line, whitespace-nowrap) */}
        <nav className="hidden lg:flex items-center gap-5 text-xs font-medium text-slate-400">
          <button
            onClick={() => onSelectTab('overview')}
            className={`transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'overview'
                ? 'text-[#35D6C5] font-semibold'
                : 'hover:text-slate-200'
            }`}
          >
            Showcase
          </button>
          <button
            onClick={() => onSelectTab('customer')}
            className={`transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'customer'
                ? 'text-[#35D6C5] font-semibold'
                : 'hover:text-slate-200'
            }`}
          >
            Sender Home
          </button>
          <button
            onClick={() => onSelectTab('receiver')}
            className={`transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'receiver'
                ? 'text-[#36D399] font-semibold'
                : 'hover:text-slate-200'
            }`}
          >
            Receiver Home
          </button>
          <button
            onClick={() => onSelectTab('soc')}
            className={`transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'soc'
                ? 'text-[#4C8DFF] font-semibold'
                : 'hover:text-slate-200'
            }`}
          >
            Banker Home
          </button>
          <button
            onClick={() => onSelectTab('adversary')}
            className={`transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'adversary'
                ? 'text-[#FF4D5A] font-semibold'
                : 'hover:text-slate-200'
            }`}
          >
            Hacker Home
          </button>
          <button
            onClick={() => onSelectTab('architecture')}
            className={`transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'architecture'
                ? 'text-[#35D6C5] font-semibold'
                : 'hover:text-slate-200'
            }`}
          >
            Architecture
          </button>
        </nav>

        {/* Zone 3: Active User / Identity Switcher */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Contextual Balance Pill */}
          {currentUser.role === 'sender' && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono">
              <span className="text-slate-500">Balance:</span>
              <span className="text-[#35D6C5] font-medium tabular-nums">
                ₹{senderBalance.toLocaleString('en-IN')}
              </span>
            </div>
          )}

          {currentUser.role === 'receiver' && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono">
              <span className="text-slate-500">Cleared:</span>
              <span className="text-[#36D399] font-medium tabular-nums">
                ₹{receiverBalance.toLocaleString('en-IN')}
              </span>
            </div>
          )}

          {/* Global Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            title={
              theme === 'light'
                ? 'Switch to High-Contrast Dark Mode (Default SOC view)'
                : 'Switch to Light Mode (Daytime presentation view)'
            }
            aria-label={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-medium transition-all cursor-pointer group shadow-sm active:scale-95"
          >
            {theme === 'light' ? (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-600 group-hover:scale-110 transition-transform" />
                <span className="hidden md:inline text-slate-700 font-mono text-[11px]">Dark Mode</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-[#F5B942] group-hover:rotate-45 transition-transform" />
                <span className="hidden md:inline text-slate-300 font-mono text-[11px]">Light Mode</span>
              </>
            )}
          </button>

          {/* Interactive Guide & Lab Button */}
          {onOpenInteractiveTour && (
            <button
              onClick={onOpenInteractiveTour}
              title="Open Interactive Guided Tour & Cryptographic Sandbox (or press '?' or 'G')"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-[#35D6C5]/10 to-[#4C8DFF]/10 border border-[#35D6C5]/30 hover:border-[#35D6C5]/60 text-xs font-medium text-[#35D6C5] transition-all cursor-pointer group shadow-sm active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#35D6C5] group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline font-mono text-[11px] font-semibold">Interactive Guide</span>
            </button>
          )}

          {/* User Profile Pill & Login Switcher */}
          <button
            onClick={onOpenLogin}
            className="flex items-center gap-2 p-1.5 pl-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg text-xs transition-colors group"
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded flex items-center justify-center font-bold text-[10px] ${
                  currentUser.role === 'sender'
                    ? 'bg-[#35D6C5]/20 text-[#35D6C5]'
                    : currentUser.role === 'receiver'
                    ? 'bg-[#36D399]/20 text-[#36D399]'
                    : currentUser.role === 'banker'
                    ? 'bg-[#4C8DFF]/20 text-[#4C8DFF]'
                    : 'bg-[#FF4D5A]/20 text-[#FF4D5A]'
                }`}
              >
                {currentUser.avatarInitials}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-white font-medium truncate max-w-[110px] leading-tight">
                  {currentUser.name}
                </div>
                <div className="text-[10px] text-slate-400 capitalize">
                  {currentUser.role}
                </div>
              </div>
            </div>
            <div className="p-1 rounded bg-slate-800 text-slate-400 group-hover:text-white">
              <LogIn className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};

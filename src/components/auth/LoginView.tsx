/**
 * CipherGuard 3D - Dedicated Authentication & Role Login Application
 * Supports 4 distinct personas: Sender, Receiver, Banker, and Hacker
 */

import React, { useState } from 'react';
import { UserProfile, UserRole } from '../../types/security';
import {
  ShieldCheck,
  User,
  ArrowRight,
  Lock,
  Mail,
  KeyRound,
  Activity,
  Flame,
  Smartphone,
  Wallet,
  CheckCircle2,
} from 'lucide-react';

export const DEMO_PROFILES: UserProfile[] = [
  {
    id: 'user-sender',
    role: 'sender',
    name: 'Priya Sharma',
    email: 'priya.sharma@enterprise-client.io',
    accountId: 'ACC-PRIYA-9821',
    accountNumber: '•••• •••• •••• 4892',
    avatarInitials: 'PS',
    roleTitle: 'Sender · Corporate Client',
    badgeColor: 'text-[#35D6C5] bg-[#35D6C5]/10 border-[#35D6C5]/20',
    balance: 250000,
  },
  {
    id: 'user-receiver',
    role: 'receiver',
    name: 'Rahul Sharma',
    email: 'rahul.sharma@hdfc-vendor.com',
    accountId: 'ACC-RAHUL-1029',
    accountNumber: '•••• •••• •••• 1029',
    avatarInitials: 'RS',
    roleTitle: 'Receiver · Commercial Beneficiary',
    badgeColor: 'text-[#36D399] bg-[#36D399]/10 border-[#36D399]/20',
    balance: 68500,
  },
  {
    id: 'user-banker',
    role: 'banker',
    name: 'Vikram Malhotra',
    email: 'vikram.m@cipherguard-bank.soc',
    accountId: 'SOC-OP-01',
    accountNumber: 'SOC-NODE-ALPHA',
    avatarInitials: 'VM',
    roleTitle: 'Banker · SOC Security Commander',
    badgeColor: 'text-[#4C8DFF] bg-[#4C8DFF]/10 border-[#4C8DFF]/20',
  },
  {
    id: 'user-hacker',
    role: 'hacker',
    name: 'Mallory Adversary',
    email: 'mallory@adversary-lab.darknet',
    accountId: 'ADV-CLAW-99',
    accountNumber: 'MITM-TAP-00',
    avatarInitials: 'MA',
    roleTitle: 'Hacker · Adversarial Penetration Lab',
    badgeColor: 'text-[#FF4D5A] bg-[#FF4D5A]/10 border-[#FF4D5A]/20',
  },
];

interface LoginViewProps {
  onLogin: (profile: UserProfile) => void;
  onCancel?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin, onCancel }) => {
  const [selectedProfile, setSelectedProfile] = useState<UserProfile>(DEMO_PROFILES[0]);
  const [emailInput, setEmailInput] = useState<string>(DEMO_PROFILES[0].email);
  const [passwordInput, setPasswordInput] = useState<string>('••••••••••••');
  const [mfaCode, setMfaCode] = useState<string>('849201');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSelectDemoProfile = (profile: UserProfile) => {
    setSelectedProfile(profile);
    setEmailInput(profile.email);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onLogin(selectedProfile);
    }, 450);
  };

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-8">
      {/* Header Banner */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#35D6C5]/10 border border-[#35D6C5]/20 text-xs font-mono text-[#35D6C5]">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>SECURE BANKING ACCESS GATEWAY</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-heading font-bold text-white tracking-tight">
          Select Your Banking Identity
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
          Choose a role profile to experience CipherGuard 3D from the perspective of the Sender, Receiver, Bank SOC Commander, or Adversary.
        </p>
      </div>

      {/* 4 Role Persona Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {DEMO_PROFILES.map((profile) => {
          const isSelected = selectedProfile.id === profile.id;
          let RoleIcon = User;
          if (profile.role === 'receiver') RoleIcon = Wallet;
          if (profile.role === 'banker') RoleIcon = Activity;
          if (profile.role === 'hacker') RoleIcon = Flame;

          return (
            <div
              key={profile.id}
              onClick={() => handleSelectDemoProfile(profile)}
              className={`p-5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between relative ${
                isSelected
                  ? 'bg-slate-900 border-[#35D6C5] shadow-xl shadow-[#35D6C5]/10'
                  : 'bg-[#101827] border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs ${
                      profile.role === 'sender'
                        ? 'bg-[#35D6C5]/15 text-[#35D6C5]'
                        : profile.role === 'receiver'
                        ? 'bg-[#36D399]/15 text-[#36D399]'
                        : profile.role === 'banker'
                        ? 'bg-[#4C8DFF]/15 text-[#4C8DFF]'
                        : 'bg-[#FF4D5A]/15 text-[#FF4D5A]'
                    }`}
                  >
                    <RoleIcon className="w-5 h-5" />
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-[#35D6C5]" />
                  )}
                </div>

                <div className="text-xs font-semibold text-white mb-0.5">
                  {profile.name}
                </div>
                <div className="text-[10px] text-slate-400 font-mono mb-2 truncate">
                  {profile.accountNumber}
                </div>
                <div className="text-[11px] text-slate-400 leading-tight mb-4">
                  {profile.roleTitle}
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-800/80">
                {profile.balance !== undefined && (
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-500">Balance:</span>
                    <span className="text-white font-medium tabular-nums">
                      ₹{profile.balance.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onLogin(profile);
                  }}
                  className="w-full py-1.5 px-3 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>Instant Login</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom Credentials Form */}
      <div className="max-w-xl mx-auto p-6 sm:p-8 rounded-xl bg-[#101827] border border-slate-800">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Authenticated Session Credentials
            </h3>
            <p className="text-xs text-slate-400">
              Logging in as: <span className="text-[#35D6C5] font-medium">{selectedProfile.name}</span> ({selectedProfile.roleTitle})
            </p>
          </div>
          <div className="p-2 rounded-lg bg-slate-800/60 text-[#35D6C5]">
            <Lock className="w-4 h-4" />
          </div>
        </div>

        <form onSubmit={handleCustomSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Authorized Email / Identity Principal
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-[#35D6C5] font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Master Security Key
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-[#35D6C5] font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Hardware MFA Token
              </label>
              <input
                type="text"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-[#35D6C5] font-mono"
                required
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-[#35D6C5] to-[#4C8DFF] text-slate-950 font-semibold text-xs hover:opacity-95 transition-all shadow-lg shadow-[#35D6C5]/20 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Validating Credentials & Establishing Session...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Sign In as {selectedProfile.name}</span>
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-4 pt-4 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Session encrypted via TLS 1.3</span>
          <span className="text-[#35D6C5]">Zero-Knowledge Auth</span>
        </div>
      </div>
    </div>
  );
};

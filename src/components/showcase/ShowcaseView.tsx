/**
 * CipherGuard 3D - Showcase Landing View
 * Cinematic introduction with 3D pipeline hero and 4-role identity switcher
 */

import React from 'react';
import { UserRole } from '../../types/security';
import {
  ShieldCheck,
  User,
  Activity,
  Flame,
  ArrowRight,
  Wallet,
  Layers,
  Sparkles,
  FileSpreadsheet,
} from 'lucide-react';

interface ShowcaseViewProps {
  onSelectRole: (role: 'sender' | 'receiver' | 'banker' | 'hacker') => void;
  onSelectTab: (tab: 'overview' | 'customer' | 'receiver' | 'soc' | 'adversary' | 'architecture' | 'login') => void;
  onTriggerQuickDemo: () => void;
  isProcessing: boolean;
}

export const ShowcaseView: React.FC<ShowcaseViewProps> = ({
  onSelectRole,
  onSelectTab,
  onTriggerQuickDemo,
  isProcessing,
}) => {
  return (
    <div className="space-y-12 pb-12">
      {/* Cinematic Hero Section */}
      <div className="relative text-center pt-8 pb-4 max-w-4xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#35D6C5]/10 border border-[#35D6C5]/20 text-xs text-[#35D6C5] font-mono mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>PRODUCTION-GRADE CYBERSECURITY PLATFORM</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-heading font-bold text-white tracking-tight leading-tight">
          Every Transaction Has a Guardian.
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Visualize the invisible. Demonstrate the security. Defeat the interception. Experience how banking infrastructure defends transactions against Man-in-the-Middle (MITM), replay attacks, and message forgery.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <button
            onClick={onTriggerQuickDemo}
            disabled={isProcessing}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-[#35D6C5] to-[#4C8DFF] text-slate-950 font-semibold text-sm hover:opacity-95 transition-all shadow-lg shadow-[#35D6C5]/20 disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Simulating Live Pipeline...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Launch Live 3D Transaction</span>
              </>
            )}
          </button>

          <button
            onClick={() => onSelectTab('architecture')}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 hover:text-white hover:bg-slate-800 text-sm font-medium transition-colors"
          >
            <Layers className="w-4 h-4" />
            <span>Explore Architecture</span>
          </button>
        </div>
      </div>

      {/* 4 Distinct Role Entrance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Role 1: Sender */}
        <div className="p-5 rounded-xl bg-[#101827] border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all group">
          <div>
            <div className="w-9 h-9 rounded-lg bg-[#35D6C5]/10 text-[#35D6C5] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <User className="w-4 h-4" />
            </div>
            <div className="text-[10px] font-mono text-[#35D6C5] uppercase mb-1">
              Role 01 · Corporate Client
            </div>
            <h3 className="text-base font-heading font-semibold text-white mb-1.5">
              Sender Portal
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Priya Sharma's portal. Hold private ECDSA keys, initiate wire transfers, and track live 8-stage mechanical verification.
            </p>
          </div>

          <button
            onClick={() => {
              onSelectRole('sender');
              onSelectTab('customer');
            }}
            className="w-full py-2 px-3 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 flex items-center justify-between transition-colors"
          >
            <span>Enter Sender Desk</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#35D6C5]" />
          </button>
        </div>

        {/* Role 2: Receiver */}
        <div className="p-5 rounded-xl bg-[#101827] border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all group">
          <div>
            <div className="w-9 h-9 rounded-lg bg-[#36D399]/10 text-[#36D399] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Wallet className="w-4 h-4" />
            </div>
            <div className="text-[10px] font-mono text-[#36D399] uppercase mb-1">
              Role 02 · Beneficiary
            </div>
            <h3 className="text-base font-heading font-semibold text-white mb-1.5">
              Receiver Portal
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Rahul Sharma's portal. Inspect incoming cleared deposits, real-time credit alerts, and client-side signature verifier.
            </p>
          </div>

          <button
            onClick={() => {
              onSelectRole('receiver');
              onSelectTab('receiver');
            }}
            className="w-full py-2 px-3 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 flex items-center justify-between transition-colors"
          >
            <span>Enter Receiver Desk</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#36D399]" />
          </button>
        </div>

        {/* Role 3: Banker SOC */}
        <div className="p-5 rounded-xl bg-[#101827] border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all group">
          <div>
            <div className="w-9 h-9 rounded-lg bg-[#4C8DFF]/10 text-[#4C8DFF] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Activity className="w-4 h-4" />
            </div>
            <div className="text-[10px] font-mono text-[#4C8DFF] uppercase mb-1">
              Role 03 · SOC Command
            </div>
            <h3 className="text-base font-heading font-semibold text-white mb-1.5">
              Banker SOC Desk
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Security operations center. Live network topology, 5-gate telemetry, and dual forensic CSV exports for compliance.
            </p>
          </div>

          <button
            onClick={() => {
              onSelectRole('banker');
              onSelectTab('soc');
            }}
            className="w-full py-2 px-3 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 flex items-center justify-between transition-colors"
          >
            <span>Enter SOC Command</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#4C8DFF]" />
          </button>
        </div>

        {/* Role 4: Hacker Lab */}
        <div className="p-5 rounded-xl bg-[#101827] border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all group">
          <div>
            <div className="w-9 h-9 rounded-lg bg-[#FF4D5A]/10 text-[#FF4D5A] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Flame className="w-4 h-4" />
            </div>
            <div className="text-[10px] font-mono text-[#FF4D5A] uppercase mb-1">
              Role 04 · Adversary Lab
            </div>
            <h3 className="text-base font-heading font-semibold text-white mb-1.5">
              Hacker Lab
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Mallory's attack laboratory. Intercept in-flight packets, alter values (₹5,000 to ₹50,000), and test mathematical defenses.
            </p>
          </div>

          <button
            onClick={() => {
              onSelectRole('hacker');
              onSelectTab('adversary');
            }}
            className="w-full py-2 px-3 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 flex items-center justify-between transition-colors"
          >
            <span>Enter Attack Lab</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#FF4D5A]" />
          </button>
        </div>
      </div>

      {/* Feature Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
        <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800/80">
          <div className="text-xs font-mono text-[#35D6C5] mb-1">REAL CRYPTO</div>
          <div className="text-sm font-semibold text-white mb-1">AES-256-GCM + Tag</div>
          <div className="text-xs text-slate-400">
            128-bit GHASH authentication tag defeats bit-flipping and MITM manipulation.
          </div>
        </div>

        <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800/80">
          <div className="text-xs font-mono text-[#4C8DFF] mb-1">SIGNATURES</div>
          <div className="text-sm font-semibold text-white mb-1">ECDSA P-256</div>
          <div className="text-xs text-slate-400">
            Asymmetric signing ensures sender non-repudiation and canonical binding.
          </div>
        </div>

        <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800/80">
          <div className="text-xs font-mono text-[#36D399] mb-1">INDEPENDENT PROOF</div>
          <div className="text-sm font-semibold text-white mb-1">Receiver Proof Inspector</div>
          <div className="text-xs text-slate-400">
            Recipient can mathematically verify the sender's public key directly.
          </div>
        </div>

        <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800/80">
          <div className="text-xs font-mono text-[#F5B942] mb-1">FORENSIC EXPORT</div>
          <div className="text-sm font-semibold text-white mb-1">Dual RFC 4180 CSVs</div>
          <div className="text-xs text-slate-400">
            One-click download of full cryptographic audit ledger and security event stream.
          </div>
        </div>
      </div>
    </div>
  );
};

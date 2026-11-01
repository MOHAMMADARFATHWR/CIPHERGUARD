/**
 * CipherGuard 3D - Hacker Home Dashboard (Adversary Lab Entrance)
 * Specialized dashboard for Mallory (Adversarial Penetration Tester)
 * Featuring exploit vectors, in-flight packet interception, payload tampering, and mathematical defense analysis
 */

import React from 'react';
import {
  AttackScenarioId,
  TransactionRecord,
} from '../../types/security';
import { AdversaryLab } from '../adversary/AdversaryLab';
import { Flame, ShieldAlert, Crosshair, Terminal } from 'lucide-react';

interface HackerHomeProps {
  onExecuteAttack: (scenarioId: AttackScenarioId) => Promise<TransactionRecord | null>;
  isSimulating: boolean;
  lastAttackResult?: TransactionRecord | null;
}

export const HackerHome: React.FC<HackerHomeProps> = (props) => {
  return (
    <div className="space-y-6">
      {/* Hacker Home Executive Banner */}
      <div className="p-6 rounded-xl bg-gradient-to-r from-red-950/40 via-[#101827] to-[#101827] border border-red-900/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-[#FF4D5A] tracking-wider uppercase flex items-center gap-1.5 font-semibold">
              <Flame className="w-3.5 h-3.5" />
              <span>HACKER HOME · ADVERSARIAL PENETRATION LAB</span>
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-xs text-slate-400">Mallory (Attacker Terminal)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-heading font-bold text-white">
            Adversary Interception & Tampering Sandbox
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl mt-0.5">
            Test packet interception, in-flight bit manipulation (e.g. inflating ₹5,000 to ₹50,000), duplicate replay injection, and forgery to observe how cryptographic barriers detect and neutralize each threat.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="px-3 py-1.5 rounded-lg bg-red-950/30 border border-red-900/40 text-xs font-mono text-[#FF4D5A] flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-[#FF4D5A]" />
            <span>Target: Active In-Flight Packets</span>
          </div>
        </div>
      </div>

      {/* Main Adversary Lab Engine */}
      <AdversaryLab {...props} />
    </div>
  );
};

/**
 * CipherGuard 3D - Adversary Attack Simulation Laboratory
 * Controlled cybersecurity sandbox demonstrating cryptographic defenses against MITM, Replay, and Forgery
 */

import React, { useState } from 'react';
import {
  AttackScenario,
  AttackScenarioId,
  TransactionRecord,
} from '../../types/security';
import {
  Flame,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Play,
  RotateCcw,
  Zap,
  CheckCircle2,
  XCircle,
  FileCode,
  Terminal,
  Crosshair,
} from 'lucide-react';

interface AdversaryLabProps {
  onExecuteAttack: (scenarioId: AttackScenarioId) => Promise<TransactionRecord | null>;
  isSimulating: boolean;
  lastAttackResult?: TransactionRecord | null;
}

const ATTACK_SCENARIOS: AttackScenario[] = [
  {
    id: 'mitm_amount_tamper',
    name: 'Man-in-the-Middle (MITM) Amount Inflation',
    category: 'Integrity',
    severity: 'Critical',
    targetStage: 6,
    description:
      'Attacker intercepts the in-flight packet and alters ciphertext bytes to inflate transfer value from ₹5,000 to ₹50,000.',
    simulatedPayloadChanges: {
      label: 'Transfer Amount',
      original: '₹5,000.00 (Canonical Payload)',
      tampered: '₹50,000.00 (Tampered In-Transit)',
    },
    expectedDefendingGate: 2,
    expectedDefenseName: 'AES-256-GCM Authentication Tag Verification',
    technicalMechanism:
      'AES-GCM computes a 128-bit GHASH Galois Authentication Tag over ciphertext and AAD. Flipping even a single bit in the ciphertext causes the tag verification to fail during decryption, discarding the tampered packet.',
  },
  {
    id: 'mitm_recipient_tamper',
    name: 'Recipient Account Hijacking',
    category: 'Integrity',
    severity: 'Critical',
    targetStage: 6,
    description:
      'Attacker attempts to replace the recipient account number with a malicious overseas destination.',
    simulatedPayloadChanges: {
      label: 'Recipient Account',
      original: 'Rahul Sharma (•••• 1029)',
      tampered: 'MALLORY_ATTACKER_LLC (•••• 9999)',
    },
    expectedDefendingGate: 2,
    expectedDefenseName: 'AES-256-GCM Authentication Tag Verification',
    technicalMechanism:
      'The recipient details are bound both inside the encrypted ciphertext and in the Additional Authenticated Data (AAD). Any modification breaks the cryptographic GMAC integrity tag.',
  },
  {
    id: 'replay_attack',
    name: 'Transaction Replay Duplicate Attack',
    category: 'Replay',
    severity: 'High',
    targetStage: 7,
    description:
      'Attacker eavesdrops and captures a genuine previously executed packet, attempting to resubmit it to drain the sender’s account twice.',
    simulatedPayloadChanges: {
      label: 'Cryptographic Nonce',
      original: '7a8f90b1... (Consumed & Logged)',
      tampered: '7a8f90b1... (Resubmitted Duplicate)',
    },
    expectedDefendingGate: 4,
    expectedDefenseName: 'Nonce Cache & Replay Protection Gate',
    technicalMechanism:
      'The bank core maintains an atomic registry of previously cleared nonces within the active sliding time window. When a duplicate nonce is detected, the transaction is immediately rejected as a replay attack.',
  },
  {
    id: 'signature_forgery',
    name: 'Digital Signature Forgery',
    category: 'Authentication',
    severity: 'Critical',
    targetStage: 7,
    description:
      'Attacker alters transaction metadata and attempts to forge an ECDSA signature without possessing the sender’s private key.',
    simulatedPayloadChanges: {
      label: 'ECDSA Signature',
      original: 'Valid P-256 Signature of SHA-256 Digest',
      tampered: 'Forged Signature Math (No Private Key)',
    },
    expectedDefendingGate: 3,
    expectedDefenseName: 'ECDSA P-256 Signature Verification Gate',
    technicalMechanism:
      'Elliptic Curve Digital Signature Algorithm (ECDSA) relies on the discrete logarithm problem over the secp256r1 curve. The bank computes the canonical SHA-256 digest and verifies it against the client’s public key, proving forgery.',
  },
  {
    id: 'expired_timestamp',
    name: 'Stale / Expired Timestamp Injection',
    category: 'Replay',
    severity: 'Medium',
    targetStage: 7,
    description:
      'Attacker holds an authentic transaction packet and broadcasts it 15 minutes later, after financial conditions have shifted.',
    simulatedPayloadChanges: {
      label: 'Request Age',
      original: '0.4s (Fresh Execution)',
      tampered: '900.0s (Outside 300s Sliding Window)',
    },
    expectedDefendingGate: 4,
    expectedDefenseName: 'Timestamp Freshness Filter',
    technicalMechanism:
      'All canonical payloads contain an authenticated timestamp and 300-second expiration window. Packets arriving outside this boundary are rejected to prevent delayed execution attacks.',
  },
];

export const AdversaryLab: React.FC<AdversaryLabProps> = ({
  onExecuteAttack,
  isSimulating,
  lastAttackResult,
}) => {
  const [selectedScenario, setSelectedScenario] = useState<AttackScenario>(ATTACK_SCENARIOS[0]);

  const handleLaunchAttack = async () => {
    if (isSimulating) return;
    await onExecuteAttack(selectedScenario.id);
  };

  const failingGate = lastAttackResult?.result.gates.find(
    (g) => g.gate === lastAttackResult.result.failingGateIndex
  );

  return (
    <div className="space-y-8">
      {/* Adversary Laboratory Banner */}
      <div className="p-6 rounded-xl bg-gradient-to-r from-red-950/40 via-[#101827] to-[#101827] border border-red-900/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded bg-[#FF4D5A]/20 text-[#FF4D5A]">
              <Flame className="w-4 h-4" />
            </span>
            <span className="text-xs font-mono text-[#FF4D5A] uppercase tracking-wider font-semibold">
              Isolated Adversarial Laboratory
            </span>
          </div>
          <h2 className="text-xl font-heading font-bold text-white">
            Simulated Penetration & Cryptographic Barrier Testing
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl mt-1">
            Test real cryptographic defenses against MITM packet alteration, replay injection, and signature forgery. All operations run in an isolated synthetic sandbox with zero real banking exposure.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleLaunchAttack}
            disabled={isSimulating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#FF4D5A] hover:bg-[#e03845] text-slate-950 font-semibold text-xs transition-all shadow-lg shadow-[#FF4D5A]/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSimulating ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Interception in Progress...</span>
              </>
            ) : (
              <>
                <Crosshair className="w-4 h-4" />
                <span>Launch Selected Attack</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Attack Scenario Grid Selection */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {ATTACK_SCENARIOS.map((scenario) => {
          const isSelected = selectedScenario.id === scenario.id;
          return (
            <button
              key={scenario.id}
              onClick={() => setSelectedScenario(scenario)}
              className={`p-4 rounded-xl text-left transition-all border ${
                isSelected
                  ? 'bg-slate-800 border-[#FF4D5A] shadow-lg shadow-[#FF4D5A]/10'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border ${
                    scenario.severity === 'Critical'
                      ? 'text-[#FF4D5A] bg-[#FF4D5A]/10 border-[#FF4D5A]/30'
                      : 'text-[#F5B942] bg-[#F5B942]/10 border-[#F5B942]/30'
                  }`}
                >
                  {scenario.severity}
                </span>
                <span className="text-[10px] font-mono text-slate-500">Gate 0{scenario.expectedDefendingGate}</span>
              </div>
              <h4 className="text-xs font-semibold text-white mb-1 leading-snug">
                {scenario.name}
              </h4>
              <p className="text-[11px] text-slate-400 line-clamp-2">
                {scenario.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Main Attack Workspace Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Selected Attack Blueprint & Payload Alteration */}
        <div className="lg:col-span-6 p-6 rounded-xl bg-[#101827] border border-slate-800 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-[#FF4D5A]">
                TARGET VECTOR: {selectedScenario.category.toUpperCase()}
              </span>
              <span className="text-xs font-mono text-slate-400">
                DEFENSE: GATE 0{selectedScenario.expectedDefendingGate}
              </span>
            </div>
            <h3 className="text-base font-heading font-semibold text-white">
              {selectedScenario.name}
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {selectedScenario.description}
            </p>
          </div>

          {/* Tamper Payload Diff Viewer */}
          <div>
            <h4 className="text-xs font-medium text-slate-300 mb-2 flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-slate-400" />
              <span>Simulated In-Flight Payload Modification</span>
            </h4>
            <div className="rounded-lg bg-slate-950 border border-slate-800 p-3.5 space-y-2 text-xs font-mono">
              <div className="text-slate-400">{selectedScenario.simulatedPayloadChanges.label}:</div>
              <div className="p-2 rounded bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 flex items-center justify-between">
                <span>ORIGINAL:</span>
                <span>{selectedScenario.simulatedPayloadChanges.original}</span>
              </div>
              <div className="p-2 rounded bg-red-950/30 border border-red-500/30 text-[#FF4D5A] flex items-center justify-between">
                <span>TAMPERED:</span>
                <span>{selectedScenario.simulatedPayloadChanges.tampered}</span>
              </div>
            </div>
          </div>

          {/* Technical Defense Explanation */}
          <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
            <h4 className="text-xs font-semibold text-[#35D6C5] mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Target Cryptographic Defense: {selectedScenario.expectedDefenseName}</span>
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {selectedScenario.technicalMechanism}
            </p>
          </div>
        </div>

        {/* Right: Real-time Attack Outcome & Cryptographic Proof */}
        <div className="lg:col-span-6 p-6 rounded-xl bg-[#101827] border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#FF4D5A]" />
                <span>Adversarial Execution Telemetry</span>
              </h3>
              {lastAttackResult && (
                <span className="text-[11px] font-mono text-[#FF4D5A] bg-[#FF4D5A]/10 px-2 py-0.5 rounded border border-[#FF4D5A]/30">
                  ATTACK DEFLECTED
                </span>
              )}
            </div>

            {lastAttackResult ? (
              <div className="space-y-4">
                {/* Banner Status */}
                <div className="p-4 rounded-lg bg-red-950/30 border border-[#FF4D5A]/40 text-center space-y-1">
                  <div className="text-base font-heading font-bold text-[#FF4D5A] tracking-wider uppercase">
                    ATTACK DETECTED · TRANSACTION REJECTED
                  </div>
                  <div className="text-xs text-red-200 font-mono">
                    DEFENSE TRIGGERED AT GATE 0{lastAttackResult.result.failingGateIndex}
                  </div>
                </div>

                {/* Specific Failing Gate Info */}
                {failingGate && (
                  <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">
                        Defending Gate: {failingGate.name}
                      </span>
                      <span className="text-slate-400 font-mono">{failingGate.latencyMs}ms</span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {failingGate.details}
                    </p>
                  </div>
                )}

                {/* Cryptographic Proof Comparison */}
                <div className="space-y-2 text-xs font-mono bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div className="text-slate-400 font-sans text-[11px] font-medium">
                    Cryptographic Evidence Log:
                  </div>
                  <div className="text-slate-300 text-[11px] break-all">
                    ID: {lastAttackResult.id}
                  </div>
                  <div className="text-slate-300 text-[11px] break-all">
                    Digest: {lastAttackResult.packet.canonicalDigest.slice(0, 32)}...
                  </div>
                  <div className="text-[#FF4D5A] text-[11px]">
                    Failure Result: {lastAttackResult.result.failureReason}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-slate-500 space-y-2">
                <ShieldAlert className="w-8 h-8 mx-auto text-slate-600" />
                <p className="text-xs">
                  Select an attack vector and click "Launch Selected Attack" to witness the real WebCrypto verification rejection.
                </p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>CONTAINMENT: 100% ISOLATED SANDBOX</span>
            <span className="text-[#36D399]">CORE LEDGER UNCOMPROMISED</span>
          </div>
        </div>
      </div>
    </div>
  );
};

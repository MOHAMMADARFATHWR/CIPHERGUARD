/**
 * CipherGuard 3D - Technical Security Architecture Deep-Dive
 * Comprehensive educational breakdown of cryptographic controls and zero-trust banking
 */

import React from 'react';
import {
  ShieldCheck,
  Lock,
  Key,
  Network,
  Cpu,
  RefreshCw,
  Server,
  Layers,
  FileCheck,
} from 'lucide-react';

export const ArchitectureView: React.FC = () => {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="p-8 rounded-xl bg-gradient-to-r from-[#101827] via-[#172235] to-[#101827] border border-slate-800">
        <div className="flex items-center gap-2 mb-2 text-xs font-mono text-[#35D6C5]">
          <Layers className="w-4 h-4" />
          <span>CYBER-FINANCIAL ARCHITECTURE BLUEPRINT</span>
        </div>
        <h2 className="text-2xl font-heading font-bold text-white mb-2">
          Defense-in-Depth Cryptographic Engineering
        </h2>
        <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
          How CipherGuard 3D combines transport security, end-to-end authenticated encryption, and non-repudiable digital signatures to ensure absolute transaction integrity.
        </p>
      </div>

      {/* 4 Pillars of Banking Transaction Defense */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pillar 1: Transport vs End-to-End Encryption */}
        <div className="p-6 rounded-xl bg-[#101827] border border-slate-800 space-y-3">
          <div className="flex items-center gap-2.5 text-[#4C8DFF]">
            <Network className="w-5 h-5" />
            <h3 className="text-sm font-semibold text-white">
              1. TLS 1.3 Transport vs. Application-Layer AES-GCM
            </h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            A common vulnerability in traditional architectures is relying solely on TLS (HTTPS). When packets reach reverse proxies or load balancers, TLS terminates, exposing sensitive transaction data to insider threats or memory inspection.
          </p>
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
            <span className="text-[#35D6C5] block font-semibold mb-1">Defense-in-Depth Strategy:</span>
            CipherGuard wraps canonical payloads inside an ephemeral AES-256-GCM envelope before transmission. Even if TLS is terminated at a cloud ingress proxy, the payload remains protected until verified by the bank’s core cryptographic gate.
          </div>
        </div>

        {/* Pillar 2: ECDSA Non-Repudiation */}
        <div className="p-6 rounded-xl bg-[#101827] border border-slate-800 space-y-3">
          <div className="flex items-center gap-2.5 text-[#35D6C5]">
            <Key className="w-5 h-5" />
            <h3 className="text-sm font-semibold text-white">
              2. ECDSA P-256 Asymmetric Digital Signatures
            </h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Symmetric encryption (AES) guarantees confidentiality and integrity, but does not provide non-repudiation because both parties share the key. CipherGuard binds an ECDSA P-256 private key signature to the SHA-256 canonical digest.
          </p>
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
            <span className="text-[#4C8DFF] block font-semibold mb-1">Cryptographic Binding:</span>
            The signature commits to sender ID, recipient ID, exact amount, currency, timestamp, and unique nonce. Altering any field mathematically invalidates the signature verification.
          </div>
        </div>

        {/* Pillar 3: Nonce & Replay Defenses */}
        <div className="p-6 rounded-xl bg-[#101827] border border-slate-800 space-y-3">
          <div className="flex items-center gap-2.5 text-[#F5B942]">
            <RefreshCw className="w-5 h-5" />
            <h3 className="text-sm font-semibold text-white">
              3. Cryptographic Nonce & Replay Cache
            </h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Adversaries who intercept valid packets cannot decrypt or modify them, but could replay them to cause duplicate charges. CipherGuard embeds a 128-bit cryptographically secure random nonce in every packet.
          </p>
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
            <span className="text-[#F5B942] block font-semibold mb-1">Sliding Window Protection:</span>
            The bank core enforces a 300-second sliding expiration window combined with an atomic in-memory nonce cache. Resubmitted identical nonces are detected and blocked instantly at Gate 4.
          </div>
        </div>

        {/* Pillar 4: Atomic Ledger Settlement */}
        <div className="p-6 rounded-xl bg-[#101827] border border-slate-800 space-y-3">
          <div className="flex items-center gap-2.5 text-[#36D399]">
            <Server className="w-5 h-5" />
            <h3 className="text-sm font-semibold text-white">
              4. Atomic Balances & Cryptographic Receipts
            </h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Only after all 4 preceding cryptographic gates pass does the transaction reach Gate 5 for ledger commitment. Account balance debits and receipt generation execute as an atomic transaction.
          </p>
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
            <span className="text-[#36D399] block font-semibold mb-1">Settlement Receipt:</span>
            Upon confirmation, the system issues a tamper-evident digital receipt with a unique clearing reference and audit block height for compliance traceability.
          </div>
        </div>
      </div>

      {/* 5 Sequential Security Gates Matrix */}
      <div className="p-6 rounded-xl bg-[#101827] border border-slate-800">
        <h3 className="text-base font-heading font-semibold text-white mb-4">
          The 5 Verification Gates of Bank Ingress
        </h3>
        <div className="space-y-3">
          {[
            {
              gate: 1,
              name: 'TLS 1.3 Transport Channel Verification',
              target: 'Man-in-the-Middle Wiretapping & Eavesdropping',
              action: 'Validates forward secrecy and negotiated TLS_AES_256_GCM_SHA384 cipher suite.',
            },
            {
              gate: 2,
              name: 'AES-256-GCM Authentication Tag Verification',
              target: 'In-Flight Bit-Flipping & Payload Tampering',
              action: 'Calculates GHASH tag over ciphertext and AAD. Any altered byte causes instant rejection.',
            },
            {
              gate: 3,
              name: 'ECDSA P-256 Digital Signature Verification',
              target: 'Message Forgery & Identity Impersonation',
              action: 'Verifies canonical SHA-256 digest against customer’s registered public key.',
            },
            {
              gate: 4,
              name: 'Nonce Cache & 300s Timestamp Freshness',
              target: 'Packet Replay & Stale Message Injections',
              action: 'Ensures nonce has never been consumed and request timestamp is within 5 minutes.',
            },
            {
              gate: 5,
              name: 'Core Ledger Balance & State Settlement',
              target: 'Overdrafts & Insolvent Transfers',
              action: 'Verifies account limits, debits balance atomically, and records audit receipt.',
            },
          ].map((g) => (
            <div
              key={g.gate}
              className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div>
                <div className="font-semibold text-white mb-0.5">
                  Gate 0{g.gate}: {g.name}
                </div>
                <div className="text-slate-400">{g.action}</div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] font-mono text-[#35D6C5] bg-[#35D6C5]/10 px-2 py-1 rounded border border-[#35D6C5]/20">
                  DEFENDS: {g.target}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

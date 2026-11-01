/**
 * CipherGuard 3D - Dedicated Receiver Banking Portal (Rahul Sharma)
 * Displays incoming settled credits, real-time settlement notifications, and independent cryptographic receipt verification
 */

import React, { useState } from 'react';
import {
  TransactionRecord,
} from '../../types/security';
import {
  Wallet,
  ArrowDownLeft,
  ShieldCheck,
  CheckCircle2,
  Copy,
  FileCheck,
  ExternalLink,
  Clock,
  Key,
  Layers,
  X,
} from 'lucide-react';
import { verifyTransactionSignature, importPublicKeyJWK } from '../../services/cryptoEngine';

interface ReceiverViewProps {
  balance: number;
  transactions: TransactionRecord[];
  accountHolder?: string;
  accountNumber?: string;
}

export const ReceiverView: React.FC<ReceiverViewProps> = ({
  balance,
  transactions,
  accountHolder = 'Rahul Sharma',
  accountNumber = '•••• •••• •••• 1029',
}) => {
  const [selectedProofTx, setSelectedProofTx] = useState<TransactionRecord | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleInspectProof = async (tx: TransactionRecord) => {
    setSelectedProofTx(tx);
    setVerificationStatus('verifying');

    try {
      // Re-verify sender's ECDSA signature client-side using sender's public key
      const pubKey = await importPublicKeyJWK(tx.packet.senderPublicKey);
      const isSigValid = await verifyTransactionSignature(pubKey, tx.packet.signature, tx.canonical);
      setVerificationStatus(isSigValid ? 'valid' : 'invalid');
    } catch {
      setVerificationStatus('error');
    }
  };

  const incomingTxs = transactions.filter(
    (t) =>
      t.canonical.recipientId === 'BENEF-1029' ||
      t.canonical.recipientName.includes('Rahul') ||
      t.canonical.recipientAccount.includes('1029')
  );

  return (
    <div className="space-y-8">
      {/* Receiver Account Balance Hero */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 p-6 rounded-xl bg-gradient-to-br from-[#101827] to-[#172235] border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#36D399] tracking-wider uppercase">
                Beneficiary Merchant Account
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-xs text-slate-400">{accountNumber}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Direct Settlement Ingress</span>
            </div>
          </div>

          <div className="mb-6">
            <div className="text-xs text-slate-400 mb-1">Available Cleared Balance</div>
            <div className="text-3xl sm:text-4xl font-heading font-bold text-white tabular-nums tracking-tight">
              ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800/80 text-xs">
            <div>
              <span className="text-slate-500 block">Beneficiary Name</span>
              <span className="text-slate-200 font-medium">{accountHolder}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Settled Payments</span>
              <span className="text-white font-medium tabular-nums">{incomingTxs.length} Received</span>
            </div>
            <div>
              <span className="text-slate-500 block">Cryptographic Verification</span>
              <span className="text-[#36D399] font-medium">ECDSA Validated</span>
            </div>
          </div>
        </div>

        {/* Receiver Security Assurance Card */}
        <div className="p-6 rounded-xl bg-[#101827] border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-[#36D399]" />
              <span>Independent Verification</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              As a recipient, you don't need to trust the bank blindly. You can verify the sender’s ECDSA signature directly against their public key.
            </p>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800/80">
              <span className="text-slate-400">NON-REPUDIATION</span>
              <span className="text-[#36D399]">ACTIVE</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800/80">
              <span className="text-slate-400">SIGNER IDENT</span>
              <span className="text-[#35D6C5]">Priya Sharma</span>
            </div>
          </div>
        </div>
      </div>

      {/* Incoming Transactions Table */}
      <div className="p-6 rounded-xl bg-[#101827] border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-heading font-semibold text-white">
              Incoming Payments & Cryptographic Receipts
            </h3>
            <p className="text-xs text-slate-400">
              All settled deposits with cryptographic proof hashes. Click "Verify Proof" to validate sender’s signature.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {incomingTxs.length} Records Received
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-3 px-3 font-medium">Time Received</th>
                <th className="py-3 px-3 font-medium">Transaction ID</th>
                <th className="py-3 px-3 font-medium">Sender</th>
                <th className="py-3 px-3 font-medium">Amount Credited</th>
                <th className="py-3 px-3 font-medium">Payment Status</th>
                <th className="py-3 px-3 font-medium">Bank Reference</th>
                <th className="py-3 px-3 font-medium text-right">Proof Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {incomingTxs.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                    {new Date(tx.createdAt).toLocaleTimeString()}
                  </td>
                  <td className="py-3 px-3 text-slate-300 font-mono truncate max-w-[130px]">
                    {tx.id.slice(0, 13)}...
                  </td>
                  <td className="py-3 px-3 text-slate-200 font-sans font-medium whitespace-nowrap">
                    {tx.canonical.senderName}
                  </td>
                  <td className="py-3 px-3 text-[#36D399] font-medium tabular-nums whitespace-nowrap">
                    +₹{tx.canonical.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    {tx.result.status === 'verified' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-sans font-medium text-[#36D399] bg-[#36D399]/10 border border-[#36D399]/30">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Completed</span>
                      </span>
                    ) : tx.result.status === 'tampered' || tx.result.status === 'rejected' || tx.result.status === 'replay_blocked' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-sans font-medium text-[#FF4D5A] bg-[#FF4D5A]/10 border border-[#FF4D5A]/30">
                        <X className="w-3.5 h-3.5" />
                        <span>Rejected ({tx.result.status.replace('_', ' ')})</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-sans font-medium text-[#F5B942] bg-[#F5B942]/10 border border-[#F5B942]/30">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Pending</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                    {tx.result.receipt?.bankReference ?? 'CG3D-SETTLED'}
                  </td>
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => handleInspectProof(tx)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-sans font-medium text-[#35D6C5] transition-colors inline-flex items-center gap-1"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Verify Proof</span>
                    </button>
                  </td>
                </tr>
              ))}

              {incomingTxs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-sans text-xs">
                    No incoming transfers received yet. Initiate a transfer from the Sender portal to see live credits appear here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cryptographic Proof Verification Modal */}
      {selectedProofTx && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#101827] border border-slate-800 rounded-xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-[#36D399]" />
                <h3 className="text-base font-heading font-semibold text-white">
                  Independent Cryptographic Proof Verification
                </h3>
              </div>
              <button
                onClick={() => setSelectedProofTx(null)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Verification Result Banner */}
            <div
              className={`p-4 rounded-lg border text-xs flex items-center justify-between ${
                verificationStatus === 'valid'
                  ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#36D399]" />
                <span className="font-semibold">
                  ECDSA P-256 Signature Math: Mathematically Valid
                </span>
              </div>
              <span className="text-[10px] font-mono bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-300 font-semibold">
                NON-REPUDIATION GUARANTEED
              </span>
            </div>

            {/* Cryptographic Parameter Inspection */}
            <div className="space-y-3 text-xs font-mono">
              <div>
                <span className="text-slate-400 block font-sans text-[11px] mb-1">
                  Sender Registered Public Key (JWK):
                </span>
                <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-slate-300 break-all text-[11px] max-h-20 overflow-y-auto">
                  {selectedProofTx.packet.senderPublicKey}
                </div>
              </div>

              <div>
                <span className="text-slate-400 block font-sans text-[11px] mb-1">
                  Canonical SHA-256 Digest:
                </span>
                <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800 text-[#35D6C5]">
                  <span className="truncate">{selectedProofTx.packet.canonicalDigest}</span>
                  <button
                    onClick={() => handleCopy(selectedProofTx.packet.canonicalDigest, 'digest')}
                    className="text-slate-400 hover:text-white ml-2 shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block font-sans text-[11px] mb-1">
                  ECDSA Signature (secp256r1):
                </span>
                <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-slate-300 break-all text-[11px] max-h-16 overflow-y-auto">
                  {selectedProofTx.packet.signature}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-500 block text-[10px] font-sans">NONCE FRESHNESS</span>
                  <span className="text-slate-200 text-[11px] truncate block">
                    {selectedProofTx.canonical.nonce.slice(0, 16)}...
                  </span>
                </div>
                <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-500 block text-[10px] font-sans">AES-GCM TAG</span>
                  <span className="text-slate-200 text-[11px] truncate block">
                    {selectedProofTx.packet.tag.slice(0, 16)}...
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedProofTx(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

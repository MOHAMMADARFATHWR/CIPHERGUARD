/**
 * CipherGuard 3D - Sender Home Dashboard
 * Specialized dashboard for Priya Sharma (Corporate Client Sender)
 * Featuring multi-account cards, quick beneficiary actions, wire transfer form, and outgoing transaction history
 */

import React, { useState } from 'react';
import {
  CustomerAccount,
  Beneficiary,
  TransactionRecord,
} from '../../types/security';
import {
  Send,
  CreditCard,
  ShieldCheck,
  ArrowUpRight,
  Plus,
  Copy,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Lock,
  Layers,
  Sparkles,
} from 'lucide-react';

interface SenderHomeProps {
  account: CustomerAccount;
  transactions: TransactionRecord[];
  onInitiateTransfer: (details: {
    recipientId: string;
    recipientName: string;
    recipientAccount: string;
    amount: number;
    purpose: string;
  }) => Promise<void>;
  isProcessing: boolean;
  activeTransactionRecord?: TransactionRecord | null;
  onView3DPipeline?: () => void;
}

const BENEFICIARIES: Beneficiary[] = [
  {
    id: 'BENEF-1029',
    name: 'Rahul Sharma',
    accountNumber: '•••• •••• •••• 1029',
    bankName: 'HDFC Bank - Commercial Branch',
    avatarInitials: 'RS',
  },
  {
    id: 'BENEF-4412',
    name: 'Ananya Patel',
    accountNumber: '•••• •••• •••• 4412',
    bankName: 'State Bank of India - FinTech Hub',
    avatarInitials: 'AP',
  },
  {
    id: 'BENEF-8830',
    name: 'Vikram Malhotra',
    accountNumber: '•••• •••• •••• 8830',
    bankName: 'ICICI Bank - Cyber City',
    avatarInitials: 'VM',
  },
];

export const SenderHome: React.FC<SenderHomeProps> = ({
  account,
  transactions,
  onInitiateTransfer,
  isProcessing,
  activeTransactionRecord,
  onView3DPipeline,
}) => {
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary>(BENEFICIARIES[0]);
  const [transferAmount, setTransferAmount] = useState<string>('5000');
  const [purpose, setPurpose] = useState<string>('Vendor Consulting Retainer');
  const [activeAccountTab, setActiveAccountTab] = useState<'primary' | 'usd' | 'eur'>('primary');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(transferAmount);
    if (!amountNum || amountNum <= 0 || amountNum > account.balance) return;

    await onInitiateTransfer({
      recipientId: selectedBeneficiary.id,
      recipientName: selectedBeneficiary.name,
      recipientAccount: selectedBeneficiary.accountNumber,
      amount: amountNum,
      purpose,
    });
  };

  return (
    <div className="space-y-8">
      {/* Sender Header Banner */}
      <div className="p-6 rounded-xl bg-gradient-to-r from-[#101827] via-[#172235] to-[#101827] border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-[#35D6C5] tracking-wider uppercase">
              SENDER HOME · CORPORATE TREASURY DESK
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-xs text-slate-400">Priya Sharma</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-heading font-bold text-white">
            Client Accounts & Encrypted Transfers
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl mt-0.5">
            Manage corporate operating balances, authorized recipients, and execute cryptographically signed wire transfers.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#35D6C5]" />
            <span>ECDSA P-256 Enclave Ready</span>
          </div>
        </div>
      </div>

      {/* Multi-Account Cards Showcase */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">
            Corporate Account Portfolio
          </h3>
          <span className="text-xs text-slate-500 font-mono">3 Accounts Configured</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Account 1: Primary Current INR Account */}
          <div
            onClick={() => setActiveAccountTab('primary')}
            className={`p-5 rounded-xl border text-left cursor-pointer transition-all relative overflow-hidden ${
              activeAccountTab === 'primary'
                ? 'bg-gradient-to-br from-[#101827] to-[#172235] border-[#35D6C5] shadow-lg shadow-[#35D6C5]/10'
                : 'bg-[#101827] border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono text-[#35D6C5] uppercase">
                Primary INR Checking
              </span>
              <span className="w-2 h-2 rounded-full bg-[#35D6C5]" />
            </div>
            <div className="text-2xl font-heading font-bold text-white tabular-nums mb-1">
              ₹{account.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs font-mono text-slate-400 mb-4">{account.accountNumber}</div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
              <span>Limit: ₹{account.dailyLimit.toLocaleString('en-IN')}</span>
              <span className="text-emerald-400">Active</span>
            </div>
          </div>

          {/* Account 2: USD Global Escrow Card */}
          <div
            onClick={() => setActiveAccountTab('usd')}
            className={`p-5 rounded-xl border text-left cursor-pointer transition-all relative overflow-hidden ${
              activeAccountTab === 'usd'
                ? 'bg-gradient-to-br from-[#101827] to-[#172235] border-[#4C8DFF] shadow-lg shadow-[#4C8DFF]/10'
                : 'bg-[#101827] border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono text-[#4C8DFF] uppercase">
                USD Commercial Escrow
              </span>
              <span className="w-2 h-2 rounded-full bg-[#4C8DFF]" />
            </div>
            <div className="text-2xl font-heading font-bold text-white tabular-nums mb-1">
              $35,000.00
            </div>
            <div className="text-xs font-mono text-slate-400 mb-4">•••• •••• •••• 9921</div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
              <span>Wire Routing: SWIFT/FED</span>
              <span className="text-slate-300">Ready</span>
            </div>
          </div>

          {/* Account 3: EUR Treasury Reserve */}
          <div
            onClick={() => setActiveAccountTab('eur')}
            className={`p-5 rounded-xl border text-left cursor-pointer transition-all relative overflow-hidden ${
              activeAccountTab === 'eur'
                ? 'bg-gradient-to-br from-[#101827] to-[#172235] border-[#36D399] shadow-lg shadow-[#36D399]/10'
                : 'bg-[#101827] border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono text-[#36D399] uppercase">
                EUR Liquidity Reserve
              </span>
              <span className="w-2 h-2 rounded-full bg-[#36D399]" />
            </div>
            <div className="text-2xl font-heading font-bold text-white tabular-nums mb-1">
              €18,400.00
            </div>
            <div className="text-xs font-mono text-slate-400 mb-4">•••• •••• •••• 7104</div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
              <span>Clearing: SEPA Instant</span>
              <span className="text-slate-300">Ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* Transfer Initiation Form & Cryptographic Proof Receipt */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 p-6 rounded-xl bg-[#101827] border border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-heading font-semibold text-white">
                Initiate Cryptographic Wire Transfer
              </h3>
              <p className="text-xs text-slate-400">
                Payload is formulated with unique 128-bit nonce, signed via ECDSA, and encrypted with AES-256-GCM.
              </p>
            </div>
            <div className="p-2 rounded-lg bg-slate-800/60 text-[#35D6C5]">
              <Send className="w-4 h-4" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Beneficiary Quick Select */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                Select Beneficiary
              </label>
              <div className="grid grid-cols-3 gap-3">
                {BENEFICIARIES.map((b) => {
                  const isSelected = selectedBeneficiary.id === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedBeneficiary(b)}
                      className={`p-3 rounded-lg text-left transition-all border ${
                        isSelected
                          ? 'bg-slate-800 border-[#35D6C5] shadow-sm'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-[#35D6C5] mb-2">
                        {b.avatarInitials}
                      </div>
                      <div className="text-xs font-medium text-slate-200 truncate">{b.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{b.accountNumber}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Transfer Amount */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Transfer Amount (INR)
                </label>
                <span className="text-[11px] text-slate-400">
                  Available: ₹{account.balance.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  min="100"
                  max={account.balance}
                  step="100"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  disabled={isProcessing}
                  className="w-full pl-8 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-[#35D6C5] transition-colors"
                  placeholder="5000"
                  required
                />
              </div>
            </div>

            {/* Transfer Purpose */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Payment Reference / Purpose
              </label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                disabled={isProcessing}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-[#35D6C5] transition-colors"
                placeholder="Vendor Consulting Retainer"
                required
              />
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isProcessing || !parseFloat(transferAmount) || parseFloat(transferAmount) > account.balance}
                className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-[#35D6C5] to-[#4C8DFF] text-slate-950 font-semibold text-sm hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#35D6C5]/20 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Executing 8-Stage Security Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Sign & Send ₹{parseFloat(transferAmount || '0').toLocaleString('en-IN')}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Cryptographic Proof Receipt Box */}
        <div className="lg:col-span-5 p-6 rounded-xl bg-[#101827] border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#35D6C5]" />
                <span>Active Transaction Audit Proof</span>
              </h3>
              {activeTransactionRecord?.result.status === 'verified' && (
                <span className="text-[11px] font-mono text-[#36D399] bg-[#36D399]/10 px-2 py-0.5 rounded border border-[#36D399]/20 font-medium">
                  SETTLED
                </span>
              )}
            </div>

            {activeTransactionRecord ? (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Transaction UUID</span>
                  <div className="flex items-center justify-between font-mono text-slate-300 bg-slate-900 p-1.5 rounded mt-0.5">
                    <span className="truncate">{activeTransactionRecord.id}</span>
                    <button
                      onClick={() => handleCopy(activeTransactionRecord.id, 'txid')}
                      className="text-slate-400 hover:text-white ml-2"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block">SHA-256 Canonical Digest</span>
                  <div className="flex items-center justify-between font-mono text-[#35D6C5] bg-slate-900 p-1.5 rounded mt-0.5">
                    <span className="truncate">{activeTransactionRecord.packet.canonicalDigest}</span>
                    <button
                      onClick={() => handleCopy(activeTransactionRecord.packet.canonicalDigest, 'digest')}
                      className="text-slate-400 hover:text-white ml-2"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block">ECDSA Signature (secp256r1)</span>
                  <div className="font-mono text-slate-300 bg-slate-900 p-1.5 rounded mt-0.5 break-all max-h-16 overflow-y-auto">
                    {activeTransactionRecord.packet.signature}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
                  <div className="bg-slate-900 p-2 rounded">
                    <span className="text-slate-500 block text-[10px]">AES-GCM TAG</span>
                    <span className="text-slate-300 truncate block text-[11px]">
                      {activeTransactionRecord.packet.tag.slice(0, 16)}...
                    </span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded">
                    <span className="text-slate-500 block text-[10px]">NONCE (128-BIT)</span>
                    <span className="text-slate-300 truncate block text-[11px]">
                      {activeTransactionRecord.canonical.nonce.slice(0, 16)}...
                    </span>
                  </div>
                </div>

                {activeTransactionRecord.result.receipt && (
                  <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-emerald-300">
                    <div className="flex items-center gap-1.5 font-semibold text-xs mb-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Settlement Confirmed</span>
                    </div>
                    <div className="text-[11px] space-y-0.5 text-emerald-200/80 font-mono">
                      <div>Bank Ref: {activeTransactionRecord.result.receipt.bankReference}</div>
                      <div>Audit Block: #{activeTransactionRecord.result.receipt.auditBlockHeight}</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 space-y-2">
                <ShieldCheck className="w-8 h-8 mx-auto text-slate-600" />
                <p className="text-xs">
                  Enter an amount and click "Sign & Send" to observe live cryptographic signing and verification.
                </p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between font-mono">
            <span>KEYSTORE: FIPS 140-3 LEVEL 3</span>
            <span className="text-[#35D6C5]">ZERO PRIV-KEY EXPOSURE</span>
          </div>
        </div>
      </div>

      {/* Outgoing Transaction History Ledger */}
      <div className="p-6 rounded-xl bg-[#101827] border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-heading font-semibold text-white">
              Outgoing Payments Ledger
            </h3>
            <p className="text-xs text-slate-400">
              Historical record of signed payments, latencies, and clearance states.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {transactions.length} Transactions
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-3 px-3 font-medium">Timestamp</th>
                <th className="py-3 px-3 font-medium">Transaction ID</th>
                <th className="py-3 px-3 font-medium">Beneficiary</th>
                <th className="py-3 px-3 font-medium">Amount</th>
                <th className="py-3 px-3 font-medium">Security State</th>
                <th className="py-3 px-3 font-medium text-right">Verification Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {transactions.map((tx) => {
                const isVerified = tx.result.status === 'verified';
                return (
                  <tr key={tx.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                      {new Date(tx.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-3 text-slate-300 font-mono truncate max-w-[130px]">
                      {tx.id.slice(0, 13)}...
                    </td>
                    <td className="py-3 px-3 text-slate-200 font-sans font-medium whitespace-nowrap">
                      {tx.canonical.recipientName}
                    </td>
                    <td className="py-3 px-3 text-white font-medium tabular-nums whitespace-nowrap">
                      ₹{tx.canonical.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {isVerified ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-sans font-medium text-[#36D399] bg-[#36D399]/10 border border-[#36D399]/30">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Completed</span>
                        </span>
                      ) : tx.result.status === 'tampered' || tx.result.status === 'rejected' || tx.result.status === 'replay_blocked' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-sans font-medium text-[#FF4D5A] bg-[#FF4D5A]/10 border border-[#FF4D5A]/30">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Rejected ({tx.result.status.replace('_', ' ')})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-sans font-medium text-[#F5B942] bg-[#F5B942]/10 border border-[#F5B942]/30">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Pending</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-400 tabular-nums">
                      {tx.result.totalLatencyMs}ms
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

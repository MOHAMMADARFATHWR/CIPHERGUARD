/**
 * CipherGuard 3D - Bank Manager & Security Operations Center (SOC)
 * High-density cyber-financial telemetry command center
 */

import React, { useState } from 'react';
import {
  TransactionRecord,
  AuditLogItem,
  SocMetrics,
} from '../../types/security';
import {
  ShieldAlert,
  ShieldCheck,
  Activity,
  Layers,
  Radio,
  Clock,
  Server,
  Lock,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Database,
  Smartphone,
  Wifi,
  Download,
  FileSpreadsheet,
  FileText,
  Check,
  Globe2,
  X,
  Info,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { exportTransactionsCSV, exportAuditLogsCSV } from '../../utils/csvExport';
import { ThreatHeatmap } from './ThreatHeatmap';
import {
  TransactionStatusTooltip,
  AuditLogStatusTooltip,
} from '../common/SecurityGateTooltip';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  Tooltip,
  YAxis,
} from 'recharts';

interface SocDashboardProps {
  metrics: SocMetrics;
  transactions: TransactionRecord[];
  auditLogs: AuditLogItem[];
  onSelectTransaction: (tx: TransactionRecord) => void;
  selectedTransaction?: TransactionRecord | null;
  onSimulateProbe?: (attackType: string) => void;
  onReplayTransaction?: (tx: TransactionRecord) => void;
}

export const SocDashboard: React.FC<SocDashboardProps> = ({
  metrics,
  transactions,
  auditLogs,
  onSelectTransaction,
  selectedTransaction,
  onSimulateProbe,
  onReplayTransaction,
}) => {
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [inspectedTopologyNode, setInspectedTopologyNode] = useState<string>('gateway');
  const [exportedToast, setExportedToast] = useState<string | null>(null);

  // Security Audit Log Stream search & level filtering
  const [logSearchQuery, setLogSearchQuery] = useState<string>('');
  const [logFilterLevel, setLogFilterLevel] = useState<'all' | 'critical' | 'warning' | 'info'>('all');

  // Compute log counts by level
  const criticalCount = auditLogs.filter((log) => log.level === 'error').length;
  const warningCount = auditLogs.filter((log) => log.level === 'warn').length;
  const infoCount = auditLogs.filter((log) => log.level === 'info' || log.level === 'success').length;

  // Filter audit logs by search query (transactionId, category/event-type, or message) and level
  const filteredAuditLogs = auditLogs.filter((log) => {
    // Level filter
    if (logFilterLevel === 'critical' && log.level !== 'error') return false;
    if (logFilterLevel === 'warning' && log.level !== 'warn') return false;
    if (logFilterLevel === 'info' && log.level !== 'info' && log.level !== 'success') return false;

    // Search query filter
    if (logSearchQuery.trim()) {
      const q = logSearchQuery.trim().toLowerCase();
      const matchTxId = log.transactionId ? log.transactionId.toLowerCase().includes(q) : false;
      const matchCategory = log.category.toLowerCase().includes(q);
      const matchMessage = log.message.toLowerCase().includes(q);
      return matchTxId || matchCategory || matchMessage;
    }

    return true;
  });

  const handleExportTransactions = () => {
    exportTransactionsCSV(transactions);
    setExportedToast('Transaction Ledger CSV Exported');
    setTimeout(() => setExportedToast(null), 3000);
  };

  const handleExportAuditLogs = () => {
    const logsToExport = filteredAuditLogs.length > 0 ? filteredAuditLogs : auditLogs;
    exportAuditLogsCSV(logsToExport);
    setExportedToast(
      filteredAuditLogs.length > 0 && filteredAuditLogs.length !== auditLogs.length
        ? `Filtered Security Audit Logs (${filteredAuditLogs.length}) CSV Exported`
        : 'Security Audit Logs CSV Exported'
    );
    setTimeout(() => setExportedToast(null), 3000);
  };

  const latencySparklineData = transactions.length > 0
    ? transactions
        .slice(0, 10)
        .reverse()
        .map((tx, idx) => ({
          name: `#${idx + 1}`,
          latency: tx.result.totalLatencyMs || 24,
          status: tx.result.status,
        }))
    : [
        { name: '#1', latency: 26, status: 'verified' },
        { name: '#2', latency: 22, status: 'verified' },
        { name: '#3', latency: 25, status: 'verified' },
        { name: '#4', latency: metrics.avgVerificationLatencyMs || 24, status: 'verified' },
      ];

  const filteredTransactions = transactions.filter((tx) => {
    if (filterStatus === 'verified' && tx.result.status !== 'verified') return false;
    if (filterStatus === 'tampered' && tx.result.status !== 'tampered') return false;
    if (filterStatus === 'replay' && tx.result.status !== 'replay_blocked') return false;
    if (filterStatus === 'rejected' && tx.result.status === 'verified') return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchId = tx.id.toLowerCase().includes(q);
      const matchSender = tx.canonical.senderName.toLowerCase().includes(q);
      const matchRecipient = tx.canonical.recipientName.toLowerCase().includes(q);
      const matchDigest = tx.packet.canonicalDigest.toLowerCase().includes(q);
      return matchId || matchSender || matchRecipient || matchDigest;
    }
    return true;
  });

  const topologyNodes = [
    {
      id: 'client',
      name: 'Client Device',
      type: 'ECDSA Enclave',
      icon: Smartphone,
      status: 'nominal',
      metrics: 'P-256 Keypair Active',
      details: 'Secure hardware-backed keystore generates canonical SHA-256 digests and ECDSA signatures.',
    },
    {
      id: 'tls_proxy',
      name: 'TLS 1.3 Termination',
      type: 'Forward Secrecy Proxy',
      icon: Wifi,
      status: 'nominal',
      metrics: 'TLS_AES_256_GCM_SHA384',
      details: 'Enforces Perfect Forward Secrecy (PFS), Curve25519 key exchange, and mutual certificate authentication.',
    },
    {
      id: 'gateway',
      name: 'Bank API Gateway',
      type: 'Verification Ingress',
      icon: Radio,
      status: 'nominal',
      metrics: 'Zero-Trust Tag Checker',
      details: 'Performs immediate AES-256-GCM authentication tag verification; discards tampered packets before internal dispatch.',
    },
    {
      id: 'auth_core',
      name: 'Security Core & Replay Cache',
      type: 'Validation Cluster',
      icon: Server,
      status: 'nominal',
      metrics: 'Sliding Nonce Cache (300s)',
      details: 'Atomic Bloom filter and sliding window cache tracking 128-bit cryptographic nonces to defeat replay attacks.',
    },
    {
      id: 'ledger_db',
      name: 'Core Banking Ledger',
      type: 'Transactional Store',
      icon: Database,
      status: 'nominal',
      metrics: 'ACID Balances & Audit Block',
      details: 'Immutable cryptographic ledger records verified transaction receipts and updates balances atomically.',
    },
  ];

  const activeNodeInfo = topologyNodes.find((n) => n.id === inspectedTopologyNode) || topologyNodes[2];

  return (
    <div className="space-y-8">
      {/* SOC Top KPI Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#101827] border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Total Transactions Monitored</span>
            <Activity className="w-3.5 h-3.5 text-[#35D6C5]" />
          </div>
          <div className="text-2xl font-heading font-bold text-white tabular-nums">
            {metrics.totalTransactions}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">100% End-to-End Cryptographic Audit</div>
        </div>

        <div className="p-4 rounded-xl bg-[#101827] border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Verified Settlements</span>
            <ShieldCheck className="w-3.5 h-3.5 text-[#36D399]" />
          </div>
          <div className="text-2xl font-heading font-bold text-[#36D399] tabular-nums">
            {metrics.verifiedCount}
          </div>
          <div className="text-[11px] text-emerald-400/80 mt-1">5-Gate Integrity Confirmed</div>
        </div>

        <div className="p-4 rounded-xl bg-[#101827] border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Attacks Deflected</span>
            <ShieldAlert className="w-3.5 h-3.5 text-[#FF4D5A]" />
          </div>
          <div className="text-2xl font-heading font-bold text-[#FF4D5A] tabular-nums">
            {metrics.attackCount}
          </div>
          <div className="text-[11px] text-[#FF4D5A]/80 mt-1">
            {metrics.replayBlockedCount} Replay Attempts Neutralized
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#101827] border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Average Verification Latency</span>
              <Clock className="w-3.5 h-3.5 text-[#4C8DFF]" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-heading font-bold text-white tabular-nums">
                {metrics.avgVerificationLatencyMs}ms
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Last 10 txs</span>
            </div>
          </div>

          {/* Real-Time Mini-Sparkline Chart (Recharts) */}
          <div className="h-9 w-full my-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={latencySparklineData}>
                <YAxis domain={['dataMin - 4', 'dataMax + 4']} hide />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-mono text-white shadow-md">
                          <span className="text-[#4C8DFF] font-semibold">{item.latency}ms</span>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="latency"
                  stroke="#4C8DFF"
                  strokeWidth={2}
                  dot={{ r: 2, fill: '#4C8DFF', stroke: '#101827', strokeWidth: 1 }}
                  activeDot={{ r: 3, fill: '#35D6C5' }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="text-[10px] text-slate-500 flex items-center justify-between font-mono">
            <span>Target: &lt;30ms</span>
            <span className="text-emerald-400">Nominal Trend</span>
          </div>
        </div>
      </div>

      {/* Forensic Analysis & CSV Export Control Bar */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-[#101827] via-[#172235] to-[#101827] border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <FileSpreadsheet className="w-4 h-4 text-[#35D6C5]" />
            <h3 className="text-sm font-semibold text-white">
              Forensic Investigation & Compliance Export
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            Export full cryptographic audit records, canonical digests, AES-GCM tags, nonces, and timestamped security event trails in RFC 4180 CSV format.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {exportedToast && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/20">
              <Check className="w-3.5 h-3.5" />
              <span>{exportedToast}</span>
            </div>
          )}

          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-medium transition-all shadow-sm ${
              showHeatmap
                ? 'bg-[#FF4D5A]/15 border-[#FF4D5A]/40 text-[#FF4D5A] hover:bg-[#FF4D5A]/25'
                : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
            }`}
          >
            <Globe2 className="w-3.5 h-3.5" />
            <span>{showHeatmap ? 'Threat Heatmap (Active)' : 'Show Threat Heatmap'}</span>
          </button>

          <button
            onClick={handleExportTransactions}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-xs font-medium text-slate-200 hover:text-white transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-[#35D6C5]" />
            <span>Export Transactions (CSV)</span>
          </button>

          <button
            onClick={handleExportAuditLogs}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-xs font-medium text-slate-200 hover:text-white transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-[#4C8DFF]" />
            <span>Export Audit Logs (CSV)</span>
          </button>
        </div>
      </div>

      {/* Geographical Threat Heatmap Overlay */}
      {showHeatmap && (
        <ThreatHeatmap
          transactions={transactions}
          onSelectTransaction={onSelectTransaction}
          onSimulateProbe={onSimulateProbe}
          onReplayTransaction={onReplayTransaction}
        />
      )}

      {/* Network Topology & Live Node Inspector */}
      <div className="p-6 rounded-xl bg-[#101827] border border-slate-800">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-heading font-semibold text-white">
              Live Bank Network Topology
            </h3>
            <p className="text-xs text-slate-400">
              Interactive node pathways showing active cryptographic barriers. Click any node to inspect telemetry.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span className="w-2 h-2 rounded-full bg-[#35D6C5]" />
            <span>All Channels Operational</span>
          </div>
        </div>

        {/* 5-Node Interactive Pathway */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6">
          {topologyNodes.map((node, index) => {
            const Icon = node.icon;
            const isSelected = inspectedTopologyNode === node.id;
            return (
              <button
                key={node.id}
                onClick={() => setInspectedTopologyNode(node.id)}
                className={`p-4 rounded-xl text-left transition-all border relative ${
                  isSelected
                    ? 'bg-slate-800 border-[#35D6C5] shadow-lg shadow-[#35D6C5]/10'
                    : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-lg ${isSelected ? 'bg-[#35D6C5]/20 text-[#35D6C5]' : 'bg-slate-800 text-slate-400'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Node 0{index + 1}</span>
                </div>
                <h4 className="text-xs font-semibold text-white mb-0.5 truncate">{node.name}</h4>
                <div className="text-[10px] text-slate-400 mb-2 truncate">{node.type}</div>
                <div className="text-[10px] font-mono text-[#35D6C5] truncate bg-slate-950/60 px-2 py-1 rounded">
                  {node.metrics}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Node Detailed Inspector */}
        <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-white mb-1">
              <span className="text-[#35D6C5]">{activeNodeInfo.name}</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400 font-normal">{activeNodeInfo.type}</span>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl">{activeNodeInfo.details}</p>
          </div>
          <div className="text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1.5 rounded border border-slate-800 shrink-0">
            SECURITY PROFILE: HIGH ASSURANCE
          </div>
        </div>
      </div>

      {/* Main SOC Split: Transaction Feed + Real-Time Security Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Transaction Filter & Feed */}
        <div className="lg:col-span-7 p-6 rounded-xl bg-[#101827] border border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-heading font-semibold text-white">
                Transaction Stream
              </h3>
              <p className="text-xs text-slate-400">
                Click a transaction to inspect its 5-gate cryptographic breakdown.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  filterStatus === 'all'
                    ? 'bg-slate-800 text-[#35D6C5] font-medium'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterStatus('verified')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  filterStatus === 'verified'
                    ? 'bg-slate-800 text-[#36D399] font-medium'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Verified
              </button>
              <button
                onClick={() => setFilterStatus('tampered')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  filterStatus === 'tampered'
                    ? 'bg-slate-800 text-[#FF4D5A] font-medium'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Tampered
              </button>
              <button
                onClick={() => setFilterStatus('replay')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  filterStatus === 'replay'
                    ? 'bg-slate-800 text-[#F5B942] font-medium'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Replays
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Transaction ID, sender, recipient, or SHA-256 digest..."
              className="w-full pl-8 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#35D6C5] font-mono"
            />
          </div>

          {/* Transaction Cards List */}
          <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
            {filteredTransactions.map((tx) => {
              const isSelected = selectedTransaction?.id === tx.id;
              const isVerified = tx.result.status === 'verified';
              const isTampered = tx.result.status === 'tampered';
              const isReplay = tx.result.status === 'replay_blocked';

              return (
                <div
                  key={tx.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectTransaction(tx)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectTransaction(tx);
                    }
                  }}
                  className={`w-full p-3.5 rounded-lg text-left transition-all border flex items-center justify-between cursor-pointer group/card ${
                    isSelected
                      ? 'bg-slate-800/90 border-[#35D6C5]'
                      : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <TransactionStatusTooltip transaction={tx}>
                      <div
                        className={`p-2 rounded-lg shrink-0 ${
                          isVerified
                            ? 'bg-[#36D399]/10 text-[#36D399]'
                            : isTampered
                            ? 'bg-[#FF4D5A]/10 text-[#FF4D5A]'
                            : 'bg-[#F5B942]/10 text-[#F5B942]'
                        }`}
                      >
                        {isVerified ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : isTampered ? (
                          <XCircle className="w-4 h-4" />
                        ) : (
                          <AlertTriangle className="w-4 h-4" />
                        )}
                      </div>
                    </TransactionStatusTooltip>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white truncate">
                          ₹{tx.canonical.amount.toLocaleString('en-IN')}
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className="text-xs text-slate-300 truncate">
                          {tx.canonical.senderName} → {tx.canonical.recipientName}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 truncate max-w-[240px] sm:max-w-[280px]">
                        ID: {tx.id}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <TransactionStatusTooltip transaction={tx}>
                        <div
                          className={`text-[11px] font-semibold uppercase ${
                            isVerified
                              ? 'text-[#36D399]'
                              : isTampered
                              ? 'text-[#FF4D5A]'
                              : 'text-[#F5B942]'
                          }`}
                        >
                          {tx.result.status.replace('_', ' ')}
                        </div>
                      </TransactionStatusTooltip>
                      <div className="text-[10px] font-mono text-slate-500">
                        {tx.result.totalLatencyMs}ms · {new Date(tx.createdAt).toLocaleTimeString()}
                      </div>
                    </div>

                    {/* Forensic Replay in 3D Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onReplayTransaction?.(tx);
                      }}
                      title={`Forensic Replay: Re-trigger 3D mechanical pipeline visualization for transaction ${tx.id}`}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#4C8DFF]/15 hover:bg-[#4C8DFF] text-[#4C8DFF] hover:text-white border border-[#4C8DFF]/30 hover:border-[#4C8DFF] text-xs font-semibold font-mono transition-all shadow-sm active:scale-95 cursor-pointer group/replay"
                    >
                      <RotateCcw className="w-3.5 h-3.5 group-hover/replay:-rotate-90 transition-transform duration-300" />
                      <span>Replay</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredTransactions.length === 0 && (
              <div className="py-12 text-center text-slate-500 text-xs">
                No transactions match the selected filter criteria.
              </div>
            )}
          </div>
        </div>

        {/* Right: Selected Transaction Inspector / Gate Matrix */}
        <div id="five-gate-inspector" className="lg:col-span-5 p-6 rounded-xl bg-[#101827] border border-slate-800 flex flex-col justify-between scroll-mt-24">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#35D6C5]" />
                <span>5-Gate Cryptographic Inspector</span>
              </h3>
              {selectedTransaction && (
                <span className="text-xs font-mono text-slate-400">
                  {selectedTransaction.id.slice(0, 8)}...
                </span>
              )}
            </div>

            {selectedTransaction ? (
              <div className="space-y-3">
                {selectedTransaction.result.gates.map((g) => (
                  <div
                    key={g.gate}
                    className={`p-3 rounded-lg border text-xs ${
                      g.passed
                        ? 'bg-slate-900/80 border-slate-800'
                        : 'bg-red-950/20 border-[#FF4D5A]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 font-medium text-white">
                        {g.passed ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#36D399]" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-[#FF4D5A]" />
                        )}
                        <span>Gate 0{g.gate}: {g.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">{g.latencyMs}ms</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">{g.details}</p>
                  </div>
                ))}

                {selectedTransaction.result.failureReason && (
                  <div className="p-3 rounded-lg bg-red-950/30 border border-[#FF4D5A]/30 text-xs text-red-200">
                    <span className="font-semibold block mb-0.5">Deflected Threat:</span>
                    <span>{selectedTransaction.result.failureReason}</span>
                  </div>
                )}

                {/* Prominent 3D Pipeline Forensic Replay Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => onReplayTransaction?.(selectedTransaction)}
                    title={`Trigger 3D pipeline forensic replay for transaction ${selectedTransaction.id}`}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-gradient-to-r from-[#172554] via-[#1e293b] to-[#172554] hover:from-[#1d4ed8] hover:via-[#2563eb] hover:to-[#1d4ed8] border border-[#3b82f6]/50 hover:border-[#60a5fa] text-[#93c5fd] hover:text-white text-xs font-semibold font-mono tracking-wide transition-all shadow-md active:scale-[0.99] cursor-pointer group"
                  >
                    <RotateCcw className="w-4 h-4 text-[#60a5fa] group-hover:-rotate-90 transition-transform duration-300" />
                    <span>FORENSIC REPLAY IN 3D PIPELINE</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-slate-500 text-xs">
                Select any transaction from the stream to inspect individual gate latencies and cryptographic proofs.
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>TERMINAL: SOC-NODE-ALPHA</span>
            <span>AUDIT TRAIL SECURED</span>
          </div>
        </div>
      </div>

      {/* Live Security Audit Log Stream */}
      <div id="security-audit-logs" className="p-6 rounded-xl bg-[#101827] border border-slate-800 space-y-4">
        {/* Header & Meta */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-heading font-semibold text-white">
                Real-Time Security Event Stream
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#36D399]/10 text-[#36D399] border border-[#36D399]/20">
                <span className="w-1.5 h-1.5 rounded-full bg-[#36D399] animate-pulse" />
                Live Bus
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Cryptographic event bus broadcasting TLS handshakes, AES-GCM decryptions, signature validations, and adversary interventions.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-mono text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded border border-slate-800">
              Showing <span className="text-white font-semibold">{filteredAuditLogs.length}</span> of {auditLogs.length} Events
            </span>
          </div>
        </div>

        {/* Search Bar & Level Filter Buttons */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={logSearchQuery}
              onChange={(e) => setLogSearchQuery(e.target.value)}
              placeholder="Search logs by Transaction ID (e.g. tx-8942) or Event Type (e.g. CRYPTO, REPLAY, AUTH, TLS)..."
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg pl-9 pr-9 py-2 text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#4C8DFF] focus:ring-1 focus:ring-[#4C8DFF] transition-all"
            />
            {logSearchQuery && (
              <button
                onClick={() => setLogSearchQuery('')}
                title="Clear search query"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Level Filter Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap shrink-0">
            {/* All Logs */}
            <button
              onClick={() => setLogFilterLevel('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                logFilterLevel === 'all'
                  ? 'bg-slate-700 text-white shadow-sm ring-1 ring-slate-500'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800'
              }`}
            >
              <span>All</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                logFilterLevel === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-800/60 text-slate-400'
              }`}>
                {auditLogs.length}
              </span>
            </button>

            {/* Critical Filter */}
            <button
              onClick={() => setLogFilterLevel(logFilterLevel === 'critical' ? 'all' : 'critical')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                logFilterLevel === 'critical'
                  ? 'bg-red-950/80 text-[#FF4D5A] border border-[#FF4D5A] shadow-md shadow-red-900/20 ring-1 ring-[#FF4D5A]/50'
                  : 'bg-slate-900/80 text-slate-400 hover:text-red-400 hover:bg-red-950/30 border border-slate-800'
              }`}
            >
              <AlertCircle className={`w-3.5 h-3.5 ${logFilterLevel === 'critical' ? 'text-[#FF4D5A]' : 'text-red-400'}`} />
              <span>Critical</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-semibold ${
                logFilterLevel === 'critical' ? 'bg-red-900/60 text-[#FF4D5A]' : 'bg-slate-800/60 text-slate-400'
              }`}>
                {criticalCount}
              </span>
            </button>

            {/* Warning Filter */}
            <button
              onClick={() => setLogFilterLevel(logFilterLevel === 'warning' ? 'all' : 'warning')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                logFilterLevel === 'warning'
                  ? 'bg-amber-950/80 text-[#F5B942] border border-[#F5B942] shadow-md shadow-amber-900/20 ring-1 ring-[#F5B942]/50'
                  : 'bg-slate-900/80 text-slate-400 hover:text-amber-400 hover:bg-amber-950/30 border border-slate-800'
              }`}
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${logFilterLevel === 'warning' ? 'text-[#F5B942]' : 'text-amber-400'}`} />
              <span>Warning</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-semibold ${
                logFilterLevel === 'warning' ? 'bg-amber-900/60 text-[#F5B942]' : 'bg-slate-800/60 text-slate-400'
              }`}>
                {warningCount}
              </span>
            </button>

            {/* Info Filter */}
            <button
              onClick={() => setLogFilterLevel(logFilterLevel === 'info' ? 'all' : 'info')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                logFilterLevel === 'info'
                  ? 'bg-sky-950/80 text-sky-400 border border-sky-400 shadow-md shadow-sky-900/20 ring-1 ring-sky-400/50'
                  : 'bg-slate-900/80 text-slate-400 hover:text-sky-300 hover:bg-sky-950/30 border border-slate-800'
              }`}
            >
              <Info className={`w-3.5 h-3.5 ${logFilterLevel === 'info' ? 'text-sky-400' : 'text-sky-400'}`} />
              <span>Info</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-semibold ${
                logFilterLevel === 'info' ? 'bg-sky-900/60 text-sky-400' : 'bg-slate-800/60 text-slate-400'
              }`}>
                {infoCount}
              </span>
            </button>

            {/* Reset Filters Shortcut if active */}
            {(logSearchQuery || logFilterLevel !== 'all') && (
              <button
                onClick={() => {
                  setLogSearchQuery('');
                  setLogFilterLevel('all');
                }}
                title="Reset all log filters"
                className="flex items-center gap-1 px-2 py-1.5 rounded text-[11px] text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
              >
                <X className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Log Entries List */}
        <div className="space-y-2 max-h-72 overflow-y-auto font-mono text-xs pr-1 divide-y divide-slate-800/40">
          {filteredAuditLogs.length > 0 ? (
            filteredAuditLogs.map((log) => {
              let levelBadge = 'text-slate-400 bg-slate-800/60 border-slate-700';
              let levelLabel = 'INFO';
              if (log.level === 'success') {
                levelBadge = 'text-[#36D399] bg-[#36D399]/10 border-[#36D399]/30';
                levelLabel = 'OK';
              } else if (log.level === 'warn') {
                levelBadge = 'text-[#F5B942] bg-[#F5B942]/10 border-[#F5B942]/30';
                levelLabel = 'WARN';
              } else if (log.level === 'error') {
                levelBadge = 'text-[#FF4D5A] bg-[#FF4D5A]/10 border-[#FF4D5A]/30';
                levelLabel = 'CRITICAL';
              }

              // Event type category badge colors
              let categoryColor = 'text-indigo-400 bg-indigo-950/40 border-indigo-800/50';
              if (log.category === 'CRYPTO') categoryColor = 'text-cyan-400 bg-cyan-950/40 border-cyan-800/50';
              if (log.category === 'TLS') categoryColor = 'text-blue-400 bg-blue-950/40 border-blue-800/50';
              if (log.category === 'AUTH') categoryColor = 'text-purple-400 bg-purple-950/40 border-purple-800/50';
              if (log.category === 'REPLAY') categoryColor = 'text-amber-400 bg-amber-950/40 border-amber-800/50';
              if (log.category === 'ADVERSARY') categoryColor = 'text-rose-400 bg-rose-950/40 border-rose-800/50';
              if (log.category === 'LEDGER') categoryColor = 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50';

              const matchingTx = log.transactionId
                ? transactions.find((t) => t.id === log.transactionId)
                : null;

              return (
                <div
                  key={log.id}
                  className="pt-2 first:pt-0 p-2.5 rounded bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800/80 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-2"
                >
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <span className="text-slate-500 shrink-0 text-[11px] pt-0.5">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>

                    {/* Level Badge */}
                    <AuditLogStatusTooltip log={log} matchingTx={matchingTx || undefined}>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase border shrink-0 ${levelBadge}`}>
                        {levelLabel}
                      </span>
                    </AuditLogStatusTooltip>

                    {/* Event Type / Category Badge */}
                    <AuditLogStatusTooltip log={log} matchingTx={matchingTx || undefined}>
                      <button
                        onClick={() => setLogSearchQuery(log.category)}
                        title={`Filter by event type: ${log.category}`}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase border shrink-0 cursor-pointer hover:brightness-125 transition-all ${categoryColor}`}
                      >
                        {log.category}
                      </button>
                    </AuditLogStatusTooltip>

                    {/* Message */}
                    <span className="text-slate-300 leading-snug break-words">
                      {log.message}
                    </span>
                  </div>

                  {/* Transaction ID Tag & Link */}
                  {log.transactionId && (
                    <div className="sm:shrink-0 flex items-center gap-1.5 self-end sm:self-start">
                      {matchingTx ? (
                        <TransactionStatusTooltip transaction={matchingTx}>
                          <button
                            onClick={() => {
                              onSelectTransaction(matchingTx);
                              const el = document.getElementById('five-gate-inspector');
                              if (el) el.scrollIntoView({ behavior: 'smooth' });
                            }}
                            title={`Inspect Transaction ${log.transactionId} in 5-Gate Inspector`}
                            className="px-2 py-0.5 rounded bg-slate-800/90 hover:bg-slate-700 text-[11px] text-[#4C8DFF] hover:text-white border border-slate-700/80 hover:border-[#4C8DFF] flex items-center gap-1 cursor-pointer transition-all"
                          >
                            <span className="text-slate-400">TX:</span>
                            <span className="font-semibold underline decoration-[#4C8DFF]/40">{log.transactionId}</span>
                          </button>
                        </TransactionStatusTooltip>
                      ) : (
                        <button
                          onClick={() => setLogSearchQuery(log.transactionId || '')}
                          title={`Search logs for ${log.transactionId}`}
                          className="px-2 py-0.5 rounded bg-slate-800/60 text-[11px] text-slate-400 border border-slate-700/60 hover:text-slate-200 cursor-pointer"
                        >
                          <span>TX: {log.transactionId}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="py-12 px-4 text-center rounded-lg bg-slate-900/30 border border-slate-800/60 flex flex-col items-center justify-center gap-2">
              <Filter className="w-6 h-6 text-slate-500 mb-1" />
              <p className="text-sm font-medium text-slate-300">
                No security audit events match the current filter criteria
              </p>
              <p className="text-xs text-slate-500 max-w-md">
                {logSearchQuery && (
                  <span>Query &quot;<span className="text-slate-300 font-mono">{logSearchQuery}</span>&quot; </span>
                )}
                {logFilterLevel !== 'all' && (
                  <span>with level &quot;<span className="text-slate-300 uppercase font-mono">{logFilterLevel}</span>&quot; </span>
                )}
                returned 0 events.
              </p>
              <button
                onClick={() => {
                  setLogSearchQuery('');
                  setLogFilterLevel('all');
                }}
                className="mt-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 hover:text-white font-medium border border-slate-700 transition-colors cursor-pointer"
              >
                Clear Search & Filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

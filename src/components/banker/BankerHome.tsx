/**
 * CipherGuard 3D - Banker Home Dashboard (SOC Command Center)
 * Specialized dashboard for Vikram Malhotra (Banker / SOC Commander)
 * Featuring real-time transaction monitoring, live Security Alerts Panel,
 * toast notification system for critical security events, network topology,
 * 5-gate cryptographic inspection, and forensic CSV export.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  TransactionRecord,
  AuditLogItem,
  SocMetrics,
} from '../../types/security';
import { SecurityAlert, ToastNotification } from '../../types/alerts';
import { SocDashboard } from '../soc/SocDashboard';
import { SecurityAlertsPanel } from './SecurityAlertsPanel';
import { SecurityToastContainer } from '../common/SecurityToastContainer';
import { NetworkTopologyView } from './NetworkTopologyView';
import {
  ShieldCheck,
  ShieldAlert,
  Download,
  FileSpreadsheet,
  FileText,
  Check,
  Bell,
  ChevronDown,
  ChevronUp,
  Network,
} from 'lucide-react';
import { exportTransactionsCSV, exportAuditLogsCSV } from '../../utils/csvExport';
import { alertSound } from '../../utils/alertSound';

interface BankerHomeProps {
  metrics: SocMetrics;
  transactions: TransactionRecord[];
  auditLogs: AuditLogItem[];
  onSelectTransaction: (tx: TransactionRecord) => void;
  selectedTransaction?: TransactionRecord | null;
  onSimulateProbe?: (attackType: string) => void;
  onReplayTransaction?: (tx: TransactionRecord) => void;
}

// Convert a transaction into a structured SecurityAlert if it represents a threat or failure
function mapTransactionToAlert(tx: TransactionRecord, isNew: boolean = false): SecurityAlert | null {
  if (tx.result.status === 'verified' && !tx.isSimulatedAttack) {
    return null;
  }

  const failingGate = tx.result.failingGateIndex;
  let title = 'Security Incident Intercepted';
  let message = tx.result.failureReason || 'Cryptographic integrity verification failed.';
  let severity: SecurityAlert['severity'] = 'high';
  let category: SecurityAlert['category'] = 'ADVERSARY_PROBE';
  let defendingGate = failingGate || 2;
  let defendingGateName = 'Mechanical Gate Defended';

  if (failingGate === 2 || tx.attackType?.includes('mitm')) {
    title = 'MITM Attempt Detected';
    message = tx.result.failureReason || 'Ciphertext bit-tampering intercepted. AES-256-GCM authentication tag mismatch prevented unauthorized balance modification.';
    severity = 'critical';
    category = 'MITM_ATTACK';
    defendingGate = 2;
    defendingGateName = 'AES-256-GCM Tag Verification';
  } else if (failingGate === 3 || tx.attackType === 'signature_forgery') {
    title = 'Signature Mismatch Detected';
    message = tx.result.failureReason || 'Sender ECDSA P-256 signature mismatch detected. Payload forgery or unauthorized private key intercepted before settlement.';
    severity = 'critical';
    category = 'SIGNATURE_MISMATCH';
    defendingGate = 3;
    defendingGateName = 'ECDSA Digital Signature';
  } else if (failingGate === 4 && (tx.result.failureReason?.includes('Replay') || tx.attackType === 'replay_attack')) {
    title = 'Replay Attack Intercepted';
    message = tx.result.failureReason || 'Duplicate cryptographic nonce detected. Transaction replay blocked by sliding nonce cache.';
    severity = 'high';
    category = 'REPLAY_ATTACK';
    defendingGate = 4;
    defendingGateName = 'Nonce & Replay Protection';
  } else if (failingGate === 4) {
    title = 'Expired Timestamp Detected';
    message = tx.result.failureReason || 'Transaction timestamp delta exceeded the 300s security window.';
    severity = 'warning';
    category = 'TIMESTAMP_EXPIRED';
    defendingGate = 4;
    defendingGateName = 'Timestamp Freshness';
  } else if (failingGate === 1) {
    title = 'Insecure TLS Negotiation Attempt';
    message = tx.result.failureReason || 'TLS 1.3 cipher suite downgrade attempt blocked.';
    severity = 'critical';
    category = 'TLS_DEGRADATION';
    defendingGate = 1;
    defendingGateName = 'TLS 1.3 Session Verification';
  } else if (failingGate === 5) {
    title = 'Ledger Limit / Insufficient Balance';
    message = tx.result.failureReason || 'Transaction amount exceeds authorized balance limits.';
    severity = 'warning';
    category = 'INSUFFICIENT_FUNDS';
    defendingGate = 5;
    defendingGateName = 'Ledger Authorization';
  }

  return {
    id: `ALERT-${tx.id}`,
    title,
    message,
    severity,
    category,
    timestamp: tx.createdAt || Date.now(),
    transactionId: tx.id,
    originGeo: tx.originGeo,
    defendingGate,
    defendingGateName,
    technicalDetails: tx.result.failureReason,
    acknowledged: !isNew,
  };
}

export const BankerHome: React.FC<BankerHomeProps> = (props) => {
  const [exportedToast, setExportedToast] = useState<string | null>(null);
  const [showAlertsPanel, setShowAlertsPanel] = useState<boolean>(true);
  const [showTopologyView, setShowTopologyView] = useState<boolean>(true);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Track transaction IDs we have already seen to avoid duplicate toasts on re-renders
  const seenTxIdsRef = useRef<Set<string>>(new Set());
  const initialMountRef = useRef<boolean>(true);

  // Initialize and synchronize alerts from transactions
  useEffect(() => {
    const currentAlerts: SecurityAlert[] = [];
    const newThreatTransactions: TransactionRecord[] = [];

    props.transactions.forEach((tx) => {
      const isFailedOrAttack = tx.result.status !== 'verified' || Boolean(tx.isSimulatedAttack);
      if (isFailedOrAttack) {
        const isNew = !initialMountRef.current && !seenTxIdsRef.current.has(tx.id);
        const mapped = mapTransactionToAlert(tx, isNew);
        if (mapped) {
          currentAlerts.push(mapped);
          if (isNew) {
            newThreatTransactions.push(tx);
          }
        }
      }
      seenTxIdsRef.current.add(tx.id);
    });

    setAlerts((prev) => {
      // Merge while preserving manual acknowledgment states
      const ackMap = new Map<string, boolean>();
      prev.forEach((a) => ackMap.set(a.id, Boolean(a.acknowledged)));

      const merged = currentAlerts.map((alert) => ({
        ...alert,
        acknowledged: ackMap.has(alert.id) ? ackMap.get(alert.id) : alert.acknowledged,
      }));

      // Sort by timestamp descending
      return merged.sort((a, b) => b.timestamp - a.timestamp);
    });

    // Trigger toast & audio for newly arrived threats during live session
    if (!initialMountRef.current && newThreatTransactions.length > 0) {
      newThreatTransactions.forEach((tx) => {
        const alert = mapTransactionToAlert(tx, true);
        if (alert) {
          triggerToast(alert);
          if (alert.severity === 'critical') {
            alertSound.playCriticalAlert();
          } else {
            alertSound.playWarningAlert();
          }
        }
      });
    }

    initialMountRef.current = false;
  }, [props.transactions]);

  // Trigger floating toast
  const triggerToast = useCallback((alert: SecurityAlert) => {
    const toastId = `TOAST-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newToast: ToastNotification = {
      id: toastId,
      alert,
      createdAt: Date.now(),
      durationMs: alert.severity === 'critical' ? 8000 : 6000,
    };

    setToasts((prev) => [newToast, ...prev.slice(0, 4)]);
  }, []);

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleAcknowledgeAlert = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
    );
  };

  const handleAcknowledgeAll = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, acknowledged: true })));
  };

  const handleClearResolved = () => {
    setAlerts((prev) => prev.filter((a) => !a.acknowledged));
  };

  const handleSelectTransactionById = (transactionId?: string) => {
    if (!transactionId) return;
    const targetTx = props.transactions.find((t) => t.id === transactionId);
    if (targetTx) {
      props.onSelectTransaction(targetTx);
    }
    // Smooth scroll to 5-gate inspector
    const elem = document.getElementById('five-gate-inspector');
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Trigger simulated alert for immediate verification
  const handleTriggerSimulatedAlert = (type: 'mitm' | 'signature' | 'replay') => {
    if (type === 'mitm') {
      const alert: SecurityAlert = {
        id: `ALERT-SIM-MITM-${Date.now()}`,
        title: 'MITM Attempt Detected',
        message: 'Adversary in Bucharest modified payload ciphertext byte at offset 0x4B. Intercepted by Gate 2: AES-256-GCM authentication tag mismatch.',
        severity: 'critical',
        category: 'MITM_ATTACK',
        timestamp: Date.now(),
        originGeo: {
          city: 'Bucharest',
          country: 'Romania',
          countryCode: 'RO',
          ip: '185.220.101.42',
          lat: 44.4268,
          lng: 26.1025,
          threatScore: 94,
        },
        defendingGate: 2,
        defendingGateName: 'AES-256-GCM Tag Verification',
        technicalDetails: 'Expected tag 4b29f... != Received calculated tag 9f12d...',
        acknowledged: false,
      };
      setAlerts((prev) => [alert, ...prev]);
      triggerToast(alert);
      alertSound.playCriticalAlert();
      props.onSimulateProbe?.('mitm_amount_tamper');
    } else if (type === 'signature') {
      const alert: SecurityAlert = {
        id: `ALERT-SIM-SIG-${Date.now()}`,
        title: 'Signature Mismatch Detected',
        message: 'ECDSA P-256 digital signature validation failed. Origin in Ashburn attempted transaction forgery with invalid private key.',
        severity: 'critical',
        category: 'SIGNATURE_MISMATCH',
        timestamp: Date.now(),
        originGeo: {
          city: 'Ashburn',
          country: 'United States',
          countryCode: 'US',
          ip: '23.129.64.150',
          lat: 39.0438,
          lng: -77.4874,
          threatScore: 92,
        },
        defendingGate: 3,
        defendingGateName: 'ECDSA P-256 Digital Signature',
        technicalDetails: 'crypto.subtle.verify returned false over canonical SHA-256 digest',
        acknowledged: false,
      };
      setAlerts((prev) => [alert, ...prev]);
      triggerToast(alert);
      alertSound.playCriticalAlert();
      props.onSimulateProbe?.('signature_forgery');
    } else {
      const alert: SecurityAlert = {
        id: `ALERT-SIM-REPLAY-${Date.now()}`,
        title: 'Replay Attack Intercepted',
        message: 'Replay attack blocked. Transaction nonce 7f4a08bc... previously processed in current block window.',
        severity: 'high',
        category: 'REPLAY_ATTACK',
        timestamp: Date.now(),
        originGeo: {
          city: 'Frankfurt',
          country: 'Germany',
          countryCode: 'DE',
          ip: '194.26.29.112',
          lat: 50.1109,
          lng: 8.6821,
          threatScore: 88,
        },
        defendingGate: 4,
        defendingGateName: 'Nonce & Replay Protection',
        technicalDetails: 'seenNonces.has(canonical.nonce) === true',
        acknowledged: false,
      };
      setAlerts((prev) => [alert, ...prev]);
      triggerToast(alert);
      alertSound.playWarningAlert();
      props.onSimulateProbe?.('replay_attack');
    }
  };

  const handleExportLedger = () => {
    exportTransactionsCSV(props.transactions);
    setExportedToast('Transaction Ledger CSV Exported');
    setTimeout(() => setExportedToast(null), 3000);
  };

  const handleExportAuditLogs = () => {
    exportAuditLogsCSV(props.auditLogs);
    setExportedToast('Security Audit Logs CSV Exported');
    setTimeout(() => setExportedToast(null), 3000);
  };

  const handleReplayTransaction = (tx: TransactionRecord) => {
    setExportedToast(`Replaying TX ${tx.id.slice(0, 10)}... in 3D Pipeline`);
    setTimeout(() => setExportedToast(null), 3500);
    props.onReplayTransaction?.(tx);
  };

  const unreadAlertsCount = alerts.filter((a) => !a.acknowledged).length;

  return (
    <div className="space-y-6 relative">
      {/* Floating Real-time Security Toast Notification System */}
      <SecurityToastContainer
        toasts={toasts}
        onDismiss={handleDismissToast}
        onInspect={handleSelectTransactionById}
      />

      {/* Banker Home Executive Header with Dual CSV Export Buttons & Alerts Panel Toggle */}
      <div className="p-6 rounded-xl bg-gradient-to-r from-[#101827] via-[#172235] to-[#101827] border border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#4C8DFF] tracking-wider uppercase font-semibold">
              BANKER HOME · SECURITY OPERATIONS CENTER (SOC)
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-xs text-slate-400">Vikram Malhotra (Commander)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-heading font-bold text-white">
            Bank Transaction Security Operations & Audit Control
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Real-time transaction authorization monitoring, live security alerts panel with instant threat toasts, 5-gate cryptographic inspection, and forensic CSV export.
          </p>
        </div>

        {/* Action Controls in Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0 w-full lg:w-auto">
          {exportedToast && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono bg-emerald-500/10 px-3 py-2 rounded-lg border border-emerald-500/20">
              <Check className="w-4 h-4" />
              <span>{exportedToast}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {/* Toggle Alerts Panel Button */}
            <button
              onClick={() => setShowAlertsPanel((prev) => !prev)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg border text-xs font-mono transition-all cursor-pointer ${
                showAlertsPanel
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 shadow-md shadow-rose-950/40'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="relative">
                <Bell className="w-4 h-4 text-rose-400" />
                {unreadAlertsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                )}
              </div>
              <span className="font-semibold">
                Alerts ({alerts.length})
              </span>
              {unreadAlertsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                  {unreadAlertsCount}
                </span>
              )}
              {showAlertsPanel ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            {/* Toggle Network Topology Live SVG View Button */}
            <button
              onClick={() => setShowTopologyView((prev) => !prev)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg border text-xs font-mono transition-all cursor-pointer ${
                showTopologyView
                  ? 'bg-[#35D6C5]/15 border-[#35D6C5]/40 text-[#35D6C5] shadow-md shadow-[#35D6C5]/10'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Network className="w-4 h-4 text-[#35D6C5]" />
              <span className="font-semibold">Topology (SVG)</span>
              {showTopologyView ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            {/* Export Ledger Button */}
            <button
              onClick={handleExportLedger}
              title="Download RFC 4180 CSV of all currently displayed transactions"
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#35D6C5] hover:bg-[#28b8a8] active:scale-[0.98] text-slate-950 font-semibold text-xs transition-all shadow-lg shadow-[#35D6C5]/20 cursor-pointer group"
            >
              <FileSpreadsheet className="w-4 h-4 text-slate-950 group-hover:scale-110 transition-transform" />
              <span>Export Ledger</span>
            </button>

            {/* Export Audit Logs Button */}
            <button
              onClick={handleExportAuditLogs}
              title="Download RFC 4180 CSV of all currently displayed security audit logs"
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#4C8DFF] hover:bg-[#3b79ea] active:scale-[0.98] text-white font-semibold text-xs transition-all shadow-lg shadow-[#4C8DFF]/20 cursor-pointer group"
            >
              <FileText className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
              <span>Export Audit Logs</span>
            </button>

            <div className="hidden sm:flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs font-mono text-[#36D399]">
              <ShieldCheck className="w-4 h-4 text-[#36D399]" />
              <span>5-Gate Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Security Alerts Panel */}
      {showAlertsPanel && (
        <SecurityAlertsPanel
          alerts={alerts}
          transactions={props.transactions}
          onAcknowledgeAlert={handleAcknowledgeAlert}
          onAcknowledgeAll={handleAcknowledgeAll}
          onClearResolved={handleClearResolved}
          onSelectTransaction={handleSelectTransactionById}
          onTriggerSimulatedAlert={handleTriggerSimulatedAlert}
          onReplayTransaction={handleReplayTransaction}
        />
      )}

      {/* Live SVG Network Topology & Real-time WebSocket Telemetry */}
      {showTopologyView && (
        <NetworkTopologyView
          transactions={props.transactions}
          metrics={props.metrics}
          onSelectTransaction={props.onSelectTransaction}
          onSimulateProbe={props.onSimulateProbe}
          onReplayTransaction={handleReplayTransaction}
        />
      )}

      {/* Main SOC Dashboard Engine */}
      <SocDashboard
        {...props}
        onReplayTransaction={handleReplayTransaction}
      />
    </div>
  );
};

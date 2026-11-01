/**
 * CipherGuard 3D - Banker Security Alerts Panel
 * Real-time command panel displaying critical threat notifications,
 * forensic incident details, severity filtering, and live toast integration.
 */

import React, { useState } from 'react';
import { SecurityAlert, AlertSeverity } from '../../types/alerts';
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Filter,
  Search,
  ExternalLink,
  MapPin,
  ShieldCheck,
  Check,
  Trash2,
  Zap,
  Radio,
  Copy,
  RotateCcw,
} from 'lucide-react';
import { alertSound } from '../../utils/alertSound';
import { TransactionRecord } from '../../types/security';
import { TransactionStatusTooltip } from '../common/SecurityGateTooltip';

interface SecurityAlertsPanelProps {
  alerts: SecurityAlert[];
  transactions?: TransactionRecord[];
  onAcknowledgeAlert: (id: string) => void;
  onAcknowledgeAll: () => void;
  onClearResolved: () => void;
  onSelectTransaction?: (transactionId: string) => void;
  onTriggerSimulatedAlert?: (type: 'mitm' | 'signature' | 'replay') => void;
  onReplayTransaction?: (tx: TransactionRecord) => void;
}

export const SecurityAlertsPanel: React.FC<SecurityAlertsPanelProps> = ({
  alerts,
  transactions,
  onAcknowledgeAlert,
  onAcknowledgeAll,
  onClearResolved,
  onSelectTransaction,
  onTriggerSimulatedAlert,
  onReplayTransaction,
}) => {
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(alertSound.isEnabled());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleSound = () => {
    const newState = !soundEnabled;
    alertSound.setEnabled(newState);
    setSoundEnabled(newState);
    if (newState) {
      alertSound.playWarningAlert();
    }
  };

  const handleCopyForensics = (alert: SecurityAlert) => {
    const text = `CIPHERGUARD 3D INCIDENT REPORT
Alert: ${alert.title}
Severity: ${alert.severity.toUpperCase()}
Timestamp: ${new Date(alert.timestamp).toISOString()}
Transaction: ${alert.transactionId || 'N/A'}
Origin: ${alert.originGeo ? `${alert.originGeo.ip} (${alert.originGeo.city}, ${alert.originGeo.country})` : 'N/A'}
Defending Gate: ${alert.defendingGate ? `Gate ${alert.defendingGate} (${alert.defendingGateName})` : 'N/A'}
Details: ${alert.message}`;

    navigator.clipboard.writeText(text);
    setCopiedId(alert.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter alerts
  const filteredAlerts = alerts.filter((item) => {
    if (selectedSeverity === 'unacknowledged' && item.acknowledged) return false;
    if (selectedSeverity !== 'all' && selectedSeverity !== 'unacknowledged' && item.severity !== selectedSeverity) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchMsg = item.message.toLowerCase().includes(q);
      const matchTx = item.transactionId?.toLowerCase().includes(q) || false;
      const matchCity = item.originGeo?.city.toLowerCase().includes(q) || false;
      const matchIp = item.originGeo?.ip.toLowerCase().includes(q) || false;
      return matchTitle || matchMsg || matchTx || matchCity || matchIp;
    }
    return true;
  });

  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const highCount = alerts.filter((a) => a.severity === 'high').length;
  const unackCount = alerts.filter((a) => !a.acknowledged).length;

  return (
    <div className="rounded-xl bg-[#0D1524] border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
      {/* Top Banner Header */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-[#111C30] via-[#0E1726] to-[#111C30] border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-heading font-bold text-white tracking-wide">
                Security Alerts & Incident Stream
              </h3>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ACTIVE MONITOR
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Live threat telemetry intercepted across TLS 1.3, AES-GCM tag verification, and ECDSA signature checks.
            </p>
          </div>
        </div>

        {/* Header Controls: Audio & Quick Incident Simulation */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Audio Chime Toggle */}
          <button
            onClick={toggleSound}
            title={soundEnabled ? 'Mute Alert Sound Chimes' : 'Enable Alert Sound Chimes'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
              soundEnabled
                ? 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800'
                : 'bg-rose-950/30 border-rose-900/50 text-rose-300'
            }`}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Audio ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                <span>Muted</span>
              </>
            )}
          </button>

          {/* Quick Simulate Buttons for testing */}
          {onTriggerSimulatedAlert && (
            <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-lg border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 px-1 hidden md:inline">TEST:</span>
              <button
                onClick={() => onTriggerSimulatedAlert('mitm')}
                className="px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-mono transition-colors cursor-pointer"
                title="Simulate MITM Attack Alert"
              >
                + MITM
              </button>
              <button
                onClick={() => onTriggerSimulatedAlert('signature')}
                className="px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-mono transition-colors cursor-pointer"
                title="Simulate Signature Mismatch Alert"
              >
                + Sig Mismatch
              </button>
              <button
                onClick={() => onTriggerSimulatedAlert('replay')}
                className="px-2 py-1 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-mono transition-colors cursor-pointer"
                title="Simulate Replay Attack Alert"
              >
                + Replay
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Metric Counters & Filter Row */}
      <div className="px-4 py-3 bg-[#0A101C] border-b border-slate-800/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Severity Tabs */}
        <div className="flex items-center flex-wrap gap-1.5 text-xs font-mono">
          <button
            onClick={() => setSelectedSeverity('all')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              selectedSeverity === 'all'
                ? 'bg-slate-700 text-white font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            All ({alerts.length})
          </button>
          <button
            onClick={() => setSelectedSeverity('critical')}
            className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
              selectedSeverity === 'critical'
                ? 'bg-rose-600 text-white font-semibold'
                : 'text-rose-400 hover:bg-rose-950/40'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Critical ({criticalCount})
          </button>
          <button
            onClick={() => setSelectedSeverity('high')}
            className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
              selectedSeverity === 'high'
                ? 'bg-amber-600 text-slate-950 font-semibold'
                : 'text-amber-400 hover:bg-amber-950/40'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            High ({highCount})
          </button>
          <button
            onClick={() => setSelectedSeverity('unacknowledged')}
            className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
              selectedSeverity === 'unacknowledged'
                ? 'bg-[#4C8DFF] text-white font-semibold'
                : 'text-blue-400 hover:bg-blue-950/40'
            }`}
          >
            <span>Unacknowledged</span>
            {unackCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-blue-500 text-white text-[10px]">
                {unackCount}
              </span>
            )}
          </button>
        </div>

        {/* Search Bar & Action Buttons */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-56">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search threat, IP, ID..."
              className="w-full pl-8 pr-3 py-1 text-xs bg-slate-900 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {unackCount > 0 && (
            <button
              onClick={onAcknowledgeAll}
              title="Mark all alerts as acknowledged"
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors whitespace-nowrap cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ack All</span>
            </button>
          )}

          {alerts.length > 0 && (
            <button
              onClick={onClearResolved}
              title="Clear acknowledged alerts"
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-rose-950/50 hover:text-rose-300 text-slate-400 text-xs font-mono transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Alerts Feed List */}
      <div className="p-4 space-y-3 max-h-[460px] overflow-y-auto">
        {filteredAlerts.length === 0 ? (
          <div className="py-12 px-4 text-center rounded-xl bg-slate-900/40 border border-slate-800/80 flex flex-col items-center justify-center">
            <div className="p-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-2">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-white">Perimeter Defense Secure</h4>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              {alerts.length === 0
                ? 'No active security incidents detected. Cryptographic 5-gate pipeline operating without interference.'
                : 'No alerts matching the selected filter criteria.'}
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isCritical = alert.severity === 'critical';
            const isHigh = alert.severity === 'high';

            const cardBorder = isCritical
              ? 'border-rose-500/40 bg-gradient-to-r from-[#170a0e] via-[#101625] to-[#0e1624] hover:border-rose-500/70'
              : isHigh
              ? 'border-amber-500/40 bg-gradient-to-r from-[#181109] via-[#101625] to-[#0e1624] hover:border-amber-500/70'
              : 'border-cyan-500/30 bg-gradient-to-r from-[#09151e] via-[#101625] to-[#0e1624] hover:border-cyan-500/60';

            const severityBadge = isCritical
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              : isHigh
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';

            const alertTx = alert.transactionId && transactions ? transactions.find((t) => t.id === alert.transactionId) : null;

            return (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border transition-all duration-200 flex flex-col gap-3 relative shadow-lg ${cardBorder} ${
                  alert.acknowledged ? 'opacity-75' : ''
                }`}
              >
                {/* Header: Severity Badge, Title & Timing */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-bold border flex items-center gap-1.5 ${severityBadge}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isCritical ? 'bg-rose-400 animate-ping' : isHigh ? 'bg-amber-400' : 'bg-cyan-400'
                        }`}
                      />
                      {alert.severity}
                    </span>

                    <h4 className="text-sm font-semibold text-white tracking-tight">
                      {alert.title}
                    </h4>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
                    <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                    {alert.acknowledged ? (
                      <span className="flex items-center gap-1 text-emerald-400 text-[11px]">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Acknowledged</span>
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 text-[10px]">
                        Unacknowledged
                      </span>
                    )}
                  </div>
                </div>

                {/* Message Body & Technical Proof */}
                <div className="space-y-1.5">
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {alert.message}
                  </p>
                  {alert.technicalDetails && (
                    <div className="p-2 rounded bg-black/40 border border-slate-800 text-[11px] font-mono text-slate-400">
                      <span className="text-cyan-400">Proof: </span>
                      {alert.technicalDetails}
                    </div>
                  )}
                </div>

                {/* Badges: Origin IP/City + Gate Protection */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs font-mono">
                  <div className="flex flex-wrap items-center gap-2">
                    {alert.originGeo && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/50 text-slate-300 border border-slate-700/80">
                        <MapPin className="w-3.5 h-3.5 text-rose-400" />
                        <span>
                          {alert.originGeo.city}, {alert.originGeo.countryCode} ({alert.originGeo.ip})
                        </span>
                      </span>
                    )}

                    {alert.defendingGate && (
                      alertTx ? (
                        <TransactionStatusTooltip transaction={alertTx}>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-800/60 cursor-help">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Gate {alert.defendingGate}: {alert.defendingGateName || 'Defended'}</span>
                          </span>
                        </TransactionStatusTooltip>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-800/60">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Gate {alert.defendingGate}: {alert.defendingGateName || 'Defended'}</span>
                        </span>
                      )
                    )}
                  </div>

                  {/* Actions: Inspect, Acknowledge, Copy */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyForensics(alert)}
                      className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="Copy Incident Forensics"
                    >
                      {copiedId === alert.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {!alert.acknowledged && (
                      <button
                        onClick={() => onAcknowledgeAlert(alert.id)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-mono transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Ack</span>
                      </button>
                    )}

                    {alert.transactionId && onReplayTransaction && (
                      <button
                        onClick={() => {
                          const targetTx = transactions?.find((t) => t.id === alert.transactionId);
                          if (targetTx) {
                            onReplayTransaction(targetTx);
                          } else if (onSelectTransaction) {
                            onSelectTransaction(alert.transactionId!);
                          }
                        }}
                        className="px-2.5 py-1 rounded bg-[#4C8DFF]/20 hover:bg-[#4C8DFF] text-[#4C8DFF] hover:text-white border border-[#4C8DFF]/40 text-xs font-semibold font-mono transition-all flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer group/alertreplay"
                        title={`Forensically replay transaction ${alert.transactionId} in 3D pipeline`}
                      >
                        <RotateCcw className="w-3 h-3 group-hover/alertreplay:-rotate-90 transition-transform duration-300" />
                        <span>Replay in 3D</span>
                      </button>
                    )}

                    {alert.transactionId && onSelectTransaction && (
                      <button
                        onClick={() => onSelectTransaction(alert.transactionId!)}
                        className="px-3 py-1 rounded bg-[#4C8DFF] hover:bg-[#3b79ea] text-white text-xs font-semibold transition-colors flex items-center gap-1 shadow-md shadow-[#4C8DFF]/20 cursor-pointer"
                      >
                        <span>Inspect in 5 Gates</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

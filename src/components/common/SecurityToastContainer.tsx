/**
 * CipherGuard 3D - Floating Security Toast Notification System
 * Renders real-time animated alerts for incoming critical threats.
 */

import React, { useEffect, useState } from 'react';
import { ToastNotification } from '../../types/alerts';
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  X,
  ExternalLink,
  MapPin,
  ShieldCheck,
} from 'lucide-react';

interface SecurityToastContainerProps {
  toasts: ToastNotification[];
  onDismiss: (id: string) => void;
  onInspect?: (transactionId?: string) => void;
}

export const SecurityToastContainer: React.FC<SecurityToastContainerProps> = ({
  toasts,
  onDismiss,
  onInspect,
}) => {
  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col-reverse gap-3 max-w-md w-full pointer-events-none px-4 sm:px-0"
      aria-live="assertive"
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => onDismiss(toast.id)}
          onInspect={() => {
            if (onInspect && toast.alert.transactionId) {
              onInspect(toast.alert.transactionId);
            }
          }}
        />
      ))}
    </div>
  );
};

interface ToastItemProps {
  toast: ToastNotification;
  onDismiss: () => void;
  onInspect: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss, onInspect }) => {
  const { alert } = toast;
  const durationMs = toast.durationMs || 7000;
  const [progress, setProgress] = useState<number>(100);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  useEffect(() => {
    if (isPaused) return;

    const intervalTime = 50;
    const step = (intervalTime / durationMs) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= step) {
          clearInterval(timer);
          onDismiss();
          return 0;
        }
        return prev - step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [durationMs, isPaused, onDismiss]);

  const isCritical = alert.severity === 'critical';
  const isHigh = alert.severity === 'high';

  const severityBg = isCritical
    ? 'bg-gradient-to-r from-rose-950/95 via-[#1a080d]/95 to-slate-950/95 border-rose-500/60 shadow-rose-900/40 text-rose-100'
    : isHigh
    ? 'bg-gradient-to-r from-amber-950/95 via-[#1b1208]/95 to-slate-950/95 border-amber-500/60 shadow-amber-900/40 text-amber-100'
    : 'bg-gradient-to-r from-cyan-950/95 via-[#081822]/95 to-slate-950/95 border-cyan-500/50 shadow-cyan-900/30 text-cyan-100';

  const badgeColor = isCritical
    ? 'bg-rose-500 text-white font-bold'
    : isHigh
    ? 'bg-amber-500 text-slate-950 font-bold'
    : 'bg-cyan-500 text-slate-950 font-bold';

  const progressBarColor = isCritical
    ? 'bg-rose-500'
    : isHigh
    ? 'bg-amber-500'
    : 'bg-cyan-400';

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`pointer-events-auto rounded-xl border p-4 shadow-2xl backdrop-blur-md transition-all duration-300 relative overflow-hidden flex flex-col gap-2.5 ${severityBg}`}
      role="alert"
    >
      {/* Progress countdown bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800/80">
        <div
          className={`h-full transition-all linear ${progressBarColor}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header with Severity, Title & Dismiss */}
      <div className="flex items-start justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-[10px] tracking-wider uppercase flex items-center gap-1 ${badgeColor}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            {alert.severity}
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            {new Date(alert.timestamp).toLocaleTimeString()}
          </span>
        </div>

        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-white/10"
          title="Dismiss Alert"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Alert Content */}
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-black/40 border border-white/10 shrink-0 mt-0.5">
          {isCritical ? (
            <ShieldAlert className="w-5 h-5 text-rose-400 animate-pulse" />
          ) : isHigh ? (
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          ) : (
            <Info className="w-5 h-5 text-cyan-400" />
          )}
        </div>

        <div className="space-y-1 flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
            <span>{alert.title}</span>
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed font-sans line-clamp-2">
            {alert.message}
          </p>

          {/* Forensic details: Origin & Gate */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono">
            {alert.originGeo && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-black/50 text-slate-300 border border-slate-700/60">
                <MapPin className="w-3 h-3 text-rose-400" />
                <span>
                  {alert.originGeo.city}, {alert.originGeo.countryCode} ({alert.originGeo.ip})
                </span>
              </span>
            )}

            {alert.defendingGate && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-black/50 text-emerald-400 border border-emerald-900/60">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Gate {alert.defendingGate} Defended</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      {alert.transactionId && (
        <div className="flex items-center justify-between pt-1 border-t border-white/10">
          <span className="text-[10px] font-mono text-slate-400">
            ID: {alert.transactionId.slice(0, 18)}...
          </span>

          <button
            onClick={onInspect}
            className="flex items-center gap-1 text-xs font-semibold text-white hover:text-cyan-300 px-2 py-1 rounded hover:bg-white/10 transition-colors"
          >
            <span>Inspect in SOC</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

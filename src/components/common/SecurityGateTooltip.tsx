/**
 * CipherGuard 3D - Security Gate Hover Tooltip Components
 * High-assurance hover tooltips for Transaction Status indicators and Audit Log events.
 * Explains specific security gate failures (TLS 1.3, AES-GCM, ECDSA, Nonce/Replay, Ledger).
 * Rendered via createPortal to guarantee zero clipping inside overflow-y-auto containers.
 */

import React, { useState, useRef, useEffect, ReactNode, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { TransactionRecord, AuditLogItem } from '../../types/security';
import {
  getTransactionGateExplanation,
  getAuditLogSecurityContext,
  TransactionGateExplanation,
  AuditLogGateExplanation,
} from '../../utils/securityGateInfo';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Lock,
  Radio,
  FileText,
  ExternalLink,
} from 'lucide-react';

interface TooltipPosition {
  top: number;
  left: number;
  placement: 'top' | 'bottom';
  arrowLeft: number;
}

interface TransactionStatusTooltipProps {
  transaction: TransactionRecord;
  children: ReactNode;
  className?: string;
  preferredPlacement?: 'top' | 'bottom';
}

export const TransactionStatusTooltip: React.FC<TransactionStatusTooltipProps> = ({
  transaction,
  children,
  className = '',
  preferredPlacement = 'top',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | null>(null);

  const explanation = getTransactionGateExplanation(transaction);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipWidth = 340;
    const estimatedHeight = 220;

    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    // Keep at least 12px away from window edges
    left = Math.max(12, Math.min(left, window.innerWidth - tooltipWidth - 12));

    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    const showBelow = preferredPlacement === 'bottom'
      ? spaceBelow > estimatedHeight || spaceBelow > spaceAbove
      : spaceAbove < estimatedHeight && spaceBelow > spaceAbove;

    const top = showBelow ? rect.bottom + 8 : rect.top - 8;
    const arrowLeft = Math.max(16, Math.min(rect.left + rect.width / 2 - left, tooltipWidth - 16));

    setPosition({
      top,
      left,
      placement: showBelow ? 'bottom' : 'top',
      arrowLeft,
    });
  }, [preferredPlacement]);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      calculatePosition();
      setIsVisible(true);
    }, 100);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Recalculate on scroll/resize while visible
  useEffect(() => {
    if (!isVisible) return;
    const handleUpdate = () => calculatePosition();
    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);
    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [isVisible, calculatePosition]);

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
        className={`inline-flex items-center cursor-help ${className}`}
        tabIndex={0}
        aria-label={`Security Status: ${explanation.statusLabel}`}
      >
        {children}
      </div>

      {isVisible && position && typeof document !== 'undefined' &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: `${position.top}px`,
              left: `${position.left}px`,
              transform: position.placement === 'top' ? 'translateY(-100%)' : 'none',
              zIndex: 99999,
            }}
            className="w-[340px] p-3.5 rounded-xl bg-[#080D1A]/95 backdrop-blur-md border border-slate-700/80 shadow-2xl text-xs text-slate-200 pointer-events-none select-none transition-opacity duration-150 animate-in fade-in zoom-in-95"
          >
            {/* Arrow Pin */}
            <div
              style={{ left: `${position.arrowLeft}px` }}
              className={`absolute w-2.5 h-2.5 bg-[#080D1A] border-slate-700/80 rotate-45 transform -translate-x-1/2 ${
                position.placement === 'top'
                  ? 'bottom-[-6px] border-r border-b'
                  : 'top-[-6px] border-l border-t'
              }`}
            />

            {/* Header: Status Badge & Failing Gate */}
            <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-1.5 min-w-0">
                {explanation.isVerified ? (
                  <ShieldCheck className="w-4 h-4 text-[#36D399] shrink-0" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-[#FF4D5A] shrink-0" />
                )}
                <span className="font-heading font-semibold text-white truncate text-[13px]">
                  {explanation.title}
                </span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase border shrink-0 ${explanation.statusBadgeClass}`}
              >
                {explanation.statusLabel}
              </span>
            </div>

            {/* Specific Security Gate Explanation */}
            <div className="space-y-2 mb-3">
              <div className="text-[11px] text-slate-300 leading-snug">
                <span className="text-white font-medium">Diagnostic: </span>
                <span className={explanation.isVerified ? 'text-emerald-300' : 'text-rose-300'}>
                  {explanation.failureReason}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800/80 text-[10px] space-y-1">
                <div className="text-slate-400">
                  <span className="text-slate-300 font-semibold">Defensive Action: </span>
                  {explanation.defenseSummary}
                </div>
                <div className="text-[#35D6C5]">
                  <span className="text-slate-300 font-semibold">Threat Mitigated: </span>
                  {explanation.threatPrevented}
                </div>
              </div>
            </div>

            {/* 5-Gate Sequential Barrier Pipeline Mini Tracker */}
            <div className="space-y-1 pt-1 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>5-GATE CRYPTOGRAPHIC TRAIL</span>
                <span>{explanation.totalLatencyMs}ms total</span>
              </div>
              <div className="grid grid-cols-5 gap-1 font-mono text-[9px] text-center">
                {explanation.gateStatuses.map((g) => {
                  let badge = 'bg-slate-800/80 text-slate-500 border-slate-800';
                  let icon = '—';
                  if (g.status === 'pass') {
                    badge = 'bg-emerald-950/60 text-[#36D399] border-emerald-800/60 font-semibold';
                    icon = '✓';
                  } else if (g.status === 'fail') {
                    badge = 'bg-red-950/90 text-[#FF4D5A] border-red-700/80 font-bold';
                    icon = '✕';
                  }
                  return (
                    <div
                      key={g.gate}
                      className={`p-1 rounded border flex flex-col items-center justify-center ${badge}`}
                      title={`Gate 0${g.gate}: ${g.name} (${g.status.toUpperCase()})`}
                    >
                      <span className="text-[8px] opacity-75">G0{g.gate}</span>
                      <span className="font-bold">{icon}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer with RFC Standards metadata */}
            <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[9px] text-slate-500 font-mono">
              <span>{explanation.rfcStandard || 'ISO/IEC 18033-3'}</span>
              <span className="text-slate-400">Click transaction to inspect proofs</span>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

interface AuditLogStatusTooltipProps {
  log: AuditLogItem;
  matchingTx?: TransactionRecord;
  children: ReactNode;
  className?: string;
  preferredPlacement?: 'top' | 'bottom';
}

export const AuditLogStatusTooltip: React.FC<AuditLogStatusTooltipProps> = ({
  log,
  matchingTx,
  children,
  className = '',
  preferredPlacement = 'top',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | null>(null);

  const context = getAuditLogSecurityContext(log, matchingTx);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipWidth = 320;
    const estimatedHeight = 190;

    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    left = Math.max(12, Math.min(left, window.innerWidth - tooltipWidth - 12));

    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    const showBelow = preferredPlacement === 'bottom'
      ? spaceBelow > estimatedHeight || spaceBelow > spaceAbove
      : spaceAbove < estimatedHeight && spaceBelow > spaceAbove;

    const top = showBelow ? rect.bottom + 8 : rect.top - 8;
    const arrowLeft = Math.max(16, Math.min(rect.left + rect.width / 2 - left, tooltipWidth - 16));

    setPosition({
      top,
      left,
      placement: showBelow ? 'bottom' : 'top',
      arrowLeft,
    });
  }, [preferredPlacement]);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      calculatePosition();
      setIsVisible(true);
    }, 100);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    const handleUpdate = () => calculatePosition();
    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);
    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [isVisible, calculatePosition]);

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
        className={`inline-flex items-center cursor-help ${className}`}
        tabIndex={0}
        aria-label={`Audit Log Details: ${context.levelLabel} ${context.category}`}
      >
        {children}
      </div>

      {isVisible && position && typeof document !== 'undefined' &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: `${position.top}px`,
              left: `${position.left}px`,
              transform: position.placement === 'top' ? 'translateY(-100%)' : 'none',
              zIndex: 99999,
            }}
            className="w-[320px] p-3.5 rounded-xl bg-[#080D1A]/95 backdrop-blur-md border border-slate-700/80 shadow-2xl text-xs text-slate-200 pointer-events-none select-none transition-opacity duration-150 animate-in fade-in zoom-in-95"
          >
            {/* Arrow Pin */}
            <div
              style={{ left: `${position.arrowLeft}px` }}
              className={`absolute w-2.5 h-2.5 bg-[#080D1A] border-slate-700/80 rotate-45 transform -translate-x-1/2 ${
                position.placement === 'top'
                  ? 'bottom-[-6px] border-r border-b'
                  : 'top-[-6px] border-l border-t'
              }`}
            />

            {/* Header: Level & Event Category */}
            <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800">
              <div className="flex items-center gap-1.5">
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider uppercase border ${context.levelBadgeClass}`}>
                  {context.levelLabel}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold uppercase border ${context.categoryBadgeClass}`}>
                  {context.category}
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
            </div>

            {/* Associated Security Gate Info */}
            <div className="space-y-1.5 mb-2.5">
              {context.associatedGateName && (
                <div className="text-[11px] font-semibold text-white flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#35D6C5]" />
                  <span>{context.associatedGateName}</span>
                </div>
              )}
              <p className="text-[11px] text-slate-300 leading-snug">
                {context.securityImpact}
              </p>
            </div>

            {/* Defensive Rule Fired */}
            <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800/80 text-[10px] space-y-1 mb-2">
              <div className="text-slate-400">
                <span className="text-slate-300 font-semibold">Security Action: </span>
                {context.defensiveAction}
              </div>
              {matchingTx && (
                <div className="text-[10px] pt-0.5 border-t border-slate-800/60 flex items-center justify-between">
                  <span className="text-slate-400 font-mono">TX: {matchingTx.id}</span>
                  <span
                    className={`font-mono font-bold uppercase ${
                      matchingTx.result.status === 'verified'
                        ? 'text-[#36D399]'
                        : 'text-[#FF4D5A]'
                    }`}
                  >
                    {matchingTx.result.status.replace('_', ' ')}
                  </span>
                </div>
              )}
            </div>

            {/* Footer with Log ID */}
            <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[9px] text-slate-500 font-mono">
              <span>EVENT BUS #{log.id.slice(-6)}</span>
              <span className="text-[#35D6C5]">Zero-Trust Trail Active</span>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

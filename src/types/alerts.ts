/**
 * CipherGuard 3D - Security Alerts & Toast Types
 */

import { ThreatOrigin } from './security';

export type AlertSeverity = 'critical' | 'high' | 'warning' | 'info';

export type AlertCategory = 
  | 'MITM_ATTACK' 
  | 'SIGNATURE_MISMATCH' 
  | 'REPLAY_ATTACK' 
  | 'TIMESTAMP_EXPIRED' 
  | 'TLS_DEGRADATION' 
  | 'INSUFFICIENT_FUNDS'
  | 'ADVERSARY_PROBE';

export interface SecurityAlert {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  category: AlertCategory;
  timestamp: number;
  transactionId?: string;
  originGeo?: ThreatOrigin;
  defendingGate?: number;
  defendingGateName?: string;
  technicalDetails?: string;
  acknowledged?: boolean;
}

export interface ToastNotification {
  id: string;
  alert: SecurityAlert;
  createdAt: number;
  durationMs?: number;
}

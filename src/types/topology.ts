/**
 * CipherGuard 3D - Network Topology & Real-time WebSocket Types
 */

export type TopologyNodeId = 'customer' | 'gateway' | 'database';

export type NodeHealthStatus = 'healthy' | 'degraded' | 'critical';

export interface TopologyGateStatus {
  gate1Tls: 'pass' | 'fail' | 'checking';
  gate2AesGcm: 'pass' | 'fail' | 'checking';
  gate3Ecdsa: 'pass' | 'fail' | 'checking';
  gate4Nonce: 'pass' | 'fail' | 'checking';
  gate5Ledger: 'pass' | 'fail' | 'checking';
}

export interface TopologyNodeData {
  id: TopologyNodeId;
  name: string;
  subName: string;
  role: string;
  status: NodeHealthStatus;
  healthScore: number; // 0 - 100
  latencyMs: number;
  packetsPerSec: number;
  trafficRateKBps: number;
  packetLossPercent: number;
  ip: string;
  tlsVersion: string;
  cipherSuite: string;
  details: string;
  defenseStatus: string;
  hardwareProfile: string;
  activeSessions: number;
  cpuLoadPercent?: number;
  memoryUsageMB?: number;
  hsmStatus?: string;
  connectionPool?: string;
  gates?: TopologyGateStatus;
  recentEvents: Array<{
    id: string;
    timestamp: number;
    message: string;
    level: 'info' | 'warn' | 'critical';
  }>;
}

export interface LiveTrafficLink {
  id: string;
  from: TopologyNodeId;
  to: TopologyNodeId;
  label: string;
  protocol: string;
  status: NodeHealthStatus;
  throughputMbps: number;
  rttMs: number;
  inFlightPackets: number;
  packetLossPercent: number;
}

export interface WebSocketTelemetryFrame {
  type: 'topology_tick' | 'packet_event' | 'alert_event' | 'pong';
  timestamp: number;
  nodes: Record<TopologyNodeId, TopologyNodeData>;
  links: {
    customerToGateway: LiveTrafficLink;
    gatewayToDatabase: LiveTrafficLink;
  };
  metrics: {
    websocketConnected: boolean;
    packetRate: number;
    totalPacketsProcessed: number;
    activeThreatsCount: number;
    avgLatencyMs: number;
    currentThroughputMbps: number;
  };
}

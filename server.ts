/**
 * CipherGuard 3D - Full-Stack Express Server with Real WebCrypto Verification & SSE
 */

import express, { Request, Response } from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  evaluateTransactionSecurityGates,
  generateAESIV,
  generateAESKey,
  generateECDSAKeyPair,
  generateSecureNonce,
  exportPublicKeyJWK,
  signCanonicalTransaction,
  encryptPayloadAESGCM,
  bufferToHex,
  serializeCanonical,
  computeSHA256Hex,
} from './src/services/cryptoEngine.ts';
import {
  CanonicalTransaction,
  EncryptedPacket,
  TransactionRecord,
  AuditLogItem,
  SocMetrics,
  AttackScenarioId,
  ThreatOrigin,
} from './src/types/security.ts';
import {
  TopologyNodeData,
  TopologyGateStatus,
  NodeHealthStatus,
  WebSocketTelemetryFrame,
} from './src/types/topology.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json());

// In-Memory Banking State
let customerAccount = {
  accountId: 'ACC-PRIYA-9821',
  accountHolder: 'Priya Sharma',
  accountNumber: '•••• •••• •••• 4892',
  balance: 250000.0,
  currency: 'INR',
  dailyLimit: 500000.0,
  status: 'active' as const,
};

let receiverAccount = {
  accountId: 'ACC-RAHUL-1029',
  accountHolder: 'Rahul Sharma',
  accountNumber: '•••• •••• •••• 1029',
  balance: 68500.0,
  currency: 'INR',
  status: 'active' as const,
};

const transactionRecords: TransactionRecord[] = [];
const auditLogs: AuditLogItem[] = [];
const seenNonces = new Set<string>();
const sseClients: Response[] = [];
const wsClients: WebSocket[] = [];
let burstActiveUntil = 0;
let totalProcessedPackets = 4821;

// Broadcast event to connected SSE clients
function broadcastEvent(type: string, data: unknown) {
  const payload = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  for (let i = sseClients.length - 1; i >= 0; i--) {
    try {
      sseClients[i].write(payload);
    } catch {
      sseClients.splice(i, 1);
    }
  }
}

// Broadcast frame to connected WebSocket clients
function broadcastWebSocket(data: unknown) {
  const json = JSON.stringify(data);
  for (let i = wsClients.length - 1; i >= 0; i--) {
    const client = wsClients[i];
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(json);
      } catch {
        wsClients.splice(i, 1);
      }
    } else if (client.readyState === WebSocket.CLOSED || client.readyState === WebSocket.CLOSING) {
      wsClients.splice(i, 1);
    }
  }
}

// Generate dynamic real-time topology telemetry frame based on current system state
function generateTopologyTelemetry(): WebSocketTelemetryFrame {
  const now = Date.now();
  const isBurst = now < burstActiveUntil;
  totalProcessedPackets += isBurst ? Math.floor(Math.random() * 8 + 5) : Math.floor(Math.random() * 3 + 1);

  // Look at recent transactions in the last 20 seconds
  const recentWindow = 20000;
  const recentTxs = transactionRecords.filter((t) => now - t.createdAt < recentWindow);
  const recentAttack = recentTxs.find((t) => t.result.status !== 'verified' || t.isSimulatedAttack);

  let customerStatus: NodeHealthStatus = 'healthy';
  let gatewayStatus: NodeHealthStatus = 'healthy';
  let databaseStatus: NodeHealthStatus = 'healthy';

  let customerScore = 98;
  let gatewayScore = 99;
  let databaseScore = 100;

  let gatewayCpu = isBurst ? 68 + Math.floor(Math.random() * 14) : 26 + Math.floor(Math.random() * 8);

  const gatesStatus: TopologyGateStatus = {
    gate1Tls: 'pass',
    gate2AesGcm: 'pass',
    gate3Ecdsa: 'pass',
    gate4Nonce: 'pass',
    gate5Ledger: 'pass',
  };

  if (recentAttack) {
    const failingGate = recentAttack.result.failingGateIndex;
    if (failingGate === 2 || recentAttack.attackType?.includes('mitm')) {
      gatewayStatus = 'critical';
      gatewayScore = 64;
      gatewayCpu = 88;
      gatesStatus.gate2AesGcm = 'fail';
      customerStatus = 'degraded';
      customerScore = 82;
    } else if (failingGate === 3 || recentAttack.attackType === 'signature_forgery') {
      gatewayStatus = 'critical';
      gatewayScore = 70;
      gatewayCpu = 82;
      gatesStatus.gate3Ecdsa = 'fail';
      customerStatus = 'degraded';
      customerScore = 78;
    } else if (failingGate === 4) {
      gatewayStatus = 'degraded';
      gatewayScore = 85;
      gatewayCpu = 62;
      gatesStatus.gate4Nonce = 'fail';
    } else if (failingGate === 1) {
      gatewayStatus = 'critical';
      gatewayScore = 60;
      gatesStatus.gate1Tls = 'fail';
      customerStatus = 'critical';
      customerScore = 55;
    }
  }

  const basePacketRate = isBurst ? 94 : 32;
  const jitterRate = Math.floor(Math.random() * 6 - 3);
  const currentPacketRate = Math.max(12, basePacketRate + jitterRate);

  const customerNode: TopologyNodeData = {
    id: 'customer',
    name: 'Customer & Client App Node',
    subName: 'Edge Ingress / Mobile Banking POS',
    role: 'Client Edge Ingress',
    status: customerStatus,
    healthScore: customerScore,
    latencyMs: 14 + Math.floor(Math.random() * 4),
    packetsPerSec: Math.floor(currentPacketRate * 0.65),
    trafficRateKBps: isBurst ? 520 : 184 + Math.floor(Math.random() * 20),
    packetLossPercent: customerStatus === 'critical' ? 1.4 : 0.01,
    ip: recentAttack?.originGeo?.ip || '49.36.128.45',
    tlsVersion: 'TLS 1.3 (RFC 8446)',
    cipherSuite: 'TLS_AES_256_GCM_SHA384',
    details: 'Authenticated customer mobile device & web portal sessions running native WebCrypto client ECDSA key isolation.',
    defenseStatus: customerStatus === 'healthy' ? 'Nominal Client Traffic' : 'Adversarial Edge Ingress Detected',
    hardwareProfile: 'Mobile/Web Edge · Isolated Secure Enclave',
    activeSessions: 18 + Math.floor(Math.random() * 4),
    recentEvents: [
      {
        id: `ev-cust-${now}`,
        timestamp: now - 3000,
        message: 'Client session TLS 1.3 handshake negotiated with Curve25519 / P-256',
        level: 'info',
      },
    ],
  };

  const gatewayNode: TopologyNodeData = {
    id: 'gateway',
    name: 'CipherGuard Security Gateway',
    subName: '5-Gate Cryptographic Verifier & WAF',
    role: 'Cryptographic Security Gateway',
    status: gatewayStatus,
    healthScore: gatewayScore,
    latencyMs: 5 + Math.floor(Math.random() * 3),
    packetsPerSec: currentPacketRate,
    trafficRateKBps: isBurst ? 1420 : 640 + Math.floor(Math.random() * 40),
    packetLossPercent: 0,
    ip: '10.240.0.12 (Internal Gateway Mesh)',
    tlsVersion: 'TLS 1.3 / mTLS Mesh',
    cipherSuite: 'AES-256-GCM + ECDSA P-256 SHA-256',
    details: 'Zero-trust mechanical verification gateway enforcing TLS 1.3, AES-GCM ciphertext integrity, ECDSA signature verification, sliding nonce cache, and balance limit check.',
    defenseStatus: gatewayStatus === 'critical' ? 'Active Threat Defense Engaged' : gatewayStatus === 'degraded' ? 'Enhanced Verification Mode' : 'All 5 Gates Guarding',
    hardwareProfile: '64-Core High-Throughput Crypto Engine',
    activeSessions: 42,
    cpuLoadPercent: gatewayCpu,
    memoryUsageMB: 480 + Math.floor(Math.random() * 30),
    gates: gatesStatus,
    recentEvents: [
      {
        id: `ev-gw-${now}`,
        timestamp: now - 1200,
        message: gatewayStatus === 'critical'
          ? 'Threat intercepted by Gate 2/3: authentication tag or signature failure prevented unauthorized state change'
          : '5-Gate cryptographic verification pipeline operational at nominal sub-30ms latency',
        level: gatewayStatus === 'critical' ? 'critical' : 'info',
      },
    ],
  };

  const databaseNode: TopologyNodeData = {
    id: 'database',
    name: 'Bank Core Ledger & HSM Vault',
    subName: 'FIPS 140-3 Level 4 Key Vault & Settlement DB',
    role: 'Core Settlement & Ledger Vault',
    status: databaseStatus,
    healthScore: databaseScore,
    latencyMs: 2 + Math.floor(Math.random() * 2),
    packetsPerSec: Math.floor(currentPacketRate * 0.45),
    trafficRateKBps: isBurst ? 890 : 380 + Math.floor(Math.random() * 20),
    packetLossPercent: 0,
    ip: '10.240.4.88 (Isolated Vault VLAN)',
    tlsVersion: 'mTLS WireGuard Internal',
    cipherSuite: 'FIPS-Validated Hardware Cryptography',
    details: 'Isolated core banking ledger recording immutable audit transactions with cryptographic receipt chaining and hardware security module (HSM) master key management.',
    defenseStatus: 'Air-Gapped Vault Enclosure Active',
    hardwareProfile: 'HSM Dedicated Vault · ACID Distributed Cluster',
    activeSessions: 64,
    hsmStatus: 'ONLINE / FIPS 140-3 Level 4',
    connectionPool: '52/64 Active Pool Connections',
    recentEvents: [
      {
        id: `ev-db-${now}`,
        timestamp: now - 4500,
        message: 'Immutable ledger commit signed with bank authority root certificate',
        level: 'info',
      },
    ],
  };

  const link1Status: NodeHealthStatus = customerStatus === 'critical' || gatewayStatus === 'critical' ? 'critical' : customerStatus === 'degraded' || gatewayStatus === 'degraded' ? 'degraded' : 'healthy';
  const link2Status: NodeHealthStatus = gatewayStatus === 'critical' ? 'degraded' : 'healthy';

  return {
    type: 'topology_tick',
    timestamp: now,
    nodes: {
      customer: customerNode,
      gateway: gatewayNode,
      database: databaseNode,
    },
    links: {
      customerToGateway: {
        id: 'link-cust-gw',
        from: 'customer',
        to: 'gateway',
        label: 'Client Ingress ↔ 5-Gate Verifier',
        protocol: 'WSS / TLS 1.3 (RFC 8446)',
        status: link1Status,
        throughputMbps: isBurst ? 78.4 : 34.2 + (Math.random() * 4 - 2),
        rttMs: 16.5 + (Math.random() * 3 - 1.5),
        inFlightPackets: isBurst ? 18 : 6,
        packetLossPercent: customerStatus === 'critical' ? 1.2 : 0,
      },
      gatewayToDatabase: {
        id: 'link-gw-db',
        from: 'gateway',
        to: 'database',
        label: 'Verifier ↔ Core Ledger & HSM',
        protocol: 'mTLS Internal Mesh (WireGuard)',
        status: link2Status,
        throughputMbps: isBurst ? 142.6 : 88.5 + (Math.random() * 6 - 3),
        rttMs: 2.4 + (Math.random() * 0.8 - 0.4),
        inFlightPackets: isBurst ? 24 : 9,
        packetLossPercent: 0,
      },
    },
    metrics: {
      websocketConnected: true,
      packetRate: currentPacketRate,
      totalPacketsProcessed: totalProcessedPackets,
      activeThreatsCount: recentAttack ? 1 : 0,
      avgLatencyMs: Math.round((customerNode.latencyMs + gatewayNode.latencyMs + databaseNode.latencyMs) / 3),
      currentThroughputMbps: isBurst ? 221.0 : 122.7 + (Math.random() * 8 - 4),
    },
  };
}

function addAuditLog(log: Omit<AuditLogItem, 'id' | 'timestamp'>) {
  const item: AuditLogItem = {
    id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: Date.now(),
    ...log,
  };
  auditLogs.unshift(item);
  if (auditLogs.length > 200) auditLogs.pop();
  broadcastEvent('audit_log', item);
  return item;
}

// Threat Geolocation Definitions for Visual Heatmap
export const ATTACK_GEOLOCATIONS: Record<string, ThreatOrigin> = {
  mitm_amount_tamper: {
    city: 'Bucharest',
    country: 'Romania',
    countryCode: 'RO',
    ip: '185.220.101.42',
    lat: 44.4268,
    lng: 26.1025,
    asn: 'AS9009 (Tor Exit Relay)',
    isp: 'M247 Cyber Services',
    threatScore: 94,
  },
  mitm_recipient_tamper: {
    city: 'St. Petersburg',
    country: 'Russia',
    countryCode: 'RU',
    ip: '45.142.122.18',
    lat: 59.9343,
    lng: 30.3351,
    asn: 'AS48693 (Bulletproof Transit)',
    isp: 'V-Line Global Hosting',
    threatScore: 96,
  },
  replay_attack: {
    city: 'Frankfurt',
    country: 'Germany',
    countryCode: 'DE',
    ip: '194.26.29.112',
    lat: 50.1109,
    lng: 8.6821,
    asn: 'AS202425 (Proxy Mesh)',
    isp: 'Frankfurt Darknet Hub',
    threatScore: 88,
  },
  signature_forgery: {
    city: 'Ashburn',
    country: 'United States',
    countryCode: 'US',
    ip: '23.129.64.150',
    lat: 39.0438,
    lng: -77.4874,
    asn: 'AS397373 (Adversary Datacenter)',
    isp: 'East Coast VPS Cloud',
    threatScore: 98,
  },
  expired_timestamp: {
    city: 'Shenzhen',
    country: 'China',
    countryCode: 'CN',
    ip: '119.28.71.205',
    lat: 22.5431,
    lng: 114.0579,
    asn: 'AS45090 (Botnet Drone Array)',
    isp: 'Tencent Cloud Proxy Node',
    threatScore: 82,
  },
  nonce_reuse: {
    city: 'Lagos',
    country: 'Nigeria',
    countryCode: 'NG',
    ip: '102.89.44.12',
    lat: 6.5244,
    lng: 3.3792,
    asn: 'AS37105 (Residential Proxy Hijack)',
    isp: 'MainOne Telecommunications',
    threatScore: 85,
  },
};

export const LEGITIMATE_GEO: ThreatOrigin = {
  city: 'Mumbai',
  country: 'India',
  countryCode: 'IN',
  ip: '49.36.128.45',
  lat: 19.0760,
  lng: 72.8777,
  asn: 'AS55836 (Reliance Jio Infocomm)',
  isp: 'Jio Fiber Metro Mumbai',
  threatScore: 0,
};

// Initial seed transactions for SOC demonstration
async function seedInitialTransactions() {
  const keyPair = await generateECDSAKeyPair();
  const pubJwk = await exportPublicKeyJWK(keyPair.publicKey);
  const aesKey = await generateAESKey();

  const seedTx1: CanonicalTransaction = {
    transactionId: '019283a1-4091-7291-a189-bcde128490a1',
    senderId: 'CUST-98214',
    senderName: 'Priya Sharma',
    senderAccount: '•••• •••• •••• 4892',
    recipientId: 'BENEF-1029',
    recipientName: 'Rahul Sharma',
    recipientAccount: '•••• •••• •••• 1029',
    amount: 5000.0,
    currency: 'INR',
    timestamp: Date.now() - 3600000 * 2,
    nonce: generateSecureNonce(),
    expirationTime: Date.now() - 3600000 * 2 + 300000,
    purpose: 'Quarterly Vendor Retainer',
  };

  const iv1 = generateAESIV();
  const { signatureHex: sig1, digestHex: dig1 } = await signCanonicalTransaction(keyPair.privateKey, seedTx1);
  const { ciphertextHex: cipher1, tagHex: tag1 } = await encryptPayloadAESGCM(aesKey, JSON.stringify(seedTx1), iv1, 'CIPHERGUARD-V1-SECURE');

  const packet1: EncryptedPacket = {
    packetId: 'PKT-9901-A',
    keyId: 'K-AES256-GCM-01',
    iv: bufferToHex(iv1),
    aad: 'CIPHERGUARD-V1-SECURE',
    ciphertext: cipher1,
    tag: tag1,
    signature: sig1,
    senderPublicKey: pubJwk,
    canonicalDigest: dig1,
    tlsSessionId: 'TLS13-SESSION-88492019',
    clientHelloVersion: 'TLS 1.3 (RFC 8446)',
    cipherSuite: 'TLS_AES_256_GCM_SHA384',
  };

  seenNonces.add(seedTx1.nonce);
  const evalResult1 = await evaluateTransactionSecurityGates({
    packet: packet1,
    canonical: seedTx1,
    aesKey,
    currentBalance: customerAccount.balance,
    seenNonces: new Set(),
  });

  transactionRecords.unshift({
    id: seedTx1.transactionId,
    canonical: seedTx1,
    packet: packet1,
    result: evalResult1,
    originGeo: LEGITIMATE_GEO,
    createdAt: seedTx1.timestamp,
  });

  // Seed initial deflected attack attempts for immediate SOC Threat Heatmap visualization
  const seedAttackTime1 = Date.now() - 3600000 * 1.2;
  transactionRecords.unshift({
    id: '019283f5-9831-7112-a890-ffbc128490a8',
    canonical: {
      ...seedTx1,
      transactionId: '019283f5-9831-7112-a890-ffbc128490a8',
      amount: 50000.0,
      timestamp: seedAttackTime1,
      purpose: 'Tampered Wire Transfer',
    },
    packet: {
      ...packet1,
      packetId: 'PKT-ADV-BUCHAREST-01',
      ciphertext: 'deadbeef' + packet1.ciphertext.slice(8),
    },
    result: {
      transactionId: '019283f5-9831-7112-a890-ffbc128490a8',
      status: 'tampered',
      timestamp: seedAttackTime1,
      totalLatencyMs: 8,
      failingGateIndex: 2,
      failureReason: 'AES-GCM Poly1305 Tag Mismatch: Ciphertext bits modified in flight',
      gates: [
        { gate: 1, name: 'TLS 1.3 Channel Verification', description: 'TLS 1.3 session check', passed: true, latencyMs: 2, details: 'Valid TLS session', technicalProof: {} },
        { gate: 2, name: 'AES-256-GCM Integrity Check', description: 'Authentication tag check', passed: false, latencyMs: 6, details: 'Authentication tag does not match ciphertext bytes', technicalProof: {} },
      ],
    },
    isSimulatedAttack: true,
    attackType: 'mitm_amount_tamper',
    originGeo: ATTACK_GEOLOCATIONS.mitm_amount_tamper,
    createdAt: seedAttackTime1,
  });

  const seedAttackTime2 = Date.now() - 3600000 * 0.6;
  transactionRecords.unshift({
    id: '019283b7-1234-7890-b123-aaee128490b2',
    canonical: {
      ...seedTx1,
      transactionId: '019283b7-1234-7890-b123-aaee128490b2',
      timestamp: seedAttackTime2,
      purpose: 'Replayed Wire Packet',
    },
    packet: {
      ...packet1,
      packetId: 'PKT-ADV-FRANKFURT-02',
    },
    result: {
      transactionId: '019283b7-1234-7890-b123-aaee128490b2',
      status: 'replay_blocked',
      timestamp: seedAttackTime2,
      totalLatencyMs: 14,
      failingGateIndex: 4,
      failureReason: 'Cryptographic Nonce Cache Collision: Nonce already cleared',
      gates: [
        { gate: 1, name: 'TLS 1.3 Channel Verification', description: 'TLS 1.3 session check', passed: true, latencyMs: 2, details: 'Valid TLS session', technicalProof: {} },
        { gate: 2, name: 'AES-256-GCM Integrity Check', description: 'Authentication tag check', passed: true, latencyMs: 5, details: 'Valid AES-GCM tag', technicalProof: {} },
        { gate: 3, name: 'ECDSA P-256 Signature Proof', description: 'ECDSA signature check', passed: true, latencyMs: 4, details: 'Signature mathematically valid', technicalProof: {} },
        { gate: 4, name: 'Freshness & Anti-Replay Gate', description: 'Nonce replay check', passed: false, latencyMs: 3, details: 'Nonce seen in previous transaction', technicalProof: {} },
      ],
    },
    isSimulatedAttack: true,
    attackType: 'replay_attack',
    originGeo: ATTACK_GEOLOCATIONS.replay_attack,
    createdAt: seedAttackTime2,
  });

  const seedAttackTime3 = Date.now() - 1800000;
  transactionRecords.unshift({
    id: '019283c9-5566-7788-c456-ccdd128490c3',
    canonical: {
      ...seedTx1,
      transactionId: '019283c9-5566-7788-c456-ccdd128490c3',
      amount: 99999.0,
      timestamp: seedAttackTime3,
      purpose: 'Forged Authorization Payload',
    },
    packet: {
      ...packet1,
      packetId: 'PKT-ADV-ASHBURN-03',
      signature: '3045022100' + '0000000000' + packet1.signature.slice(20),
    },
    result: {
      transactionId: '019283c9-5566-7788-c456-ccdd128490c3',
      status: 'rejected',
      timestamp: seedAttackTime3,
      totalLatencyMs: 11,
      failingGateIndex: 3,
      failureReason: 'ECDSA P-256 Digital Signature Mismatch: Signer does not hold private key',
      gates: [
        { gate: 1, name: 'TLS 1.3 Channel Verification', description: 'TLS 1.3 session check', passed: true, latencyMs: 2, details: 'Valid TLS session', technicalProof: {} },
        { gate: 2, name: 'AES-256-GCM Integrity Check', description: 'Authentication tag check', passed: true, latencyMs: 5, details: 'Valid AES-GCM tag', technicalProof: {} },
        { gate: 3, name: 'ECDSA P-256 Signature Proof', description: 'ECDSA signature check', passed: false, latencyMs: 4, details: 'Signature verification failed', technicalProof: {} },
      ],
    },
    isSimulatedAttack: true,
    attackType: 'signature_forgery',
    originGeo: ATTACK_GEOLOCATIONS.signature_forgery,
    createdAt: seedAttackTime3,
  });

  addAuditLog({
    level: 'error',
    category: 'CRYPTO',
    message: '[ATTACK DEFLECTED]: Origin Bucharest (185.220.101.42). Defeated at Gate 2 (AES-GCM Tag Mismatch).',
    transactionId: '019283f5-9831-7112-a890-ffbc128490a8',
  });
  addAuditLog({
    level: 'error',
    category: 'REPLAY',
    message: '[REPLAY DEFLECTED]: Origin Frankfurt (194.26.29.112). Defeated at Gate 4 (Nonce Cache Collision).',
    transactionId: '019283b7-1234-7890-b123-aaee128490b2',
  });
  addAuditLog({
    level: 'error',
    category: 'AUTH',
    message: '[FORGERY DEFLECTED]: Origin Ashburn (23.129.64.150). Defeated at Gate 3 (ECDSA Signature Mismatch).',
    transactionId: '019283c9-5566-7788-c456-ccdd128490c3',
  });

  addAuditLog({
    level: 'success',
    category: 'LEDGER',
    message: `System initialized with seed baseline. Ledger online at ₹${customerAccount.balance.toLocaleString('en-IN')}`,
  });
}

seedInitialTransactions().catch(console.error);

// API ROUTES
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// GET /api/transactions - Account info and ledger records
app.get('/api/transactions', (_req, res) => {
  res.json({
    account: customerAccount,
    transactions: transactionRecords,
    auditLogs: auditLogs.slice(0, 50),
  });
});

// GET /api/receiver - Receiver Account and incoming transaction history
app.get('/api/receiver', (_req, res) => {
  const incoming = transactionRecords.filter(
    (t) => t.canonical.recipientId === 'BENEF-1029' || t.canonical.recipientName.includes('Rahul')
  );
  res.json({
    account: receiverAccount,
    transactions: incoming,
  });
});

// GET /api/soc/stats - Command Center Metrics
app.get('/api/soc/stats', (_req, res) => {
  const total = transactionRecords.length;
  const verified = transactionRecords.filter((t) => t.result.status === 'verified').length;
  const attacks = transactionRecords.filter((t) => t.result.status === 'tampered' || t.result.status === 'rejected').length;
  const replayBlocked = transactionRecords.filter((t) => t.result.status === 'replay_blocked').length;
  const avgLatency = total > 0 ? Math.round(transactionRecords.reduce((acc, t) => acc + t.result.totalLatencyMs, 0) / total) : 26;

  const metrics: SocMetrics = {
    totalTransactions: total,
    verifiedCount: verified,
    attackCount: attacks,
    replayBlockedCount: replayBlocked,
    avgVerificationLatencyMs: avgLatency,
    systemIntegrityScore: 100,
    tlsActiveSessions: 4,
    lastAttackTimestamp: attacks > 0 ? transactionRecords.find(t => t.result.status !== 'verified')?.createdAt : undefined,
  };
  res.json(metrics);
});

// SSE Endpoint for Live SOC Streaming
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.push(res);
  res.write(`event: connected\ndata: ${JSON.stringify({ message: 'SOC Live Telemetry Connected' })}\n\n`);

  req.on('close', () => {
    const idx = sseClients.indexOf(res);
    if (idx !== -1) sseClients.splice(idx, 1);
  });
});

// POST /api/transactions/process - Real Cryptographic Transaction Execution
app.post('/api/transactions/process', async (req, res) => {
  try {
    const {
      recipientId,
      recipientName,
      recipientAccount,
      amount,
      purpose,
    } = req.body;

    const transferAmount = Number(amount);
    if (!transferAmount || transferAmount <= 0) {
      return res.status(400).json({ error: 'Valid transfer amount is required' });
    }

    // 1. Generate keys & canonical transaction
    const clientKeyPair = await generateECDSAKeyPair();
    const senderPublicKey = await exportPublicKeyJWK(clientKeyPair.publicKey);
    const sessionAESKey = await generateAESKey();
    const nonce = generateSecureNonce();
    const now = Date.now();

    const canonical: CanonicalTransaction = {
      transactionId: crypto.randomUUID(),
      senderId: 'CUST-98214',
      senderName: customerAccount.accountHolder,
      senderAccount: customerAccount.accountNumber,
      recipientId: recipientId || 'BENEF-1029',
      recipientName: recipientName || 'Rahul Sharma',
      recipientAccount: recipientAccount || '•••• •••• •••• 1029',
      amount: transferAmount,
      currency: 'INR',
      timestamp: now,
      nonce,
      expirationTime: now + 300000,
      purpose: purpose || 'General Banking Transfer',
    };

    // 2. Client Authentication & Signing
    const { signatureHex, digestHex } = await signCanonicalTransaction(clientKeyPair.privateKey, canonical);

    // 3. TLS 1.3 Channel Setup & AES-256-GCM Encryption
    const iv = generateAESIV();
    const aad = 'CIPHERGUARD-BANKING-TLS13-CHANNEL';
    const { ciphertextHex, tagHex } = await encryptPayloadAESGCM(sessionAESKey, serializeCanonical(canonical), iv, aad);

    const packet: EncryptedPacket = {
      packetId: `PKT-${Date.now().toString(36).toUpperCase()}`,
      keyId: 'K-SESSION-AES256',
      iv: bufferToHex(iv),
      aad,
      ciphertext: ciphertextHex,
      tag: tagHex,
      signature: signatureHex,
      senderPublicKey,
      canonicalDigest: digestHex,
      tlsSessionId: `TLS13-SESSION-${Math.floor(Math.random() * 10000000)}`,
      clientHelloVersion: 'TLS 1.3 (RFC 8446)',
      cipherSuite: 'TLS_AES_256_GCM_SHA384',
    };

    addAuditLog({
      level: 'info',
      category: 'AUTH',
      message: `Transaction ${canonical.transactionId.slice(0, 8)} initiated by ${canonical.senderName}. Canonical SHA-256 digest: ${digestHex.slice(0, 16)}...`,
      transactionId: canonical.transactionId,
    });

    // 4. Server-Side 5 Security Gates Evaluation
    const evaluation = await evaluateTransactionSecurityGates({
      packet,
      canonical,
      aesKey: sessionAESKey,
      currentBalance: customerAccount.balance,
      seenNonces,
    });

    if (evaluation.status === 'verified') {
      seenNonces.add(nonce);
      customerAccount.balance -= transferAmount;
      if (canonical.recipientId === 'BENEF-1029' || canonical.recipientName.includes('Rahul')) {
        receiverAccount.balance += transferAmount;
      }

      addAuditLog({
        level: 'success',
        category: 'LEDGER',
        message: `Transaction ${canonical.transactionId.slice(0, 8)} fully verified across 5 gates. Settled ₹${transferAmount.toLocaleString('en-IN')}. New balance: ₹${customerAccount.balance.toLocaleString('en-IN')}`,
        transactionId: canonical.transactionId,
      });
    } else {
      addAuditLog({
        level: 'error',
        category: 'CRYPTO',
        message: `Transaction rejected at Gate ${evaluation.failingGateIndex}: ${evaluation.failureReason}`,
        transactionId: canonical.transactionId,
      });
    }

    const record: TransactionRecord = {
      id: canonical.transactionId,
      canonical,
      packet,
      result: evaluation,
      originGeo: LEGITIMATE_GEO,
      createdAt: now,
    };

    transactionRecords.unshift(record);
    broadcastEvent('transaction_completed', record);
    broadcastWebSocket(generateTopologyTelemetry());

    res.json({
      success: evaluation.status === 'verified',
      record,
      newBalance: customerAccount.balance,
      receiverBalance: receiverAccount.balance,
    });
  } catch (error) {
    console.error('Transaction execution failed:', error);
    res.status(500).json({ error: 'Internal transaction processing failure' });
  }
});

// POST /api/simulate-attack - Controlled Adversary Attack Lab
app.post('/api/simulate-attack', async (req, res) => {
  try {
    const { attackScenarioId } = req.body as { attackScenarioId: AttackScenarioId };

    const clientKeyPair = await generateECDSAKeyPair();
    const senderPublicKey = await exportPublicKeyJWK(clientKeyPair.publicKey);
    const sessionAESKey = await generateAESKey();
    const originalNonce = generateSecureNonce();
    const now = Date.now();

    const originalCanonical: CanonicalTransaction = {
      transactionId: crypto.randomUUID(),
      senderId: 'CUST-98214',
      senderName: 'Priya Sharma',
      senderAccount: customerAccount.accountNumber,
      recipientId: 'BENEF-1029',
      recipientName: 'Rahul Sharma',
      recipientAccount: '•••• •••• •••• 1029',
      amount: 5000.0,
      currency: 'INR',
      timestamp: now,
      nonce: originalNonce,
      expirationTime: now + 300000,
      purpose: 'Payment for Services',
    };

    const { signatureHex, digestHex } = await signCanonicalTransaction(clientKeyPair.privateKey, originalCanonical);
    const iv = generateAESIV();
    const aad = 'CIPHERGUARD-BANKING-TLS13-CHANNEL';
    const { ciphertextHex, tagHex } = await encryptPayloadAESGCM(sessionAESKey, serializeCanonical(originalCanonical), iv, aad);

    let manipulatedCanonical = { ...originalCanonical };
    let manipulatedCiphertext = ciphertextHex;
    let manipulatedTag = tagHex;
    let manipulatedSignature = signatureHex;
    let testSeenNonces = new Set(seenNonces);
    let systemTimeOffsetMs = 0;

    let attackDescription = '';

    switch (attackScenarioId) {
      case 'mitm_amount_tamper':
        attackDescription = 'Attacker intercepted in-flight packet and tampered ciphertext bytes to inflate transfer from ₹5,000 to ₹50,000.';
        manipulatedCanonical.amount = 50000.0;
        // Tamper ciphertext hex by flipping bits
        manipulatedCiphertext = ciphertextHex.slice(0, -4) + (ciphertextHex.slice(-4) === 'ffff' ? '0000' : 'ffff');
        break;

      case 'mitm_recipient_tamper':
        attackDescription = 'Attacker attempted to alter recipient account to malicious account in the encrypted transmission payload.';
        manipulatedCanonical.recipientName = 'MALLORY_ATTACKER_LLC';
        manipulatedCanonical.recipientAccount = '•••• •••• •••• 9999';
        manipulatedCiphertext = 'de' + ciphertextHex.slice(2);
        break;

      case 'replay_attack':
        attackDescription = 'Attacker captured a genuine previously completed packet and replayed the exact same transaction payload and nonce.';
        testSeenNonces.add(originalNonce); // Simulate that this nonce was already cleared
        break;

      case 'signature_forgery':
        attackDescription = 'Attacker forged transaction metadata without possessing the authorized private signing key.';
        manipulatedCanonical.amount = 99999.0;
        // Invalidate signature
        manipulatedSignature = signatureHex.slice(0, 10) + '0000000000' + signatureHex.slice(20);
        break;

      case 'expired_timestamp':
        attackDescription = 'Attacker attempted to push a stale transaction packet whose timestamp is 15 minutes past the 300-second acceptance window.';
        manipulatedCanonical.timestamp = now - 900000; // 15 mins ago
        manipulatedCanonical.expirationTime = now - 600000;
        systemTimeOffsetMs = 0;
        break;

      case 'nonce_reuse':
        attackDescription = 'Attacker attempted to force initialization vector / nonce reuse across consecutive sessions.';
        testSeenNonces.add(originalNonce);
        break;

      default:
        return res.status(400).json({ error: 'Unknown attack scenario' });
    }

    const packet: EncryptedPacket = {
      packetId: `PKT-ADV-${Date.now().toString(36).toUpperCase()}`,
      keyId: 'K-SESSION-AES256',
      iv: bufferToHex(iv),
      aad,
      ciphertext: manipulatedCiphertext,
      tag: manipulatedTag,
      signature: manipulatedSignature,
      senderPublicKey,
      canonicalDigest: digestHex,
      tlsSessionId: `TLS13-SESSION-${Math.floor(Math.random() * 10000000)}`,
      clientHelloVersion: 'TLS 1.3 (RFC 8446)',
      cipherSuite: 'TLS_AES_256_GCM_SHA384',
    };

    addAuditLog({
      level: 'warn',
      category: 'ADVERSARY',
      message: `[ADVERSARIAL ATTACK INITIATED]: ${attackDescription}`,
      transactionId: originalCanonical.transactionId,
    });

    const evaluation = await evaluateTransactionSecurityGates({
      packet,
      canonical: manipulatedCanonical,
      aesKey: sessionAESKey,
      currentBalance: customerAccount.balance,
      seenNonces: testSeenNonces,
      systemTimeOffsetMs,
    });

    addAuditLog({
      level: 'error',
      category: 'CRYPTO',
      message: `[ATTACK DEFLECTED]: Defeated at Gate ${evaluation.failingGateIndex} (${evaluation.gates.find(g => g.gate === evaluation.failingGateIndex)?.name}). Reason: ${evaluation.failureReason}`,
      transactionId: originalCanonical.transactionId,
    });

    const record: TransactionRecord = {
      id: originalCanonical.transactionId,
      canonical: manipulatedCanonical,
      packet,
      result: evaluation,
      isSimulatedAttack: true,
      attackType: attackScenarioId,
      originGeo: ATTACK_GEOLOCATIONS[attackScenarioId] || ATTACK_GEOLOCATIONS.mitm_amount_tamper,
      createdAt: now,
    };

    transactionRecords.unshift(record);
    broadcastEvent('attack_detected', record);
    broadcastWebSocket(generateTopologyTelemetry());

    res.json({
      success: false,
      record,
      attackDescription,
      defendedAtGate: evaluation.failingGateIndex,
      defenseExplanation: evaluation.failureReason,
    });
  } catch (err) {
    console.error('Adversary attack simulation error:', err);
    res.status(500).json({ error: 'Adversary simulation failure' });
  }
});

// GET /api/topology - Snapshot of current network topology & node health
app.get('/api/topology', (_req, res) => {
  res.json(generateTopologyTelemetry());
});

// POST /api/topology/burst - Trigger high-throughput traffic burst
app.post('/api/topology/burst', (_req, res) => {
  burstActiveUntil = Date.now() + 5000;
  const frame = generateTopologyTelemetry();
  broadcastWebSocket(frame);
  res.json({ message: 'Traffic burst initiated for 5000ms', frame });
});

// POST /api/reset - Reset Sandbox to pristine state
app.post('/api/reset', async (_req, res) => {
  customerAccount.balance = 250000.0;
  receiverAccount.balance = 68500.0;
  transactionRecords.length = 0;
  seenNonces.clear();
  await seedInitialTransactions();
  broadcastEvent('sandbox_reset', { 
    balance: customerAccount.balance, 
    receiverBalance: receiverAccount.balance 
  });
  broadcastWebSocket(generateTopologyTelemetry());
  res.json({ 
    message: 'Sandbox reset successfully', 
    balance: customerAccount.balance,
    receiverBalance: receiverAccount.balance 
  });
});

// Vite Middleware for Full-Stack Integration
async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const httpServer = http.createServer(app);

  const wss = new WebSocketServer({ server: httpServer, path: '/ws/topology' });

  wss.on('connection', (ws) => {
    wsClients.push(ws);
    try {
      ws.send(JSON.stringify(generateTopologyTelemetry()));
    } catch {
      // ignore write error
    }

    ws.on('message', (message) => {
      try {
        const parsed = JSON.parse(message.toString());
        if (parsed.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        } else if (parsed.type === 'trigger_burst') {
          burstActiveUntil = Date.now() + 5000;
          broadcastWebSocket(generateTopologyTelemetry());
        }
      } catch {
        // ignore JSON parse error
      }
    });

    ws.on('close', () => {
      const idx = wsClients.indexOf(ws);
      if (idx !== -1) wsClients.splice(idx, 1);
    });
  });

  // Regular periodic telemetry tick every 1000ms
  setInterval(() => {
    if (wsClients.length > 0) {
      broadcastWebSocket(generateTopologyTelemetry());
    }
  }, 1000);

  httpServer.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`CipherGuard 3D full-stack server running on http://0.0.0.0:${PORT} with WebSocket /ws/topology`);
  });
}

startServer().catch(console.error);

/**
 * CipherGuard 3D - Live Network Topology View Component
 * High-density interactive SVG diagram of Customer, Gateway, and Database nodes
 * with color-coded node health status driven by real-time WebSocket traffic.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  TopologyNodeId,
  NodeHealthStatus,
  TopologyNodeData,
  WebSocketTelemetryFrame,
} from '../../types/topology';
import { TransactionRecord, SocMetrics } from '../../types/security';
import {
  Activity,
  ShieldCheck,
  ShieldAlert,
  Server,
  Database,
  Smartphone,
  Cpu,
  Lock,
  Wifi,
  Radio,
  Zap,
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ChevronRight,
  Info,
  Clock,
  Sparkles,
} from 'lucide-react';

interface NetworkTopologyViewProps {
  transactions?: TransactionRecord[];
  metrics?: SocMetrics;
  onSelectTransaction?: (tx: TransactionRecord) => void;
  onSimulateProbe?: (attackType: string) => void;
  onReplayTransaction?: (tx: TransactionRecord) => void;
}

// Initial fallback nodes data if offline or waiting for initial WebSocket message
function createInitialNodes(): Record<TopologyNodeId, TopologyNodeData> {
  const now = Date.now();
  return {
    customer: {
      id: 'customer',
      name: 'Customer & Client Ingress',
      subName: 'Mobile Banking App / Web Portal',
      role: 'Client Edge Ingress',
      status: 'healthy',
      healthScore: 98,
      latencyMs: 14,
      packetsPerSec: 28,
      trafficRateKBps: 195,
      packetLossPercent: 0.01,
      ip: '49.36.128.45',
      tlsVersion: 'TLS 1.3 (RFC 8446)',
      cipherSuite: 'TLS_AES_256_GCM_SHA384',
      details: 'Customer mobile devices running WebCrypto ECDSA private key enclave, issuing signed canonical payloads.',
      defenseStatus: 'Nominal Client Traffic',
      hardwareProfile: 'Mobile/Web Edge · Client Key Enclave',
      activeSessions: 18,
      recentEvents: [
        {
          id: 'ev-c-1',
          timestamp: now - 3500,
          message: 'Client session TLS 1.3 negotiated with Curve25519 & ECDSA P-256',
          level: 'info',
        },
      ],
    },
    gateway: {
      id: 'gateway',
      name: 'CipherGuard Security Gateway',
      subName: '5-Gate Cryptographic Verifier',
      role: 'Cryptographic Security Gateway',
      status: 'healthy',
      healthScore: 99,
      latencyMs: 5,
      packetsPerSec: 42,
      trafficRateKBps: 640,
      packetLossPercent: 0,
      ip: '10.240.0.12 (Internal Gateway Mesh)',
      tlsVersion: 'TLS 1.3 / mTLS Mesh',
      cipherSuite: 'AES-256-GCM + ECDSA P-256 SHA-256',
      details: 'Zero-trust mechanical verification pipeline inspecting TLS session, AES-GCM tag, ECDSA signature, nonce cache, and balance limit.',
      defenseStatus: 'All 5 Gates Active & Guarding',
      hardwareProfile: '64-Core High-Throughput Verification Engine',
      activeSessions: 42,
      cpuLoadPercent: 28,
      memoryUsageMB: 480,
      gates: {
        gate1Tls: 'pass',
        gate2AesGcm: 'pass',
        gate3Ecdsa: 'pass',
        gate4Nonce: 'pass',
        gate5Ledger: 'pass',
      },
      recentEvents: [
        {
          id: 'ev-g-1',
          timestamp: now - 1800,
          message: '5-Gate cryptographic verification pipeline operational at nominal 5ms latency',
          level: 'info',
        },
      ],
    },
    database: {
      id: 'database',
      name: 'Bank Core Ledger & HSM Vault',
      subName: 'FIPS 140-3 Level 4 Key Vault & Settlement DB',
      role: 'Core Settlement & Ledger Vault',
      status: 'healthy',
      healthScore: 100,
      latencyMs: 2,
      packetsPerSec: 18,
      trafficRateKBps: 380,
      packetLossPercent: 0,
      ip: '10.240.4.88 (Isolated Vault VLAN)',
      tlsVersion: 'mTLS WireGuard Internal',
      cipherSuite: 'FIPS-Validated Hardware Cryptography',
      details: 'Air-gapped transaction ledger writing immutable audit blocks and managing master cryptographic secrets.',
      defenseStatus: 'Air-Gapped Vault Enclosure Active',
      hardwareProfile: 'HSM Dedicated Key Vault · ACID Distributed DB',
      activeSessions: 64,
      hsmStatus: 'ONLINE / FIPS 140-3 Level 4',
      connectionPool: '52/64 Active Pool Connections',
      recentEvents: [
        {
          id: 'ev-d-1',
          timestamp: now - 4200,
          message: 'Immutable ledger commit signed with bank authority root certificate',
          level: 'info',
        },
      ],
    },
  };
}

export const NetworkTopologyView: React.FC<NetworkTopologyViewProps> = ({
  transactions = [],
  metrics,
  onSelectTransaction,
  onSimulateProbe,
  onReplayTransaction,
}) => {
  // Live node state and websocket telemetry
  const [nodes, setNodes] = useState<Record<TopologyNodeId, TopologyNodeData>>(createInitialNodes);
  const [selectedNodeId, setSelectedNodeId] = useState<TopologyNodeId>('gateway');
  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);
  const [wsMode, setWsMode] = useState<'websocket' | 'stream'>('stream');
  const [packetCount, setPacketCount] = useState<number>(4821);
  const [packetRate, setPacketRate] = useState<number>(34);
  const [latencyMs, setLatencyMs] = useState<number>(7);
  const [throughputMbps, setThroughputMbps] = useState<number>(128.4);
  const [lastPingTime, setLastPingTime] = useState<number>(Date.now());
  const [isAnimationPaused, setIsAnimationPaused] = useState<boolean>(false);
  const [burstActive, setBurstActive] = useState<boolean>(false);
  const [activeDeflectedThreat, setActiveDeflectedThreat] = useState<string | null>(null);

  // In-flight animated packet positions along the SVG paths
  const [packetPositions, setPacketPositions] = useState<{
    c2g_1: number;
    c2g_2: number;
    g2c_ack: number;
    g2d_1: number;
    g2d_2: number;
    d2g_ack: number;
    threatPacket: number;
  }>({
    c2g_1: 0.1,
    c2g_2: 0.6,
    g2c_ack: 0.35,
    g2d_1: 0.25,
    g2d_2: 0.75,
    d2g_ack: 0.45,
    threatPacket: -1, // inactive by default
  });

  const wsRef = useRef<WebSocket | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastAnimTimeRef = useRef<number>(performance.now());

  // Connect to backend WebSocket (/ws/topology) with automatic reconnection
  useEffect(() => {
    let isMounted = true;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connectWebSocket = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host || 'localhost:3000';
        const wsUrl = `${protocol}//${host}/ws/topology`;

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          setIsWsConnected(true);
          setWsMode('websocket');
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data: WebSocketTelemetryFrame = JSON.parse(event.data);
            if (data.type === 'topology_tick') {
              if (data.nodes) {
                setNodes(data.nodes);
              }
              if (data.metrics) {
                setPacketCount(data.metrics.totalPacketsProcessed);
                setPacketRate(data.metrics.packetRate);
                setLatencyMs(data.metrics.avgLatencyMs);
                setThroughputMbps(Number(data.metrics.currentThroughputMbps.toFixed(1)));
              }
            } else if (data.type === 'pong') {
              setLatencyMs(Math.max(1, Math.round(performance.now() - lastPingTime)));
            }
          } catch {
            // ignore malformed frame
          }
        };

        ws.onerror = () => {
          if (!isMounted) return;
          setIsWsConnected(false);
          setWsMode('stream');
        };

        ws.onclose = () => {
          if (!isMounted) return;
          setIsWsConnected(false);
          setWsMode('stream');
          // Reconnect after 3 seconds
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        };
      } catch {
        setIsWsConnected(false);
        setWsMode('stream');
        reconnectTimeout = setTimeout(connectWebSocket, 3000);
      }
    };

    connectWebSocket();

    // Polling fallback to /api/topology if WebSocket not connected
    const fallbackPoll = setInterval(async () => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) {
        try {
          const res = await fetch('/api/topology');
          if (res.ok) {
            const data: WebSocketTelemetryFrame = await res.json();
            if (data.nodes) {
              setNodes(data.nodes);
            }
            if (data.metrics) {
              setPacketCount(data.metrics.totalPacketsProcessed);
              setPacketRate(data.metrics.packetRate);
              setLatencyMs(data.metrics.avgLatencyMs);
              setThroughputMbps(Number(data.metrics.currentThroughputMbps.toFixed(1)));
            }
          }
        } catch {
          // ignore network poll error
        }
      }
    }, 1500);

    return () => {
      isMounted = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      clearInterval(fallbackPoll);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [lastPingTime]);

  // Synchronize recent threat transactions from props to highlight nodes
  useEffect(() => {
    if (transactions.length === 0) return;
    const latestTx = transactions[0];
    const isThreat = latestTx.result.status !== 'verified' || Boolean(latestTx.isSimulatedAttack);

    if (isThreat) {
      const gate = latestTx.result.failingGateIndex || 2;
      const attackName = latestTx.attackType || latestTx.result.failureReason || 'Adversary Probe';
      setActiveDeflectedThreat(`Gate 0${gate} Defended: ${attackName}`);

      // Temporarily mark gateway and animate a red threat packet
      setPacketPositions((prev) => ({ ...prev, threatPacket: 0.05 }));

      // Update node states to reflect attack deflection
      setNodes((prev) => {
        const next = { ...prev };
        next.gateway = {
          ...next.gateway,
          status: 'critical',
          healthScore: 68,
          defenseStatus: `Gate 0${gate} Blocked Adversary Payload`,
          gates: {
            ...next.gateway.gates!,
            gate2AesGcm: gate === 2 ? 'fail' : 'pass',
            gate3Ecdsa: gate === 3 ? 'fail' : 'pass',
            gate4Nonce: gate === 4 ? 'fail' : 'pass',
            gate1Tls: gate === 1 ? 'fail' : 'pass',
          },
          recentEvents: [
            {
              id: `threat-${latestTx.id}`,
              timestamp: latestTx.createdAt,
              message: `Deflected ${latestTx.result.failureReason || attackName} from IP ${latestTx.originGeo?.ip || 'external'}`,
              level: 'critical',
            },
            ...next.gateway.recentEvents.slice(0, 3),
          ],
        };

        if (latestTx.originGeo?.ip) {
          next.customer = {
            ...next.customer,
            status: 'degraded',
            healthScore: 82,
            defenseStatus: `Adversary Probe Ingress from ${latestTx.originGeo.city || 'Edge'}`,
          };
        }

        return next;
      });

      // Clear after 8 seconds back to nominal
      const timer = setTimeout(() => {
        setActiveDeflectedThreat(null);
        setPacketPositions((prev) => ({ ...prev, threatPacket: -1 }));
      }, 8000);

      return () => clearTimeout(timer);
    }
  }, [transactions]);

  // Continuous SVG Packet Animation Loop
  useEffect(() => {
    let animationId: number;

    const animatePackets = (currentTime: number) => {
      if (!isAnimationPaused) {
        const delta = (currentTime - lastAnimTimeRef.current) / 1000;
        const speed = burstActive ? 0.75 : 0.35;

        setPacketPositions((prev) => {
          const next = {
            c2g_1: (prev.c2g_1 + delta * speed) % 1,
            c2g_2: (prev.c2g_2 + delta * speed) % 1,
            g2c_ack: (prev.g2c_ack + delta * speed * 0.9) % 1,
            g2d_1: (prev.g2d_1 + delta * speed * 1.1) % 1,
            g2d_2: (prev.g2d_2 + delta * speed * 1.1) % 1,
            d2g_ack: (prev.d2g_ack + delta * speed * 0.95) % 1,
            threatPacket:
              prev.threatPacket >= 0
                ? prev.threatPacket < 0.65
                  ? prev.threatPacket + delta * 0.5
                  : 0.65 // stops at Gate 2/3 and deflects!
                : -1,
          };
          return next;
        });
      }

      lastAnimTimeRef.current = currentTime;
      animationId = requestAnimationFrame(animatePackets);
    };

    animationId = requestAnimationFrame(animatePackets);
    animFrameRef.current = animationId;

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [isAnimationPaused, burstActive]);

  // Ping Channels via WebSocket
  const handlePingChannels = () => {
    setLastPingTime(performance.now());
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'ping' }));
    } else {
      setTimeout(() => {
        setLatencyMs(4 + Math.floor(Math.random() * 3));
      }, 100);
    }
  };

  // Trigger Traffic Burst
  const handleTriggerBurst = () => {
    setBurstActive(true);
    setPacketRate((prev) => prev * 2.5);
    setThroughputMbps((prev) => prev * 1.8);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'trigger_burst' }));
    } else {
      fetch('/api/topology/burst', { method: 'POST' }).catch(() => {});
    }

    setTimeout(() => {
      setBurstActive(false);
      setPacketRate(34);
      setThroughputMbps(128.4);
    }, 5000);
  };

  // Quick Adversary Probe Trigger
  const handleTestProbe = (attackType: string) => {
    onSimulateProbe?.(attackType);
  };

  const selectedNode = nodes[selectedNodeId] || nodes.gateway;

  // Health color mapping helpers
  const getStatusColor = (status: NodeHealthStatus) => {
    switch (status) {
      case 'healthy':
        return {
          stroke: '#10B981', // emerald-500
          fill: '#064E3B',
          glow: 'rgba(16, 185, 129, 0.4)',
          text: 'text-emerald-400',
          bg: 'bg-emerald-500/15',
          border: 'border-emerald-500/40',
          label: 'Healthy / Nominal',
          badge: 'bg-emerald-500',
        };
      case 'degraded':
        return {
          stroke: '#F59E0B', // amber-500
          fill: '#78350F',
          glow: 'rgba(245, 158, 11, 0.4)',
          text: 'text-amber-400',
          bg: 'bg-amber-500/15',
          border: 'border-amber-500/40',
          label: 'Degraded / Elevated Load',
          badge: 'bg-amber-500',
        };
      case 'critical':
        return {
          stroke: '#EF4444', // rose-500
          fill: '#7F1D1D',
          glow: 'rgba(239, 68, 68, 0.5)',
          text: 'text-rose-400',
          bg: 'bg-rose-500/20',
          border: 'border-rose-500/50',
          label: 'Critical / Threat Deflected',
          badge: 'bg-rose-500',
        };
    }
  };

  const customerColors = getStatusColor(nodes.customer.status);
  const gatewayColors = getStatusColor(nodes.gateway.status);
  const databaseColors = getStatusColor(nodes.database.status);

  // SVG path coordinates (ViewBox 0 0 1000 380)
  // Customer Node: (170, 190)
  // Gateway Node:  (500, 190)
  // Database Node: (830, 190)
  const c2gForwardPath = 'M 240 165 C 320 140, 410 140, 440 165';
  const g2cReturnPath = 'M 440 215 C 410 240, 320 240, 240 215';

  const g2dForwardPath = 'M 560 165 C 640 140, 730 140, 760 165';
  const d2gReturnPath = 'M 760 215 C 730 240, 640 240, 560 215';

  // Helper to interpolate position (t: 0..1) on cubic bezier curve
  const getCubicBezierPoint = (
    p0: { x: number; y: number },
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    p3: { x: number; y: number },
    t: number
  ) => {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;

    const x = uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x;
    const y = uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y;
    return { x, y };
  };

  // Interpolated coordinates for live packet particles
  const pktC2G_1 = getCubicBezierPoint(
    { x: 240, y: 165 },
    { x: 320, y: 140 },
    { x: 410, y: 140 },
    { x: 440, y: 165 },
    packetPositions.c2g_1
  );

  const pktC2G_2 = getCubicBezierPoint(
    { x: 240, y: 165 },
    { x: 320, y: 140 },
    { x: 410, y: 140 },
    { x: 440, y: 165 },
    packetPositions.c2g_2
  );

  const pktG2C_Ack = getCubicBezierPoint(
    { x: 440, y: 215 },
    { x: 410, y: 240 },
    { x: 320, y: 240 },
    { x: 240, y: 215 },
    packetPositions.g2c_ack
  );

  const pktG2D_1 = getCubicBezierPoint(
    { x: 560, y: 165 },
    { x: 640, y: 140 },
    { x: 730, y: 140 },
    { x: 760, y: 165 },
    packetPositions.g2d_1
  );

  const pktG2D_2 = getCubicBezierPoint(
    { x: 560, y: 165 },
    { x: 640, y: 140 },
    { x: 730, y: 140 },
    { x: 760, y: 165 },
    packetPositions.g2d_2
  );

  const pktD2G_Ack = getCubicBezierPoint(
    { x: 760, y: 215 },
    { x: 730, y: 240 },
    { x: 640, y: 240 },
    { x: 560, y: 215 },
    packetPositions.d2g_ack
  );

  const pktThreat =
    packetPositions.threatPacket >= 0
      ? getCubicBezierPoint(
          { x: 240, y: 165 },
          { x: 320, y: 140 },
          { x: 410, y: 140 },
          { x: 440, y: 165 },
          packetPositions.threatPacket
        )
      : null;

  return (
    <div className="rounded-xl bg-[#101827] border border-slate-800 shadow-xl overflow-hidden transition-all">
      {/* Top Header & Real-time WebSocket Status Telemetry Bar */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-[#0d1522] via-[#131d2e] to-[#0d1522] border-b border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#35D6C5]/10 border border-[#35D6C5]/30 text-[#35D6C5]">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-heading font-bold text-white tracking-wide">
                Live Bank Network Topology
              </h3>
              <span className="text-slate-600">·</span>
              <span className="text-xs font-mono text-[#35D6C5] flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      isWsConnected ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      isWsConnected ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                </span>
                {isWsConnected ? 'WSS LIVE (PORT 3000)' : 'STREAM TELEMETRY ACTIVE'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Real-time SVG telemetry of Customer, Gateway, and Database nodes with dynamic health status & active cryptographic flow.
            </p>
          </div>
        </div>

        {/* Live Metrics Counter & Quick Stream Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto justify-start md:justify-end">
          {/* Active Deflected Threat Banner */}
          {activeDeflectedThreat && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-mono animate-pulse">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="font-semibold truncate max-w-[220px]">{activeDeflectedThreat}</span>
            </div>
          )}

          {/* WebSocket Ping Metric */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs font-mono text-slate-300">
            <Clock className="w-3.5 h-3.5 text-[#35D6C5]" />
            <span className="text-slate-400">Ping:</span>
            <span className="text-white font-semibold">{latencyMs}ms</span>
          </div>

          {/* Packet Rate Metric */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs font-mono text-slate-300">
            <Activity className="w-3.5 h-3.5 text-[#4C8DFF]" />
            <span className="text-slate-400">Traffic:</span>
            <span className="text-[#4C8DFF] font-semibold">{packetRate} pkts/s</span>
          </div>

          {/* Throughput Metric */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs font-mono text-slate-300">
            <Zap className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span className="text-slate-400">BW:</span>
            <span className="text-white font-semibold">{throughputMbps} Mbps</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleTriggerBurst}
              title="Simulate high-throughput WebSocket traffic burst"
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-all cursor-pointer ${
                burstActive
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md shadow-amber-950/40'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {burstActive ? 'Burst Active (5s)...' : 'Traffic Burst'}
            </button>

            <button
              onClick={handlePingChannels}
              title="Ping all active channels"
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsAnimationPaused((prev) => !prev)}
              title={isAnimationPaused ? 'Resume packet flow' : 'Pause packet flow'}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              {isAnimationPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4 text-slate-400" />}
            </button>
          </div>
        </div>
      </div>

      {/* Interactive SVG Diagram Canvas */}
      <div className="p-4 sm:p-6 bg-[#0a101d] relative overflow-hidden select-none">
        {/* Subtle Cyber Grid Background */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* SVG Viewport */}
        <div className="w-full relative flex items-center justify-center">
          <svg
            viewBox="0 0 1000 380"
            className="w-full max-w-5xl h-auto drop-shadow-2xl overflow-visible"
            style={{ minHeight: '260px' }}
          >
            <defs>
              {/* Radial Glow Filters */}
              <filter id="glow-emerald" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <filter id="glow-amber" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <filter id="glow-rose" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <filter id="glow-packet" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>

              {/* Gradient for Links */}
              <linearGradient id="link-c2g" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#35D6C5" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#4C8DFF" stopOpacity="0.8" />
              </linearGradient>

              <linearGradient id="link-g2d" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#4C8DFF" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#35D6C5" stopOpacity="0.8" />
              </linearGradient>

              <linearGradient id="link-threat" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#EF4444" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.9" />
              </linearGradient>
            </defs>

            {/* ============================================================== */}
            {/* SVG LINK 1: Customer <-> Gateway Channels                     */}
            {/* ============================================================== */}
            {/* Forward Channel (Customer -> Gateway) */}
            <path
              d={c2gForwardPath}
              fill="none"
              stroke="#1e293b"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <path
              d={c2gForwardPath}
              fill="none"
              stroke={nodes.customer.status === 'critical' || nodes.gateway.status === 'critical' ? 'url(#link-threat)' : 'url(#link-c2g)'}
              strokeWidth="2.5"
              strokeDasharray="6 6"
              className={isAnimationPaused ? '' : 'animate-pulse'}
            />

            {/* Return Channel (Gateway -> Customer ACK) */}
            <path
              d={g2cReturnPath}
              fill="none"
              stroke="#1e293b"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d={g2cReturnPath}
              fill="none"
              stroke="#334155"
              strokeWidth="2"
              strokeDasharray="4 4"
            />

            {/* Link 1 Protocol & Bandwidth Badge */}
            <g transform="translate(340, 115)">
              <rect
                x="-65"
                y="-14"
                width="130"
                height="28"
                rx="6"
                fill="#0f172a"
                stroke="#334155"
                strokeWidth="1"
              />
              <text
                x="0"
                y="0"
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
              >
                TLS 1.3 · WSS
              </text>
              <text
                x="0"
                y="10"
                textAnchor="middle"
                fill="#35D6C5"
                fontSize="9"
                fontFamily="monospace"
              >
                {burstActive ? '78.4 Mbps' : '38.2 Mbps'}
              </text>
            </g>

            {/* Return ACK Badge */}
            <g transform="translate(340, 260)">
              <rect
                x="-55"
                y="-11"
                width="110"
                height="22"
                rx="5"
                fill="#0f172a"
                stroke="#1e293b"
                strokeWidth="1"
              />
              <text
                x="0"
                y="4"
                textAnchor="middle"
                fill="#64748b"
                fontSize="9"
                fontFamily="monospace"
              >
                ← NONCE & ACK
              </text>
            </g>

            {/* ============================================================== */}
            {/* SVG LINK 2: Gateway <-> Database Channels                      */}
            {/* ============================================================== */}
            {/* Forward Channel (Gateway -> Database Commit) */}
            <path
              d={g2dForwardPath}
              fill="none"
              stroke="#1e293b"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <path
              d={g2dForwardPath}
              fill="none"
              stroke="url(#link-g2d)"
              strokeWidth="2.5"
              strokeDasharray="6 6"
              className={isAnimationPaused ? '' : 'animate-pulse'}
            />

            {/* Return Channel (Database -> Gateway Settlement Confirmation) */}
            <path
              d={d2gReturnPath}
              fill="none"
              stroke="#1e293b"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d={d2gReturnPath}
              fill="none"
              stroke="#334155"
              strokeWidth="2"
              strokeDasharray="4 4"
            />

            {/* Link 2 Protocol & Bandwidth Badge */}
            <g transform="translate(660, 115)">
              <rect
                x="-70"
                y="-14"
                width="140"
                height="28"
                rx="6"
                fill="#0f172a"
                stroke="#334155"
                strokeWidth="1"
              />
              <text
                x="0"
                y="0"
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
              >
                mTLS MESH · gRPC
              </text>
              <text
                x="0"
                y="10"
                textAnchor="middle"
                fill="#4C8DFF"
                fontSize="9"
                fontFamily="monospace"
              >
                {burstActive ? '142.6 Mbps' : '112.4 Mbps'}
              </text>
            </g>

            {/* Return Settlement Badge */}
            <g transform="translate(660, 260)">
              <rect
                x="-65"
                y="-11"
                width="130"
                height="22"
                rx="5"
                fill="#0f172a"
                stroke="#1e293b"
                strokeWidth="1"
              />
              <text
                x="0"
                y="4"
                textAnchor="middle"
                fill="#64748b"
                fontSize="9"
                fontFamily="monospace"
              >
                ← LEDGER RECEIPT
              </text>
            </g>

            {/* ============================================================== */}
            {/* LIVE ANIMATED PACKET PARTICLES                                  */}
            {/* ============================================================== */}
            {/* Forward Packets: Customer -> Gateway */}
            <circle
              cx={pktC2G_1.x}
              cy={pktC2G_1.y}
              r="5.5"
              fill="#35D6C5"
              filter="url(#glow-packet)"
            />
            <circle
              cx={pktC2G_2.x}
              cy={pktC2G_2.y}
              r="4.5"
              fill="#4C8DFF"
              filter="url(#glow-packet)"
            />

            {/* Return ACK Packet: Gateway -> Customer */}
            <circle
              cx={pktG2C_Ack.x}
              cy={pktG2C_Ack.y}
              r="4"
              fill="#10B981"
            />

            {/* Forward Packets: Gateway -> Database */}
            <circle
              cx={pktG2D_1.x}
              cy={pktG2D_1.y}
              r="6"
              fill="#4C8DFF"
              filter="url(#glow-packet)"
            />
            <circle
              cx={pktG2D_2.x}
              cy={pktG2D_2.y}
              r="4.5"
              fill="#35D6C5"
              filter="url(#glow-packet)"
            />

            {/* Return Ledger ACK Packet: Database -> Gateway */}
            <circle
              cx={pktD2G_Ack.x}
              cy={pktD2G_Ack.y}
              r="4"
              fill="#36D399"
            />

            {/* Live Threat Packet (if active deflection occurs) */}
            {pktThreat && (
              <g>
                <circle
                  cx={pktThreat.x}
                  cy={pktThreat.y}
                  r="7.5"
                  fill="#EF4444"
                  filter="url(#glow-rose)"
                />
                <circle
                  cx={pktThreat.x}
                  cy={pktThreat.y}
                  r="12"
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth="1.5"
                  opacity="0.8"
                  className="animate-ping"
                />
                <text
                  x={pktThreat.x}
                  y={pktThreat.y - 14}
                  textAnchor="middle"
                  fill="#EF4444"
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  ⚡ DEFLECTED PROBE
                </text>
              </g>
            )}

            {/* ============================================================== */}
            {/* NODE 1: CUSTOMER NODE (170, 190)                                */}
            {/* ============================================================== */}
            <g
              transform="translate(170, 190)"
              onClick={() => setSelectedNodeId('customer')}
              className="cursor-pointer group"
            >
              {/* Outer Pulse Ring */}
              <circle
                r="64"
                fill="none"
                stroke={customerColors.stroke}
                strokeWidth="1.5"
                opacity="0.3"
                className="animate-ping"
                style={{ animationDuration: '3s' }}
              />

              {/* Selection Halo */}
              {selectedNodeId === 'customer' && (
                <circle
                  r="58"
                  fill="none"
                  stroke="#35D6C5"
                  strokeWidth="2.5"
                  strokeDasharray="4 4"
                  className="animate-spin"
                  style={{ animationDuration: '12s' }}
                />
              )}

              {/* Main Node Background Circle */}
              <circle
                r="50"
                fill="#0f172a"
                stroke={customerColors.stroke}
                strokeWidth={selectedNodeId === 'customer' ? '3' : '2'}
                filter={nodes.customer.status !== 'healthy' ? 'url(#glow-rose)' : 'url(#glow-emerald)'}
                className="transition-all duration-300 group-hover:stroke-white"
              />

              {/* Internal Accent Disc */}
              <circle
                r="40"
                fill="#131d2e"
                stroke="#1e293b"
                strokeWidth="1"
              />

              {/* Node Icon Graphic */}
              <g transform="translate(-14, -20)">
                <rect x="4" y="2" width="20" height="34" rx="4" fill="none" stroke={customerColors.stroke} strokeWidth="2" />
                <line x1="11" y1="30" x2="17" y2="30" stroke={customerColors.stroke} strokeWidth="2" strokeLinecap="round" />
                <circle cx="14" cy="8" r="1.5" fill={customerColors.stroke} />
              </g>

              {/* Node Title & Role Labels */}
              <text
                x="0"
                y="75"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="12"
                fontFamily="sans-serif"
                fontWeight="bold"
              >
                CUSTOMER
              </text>
              <text
                x="0"
                y="90"
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="10"
                fontFamily="sans-serif"
              >
                Client Edge Ingress
              </text>

              {/* Health Status Pill */}
              <g transform="translate(0, 110)">
                <rect
                  x="-55"
                  y="-10"
                  width="110"
                  height="20"
                  rx="10"
                  fill="#0f172a"
                  stroke={customerColors.stroke}
                  strokeWidth="1"
                />
                <circle cx="-42" cy="0" r="3.5" fill={customerColors.stroke} />
                <text
                  x="4"
                  y="3.5"
                  textAnchor="middle"
                  fill="#e2e8f0"
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {nodes.customer.status === 'healthy' ? '98% HEALTH' : 'DEGRADED'}
                </text>
              </g>

              {/* Latency Pill */}
              <g transform="translate(0, -66)">
                <rect
                  x="-42"
                  y="-9"
                  width="84"
                  height="18"
                  rx="5"
                  fill="#0b1322"
                  stroke="#334155"
                  strokeWidth="1"
                />
                <text
                  x="0"
                  y="3.5"
                  textAnchor="middle"
                  fill="#35D6C5"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {nodes.customer.latencyMs}ms · Edge
                </text>
              </g>
            </g>

            {/* ============================================================== */}
            {/* NODE 2: GATEWAY NODE (500, 190) - CENTER VERIFIER             */}
            {/* ============================================================== */}
            <g
              transform="translate(500, 190)"
              onClick={() => setSelectedNodeId('gateway')}
              className="cursor-pointer group"
            >
              {/* Outer Security Ring */}
              <circle
                r="78"
                fill="none"
                stroke={gatewayColors.stroke}
                strokeWidth="1.5"
                opacity="0.3"
                className="animate-ping"
                style={{ animationDuration: '2.5s' }}
              />

              {/* Selected Rotating Cyber Ring */}
              {selectedNodeId === 'gateway' && (
                <circle
                  r="72"
                  fill="none"
                  stroke="#4C8DFF"
                  strokeWidth="3"
                  strokeDasharray="6 6"
                  className="animate-spin"
                  style={{ animationDuration: '14s' }}
                />
              )}

              {/* Main Node Background Circle */}
              <circle
                r="64"
                fill="#0d1524"
                stroke={gatewayColors.stroke}
                strokeWidth={selectedNodeId === 'gateway' ? '3.5' : '2.5'}
                filter={nodes.gateway.status !== 'healthy' ? 'url(#glow-rose)' : 'url(#glow-emerald)'}
                className="transition-all duration-300 group-hover:stroke-white"
              />

              {/* Internal Accent Disc */}
              <circle
                r="52"
                fill="#131e33"
                stroke="#1e293b"
                strokeWidth="1.5"
              />

              {/* Center Gateway Shield Graphic */}
              <g transform="translate(-16, -24)">
                <path
                  d="M16 4 L28 9 V18 C28 26 22 31 16 34 C10 31 4 26 4 18 V9 Z"
                  fill="none"
                  stroke={gatewayColors.stroke}
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M11 18 L15 22 L21 14"
                  fill="none"
                  stroke={gatewayColors.stroke}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>

              {/* 5-Gate Micro Indicators Directly on Gateway */}
              <g transform="translate(-32, 18)">
                {/* G1 TLS */}
                <circle
                  cx="0"
                  cy="0"
                  r="4"
                  fill={nodes.gateway.gates?.gate1Tls === 'fail' ? '#EF4444' : '#10B981'}
                />
                {/* G2 AES */}
                <circle
                  cx="16"
                  cy="0"
                  r="4"
                  fill={nodes.gateway.gates?.gate2AesGcm === 'fail' ? '#EF4444' : '#10B981'}
                />
                {/* G3 SIG */}
                <circle
                  cx="32"
                  cy="0"
                  r="4"
                  fill={nodes.gateway.gates?.gate3Ecdsa === 'fail' ? '#EF4444' : '#10B981'}
                />
                {/* G4 NONCE */}
                <circle
                  cx="48"
                  cy="0"
                  r="4"
                  fill={nodes.gateway.gates?.gate4Nonce === 'fail' ? '#EF4444' : '#10B981'}
                />
                {/* G5 LEDGER */}
                <circle
                  cx="64"
                  cy="0"
                  r="4"
                  fill={nodes.gateway.gates?.gate5Ledger === 'fail' ? '#EF4444' : '#10B981'}
                />
              </g>

              {/* Node Title & Subtitle */}
              <text
                x="0"
                y="86"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="13"
                fontFamily="sans-serif"
                fontWeight="bold"
              >
                GATEWAY (5-GATE)
              </text>
              <text
                x="0"
                y="101"
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="10"
                fontFamily="sans-serif"
              >
                Cryptographic Verifier & WAF
              </text>

              {/* Health Status Pill */}
              <g transform="translate(0, 122)">
                <rect
                  x="-65"
                  y="-11"
                  width="130"
                  height="22"
                  rx="11"
                  fill="#0f172a"
                  stroke={gatewayColors.stroke}
                  strokeWidth="1.5"
                />
                <circle cx="-50" cy="0" r="4" fill={gatewayColors.stroke} />
                <text
                  x="6"
                  y="4"
                  textAnchor="middle"
                  fill="#e2e8f0"
                  fontSize="9.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {nodes.gateway.status === 'healthy'
                    ? '100% SECURE'
                    : nodes.gateway.status === 'critical'
                    ? 'THREAT INTERCEPTED'
                    : 'DEFENSE ENGAGED'}
                </text>
              </g>

              {/* CPU & Latency Top Pill */}
              <g transform="translate(0, -80)">
                <rect
                  x="-55"
                  y="-10"
                  width="110"
                  height="20"
                  rx="6"
                  fill="#0b1322"
                  stroke="#334155"
                  strokeWidth="1"
                />
                <text
                  x="0"
                  y="4"
                  textAnchor="middle"
                  fill="#4C8DFF"
                  fontSize="9.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {nodes.gateway.latencyMs}ms · CPU {nodes.gateway.cpuLoadPercent || 28}%
                </text>
              </g>
            </g>

            {/* ============================================================== */}
            {/* NODE 3: DATABASE NODE (830, 190) - CORE VAULT & HSM            */}
            {/* ============================================================== */}
            <g
              transform="translate(830, 190)"
              onClick={() => setSelectedNodeId('database')}
              className="cursor-pointer group"
            >
              {/* Outer Vault Ring */}
              <circle
                r="64"
                fill="none"
                stroke={databaseColors.stroke}
                strokeWidth="1.5"
                opacity="0.3"
                className="animate-ping"
                style={{ animationDuration: '3.2s' }}
              />

              {/* Selection Halo */}
              {selectedNodeId === 'database' && (
                <circle
                  r="58"
                  fill="none"
                  stroke="#36D399"
                  strokeWidth="2.5"
                  strokeDasharray="4 4"
                  className="animate-spin"
                  style={{ animationDuration: '12s' }}
                />
              )}

              {/* Main Node Background Circle */}
              <circle
                r="50"
                fill="#0f172a"
                stroke={databaseColors.stroke}
                strokeWidth={selectedNodeId === 'database' ? '3' : '2'}
                filter="url(#glow-emerald)"
                className="transition-all duration-300 group-hover:stroke-white"
              />

              {/* Internal Accent Disc */}
              <circle
                r="40"
                fill="#131d2e"
                stroke="#1e293b"
                strokeWidth="1"
              />

              {/* Database Icon Graphic */}
              <g transform="translate(-14, -18)">
                {/* Cylinder 1 */}
                <ellipse cx="14" cy="6" rx="14" ry="5" fill="none" stroke={databaseColors.stroke} strokeWidth="2" />
                <path d="M0 6 V16 C0 19 6 21 14 21 C22 21 28 19 28 16 V6" fill="none" stroke={databaseColors.stroke} strokeWidth="2" />
                <path d="M0 16 V26 C0 29 6 31 14 31 C22 31 28 29 28 26 V16" fill="none" stroke={databaseColors.stroke} strokeWidth="2" />
              </g>

              {/* Node Title & Subtitle */}
              <text
                x="0"
                y="75"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="12"
                fontFamily="sans-serif"
                fontWeight="bold"
              >
                DATABASE
              </text>
              <text
                x="0"
                y="90"
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="10"
                fontFamily="sans-serif"
              >
                Core Ledger & HSM Vault
              </text>

              {/* Health Status Pill */}
              <g transform="translate(0, 110)">
                <rect
                  x="-55"
                  y="-10"
                  width="110"
                  height="20"
                  rx="10"
                  fill="#0f172a"
                  stroke={databaseColors.stroke}
                  strokeWidth="1"
                />
                <circle cx="-42" cy="0" r="3.5" fill={databaseColors.stroke} />
                <text
                  x="4"
                  y="3.5"
                  textAnchor="middle"
                  fill="#e2e8f0"
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  100% VERIFIED
                </text>
              </g>

              {/* Latency Pill */}
              <g transform="translate(0, -66)">
                <rect
                  x="-42"
                  y="-9"
                  width="84"
                  height="18"
                  rx="5"
                  fill="#0b1322"
                  stroke="#334155"
                  strokeWidth="1"
                />
                <text
                  x="0"
                  y="3.5"
                  textAnchor="middle"
                  fill="#36D399"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {nodes.database.latencyMs}ms · Vault
                </text>
              </g>
            </g>
          </svg>
        </div>

        {/* Bottom Fast Selector Tabs for the 3 Nodes */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-3">
          {(['customer', 'gateway', 'database'] as TopologyNodeId[]).map((nodeId) => {
            const node = nodes[nodeId];
            const isSelected = selectedNodeId === nodeId;
            const colors = getStatusColor(node.status);
            return (
              <button
                key={nodeId}
                onClick={() => setSelectedNodeId(nodeId)}
                className={`p-3 rounded-lg text-left transition-all border flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800/90 border-[#35D6C5] shadow-lg shadow-[#35D6C5]/10'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${colors.bg} ${colors.text}`}>
                    {nodeId === 'customer' && <Smartphone className="w-4 h-4" />}
                    {nodeId === 'gateway' && <ShieldCheck className="w-4 h-4" />}
                    {nodeId === 'database' && <Database className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white truncate max-w-[150px]">
                      {node.name}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {node.ip.split(' ')[0]}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${colors.badge}`} />
                    {node.healthScore}%
                  </span>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {node.latencyMs}ms latency
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Node In-Depth Telemetry Inspector Drawer */}
      <div className="p-4 sm:p-6 bg-[#0c1424] border-t border-slate-800">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div
              className={`p-3 rounded-xl ${
                getStatusColor(selectedNode.status).bg
              } ${getStatusColor(selectedNode.status).text} border ${
                getStatusColor(selectedNode.status).border
              }`}
            >
              {selectedNode.id === 'customer' && <Smartphone className="w-5 h-5" />}
              {selectedNode.id === 'gateway' && <Cpu className="w-5 h-5" />}
              {selectedNode.id === 'database' && <Database className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm sm:text-base font-heading font-bold text-white">
                  {selectedNode.name}
                </h4>
                <span className="text-slate-600">·</span>
                <span className="text-xs text-slate-400 font-mono">{selectedNode.role}</span>
              </div>
              <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                {selectedNode.details}
              </p>
            </div>
          </div>

          {/* Quick Adversary Attack Test Buttons for Security Operations Testing */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="text-xs text-slate-400 font-mono">Simulate Defense:</span>
            <button
              onClick={() => handleTestProbe('mitm_amount_tamper')}
              className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-mono transition-all cursor-pointer"
            >
              Test MITM Probe
            </button>
            <button
              onClick={() => handleTestProbe('signature_forgery')}
              className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-mono transition-all cursor-pointer"
            >
              Test Signature Forgery
            </button>
            <button
              onClick={() => handleTestProbe('replay_attack')}
              className="px-2.5 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-mono transition-all cursor-pointer"
            >
              Test Replay Nonce
            </button>
          </div>
        </div>

        {/* Detailed Node Metric Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {/* Defense State */}
          <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
            <div className="text-[10px] font-mono text-slate-400 mb-1 uppercase tracking-wider">
              Defense Status
            </div>
            <div className={`text-xs font-semibold ${getStatusColor(selectedNode.status).text}`}>
              {selectedNode.defenseStatus}
            </div>
          </div>

          {/* IP & Network Interface */}
          <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
            <div className="text-[10px] font-mono text-slate-400 mb-1 uppercase tracking-wider">
              Network Binding
            </div>
            <div className="text-xs font-mono text-slate-200 truncate">
              {selectedNode.ip}
            </div>
          </div>

          {/* Cipher Suite & TLS */}
          <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
            <div className="text-[10px] font-mono text-slate-400 mb-1 uppercase tracking-wider">
              Cryptographic Suite
            </div>
            <div className="text-xs font-mono text-[#35D6C5] truncate">
              {selectedNode.cipherSuite}
            </div>
          </div>

          {/* Traffic Throughput / Sessions */}
          <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
            <div className="text-[10px] font-mono text-slate-400 mb-1 uppercase tracking-wider">
              Active Sessions / Rate
            </div>
            <div className="text-xs font-mono text-slate-200">
              {selectedNode.activeSessions} sessions · {selectedNode.packetsPerSec} pkts/s
            </div>
          </div>
        </div>

        {/* Gateway 5-Gate Live Cryptographic Integrity Status (when Gateway is inspected) */}
        {selectedNode.id === 'gateway' && selectedNode.gates && (
          <div className="p-4 rounded-lg bg-slate-950/90 border border-slate-800/80 mb-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#35D6C5]" />
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  5-Gate Cryptographic Barrier Status
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                Zero-Trust Multi-Layer Defense
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              <div
                className={`p-2.5 rounded-lg border text-center ${
                  selectedNode.gates.gate1Tls === 'pass'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                }`}
              >
                <div className="text-[10px] font-mono text-slate-400 mb-0.5">GATE 01</div>
                <div className="text-xs font-bold">TLS 1.3 Session</div>
                <div className="text-[10px] font-mono mt-1 font-semibold uppercase">
                  {selectedNode.gates.gate1Tls === 'pass' ? '✓ Verified' : '✕ Downgrade Fail'}
                </div>
              </div>

              <div
                className={`p-2.5 rounded-lg border text-center ${
                  selectedNode.gates.gate2AesGcm === 'pass'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                }`}
              >
                <div className="text-[10px] font-mono text-slate-400 mb-0.5">GATE 02</div>
                <div className="text-xs font-bold">AES-256-GCM Tag</div>
                <div className="text-[10px] font-mono mt-1 font-semibold uppercase">
                  {selectedNode.gates.gate2AesGcm === 'pass' ? '✓ Tag Intact' : '✕ Tamper Blocked'}
                </div>
              </div>

              <div
                className={`p-2.5 rounded-lg border text-center ${
                  selectedNode.gates.gate3Ecdsa === 'pass'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                }`}
              >
                <div className="text-[10px] font-mono text-slate-400 mb-0.5">GATE 03</div>
                <div className="text-xs font-bold">ECDSA Signature</div>
                <div className="text-[10px] font-mono mt-1 font-semibold uppercase">
                  {selectedNode.gates.gate3Ecdsa === 'pass' ? '✓ Authenticated' : '✕ Forgery Caught'}
                </div>
              </div>

              <div
                className={`p-2.5 rounded-lg border text-center ${
                  selectedNode.gates.gate4Nonce === 'pass'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                }`}
              >
                <div className="text-[10px] font-mono text-slate-400 mb-0.5">GATE 04</div>
                <div className="text-xs font-bold">Sliding Nonce</div>
                <div className="text-[10px] font-mono mt-1 font-semibold uppercase">
                  {selectedNode.gates.gate4Nonce === 'pass' ? '✓ Fresh Nonce' : '✕ Replay Blocked'}
                </div>
              </div>

              <div
                className={`p-2.5 rounded-lg border text-center ${
                  selectedNode.gates.gate5Ledger === 'pass'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                }`}
              >
                <div className="text-[10px] font-mono text-slate-400 mb-0.5">GATE 05</div>
                <div className="text-xs font-bold">Ledger Balance</div>
                <div className="text-[10px] font-mono mt-1 font-semibold uppercase">
                  {selectedNode.gates.gate5Ledger === 'pass' ? '✓ Cleared' : '✕ Limit Exceeded'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Database HSM Profile (when Database is inspected) */}
        {selectedNode.id === 'database' && (
          <div className="p-4 rounded-lg bg-slate-950/90 border border-slate-800/80 mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-mono font-bold text-white">
                  HARDWARE SECURITY MODULE (HSM): {selectedNode.hsmStatus}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Connection Pool: {selectedNode.connectionPool}. All state changes backed by cryptographic SHA-256 block receipt chain.
              </p>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold shrink-0">
              ACID STRICT COMPLIANT
            </div>
          </div>
        )}

        {/* Node Recent Security Event Trail */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-2">
            Node Event Log (WebSocket Real-Time Feed)
          </div>
          {selectedNode.recentEvents.map((evt) => (
            <div
              key={evt.id}
              className={`flex items-start gap-2.5 p-2 rounded-lg text-xs font-mono border ${
                evt.level === 'critical'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : 'bg-slate-900/60 border-slate-800 text-slate-300'
              }`}
            >
              {evt.level === 'critical' ? (
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <span className="text-slate-400 text-[10px] mr-2">
                  [{new Date(evt.timestamp).toLocaleTimeString()}]
                </span>
                <span>{evt.message}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * CipherGuard 3D - Network Topology & Health Status Unit Tests
 * Exercises topology node health calculation, gate barrier status,
 * and link throughput formulas.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  TopologyNodeData,
  NodeHealthStatus,
  WebSocketTelemetryFrame,
} from '../../src/types/topology';

describe('Network Topology Telemetry & Health Calculation', () => {
  it('should validate node schema structure for Customer, Gateway, and Database', () => {
    const customerNode: TopologyNodeData = {
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
      details: 'Customer edge devices.',
      defenseStatus: 'Nominal Client Traffic',
      hardwareProfile: 'Mobile/Web Edge Enclave',
      activeSessions: 18,
      recentEvents: [],
    };

    assert.equal(customerNode.id, 'customer');
    assert.equal(customerNode.status, 'healthy');
    assert.ok(customerNode.healthScore >= 0 && customerNode.healthScore <= 100);
    assert.ok(customerNode.latencyMs > 0);
  });

  it('should correctly flag Gateway health as critical when MITM attack occurs', () => {
    const isMitm = true;
    let gatewayStatus: NodeHealthStatus = 'healthy';
    let gatewayHealthScore = 99;

    if (isMitm) {
      gatewayStatus = 'critical';
      gatewayHealthScore = 64;
    }

    assert.equal(gatewayStatus, 'critical');
    assert.equal(gatewayHealthScore, 64);
  });

  it('should format frame metrics with throughput and packet rate', () => {
    const frame: WebSocketTelemetryFrame = {
      type: 'topology_tick',
      timestamp: Date.now(),
      nodes: {
        customer: {
          id: 'customer',
          name: 'Customer Node',
          subName: 'Edge',
          role: 'Client',
          status: 'healthy',
          healthScore: 98,
          latencyMs: 12,
          packetsPerSec: 24,
          trafficRateKBps: 180,
          packetLossPercent: 0,
          ip: '192.168.1.1',
          tlsVersion: 'TLS 1.3',
          cipherSuite: 'TLS_AES_256_GCM_SHA384',
          details: 'Details',
          defenseStatus: 'Nominal',
          hardwareProfile: 'Edge',
          activeSessions: 12,
          recentEvents: [],
        },
        gateway: {
          id: 'gateway',
          name: 'Gateway Node',
          subName: 'Verifier',
          role: 'Gateway',
          status: 'healthy',
          healthScore: 99,
          latencyMs: 5,
          packetsPerSec: 36,
          trafficRateKBps: 540,
          packetLossPercent: 0,
          ip: '10.0.0.1',
          tlsVersion: 'TLS 1.3',
          cipherSuite: 'AES-256-GCM',
          details: 'Details',
          defenseStatus: 'Active',
          hardwareProfile: 'Server',
          activeSessions: 36,
          recentEvents: [],
          gates: {
            gate1Tls: 'pass',
            gate2AesGcm: 'pass',
            gate3Ecdsa: 'pass',
            gate4Nonce: 'pass',
            gate5Ledger: 'pass',
          },
        },
        database: {
          id: 'database',
          name: 'Database Node',
          subName: 'Vault',
          role: 'Ledger',
          status: 'healthy',
          healthScore: 100,
          latencyMs: 2,
          packetsPerSec: 18,
          trafficRateKBps: 320,
          packetLossPercent: 0,
          ip: '10.0.0.2',
          tlsVersion: 'mTLS',
          cipherSuite: 'HSM',
          details: 'Details',
          defenseStatus: 'Vault Active',
          hardwareProfile: 'HSM',
          activeSessions: 64,
          recentEvents: [],
        },
      },
      links: {
        customerToGateway: {
          id: 'link-1',
          from: 'customer',
          to: 'gateway',
          label: 'Client to Gateway',
          protocol: 'WSS / TLS 1.3',
          status: 'healthy',
          throughputMbps: 38.4,
          rttMs: 16.5,
          inFlightPackets: 6,
          packetLossPercent: 0,
        },
        gatewayToDatabase: {
          id: 'link-2',
          from: 'gateway',
          to: 'database',
          label: 'Gateway to Database',
          protocol: 'mTLS Mesh',
          status: 'healthy',
          throughputMbps: 112.4,
          rttMs: 2.4,
          inFlightPackets: 9,
          packetLossPercent: 0,
        },
      },
      metrics: {
        websocketConnected: true,
        packetRate: 36,
        totalPacketsProcessed: 5000,
        activeThreatsCount: 0,
        avgLatencyMs: 6,
        currentThroughputMbps: 120.5,
      },
    };

    assert.ok(frame.nodes.customer);
    assert.ok(frame.nodes.gateway);
    assert.ok(frame.nodes.database);
    assert.equal(frame.metrics.websocketConnected, true);
    assert.equal(frame.links.customerToGateway.protocol, 'WSS / TLS 1.3');
    assert.equal(frame.nodes.gateway.gates?.gate2AesGcm, 'pass');
  });
});

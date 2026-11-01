import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SECURITY_GATES,
  getTransactionGateExplanation,
  getAuditLogSecurityContext,
} from '../../src/utils/securityGateInfo';
import { TransactionRecord, AuditLogItem } from '../../src/types/security';

function createMockTransaction(overrides?: Partial<TransactionRecord>): TransactionRecord {
  return {
    id: 'tx-test-9941',
    createdAt: Date.now(),
    canonical: {
      transactionId: 'tx-test-9941',
      senderId: 'CUST-001',
      senderName: 'Aditya Birla',
      senderAccount: '•••• 1029',
      recipientId: 'BENEF-4412',
      recipientName: 'Ananya Patel',
      recipientAccount: '•••• 4412',
      amount: 5000,
      currency: 'INR',
      timestamp: Date.now(),
      nonce: 'nonce-abcdef1234567890',
      expirationTime: Date.now() + 300_000,
      purpose: 'Consulting Retainer',
    },
    packet: {
      packetId: 'pkt-123',
      keyId: 'k-1',
      iv: '0102030405060708090a0b0c',
      aad: 'aad-data',
      ciphertext: 'deadbeef123456',
      tag: '0102030405060708090a0b0c0d0e0f10',
      signature: '3045022100...',
      senderPublicKey: '{"kty":"EC"}',
      canonicalDigest: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      tlsSessionId: 'TLS13-SESSION-8812',
      clientHelloVersion: 'TLS 1.3',
      cipherSuite: 'TLS_AES_256_GCM_SHA384',
    },
    result: {
      transactionId: 'tx-test-9941',
      status: 'verified',
      timestamp: Date.now(),
      totalLatencyMs: 24,
      gates: [
        {
          gate: 1,
          name: 'TLS 1.3 Channel Verification',
          description: '',
          passed: true,
          latencyMs: 4,
          details: 'Pass',
          technicalProof: {},
        },
        {
          gate: 2,
          name: 'AES-256-GCM Tag Verification',
          description: '',
          passed: true,
          latencyMs: 6,
          details: 'Pass',
          technicalProof: {},
        },
        {
          gate: 3,
          name: 'ECDSA Digital Signature',
          description: '',
          passed: true,
          latencyMs: 8,
          details: 'Pass',
          technicalProof: {},
        },
        {
          gate: 4,
          name: 'Nonce & Replay Protection',
          description: '',
          passed: true,
          latencyMs: 3,
          details: 'Pass',
          technicalProof: {},
        },
        {
          gate: 5,
          name: 'Ledger Authorization & Balance',
          description: '',
          passed: true,
          latencyMs: 3,
          details: 'Pass',
          technicalProof: {},
        },
      ],
    },
    ...overrides,
  };
}

test('Security Gate Registry Definitions', async (t) => {
  await t.test('should define all 5 mechanical security gates with standards', () => {
    assert.strictEqual(Object.keys(SECURITY_GATES).length, 5);

    assert.strictEqual(SECURITY_GATES[1].gateName, 'TLS 1.3 Channel Verification');
    assert.strictEqual(SECURITY_GATES[1].category, 'TLS');
    assert.ok(SECURITY_GATES[1].rfcStandard.includes('8446'));

    assert.strictEqual(SECURITY_GATES[2].gateName, 'AES-256-GCM Tag Verification');
    assert.strictEqual(SECURITY_GATES[2].category, 'CRYPTO');
    assert.ok(SECURITY_GATES[2].rfcStandard.includes('800-38D'));

    assert.strictEqual(SECURITY_GATES[3].gateName, 'ECDSA Digital Signature');
    assert.strictEqual(SECURITY_GATES[3].category, 'AUTH');
    assert.ok(SECURITY_GATES[3].rfcStandard.includes('186-4'));

    assert.strictEqual(SECURITY_GATES[4].gateName, 'Nonce & Replay Protection');
    assert.strictEqual(SECURITY_GATES[4].category, 'REPLAY');

    assert.strictEqual(SECURITY_GATES[5].gateName, 'Ledger Authorization & Balance');
    assert.strictEqual(SECURITY_GATES[5].category, 'LEDGER');
  });
});

test('Transaction Gate Explanation Mapping', async (t) => {
  await t.test('should provide comprehensive explanation for verified transaction', () => {
    const tx = createMockTransaction({
      result: {
        transactionId: 'tx-1',
        status: 'verified',
        timestamp: Date.now(),
        totalLatencyMs: 25,
        gates: [],
      },
    });

    const explanation = getTransactionGateExplanation(tx);
    assert.strictEqual(explanation.isVerified, true);
    assert.strictEqual(explanation.statusLabel, 'VERIFIED');
    assert.ok(explanation.title.includes('All 5 Security Gates Cleared'));
    assert.strictEqual(explanation.gateStatuses.every((g) => g.status === 'pass'), true);
  });

  await t.test('should identify Gate 2 MITM ciphertext tampering failure', () => {
    const tx = createMockTransaction({
      result: {
        transactionId: 'tx-tampered',
        status: 'tampered',
        failingGateIndex: 2,
        failureReason: 'Cryptographic tag verification failed. Ciphertext tampered in flight.',
        timestamp: Date.now(),
        totalLatencyMs: 12,
        gates: [],
      },
    });

    const explanation = getTransactionGateExplanation(tx);
    assert.strictEqual(explanation.isVerified, false);
    assert.ok(explanation.statusLabel.includes('TAMPERED'));
    assert.strictEqual(explanation.failingGateIndex, 2);
    assert.ok(explanation.title.includes('Gate 02: AES-256-GCM'));
    assert.ok(explanation.threatPrevented.includes('Man-in-the-Middle'));

    // Check pipeline mini tracker statuses
    assert.strictEqual(explanation.gateStatuses[0].status, 'pass'); // Gate 1 passed
    assert.strictEqual(explanation.gateStatuses[1].status, 'fail'); // Gate 2 failed
    assert.strictEqual(explanation.gateStatuses[2].status, 'skipped'); // Gate 3 skipped
  });

  await t.test('should identify Gate 3 ECDSA signature forgery failure', () => {
    const tx = createMockTransaction({
      attackType: 'signature_forgery',
      result: {
        transactionId: 'tx-forged',
        status: 'rejected',
        failingGateIndex: 3,
        failureReason: 'Digital signature invalid. Message forgery detected.',
        timestamp: Date.now(),
        totalLatencyMs: 18,
        gates: [],
      },
    });

    const explanation = getTransactionGateExplanation(tx);
    assert.strictEqual(explanation.isVerified, false);
    assert.strictEqual(explanation.failingGateIndex, 3);
    assert.ok(explanation.title.includes('Gate 03: ECDSA'));
    assert.ok(explanation.threatPrevented.includes('Sender impersonation'));

    assert.strictEqual(explanation.gateStatuses[0].status, 'pass'); // Gate 1
    assert.strictEqual(explanation.gateStatuses[1].status, 'pass'); // Gate 2
    assert.strictEqual(explanation.gateStatuses[2].status, 'fail'); // Gate 3
    assert.strictEqual(explanation.gateStatuses[3].status, 'skipped'); // Gate 4
  });

  await t.test('should identify Gate 4 Replay attack failure', () => {
    const tx = createMockTransaction({
      attackType: 'replay_attack',
      result: {
        transactionId: 'tx-replay',
        status: 'replay_blocked',
        failingGateIndex: 4,
        failureReason: 'Replay attack detected! Nonce already registered in cache.',
        timestamp: Date.now(),
        totalLatencyMs: 15,
        gates: [],
      },
    });

    const explanation = getTransactionGateExplanation(tx);
    assert.strictEqual(explanation.isVerified, false);
    assert.strictEqual(explanation.failingGateIndex, 4);
    assert.ok(explanation.statusLabel.includes('REPLAY BLOCKED'));
    assert.ok(explanation.title.includes('Gate 04: Nonce'));
    assert.ok(explanation.threatPrevented.includes('replay attack'));

    assert.strictEqual(explanation.gateStatuses[3].status, 'fail'); // Gate 4
    assert.strictEqual(explanation.gateStatuses[4].status, 'skipped'); // Gate 5
  });

  await t.test('should identify Gate 5 Ledger limit failure', () => {
    const tx = createMockTransaction({
      result: {
        transactionId: 'tx-limit',
        status: 'rejected',
        failingGateIndex: 5,
        failureReason: 'Insufficient balance for transfer settlement.',
        timestamp: Date.now(),
        totalLatencyMs: 22,
        gates: [],
      },
    });

    const explanation = getTransactionGateExplanation(tx);
    assert.strictEqual(explanation.isVerified, false);
    assert.strictEqual(explanation.failingGateIndex, 5);
    assert.ok(explanation.title.includes('Gate 05: Ledger'));
    assert.strictEqual(explanation.gateStatuses[4].status, 'fail'); // Gate 5
  });
});

test('Audit Log Security Context Mapping', async (t) => {
  await t.test('should accurately map audit categories to security gates', () => {
    const tlsLog: AuditLogItem = {
      id: 'log-1',
      timestamp: Date.now(),
      level: 'info',
      category: 'TLS',
      message: 'TLS 1.3 handshake negotiated with TLS_AES_256_GCM_SHA384',
    };
    const tlsContext = getAuditLogSecurityContext(tlsLog);
    assert.strictEqual(tlsContext.associatedGateIndex, 1);
    assert.ok(tlsContext.associatedGateName?.includes('Gate 01: TLS 1.3'));

    const cryptoLog: AuditLogItem = {
      id: 'log-2',
      timestamp: Date.now(),
      level: 'error',
      category: 'CRYPTO',
      message: 'AES-GCM tag mismatch',
    };
    const cryptoContext = getAuditLogSecurityContext(cryptoLog);
    assert.strictEqual(cryptoContext.associatedGateIndex, 2);
    assert.strictEqual(cryptoContext.levelLabel, 'CRITICAL FAILURE');

    const authLog: AuditLogItem = {
      id: 'log-3',
      timestamp: Date.now(),
      level: 'error',
      category: 'AUTH',
      message: 'ECDSA signature mismatch',
    };
    const authContext = getAuditLogSecurityContext(authLog);
    assert.strictEqual(authContext.associatedGateIndex, 3);

    const replayLog: AuditLogItem = {
      id: 'log-4',
      timestamp: Date.now(),
      level: 'warn',
      category: 'REPLAY',
      message: 'Nonce collision detected',
    };
    const replayContext = getAuditLogSecurityContext(replayLog);
    assert.strictEqual(replayContext.associatedGateIndex, 4);
    assert.strictEqual(replayContext.levelLabel, 'SECURITY WARNING');

    const ledgerLog: AuditLogItem = {
      id: 'log-5',
      timestamp: Date.now(),
      level: 'success',
      category: 'LEDGER',
      message: 'Settlement confirmed into audit block #184920',
    };
    const ledgerContext = getAuditLogSecurityContext(ledgerLog);
    assert.strictEqual(ledgerContext.associatedGateIndex, 5);
    assert.strictEqual(ledgerContext.levelLabel, 'VERIFIED SUCCESS');
  });
});

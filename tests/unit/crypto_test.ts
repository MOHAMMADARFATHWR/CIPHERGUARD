/**
 * CipherGuard 3D - Cryptographic Unit Tests
 * Exercises AES-256-GCM encryption/decryption, bit-flip/tamper detection,
 * ECDSA P-256 keypair generation, canonical serialization, digital signatures,
 * and the 5-Gate mechanical security evaluation pipeline.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateAESKey,
  generateAESIV,
  generateECDSAKeyPair,
  exportPublicKeyJWK,
  importPublicKeyJWK,
  generateSecureNonce,
  serializeCanonical,
  computeSHA256Hex,
  encryptPayloadAESGCM,
  decryptPayloadAESGCM,
  signCanonicalTransaction,
  verifyTransactionSignature,
  evaluateTransactionSecurityGates,
  bufferToHex,
  hexToBuffer,
} from '../../src/services/cryptoEngine';
import { CanonicalTransaction, EncryptedPacket } from '../../src/types/security';

function createMockCanonicalTransaction(overrides?: Partial<CanonicalTransaction>): CanonicalTransaction {
  const now = Date.now();
  return {
    transactionId: `TX-TEST-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
    senderId: 'usr_sender_01',
    senderName: 'Alice Morgan',
    senderAccount: 'ACT-908123-IN',
    recipientId: 'usr_receiver_01',
    recipientName: 'Bob Jenkins',
    recipientAccount: 'ACT-543210-IN',
    amount: 15000,
    currency: 'INR',
    timestamp: now,
    nonce: generateSecureNonce(),
    expirationTime: now + 300_000,
    purpose: 'Vendor invoice settlement #892',
    ...overrides,
  };
}

describe('AES-256-GCM Cryptographic Primitives', () => {
  it('should generate an AES key and a 96-bit (12-byte) initialization vector', async () => {
    const key = await generateAESKey();
    assert.ok(key, 'AES key should be successfully generated');
    assert.equal(key.algorithm.name, 'AES-GCM');
    // @ts-expect-error algorithm length property check
    assert.equal(key.algorithm.length, 256);

    const iv = generateAESIV();
    assert.equal(iv.length, 12, 'AES-GCM IV must be exactly 12 bytes (96 bits)');
  });

  it('should successfully encrypt and decrypt a payload with matching key, IV, and AAD', async () => {
    const key = await generateAESKey();
    const iv = generateAESIV();
    const payload = JSON.stringify({ amount: 15000, memo: 'Confidential wire transfer' });
    const aad = 'Header:Sender=Alice;Receiver=Bob;Version=1.3';

    const { ciphertextHex, tagHex } = await encryptPayloadAESGCM(key, payload, iv, aad);

    assert.ok(ciphertextHex.length > 0, 'Ciphertext should not be empty');
    assert.equal(tagHex.length, 32, 'AES-GCM tag must be 16 bytes (32 hex characters)');

    const decryptResult = await decryptPayloadAESGCM(key, ciphertextHex, tagHex, iv, aad);

    assert.equal(decryptResult.success, true);
    assert.equal(decryptResult.decryptedText, payload);
    assert.equal(decryptResult.error, undefined);
  });

  it('should reject decryption when a bit is flipped in the ciphertext (tampering detection)', async () => {
    const key = await generateAESKey();
    const iv = generateAESIV();
    const payload = JSON.stringify({ amount: 15000, memo: 'Legitimate transaction' });
    const aad = 'Metadata:Channel=Secured';

    const { ciphertextHex, tagHex } = await encryptPayloadAESGCM(key, payload, iv, aad);

    // Tamper with ciphertext by flipping the first hex character
    const tamperedFirstChar = ciphertextHex[0] === 'a' ? 'b' : 'a';
    const tamperedCiphertext = tamperedFirstChar + ciphertextHex.slice(1);

    const decryptResult = await decryptPayloadAESGCM(key, tamperedCiphertext, tagHex, iv, aad);

    assert.equal(decryptResult.success, false, 'Tampered ciphertext must fail authentication tag verification');
    assert.ok(decryptResult.error, 'Error message must be present when decryption fails');
    assert.equal(decryptResult.decryptedText, undefined);
  });

  it('should reject decryption when the authentication tag is tampered', async () => {
    const key = await generateAESKey();
    const iv = generateAESIV();
    const payload = JSON.stringify({ transferId: 'TX-9988' });
    const aad = 'Auth-Scope';

    const { ciphertextHex, tagHex } = await encryptPayloadAESGCM(key, payload, iv, aad);

    // Tamper with authentication tag
    const tamperedTag = (tagHex[0] === '0' ? '1' : '0') + tagHex.slice(1);

    const decryptResult = await decryptPayloadAESGCM(key, ciphertextHex, tamperedTag, iv, aad);

    assert.equal(decryptResult.success, false, 'Tampered authentication tag must be rejected');
    assert.ok(decryptResult.error);
  });

  it('should reject decryption when Additional Authenticated Data (AAD) is altered', async () => {
    const key = await generateAESKey();
    const iv = generateAESIV();
    const payload = 'Sensitive Banking Record';
    const originalAad = 'SenderID=Alice;Role=Executive';
    const forgedAad = 'SenderID=Mallory;Role=Executive';

    const { ciphertextHex, tagHex } = await encryptPayloadAESGCM(key, payload, iv, originalAad);

    const decryptResult = await decryptPayloadAESGCM(key, ciphertextHex, tagHex, iv, forgedAad);

    assert.equal(decryptResult.success, false, 'Mismatched AAD must fail authentication check');
    assert.ok(decryptResult.error);
  });

  it('should reject decryption when attempted with a mismatched AES key', async () => {
    const keyA = await generateAESKey();
    const keyB = await generateAESKey();
    const iv = generateAESIV();
    const payload = 'Confidential payload';
    const aad = 'Scope=Testing';

    const { ciphertextHex, tagHex } = await encryptPayloadAESGCM(keyA, payload, iv, aad);

    const decryptResult = await decryptPayloadAESGCM(keyB, ciphertextHex, tagHex, iv, aad);

    assert.equal(decryptResult.success, false, 'Decryption with unauthorized key must fail');
  });

  it('should reject decryption when IV does not match encryption IV', async () => {
    const key = await generateAESKey();
    const iv1 = generateAESIV();
    const iv2 = generateAESIV();
    const payload = 'Integrity test';
    const aad = 'Scope=IV';

    const { ciphertextHex, tagHex } = await encryptPayloadAESGCM(key, payload, iv1, aad);

    const decryptResult = await decryptPayloadAESGCM(key, ciphertextHex, tagHex, iv2, aad);

    assert.equal(decryptResult.success, false, 'Decryption with mismatched IV must fail');
  });
});

describe('ECDSA P-256 Digital Signatures & Public Key Infrastructure', () => {
  it('should generate ECDSA P-256 keypair and export/import public key in JWK format', async () => {
    const keyPair = await generateECDSAKeyPair();
    assert.ok(keyPair.privateKey, 'Private key must exist');
    assert.ok(keyPair.publicKey, 'Public key must exist');

    const jwkString = await exportPublicKeyJWK(keyPair.publicKey);
    assert.ok(typeof jwkString === 'string' && jwkString.length > 0);

    const parsed = JSON.parse(jwkString);
    assert.equal(parsed.kty, 'EC');
    assert.equal(parsed.crv, 'P-256');

    const importedKey = await importPublicKeyJWK(jwkString);
    assert.ok(importedKey, 'Imported CryptoKey must be valid');
    assert.equal(importedKey.algorithm.name, 'ECDSA');
  });

  it('should generate valid ECDSA signature for canonical transaction and verify successfully', async () => {
    const keyPair = await generateECDSAKeyPair();
    const tx = createMockCanonicalTransaction();

    const { signatureHex, digestHex } = await signCanonicalTransaction(keyPair.privateKey, tx);

    assert.ok(signatureHex.length > 0, 'Signature hex should not be empty');
    assert.equal(digestHex.length, 64, 'SHA-256 digest must be 64 hex characters (256-bit)');

    const isValid = await verifyTransactionSignature(keyPair.publicKey, signatureHex, tx);
    assert.equal(isValid, true, 'Valid signature over intact canonical transaction must pass verification');
  });

  it('should reject signature when transaction payload fields are modified (non-repudiation)', async () => {
    const keyPair = await generateECDSAKeyPair();
    const originalTx = createMockCanonicalTransaction({ amount: 10000 });

    const { signatureHex } = await signCanonicalTransaction(keyPair.privateKey, originalTx);

    // Adversary tampers with the transaction amount (e.g. from 10,000 to 1,000,000)
    const tamperedTx: CanonicalTransaction = {
      ...originalTx,
      amount: 1000000,
    };

    const isValid = await verifyTransactionSignature(keyPair.publicKey, signatureHex, tamperedTx);
    assert.equal(isValid, false, 'Signature verification must fail when payload is tampered');
  });

  it('should reject signature when recipient account is altered', async () => {
    const keyPair = await generateECDSAKeyPair();
    const originalTx = createMockCanonicalTransaction({ recipientAccount: 'ACT-BOB-999' });

    const { signatureHex } = await signCanonicalTransaction(keyPair.privateKey, originalTx);

    // Adversary redirects recipient account
    const divertedTx: CanonicalTransaction = {
      ...originalTx,
      recipientAccount: 'ACT-HACKER-666',
    };

    const isValid = await verifyTransactionSignature(keyPair.publicKey, signatureHex, divertedTx);
    assert.equal(isValid, false, 'Signature verification must fail when recipient account is changed');
  });

  it('should reject signature when verified against a different public key (impersonation attack)', async () => {
    const aliceKeys = await generateECDSAKeyPair();
    const eveKeys = await generateECDSAKeyPair();
    const tx = createMockCanonicalTransaction();

    // Alice signs the transaction
    const { signatureHex } = await signCanonicalTransaction(aliceKeys.privateKey, tx);

    // Attempt verification using Eve's public key
    const isValid = await verifyTransactionSignature(eveKeys.publicKey, signatureHex, tx);
    assert.equal(isValid, false, 'Signature must not verify against an unauthorized public key');
  });

  it('should return false gracefully on corrupted or malformed signature bytes', async () => {
    const keyPair = await generateECDSAKeyPair();
    const tx = createMockCanonicalTransaction();

    const corruptedSignature = 'deadbeef00112233445566778899aabbccddeeff';
    const isValid = await verifyTransactionSignature(keyPair.publicKey, corruptedSignature, tx);
    assert.equal(isValid, false, 'Corrupted signature must return false without unhandled exceptions');
  });
});

describe('Canonical Serialization & SHA-256 Digest Integrity', () => {
  it('should produce deterministic serialization invariant of field construction', () => {
    const now = 1730000000000;
    const tx1: CanonicalTransaction = {
      transactionId: 'TX-1',
      senderId: 'S-1',
      senderName: 'Alice',
      senderAccount: 'A-1',
      recipientId: 'R-1',
      recipientName: 'Bob',
      recipientAccount: 'B-1',
      amount: 500,
      currency: 'INR',
      timestamp: now,
      nonce: 'nonce-1234',
      expirationTime: now + 300000,
      purpose: 'Gift',
    };

    const tx2: CanonicalTransaction = {
      purpose: 'Gift',
      recipientAccount: 'B-1',
      currency: 'INR',
      expirationTime: now + 300000,
      nonce: 'nonce-1234',
      senderAccount: 'A-1',
      senderName: 'Alice',
      timestamp: now,
      transactionId: 'TX-1',
      senderId: 'S-1',
      amount: 500,
      recipientId: 'R-1',
      recipientName: 'Bob',
    };

    const s1 = serializeCanonical(tx1);
    const s2 = serializeCanonical(tx2);
    assert.equal(s1, s2, 'Canonical serialization must produce identical deterministic JSON output');
  });

  it('should compute valid 64-character hex SHA-256 digest', async () => {
    const sample = '{"transactionId":"TX-100","amount":25000}';
    const digest = await computeSHA256Hex(sample);

    assert.equal(digest.length, 64, 'SHA-256 hex string must be exactly 64 characters long');
    assert.match(digest, /^[0-9a-f]{64}$/, 'Digest must contain only lowercase hex characters');

    // Deterministic output
    const digest2 = await computeSHA256Hex(sample);
    assert.equal(digest, digest2, 'Same input must yield identical hash');

    // Collision resistance / avalanche effect
    const digestDiff = await computeSHA256Hex(sample + ' ');
    assert.notEqual(digest, digestDiff, 'Altered input must yield different hash');
  });

  it('should generate cryptographically unique 128-bit nonces', () => {
    const nonces = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const nonce = generateSecureNonce();
      assert.equal(nonce.length, 32, '128-bit nonce must be 32 hex characters');
      assert.ok(!nonces.has(nonce), 'Nonce must be unique');
      nonces.add(nonce);
    }
  });

  it('should accurately convert between buffers and hex strings', () => {
    const originalHex = '00112233445566778899aabbccddeeff';
    const buffer = hexToBuffer(originalHex);
    assert.equal(buffer.length, 16);
    const backToHex = bufferToHex(buffer);
    assert.equal(backToHex.toLowerCase(), originalHex.toLowerCase());
  });
});

describe('5-Gate Mechanical Security Verification Pipeline', () => {
  it('should verify a legitimate transaction passing all 5 gates', async () => {
    const aesKey = await generateAESKey();
    const keyPair = await generateECDSAKeyPair();
    const pubJwk = await exportPublicKeyJWK(keyPair.publicKey);

    const tx = createMockCanonicalTransaction({ amount: 5000 });
    const iv = generateAESIV();
    const aad = `tx:${tx.transactionId};sender:${tx.senderAccount}`;
    const payload = JSON.stringify(tx);

    const { ciphertextHex, tagHex } = await encryptPayloadAESGCM(aesKey, payload, iv, aad);
    const { signatureHex, digestHex } = await signCanonicalTransaction(keyPair.privateKey, tx);

    const packet: EncryptedPacket = {
      packetId: `PKT-${tx.transactionId}`,
      keyId: 'KEY-PRIMARY-2026',
      iv: bufferToHex(iv),
      aad,
      ciphertext: ciphertextHex,
      tag: tagHex,
      signature: signatureHex,
      senderPublicKey: pubJwk,
      canonicalDigest: digestHex,
      tlsSessionId: 'TLS13-SESSION-SECURE-998',
      clientHelloVersion: 'TLSv1.3',
      cipherSuite: 'TLS_AES_256_GCM_SHA384',
    };

    const seenNonces = new Set<string>();
    const result = await evaluateTransactionSecurityGates({
      packet,
      canonical: tx,
      aesKey,
      currentBalance: 50000,
      seenNonces,
    });

    assert.equal(result.status, 'verified', 'Legitimate transaction must be verified');
    assert.equal(result.failingGateIndex, undefined);
    assert.equal(result.gates.length, 5, 'All 5 gates should be evaluated and passed');
    assert.ok(result.receipt, 'Receipt must be generated for verified transaction');
    assert.equal(result.receipt?.settledAmount, 5000);
    assert.ok(result.receipt?.receiptId.startsWith('REC-'));
  });

  it('should detect Gate 2 failure when ciphertext is tampered in transit', async () => {
    const aesKey = await generateAESKey();
    const keyPair = await generateECDSAKeyPair();
    const pubJwk = await exportPublicKeyJWK(keyPair.publicKey);

    const tx = createMockCanonicalTransaction();
    const iv = generateAESIV();
    const aad = `tx:${tx.transactionId}`;
    const payload = JSON.stringify(tx);

    const { ciphertextHex, tagHex } = await encryptPayloadAESGCM(aesKey, payload, iv, aad);
    const { signatureHex, digestHex } = await signCanonicalTransaction(keyPair.privateKey, tx);

    // Tamper ciphertext
    const tamperedCiphertext = (ciphertextHex[0] === 'f' ? '0' : 'f') + ciphertextHex.slice(1);

    const packet: EncryptedPacket = {
      packetId: `PKT-${tx.transactionId}`,
      keyId: 'KEY-PRIMARY-2026',
      iv: bufferToHex(iv),
      aad,
      ciphertext: tamperedCiphertext,
      tag: tagHex,
      signature: signatureHex,
      senderPublicKey: pubJwk,
      canonicalDigest: digestHex,
      tlsSessionId: 'TLS13-SESSION-SECURE-998',
      clientHelloVersion: 'TLSv1.3',
      cipherSuite: 'TLS_AES_256_GCM_SHA384',
    };

    const result = await evaluateTransactionSecurityGates({
      packet,
      canonical: tx,
      aesKey,
      currentBalance: 50000,
      seenNonces: new Set(),
    });

    assert.equal(result.status, 'tampered', 'Status must be tampered when Gate 2 fails');
    assert.equal(result.failingGateIndex, 2);
    assert.ok(result.failureReason?.includes('Gate 2 Failed'));
    assert.equal(result.receipt, undefined);
  });

  it('should detect Gate 3 failure when ECDSA signature is forged', async () => {
    const aesKey = await generateAESKey();
    const eveKeys = await generateECDSAKeyPair(); // Eve's keys
    const pubJwkEve = await exportPublicKeyJWK(eveKeys.publicKey);

    const tx = createMockCanonicalTransaction();
    const iv = generateAESIV();
    const aad = `tx:${tx.transactionId}`;
    const payload = JSON.stringify(tx);

    const { ciphertextHex, tagHex } = await encryptPayloadAESGCM(aesKey, payload, iv, aad);

    // Bogus signature
    const forgedSignature = '3045022100' + '11'.repeat(32) + '0220' + '22'.repeat(32);

    const packet: EncryptedPacket = {
      packetId: `PKT-${tx.transactionId}`,
      keyId: 'KEY-PRIMARY-2026',
      iv: bufferToHex(iv),
      aad,
      ciphertext: ciphertextHex,
      tag: tagHex,
      signature: forgedSignature,
      senderPublicKey: pubJwkEve,
      canonicalDigest: 'dummyDigest',
      tlsSessionId: 'TLS13-SESSION-SECURE-998',
      clientHelloVersion: 'TLSv1.3',
      cipherSuite: 'TLS_AES_256_GCM_SHA384',
    };

    const result = await evaluateTransactionSecurityGates({
      packet,
      canonical: tx,
      aesKey,
      currentBalance: 50000,
      seenNonces: new Set(),
    });

    assert.equal(result.status, 'rejected');
    assert.equal(result.failingGateIndex, 3);
    assert.ok(result.failureReason?.includes('Gate 3 Failed'));
  });

  it('should detect Gate 4 failure when a nonce replay attack occurs', async () => {
    const aesKey = await generateAESKey();
    const keyPair = await generateECDSAKeyPair();
    const pubJwk = await exportPublicKeyJWK(keyPair.publicKey);

    const tx = createMockCanonicalTransaction();
    const iv = generateAESIV();
    const aad = `tx:${tx.transactionId}`;
    const payload = JSON.stringify(tx);

    const { ciphertextHex, tagHex } = await encryptPayloadAESGCM(aesKey, payload, iv, aad);
    const { signatureHex, digestHex } = await signCanonicalTransaction(keyPair.privateKey, tx);

    const packet: EncryptedPacket = {
      packetId: `PKT-${tx.transactionId}`,
      keyId: 'KEY-PRIMARY-2026',
      iv: bufferToHex(iv),
      aad,
      ciphertext: ciphertextHex,
      tag: tagHex,
      signature: signatureHex,
      senderPublicKey: pubJwk,
      canonicalDigest: digestHex,
      tlsSessionId: 'TLS13-SESSION-SECURE-998',
      clientHelloVersion: 'TLSv1.3',
      cipherSuite: 'TLS_AES_256_GCM_SHA384',
    };

    // Pre-populate seenNonces with this transaction's nonce (simulating replay)
    const seenNonces = new Set<string>([tx.nonce]);

    const result = await evaluateTransactionSecurityGates({
      packet,
      canonical: tx,
      aesKey,
      currentBalance: 50000,
      seenNonces,
    });

    assert.equal(result.status, 'replay_blocked');
    assert.equal(result.failingGateIndex, 4);
    assert.ok(result.failureReason?.includes('Replay attack detected'));
  });

  it('should detect Gate 4 failure when timestamp is older than 5 minutes', async () => {
    const aesKey = await generateAESKey();
    const keyPair = await generateECDSAKeyPair();
    const pubJwk = await exportPublicKeyJWK(keyPair.publicKey);

    // Stale timestamp (10 minutes ago)
    const tenMinutesAgo = Date.now() - 600_000;
    const tx = createMockCanonicalTransaction({
      timestamp: tenMinutesAgo,
    });
    const iv = generateAESIV();
    const aad = `tx:${tx.transactionId}`;
    const payload = JSON.stringify(tx);

    const { ciphertextHex, tagHex } = await encryptPayloadAESGCM(aesKey, payload, iv, aad);
    const { signatureHex, digestHex } = await signCanonicalTransaction(keyPair.privateKey, tx);

    const packet: EncryptedPacket = {
      packetId: `PKT-${tx.transactionId}`,
      keyId: 'KEY-PRIMARY-2026',
      iv: bufferToHex(iv),
      aad,
      ciphertext: ciphertextHex,
      tag: tagHex,
      signature: signatureHex,
      senderPublicKey: pubJwk,
      canonicalDigest: digestHex,
      tlsSessionId: 'TLS13-SESSION-SECURE-998',
      clientHelloVersion: 'TLSv1.3',
      cipherSuite: 'TLS_AES_256_GCM_SHA384',
    };

    const result = await evaluateTransactionSecurityGates({
      packet,
      canonical: tx,
      aesKey,
      currentBalance: 50000,
      seenNonces: new Set(),
    });

    assert.equal(result.status, 'rejected');
    assert.equal(result.failingGateIndex, 4);
    assert.ok(result.failureReason?.includes('Expired timestamp'));
  });

  it('should detect Gate 5 failure when balance is insufficient', async () => {
    const aesKey = await generateAESKey();
    const keyPair = await generateECDSAKeyPair();
    const pubJwk = await exportPublicKeyJWK(keyPair.publicKey);

    const tx = createMockCanonicalTransaction({ amount: 75000 });
    const iv = generateAESIV();
    const aad = `tx:${tx.transactionId}`;
    const payload = JSON.stringify(tx);

    const { ciphertextHex, tagHex } = await encryptPayloadAESGCM(aesKey, payload, iv, aad);
    const { signatureHex, digestHex } = await signCanonicalTransaction(keyPair.privateKey, tx);

    const packet: EncryptedPacket = {
      packetId: `PKT-${tx.transactionId}`,
      keyId: 'KEY-PRIMARY-2026',
      iv: bufferToHex(iv),
      aad,
      ciphertext: ciphertextHex,
      tag: tagHex,
      signature: signatureHex,
      senderPublicKey: pubJwk,
      canonicalDigest: digestHex,
      tlsSessionId: 'TLS13-SESSION-SECURE-998',
      clientHelloVersion: 'TLSv1.3',
      cipherSuite: 'TLS_AES_256_GCM_SHA384',
    };

    // User only has 10,000, trying to transfer 75,000
    const result = await evaluateTransactionSecurityGates({
      packet,
      canonical: tx,
      aesKey,
      currentBalance: 10000,
      seenNonces: new Set(),
    });

    assert.equal(result.status, 'rejected');
    assert.equal(result.failingGateIndex, 5);
    assert.ok(result.failureReason?.includes('Insufficient demo balance'));
  });
});

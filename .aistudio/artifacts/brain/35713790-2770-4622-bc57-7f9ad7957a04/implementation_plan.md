# CIPHERGUARD 3D — Multi-Role Authentication, Receiver Portal & Forensic CSV Export

This enhancement expands CipherGuard 3D into a full 4-role authenticated banking ecosystem (Sender, Receiver, Banker, Hacker) featuring a dedicated authentication application, role-specific home portals, and dual forensic CSV export engines for SOC security teams.

***

### User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were confirmed during the interactive interview:
> - **Authentication Architecture**: Dedicated login screen featuring 4 pre-filled quick-login credential cards (Sender, Receiver, Banker, Hacker) alongside a custom credential login form with simulated multi-factor authentication.
> - **SOC Forensic Export**: Two separate, RFC 4180 compliant CSV export options:
>   1. `cipherguard_transaction_ledger_<timestamp>.csv` (full cryptographic parameters, SHA-256 digests, AES-GCM tags, nonces, latencies, gate evaluation proofs)
>   2. `cipherguard_security_audit_logs_<timestamp>.csv` (granular time-indexed security events, threat detections, and severities).
> - **Dedicated Receiver Portal**: Emphasizes an incoming payments ledger with real-time settlement alerts, verified incoming balance ledger, and an interactive cryptographic receipt validator allowing the receiver to independently verify the sender's ECDSA signature and digest.

***

## 1. Overview & Core Concept

- **What It Adds**:
  1. **Authentication & Session Manager**: A dedicated login portal allowing users to sign in as **Sender** (Priya Sharma), **Receiver** (Rahul Sharma), **Banker** (SOC Manager Vikram), or **Hacker** (Mallory Adversary), with persistent session state and seamless profile switching.
  2. **Dedicated Receiver Experience**: A distinct recipient portal displaying received funds, real-time incoming transfer notifications, and independent cryptographic proof verification.
  3. **SOC Forensic CSV Engines**: One-click forensic data exports on the SOC Dashboard for transaction records and security event logs to support compliance audits and incident investigation.
  4. **Home Page & Role Routing**: An updated landing experience allowing immediate exploration of the 3D showcase or direct role entry.

***

## 2. User Experience & Visual Design

### Key User Flows

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AUTHENTICATION PORTAL                             │
│       [Public Landing] ──► [Dedicated Login Screen]                         │
│                                    │                                        │
│           ┌───────────────┬────────┴───────┬───────────────┐                │
│           ▼               ▼                ▼               ▼                │
│      ┌─────────┐    ┌──────────┐     ┌───────────┐   ┌───────────┐          │
│      │ SENDER  │    │ RECEIVER │     │  BANKER   │   │  HACKER   │          │
│      │ PORTAL  │    │  PORTAL  │     │ SOC DESK  │   │   LAB     │          │
│      └────┬────┘    └────┬─────┘     └─────┬─────┘   └─────┬─────┘          │
│           │              │                 │               │                │
│           └──────────────┴────────► Real ◄─┴───────────────┘                │
│                              WebCrypto Engine                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

1. **Authentication Flow**:
   - Visitors click "Login / Switch Identity" or enter from the public landing.
   - The login screen presents 4 persona cards with one-click instant authentication, plus custom email/password authentication with remember-me session persistence.
2. **Sender Experience (Priya Sharma)**:
   - Account balance (₹2,50,000), beneficiary selector, transfer form, and real-time 8-stage 3D mechanical progress tracker.
3. **Receiver Experience (Rahul Sharma)**:
   - Received funds balance (₹68,500 demo initial balance + real-time incoming credits).
   - Incoming payments stream with instant alerts when transfers settle.
   - Cryptographic Proof Validator: inspects sender's public key, recalculates SHA-256 canonical digest, and confirms ECDSA signature validity.
4. **Banker / SOC Experience (SOC Manager)**:
   - Live network topology and 5-gate telemetry.
   - **Export Transaction CSV**: Generates RFC 4180 file with full cryptographic hashes, nonces, AAD, and latencies.
   - **Export Audit Logs CSV**: Generates timestamped security event stream file with categories and severities.
5. **Hacker Experience (Mallory Adversary)**:
   - MITM tampering, replay injection, and forgery attack laboratory with real WebCrypto rejection proofs.

### Visual Identity & Layout

- Maintains the high-end cyber-financial palette (`#080D18` canvas, `#101827` surface, `#35D6C5` cyan, `#4C8DFF` blue, `#FF4D5A` danger red, `#36D399` mint).
- Clean Top Bar with current authenticated user badge and instant "Switch Role" dropdown/action.
- Monospace tabular figures (`tabular-nums`) for all forensic hashes, timestamps, and financial figures.

***

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Dual CSV Exports vs. Single Mixed Export**
  - *Chosen Approach*: Two dedicated export buttons: "Export Transactions (CSV)" and "Export Audit Logs (CSV)".
  - *Why*: Separation of concerns for financial auditors (who need structured ledger balances, nonces, and receipts) versus cybersecurity analysts (who need high-frequency event timelines and intrusion detections).

- **Decision 2: Independent Receiver Signature Verification**
  - *Chosen Approach*: In the Receiver Portal, provide an "Inspect Cryptographic Signature" modal that actually re-runs `crypto.subtle.verify()` on the client side using the sender's public key and canonical digest.
  - *Why*: Proves that the receiver does not need to trust the bank blindly—they can cryptographically verify the sender's authentic authorization directly.

***

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CIPHERGUARD 3D CLIENT                             │
│                                                                             │
│  ┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────┐  │
│  │     Sender Portal     │ │    Receiver Portal    │ │   Banker SOC      │  │
│  │   (Transfer & Keys)   │ │ (Receipt Verification)│ │ (Forensic CSV)    │  │
│  └───────────┬───────────┘ └───────────┬───────────┘ └─────────┬─────────┘  │
│              │                         │                       │            │
│              └─────────────────────────┼───────────────────────┘            │
│                                        ▼                                    │
│                       ┌─────────────────────────────────┐                   │
│                       │   Auth Context & Session Store  │                   │
│                       │   - Current User & Role         │                   │
│                       │   - Receiver Balances & Stream  │                   │
│                       │   - CSV Generation Service      │                   │
│                       └────────────────┬────────────────┘                   │
└────────────────────────────────────────┼────────────────────────────────────┘
                                         │ HTTP & SSE (/api/*)
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EXPRESS FULL-STACK SERVER                           │
│  - /api/transactions (Supports Sender balance & Receiver credit updates)     │
│  - /api/receiver/account (Rahul Sharma received funds & ledger)             │
│  - /api/auth/login & /api/events (Real-time SSE broadcasting)               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Forensic CSV Data Schemas

1. **Transaction Ledger CSV Schema**:
   `TransactionID, TimestampISO, EpochMs, SenderName, SenderAccount, RecipientName, RecipientAccount, Amount, Currency, Status, TotalLatencyMs, Nonce, CanonicalDigest, AesGcmTag, CipherSuite, SignatureSnippet, FailingGate, RejectionReason`

2. **Security Audit Log CSV Schema**:
   `LogID, TimestampISO, EpochMs, Severity, Category, Message, TransactionUUID`

### Verification & Testing Plan

1. **Authentication Testing**:
   - Verify switching between Sender, Receiver, Banker, and Hacker updates navigation and active workspace immediately.
   - Verify unauthenticated / logout state returns to the Login Screen.
2. **CSV Export Testing**:
   - Trigger "Export Transactions" and verify downloaded `.csv` contains valid headers, quoted strings, and full cryptographic data.
   - Trigger "Export Audit Logs" and verify all logged security events are exported accurately.
3. **Receiver Experience Testing**:
   - When a transfer of ₹5,000 to Rahul Sharma completes, verify that the Receiver Portal updates his balance from ₹68,500 to ₹73,500 and lists the transaction with a "Verified" badge.
   - Click "Verify Proof" on the receiver card to verify the signature client-side.
4. **Cryptographic Engine Unit Testing**:
   - Automated unit tests in `tests/unit/crypto_test.ts` covering:
     - AES-256-GCM key/IV generation, authenticated encryption/decryption, bit-flip tamper detection, tag tampering rejection, and AAD mismatches.
     - ECDSA P-256 keypair generation, JWK export/import, canonical transaction signing, forgery detection, recipient diversion rejection, and malformed signature handling.
     - Deterministic canonical JSON serialization and SHA-256 digest integrity.
     - End-to-end 5-Gate mechanical security pipeline validation (TLS 1.3, AES-GCM, ECDSA, Nonce replay protection, and Ledger balance sufficiency).
5. **Real-Time Alerts Panel & Toast Notification System**:
   - `SecurityAlertsPanel` in BankerHome displaying live critical threats (MITM Attempt Detected, Signature Mismatch, Replay Attack Blocked).
   - Real-time `SecurityToastContainer` displaying floating animated alerts with countdown timers, origin IP/City forensics, and "Inspect in 5 Gates" deep-links.
   - Built-in Web Audio chime generator (`alertSound`) for critical/warning auditory alerts with mute/unmute control.
   - Quick test incident simulation controls (+ MITM, + Sig Mismatch, + Replay) and forensic clipboard reporting.
6. **Build & Lint Verification**:
   - Run `compile_applet` and `lint_applet` to confirm zero errors.

7. **SimpleMaps World SVG Threat Heatmap Upgrade**:
   - Integrated SimpleMaps world SVG map (`/public/assets/aistudio/world_d364c888.svg`) with Robinson projection coordinate transformation in `src/utils/worldMapUtils.ts`.
   - Enhanced `ThreatHeatmap.tsx` with high-precision vector country paths, country-level threat choropleth styling (Critical Red `#EF4444`, High Amber `#F59E0B`, Bank HQ Emerald `#10B981`), ballistic attack trajectory arcs, interactive hover tooltips with IP and risk scores, viewport presets (Global, Eurasia, Americas, Asia-Pacific), zoom controls, and live attack probe triggers.
   - Comprehensive unit test coverage in `tests/unit/world_map_test.ts` verifying projection calculations, coordinate bounds, and SVG path extraction (29/29 tests passing).

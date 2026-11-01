/**
 * CipherGuard 3D - Interactive Guided Tour & Cryptographic Sandbox Modal
 * Interactive learning center with live bit-tampering lab, avalanche effect hash explorer,
 * 5-gate step-through controller, and adversary attack triggers.
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Zap,
  Lock,
  Key,
  Network,
  RefreshCw,
  Server,
  Play,
  CheckCircle2,
  XCircle,
  HelpCircle,
  X,
  Keyboard,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  ChevronRight,
  ChevronLeft,
  Flame,
  ArrowRight,
  Sliders,
} from 'lucide-react';
import { alertSound } from '../../utils/alertSound';

interface InteractiveTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: 'overview' | 'customer' | 'receiver' | 'soc' | 'adversary' | 'architecture' | 'login') => void;
  onSelectRole: (role: 'sender' | 'receiver' | 'banker' | 'hacker') => void;
  onTriggerQuickDemo: () => void;
  onStep3DPipeline?: (stage: number) => void;
  onTriggerAttack?: (attackType: string) => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const InteractiveTourModal: React.FC<InteractiveTourModalProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  onSelectRole,
  onTriggerQuickDemo,
  onStep3DPipeline,
  onTriggerAttack,
  theme = 'dark',
  onToggleTheme,
}) => {
  const [activeTab, setActiveTab] = useState<'walkthrough' | 'tamper_lab' | 'avalanche_lab' | 'shortcuts'>('walkthrough');
  const [selectedGate, setSelectedGate] = useState<number>(1);
  const [soundOn, setSoundOn] = useState<boolean>(alertSound.isEnabled());

  // Tamper Sandbox State
  const [tamperAmount, setTamperAmount] = useState<number>(25000);
  const [isTampered, setIsTampered] = useState<boolean>(false);
  const [tamperTestResult, setTamperTestResult] = useState<'idle' | 'verified' | 'rejected'>('idle');

  // Avalanche Effect Hash Sandbox State
  const [inputText, setInputText] = useState<string>('TRANSFER INR 25,000 FROM ACC-PRIYA-9821 TO ACC-RAHUL-4401 NONCE=0x9f4a');
  const [calculatedHash, setCalculatedHash] = useState<string>('');
  const [prevHash, setPrevHash] = useState<string>('');
  const [bitDiffPercentage, setBitDiffPercentage] = useState<number>(0);

  // Toggle audio
  const handleToggleSound = () => {
    const next = !soundOn;
    alertSound.setEnabled(next);
    setSoundOn(next);
    if (next) {
      alertSound.playSuccessChime();
    }
  };

  // Compute live SHA-256 for avalanche lab
  useEffect(() => {
    async function computeHash() {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(inputText);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

        if (calculatedHash && calculatedHash !== hashHex) {
          setPrevHash(calculatedHash);
          // Calculate bit flips between old and new hash
          let diffBits = 0;
          for (let i = 0; i < hashHex.length; i++) {
            const val1 = parseInt(hashHex[i], 16);
            const val2 = parseInt(calculatedHash[i] || '0', 16);
            const xor = val1 ^ val2;
            diffBits += (xor & 1) + ((xor >> 1) & 1) + ((xor >> 2) & 1) + ((xor >> 3) & 1);
          }
          const percentage = Math.round((diffBits / 256) * 100);
          setBitDiffPercentage(percentage);
        }
        setCalculatedHash(hashHex);
      } catch {
        // Fallback for non-crypto environments
        setCalculatedHash('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
      }
    }
    computeHash();
  }, [inputText]);

  // Test Tamper Sandbox Verification
  const handleTestTamperVerification = () => {
    if (isTampered) {
      setTamperTestResult('rejected');
      alertSound.playCriticalAlert();
    } else {
      setTamperTestResult('verified');
      alertSound.playSuccessChime();
    }
  };

  const handleSelectGateStep = (gate: number) => {
    setSelectedGate(gate);
    alertSound.playGateStepTone(gate);
    if (onStep3DPipeline) {
      onStep3DPipeline(gate);
    }
  };

  if (!isOpen) return null;

  const gates = [
    {
      num: 1,
      name: 'TLS 1.3 Transport Handshake',
      std: 'RFC 8446',
      desc: 'Negotiates ephemeral (PFS) session keys with X25519 and blocks legacy insecure cipher suites.',
      color: '#35D6C5',
      icon: Network,
      failureProof: 'Blocks protocol downgrade attacks and cleartext man-in-the-middle sniffing.',
    },
    {
      num: 2,
      name: 'AES-256-GCM AEAD Tag',
      std: 'NIST SP 800-38D',
      desc: 'Wraps the canonical payload inside an authenticated envelope with a 128-bit Polyval MAC tag.',
      color: '#4C8DFF',
      icon: Lock,
      failureProof: 'Flipping a single bit in ciphertext triggers an immediate AEAD tag mismatch.',
    },
    {
      num: 3,
      name: 'ECDSA P-256 Digital Signature',
      std: 'FIPS 186-4',
      desc: 'Binds the transaction to the sender’s private key using the secp256r1 elliptic curve.',
      color: '#36D399',
      icon: Key,
      failureProof: 'Mathematically verifies non-repudiation. Forged signatures cannot produce valid (r, s).',
    },
    {
      num: 4,
      name: 'Nonce & Sliding Replay Cache',
      std: 'RFC 5246',
      desc: 'Enforces unique 128-bit cryptographically secure nonces and a 300-second sliding expiration window.',
      color: '#F5B942',
      icon: RefreshCw,
      failureProof: 'Resubmitting an identical valid packet is intercepted instantly by the cache.',
    },
    {
      num: 5,
      name: 'Double-Entry Ledger Settlement',
      std: 'ISO 20022',
      desc: 'Atomically commits debit from Priya and credit to Rahul with non-repudiable transaction receipts.',
      color: '#A78BFA',
      icon: Server,
      failureProof: 'Ensures ledger atomicity, balance caps, and zero double-spending.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col rounded-2xl bg-[#090e1a] border border-slate-800 shadow-2xl text-slate-200">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#35D6C5] to-[#4C8DFF] flex items-center justify-center text-slate-950 font-bold shadow-md shadow-[#35D6C5]/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-heading font-bold text-white flex items-center gap-2">
                CipherGuard 3D Interactive Guide &amp; Cryptographic Labs
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#35D6C5]/10 text-[#35D6C5] border border-[#35D6C5]/20">
                  LIVE INTERACTIVE
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Hands-on zero-trust architecture, live bit-tamper sandbox, and attack simulations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Toggle */}
            <button
              onClick={handleToggleSound}
              title={soundOn ? 'Mute Synthesizer Audio' : 'Unmute Synthesizer Audio'}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              {soundOn ? <Volume2 className="w-4 h-4 text-[#35D6C5]" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            {/* Theme Toggle */}
            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                title="Toggle Theme"
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-[#F5B942]" /> : <Moon className="w-4 h-4 text-indigo-400" />}
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800/80 bg-slate-900/30 text-xs">
          <button
            onClick={() => setActiveTab('walkthrough')}
            className={`flex items-center gap-2 px-3 py-2 rounded-t-lg font-medium transition-colors border-b-2 ${
              activeTab === 'walkthrough'
                ? 'border-[#35D6C5] text-white bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#35D6C5]" />
            <span>5-Gate Pipeline Walkthrough</span>
          </button>

          <button
            onClick={() => setActiveTab('tamper_lab')}
            className={`flex items-center gap-2 px-3 py-2 rounded-t-lg font-medium transition-colors border-b-2 ${
              activeTab === 'tamper_lab'
                ? 'border-[#FF4D5A] text-white bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-[#FF4D5A]" />
            <span>Live Bit-Tampering Sandbox</span>
          </button>

          <button
            onClick={() => setActiveTab('avalanche_lab')}
            className={`flex items-center gap-2 px-3 py-2 rounded-t-lg font-medium transition-colors border-b-2 ${
              activeTab === 'avalanche_lab'
                ? 'border-[#4C8DFF] text-white bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-[#4C8DFF]" />
            <span>SHA-256 Avalanche Explorer</span>
          </button>

          <button
            onClick={() => setActiveTab('shortcuts')}
            className={`flex items-center gap-2 px-3 py-2 rounded-t-lg font-medium transition-colors border-b-2 ${
              activeTab === 'shortcuts'
                ? 'border-[#F5B942] text-white bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5 text-[#F5B942]" />
            <span>Keyboard Shortcuts</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: 5-Gate Walkthrough */}
          {activeTab === 'walkthrough' && (
            <div className="space-y-6">
              {/* Gate Selector Pills */}
              <div className="grid grid-cols-5 gap-2">
                {gates.map((g) => {
                  const Icon = g.icon;
                  const isSelected = selectedGate === g.num;
                  return (
                    <button
                      key={g.num}
                      onClick={() => handleSelectGateStep(g.num)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-800 border-[#35D6C5] shadow-lg shadow-[#35D6C5]/10 ring-1 ring-[#35D6C5]'
                          : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-xs font-bold text-[#35D6C5]">Gate {g.num}</span>
                        <Icon className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="text-xs font-semibold text-white truncate">{g.name}</div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">{g.std}</div>
                    </button>
                  );
                })}
              </div>

              {/* Selected Gate Deep-Dive Card */}
              {(() => {
                const current = gates.find((g) => g.num === selectedGate) || gates[0];
                const Icon = current.icon;
                return (
                  <div className="p-6 rounded-xl bg-slate-900/70 border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${current.color}20`, color: current.color }}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-xs font-mono font-semibold" style={{ color: current.color }}>
                            GATE {current.num} PROTOCOL • {current.std}
                          </div>
                          <h3 className="text-lg font-bold text-white">{current.name}</h3>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          alertSound.playGateStepTone(current.num);
                          if (onStep3DPipeline) {
                            onStep3DPipeline(current.num);
                          }
                          onClose();
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#35D6C5]/10 hover:bg-[#35D6C5]/20 text-[#35D6C5] text-xs font-mono font-medium border border-[#35D6C5]/30 transition-all cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Pan 3D Camera To Gate {current.num}</span>
                      </button>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">{current.desc}</p>

                    <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
                      <div className="text-xs font-mono font-semibold text-[#34D399] mb-1">
                        CRYPTOGRAPHIC DEFENSE GUARANTEE:
                      </div>
                      <div className="text-xs text-slate-400 leading-relaxed">{current.failureProof}</div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <button
                        onClick={() => handleSelectGateStep(Math.max(1, selectedGate - 1))}
                        disabled={selectedGate === 1}
                        className="flex items-center gap-1 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs text-slate-300 cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" /> Previous Gate
                      </button>
                      <button
                        onClick={() => handleSelectGateStep(Math.min(5, selectedGate + 1))}
                        disabled={selectedGate === 5}
                        className="flex items-center gap-1 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs text-slate-300 cursor-pointer"
                      >
                        Next Gate <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Quick Launch Scenario Bar */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-[#101827] border border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-white mb-0.5">Want to witness the entire pipeline live?</h4>
                  <p className="text-xs text-slate-400">Launch an end-to-end simulated transaction with 3D animation.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onTriggerQuickDemo();
                      onClose();
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#35D6C5] to-[#4C8DFF] text-slate-950 font-semibold text-xs hover:opacity-90 transition-all cursor-pointer shadow-md"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Launch 3D Pipeline</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Live Bit-Tampering Sandbox */}
          {activeTab === 'tamper_lab' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-[#2a0e14] border border-[#ef4444]/40 text-xs text-rose-200">
                <div className="flex items-center gap-2 font-bold mb-1 text-rose-300">
                  <ShieldAlert className="w-4 h-4 text-[#ef4444]" />
                  <span>Interactive Adversary Bit-Tampering Simulator (Gate 2 AEAD)</span>
                </div>
                Toggle the switch below to simulate an adversary intercepting and modifying the transaction ciphertext or authentication tag in transit.
              </div>

              {/* Side-by-side: Payload vs Tamper Switch */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Legitimate Payload */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="text-xs font-mono font-semibold text-[#35D6C5]">
                    SENDER AUTHENTICATED PAYLOAD
                  </div>
                  <div className="p-3 rounded bg-slate-950 font-mono text-[11px] text-slate-300 space-y-1">
                    <div>{'{'}</div>
                    <div className="pl-4">"sender": "ACC-PRIYA-9821",</div>
                    <div className="pl-4">"recipient": "ACC-RAHUL-4401",</div>
                    <div className="pl-4">
                      "amount": <span className="text-[#35D6C5] font-bold">₹{tamperAmount.toLocaleString('en-IN')}</span>,
                    </div>
                    <div className="pl-4">"nonce": "0x9f4a821e",</div>
                    <div className="pl-4">"aeadTag": "0xa8f27c3e109d43bf"</div>
                    <div>{'}'}</div>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Calculated MAC: <span className="font-mono text-emerald-400">Valid Polyval 128-bit</span>
                  </div>
                </div>

                {/* Adversary Wire Tamper Controls */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="text-xs font-mono font-semibold text-[#FF4D5A]">
                    WIRE INTERCEPTION &amp; TAMPER SWITCH
                  </div>

                  <div className="p-3 rounded bg-slate-950 border border-slate-800 space-y-3">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-xs font-medium text-white">Flip 1 Ciphertext Bit (Amount ➔ ₹500,000)</span>
                      <input
                        type="checkbox"
                        checked={isTampered}
                        onChange={(e) => {
                          setIsTampered(e.target.checked);
                          setTamperTestResult('idle');
                        }}
                        className="w-4 h-4 accent-[#ef4444] cursor-pointer"
                      />
                    </label>

                    <div className="text-[11px] text-slate-400">
                      Status:{' '}
                      {isTampered ? (
                        <span className="text-rose-400 font-bold font-mono">TAMPERED // Bit 0x24 Inverted</span>
                      ) : (
                        <span className="text-emerald-400 font-mono">Pristine Wire State</span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleTestTamperVerification}
                    className="w-full py-2.5 rounded-lg bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-semibold text-xs transition-all shadow-md cursor-pointer"
                  >
                    Run Gate 2 Cryptographic Verification
                  </button>
                </div>
              </div>

              {/* Verification Result Feedback */}
              {tamperTestResult !== 'idle' && (
                <div
                  className={`p-4 rounded-xl border flex items-center gap-3 animate-fadeIn ${
                    tamperTestResult === 'verified'
                      ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
                  }`}
                >
                  {tamperTestResult === 'verified' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  )}
                  <div>
                    <div className="font-bold text-xs">
                      {tamperTestResult === 'verified'
                        ? 'GATE 2 PASSED: Authenticated Tag Matched Canonical Payload'
                        : 'GATE 2 REJECTED: AES-256-GCM AEAD Tag Mismatch Detected!'}
                    </div>
                    <div className="text-[11px] opacity-90 mt-0.5">
                      {tamperTestResult === 'verified'
                        ? 'Ciphertext integrity verified. Payload decrypted safely for Gate 3 signature check.'
                        : 'Because AES-GCM includes an authentication tag, changing even a single bit corrupts the tag. The transaction is instantly dropped and Priya’s balance remains safe.'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SHA-256 Avalanche Explorer */}
          {activeTab === 'avalanche_lab' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
                <div className="flex items-center gap-2 font-bold mb-1 text-[#4C8DFF]">
                  <Zap className="w-4 h-4 text-[#4C8DFF]" />
                  <span>Cryptographic Diffusion &amp; Avalanche Effect (FIPS 180-4)</span>
                </div>
                Type anything below. Notice how modifying just a single character causes approximately 50% of the entire 256-bit digest to flip unpredictably!
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Canonical Transaction Input String:</label>
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-[#4C8DFF]"
                />
              </div>

              {/* SHA-256 Result Box */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[#4C8DFF] font-semibold">SHA-256 CANONICAL DIGEST (256 BITS):</span>
                  {bitDiffPercentage > 0 && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800">
                      ~{bitDiffPercentage}% BITS FLIPPED
                    </span>
                  )}
                </div>
                <div className="font-mono text-xs text-emerald-400 break-all bg-slate-900 p-2.5 rounded border border-slate-800">
                  {calculatedHash}
                </div>
                {prevHash && (
                  <div className="text-[10px] font-mono text-slate-500 truncate">
                    Previous Hash: {prevHash}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: Keyboard Shortcuts */}
          {activeTab === 'shortcuts' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-300">
                Power users can navigate CipherGuard 3D instantly using global keyboard shortcuts:
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-300">Showcase / Sender Portal</span>
                  <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-[#35D6C5]">
                    1
                  </kbd>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-300">Receiver Home</span>
                  <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-[#36D399]">
                    2
                  </kbd>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-300">Banker Home (SOC Dashboard)</span>
                  <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-[#4C8DFF]">
                    3
                  </kbd>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-300">Hacker Home (Adversary Lab)</span>
                  <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-[#FF4D5A]">
                    4
                  </kbd>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-300">Toggle Dark / Light Theme</span>
                  <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-amber-400">
                    T
                  </kbd>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-300">Toggle Audio Synthesizer</span>
                  <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-emerald-400">
                    S
                  </kbd>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-300">Open Interactive Guide &amp; Lab</span>
                  <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-sky-400">
                    ? or G
                  </kbd>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-300">Advance 3D Pipeline Stage</span>
                  <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-indigo-400">
                    Space
                  </kbd>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-800 bg-slate-900/60 text-xs">
          <div className="text-[11px] text-slate-400">
            CipherGuard 3D • Zero-Trust Cryptographic Core • Web Crypto API
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition-colors cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};

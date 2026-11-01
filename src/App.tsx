/**
 * CipherGuard 3D - Master Application Entry
 * Full-Stack 4-Role Architecture (Sender, Receiver, Banker, Hacker) with 3D Simulation & Forensic CSV Export
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  UserProfile,
  UserRole,
  CustomerAccount,
  TransactionRecord,
  AuditLogItem,
  SocMetrics,
  AttackScenarioId,
} from './types/security';
import { Header } from './components/common/Header';
import { TransactionScene3D } from './components/3d/TransactionScene3D';
import { ShowcaseView } from './components/showcase/ShowcaseView';
import { SenderHome } from './components/sender/SenderHome';
import { ReceiverHome } from './components/receiver/ReceiverHome';
import { BankerHome } from './components/banker/BankerHome';
import { HackerHome } from './components/hacker/HackerHome';
import { ArchitectureView } from './components/architecture/ArchitectureModal';
import { LoginView, DEMO_PROFILES } from './components/auth/LoginView';
import { InteractiveTourModal } from './components/common/InteractiveTourModal';
import { alertSound } from './utils/alertSound';
import { RotateCcw } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'customer' | 'receiver' | 'soc' | 'adversary' | 'architecture' | 'login'>('overview');
  const [currentUser, setCurrentUser] = useState<UserProfile>(DEMO_PROFILES[0]);

  // Global Presentation Theme ('dark' default vs 'light' daytime presentation)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cipherguard_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    }
    return 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
      root.setAttribute('data-theme', 'light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    }
    localStorage.setItem('cipherguard_theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Interactive Guided Tour & Cryptographic Sandbox Modal State
  const [isTourModalOpen, setIsTourModalOpen] = useState<boolean>(false);

  // 3D Scene Animation State
  const [currentStage, setCurrentStage] = useState<number>(1);
  const [status, setStatus] = useState<'idle' | 'in_progress' | 'verified' | 'rejected' | 'tampered' | 'replay_blocked'>('idle');
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const [failingGateIndex, setFailingGateIndex] = useState<number | undefined>(undefined);
  const [activeAttackType, setActiveAttackType] = useState<string | undefined>(undefined);

  // Global Keyboard Shortcuts for interactive cyber navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing into input or textarea
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.key === '1') {
        setActiveTab('overview');
      } else if (e.key === '2') {
        setActiveTab('receiver');
      } else if (e.key === '3') {
        setActiveTab('soc');
      } else if (e.key === '4') {
        setActiveTab('adversary');
      } else if (e.key === 't' || e.key === 'T') {
        handleToggleTheme();
      } else if (e.key === 's' || e.key === 'S') {
        const next = !alertSound.isEnabled();
        alertSound.setEnabled(next);
        if (next) alertSound.playSuccessChime();
      } else if (e.key === '?' || e.key === 'g' || e.key === 'G') {
        setIsTourModalOpen((prev) => !prev);
      } else if (e.key === ' ') {
        e.preventDefault();
        setCurrentStage((prev) => {
          const next = (prev % 8) + 1;
          alertSound.playGateStepTone(next);
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Banking & Ledger State
  const [account, setAccount] = useState<CustomerAccount>({
    accountId: 'ACC-PRIYA-9821',
    accountHolder: 'Priya Sharma',
    accountNumber: '•••• •••• •••• 4892',
    balance: 250000.0,
    currency: 'INR',
    dailyLimit: 500000.0,
    status: 'active',
  });
  const [receiverBalance, setReceiverBalance] = useState<number>(68500.0);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [metrics, setMetrics] = useState<SocMetrics>({
    totalTransactions: 1,
    verifiedCount: 1,
    attackCount: 0,
    replayBlockedCount: 0,
    avgVerificationLatencyMs: 24,
    systemIntegrityScore: 100,
    tlsActiveSessions: 4,
  });

  const [selectedTransaction, setSelectedTransaction] = useState<TransactionRecord | null>(null);
  const [lastAttackResult, setLastAttackResult] = useState<TransactionRecord | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load state from backend
  const fetchData = async () => {
    try {
      const [txRes, socRes, recRes] = await Promise.all([
        fetch('/api/transactions'),
        fetch('/api/soc/stats'),
        fetch('/api/receiver'),
      ]);

      if (txRes.ok) {
        const txData = await txRes.json();
        setAccount(txData.account);
        setTransactions(txData.transactions);
        setAuditLogs(txData.auditLogs);
        if (txData.transactions.length > 0 && !selectedTransaction) {
          setSelectedTransaction(txData.transactions[0]);
        }
      }
      if (socRes.ok) {
        const socData = await socRes.json();
        setMetrics(socData);
      }
      if (recRes.ok) {
        const recData = await recRes.json();
        if (recData.account?.balance !== undefined) {
          setReceiverBalance(recData.account.balance);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch initial backend state:', err);
    }
  };

  useEffect(() => {
    fetchData();

    // Connect to SSE event stream
    const eventSource = new EventSource('/api/events');
    eventSource.addEventListener('transaction_completed', (e) => {
      try {
        const record = JSON.parse(e.data) as TransactionRecord;
        setTransactions((prev) => [record, ...prev.filter((t) => t.id !== record.id)]);
        setSelectedTransaction(record);
        fetchData();
      } catch (err) {
        console.error('SSE transaction parsing error:', err);
      }
    });

    eventSource.addEventListener('attack_detected', (e) => {
      try {
        const record = JSON.parse(e.data) as TransactionRecord;
        setTransactions((prev) => [record, ...prev.filter((t) => t.id !== record.id)]);
        setLastAttackResult(record);
        setSelectedTransaction(record);
        fetchData();
      } catch (err) {
        console.error('SSE attack parsing error:', err);
      }
    });

    eventSource.addEventListener('audit_log', (e) => {
      try {
        const log = JSON.parse(e.data) as AuditLogItem;
        setAuditLogs((prev) => [log, ...prev.slice(0, 100)]);
      } catch (err) {
        console.error('SSE audit parsing error:', err);
      }
    });

    eventSource.addEventListener('sandbox_reset', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.balance) setAccount((prev) => ({ ...prev, balance: data.balance }));
        if (data.receiverBalance) setReceiverBalance(data.receiverBalance);
        fetchData();
      } catch (err) {
        console.error('SSE reset parsing error:', err);
      }
    });

    return () => {
      eventSource.close();
    };
  }, []);

  // Handle stage autoplay progression
  const startStageProgression = (
    targetFinalStage: number = 8,
    finalStatus: 'verified' | 'tampered' | 'rejected' | 'replay_blocked' = 'verified',
    failingGate?: number,
    onComplete?: () => void
  ) => {
    setIsAutoPlaying(true);
    setStatus('in_progress');
    setFailingGateIndex(undefined);
    setCurrentStage(1);

    let stage = 1;
    if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);

    autoPlayTimerRef.current = setInterval(() => {
      stage += 1;
      if (stage <= targetFinalStage) {
        setCurrentStage(stage);
      } else {
        clearInterval(autoPlayTimerRef.current!);
        setIsAutoPlaying(false);
        setStatus(finalStatus);
        setFailingGateIndex(failingGate);
        if (onComplete) onComplete();
      }
    }, 1100);
  };

  // Sender initiates transfer
  const handleInitiateTransfer = async (details: {
    recipientId: string;
    recipientName: string;
    recipientAccount: string;
    amount: number;
    purpose: string;
  }) => {
    setIsProcessing(true);
    setActiveAttackType(undefined);

    try {
      const res = await fetch('/api/transactions/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(details),
      });

      const data = await res.json();
      if (data.record) {
        setSelectedTransaction(data.record);
        const record = data.record as TransactionRecord;

        startStageProgression(
          8,
          record.result.status,
          record.result.failingGateIndex,
          () => {
            setIsProcessing(false);
            setAccount((prev) => ({ ...prev, balance: data.newBalance }));
            if (data.receiverBalance !== undefined) {
              setReceiverBalance(data.receiverBalance);
            }
          }
        );
      } else {
        setIsProcessing(false);
      }
    } catch (err) {
      console.error('Transfer execution error:', err);
      setIsProcessing(false);
    }
  };

  // Adversary launches attack simulation
  const handleExecuteAttack = async (scenarioId: AttackScenarioId): Promise<TransactionRecord | null> => {
    setIsProcessing(true);
    setActiveAttackType(scenarioId);

    try {
      const res = await fetch('/api/simulate-attack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attackScenarioId: scenarioId }),
      });

      const data = await res.json();
      if (data.record) {
        const record = data.record as TransactionRecord;
        setLastAttackResult(record);
        setSelectedTransaction(record);

        const targetStage =
          scenarioId === 'mitm_amount_tamper' || scenarioId === 'mitm_recipient_tamper' ? 6 : 7;

        startStageProgression(
          targetStage,
          record.result.status,
          record.result.failingGateIndex,
          () => {
            setIsProcessing(false);
          }
        );
        return record;
      }
    } catch (err) {
      console.error('Adversary attack execution error:', err);
    } finally {
      setIsProcessing(false);
    }
    return null;
  };

  // Quick Demo Trigger from Hero
  const handleQuickDemo = () => {
    handleInitiateTransfer({
      recipientId: 'BENEF-1029',
      recipientName: 'Rahul Sharma',
      recipientAccount: '•••• •••• •••• 1029',
      amount: 5000,
      purpose: 'Live Cybersecurity Demonstration Transfer',
    });
  };

  // Handle Role Selection
  const handleSelectRole = (role: 'sender' | 'receiver' | 'banker' | 'hacker') => {
    const profile = DEMO_PROFILES.find((p) => p.role === role) || DEMO_PROFILES[0];
    setCurrentUser(profile);
    if (role === 'sender') setActiveTab('customer');
    if (role === 'receiver') setActiveTab('receiver');
    if (role === 'banker') setActiveTab('soc');
    if (role === 'hacker') setActiveTab('adversary');
  };

  // Handle Login submission
  const handleLogin = (profile: UserProfile) => {
    setCurrentUser(profile);
    if (profile.role === 'sender') setActiveTab('customer');
    if (profile.role === 'receiver') setActiveTab('receiver');
    if (profile.role === 'banker') setActiveTab('soc');
    if (profile.role === 'hacker') setActiveTab('adversary');
  };

  // Forensic Replay past transaction in 3D mechanical pipeline visualization
  const handleReplayTransaction = (tx: TransactionRecord) => {
    setSelectedTransaction(tx);

    const isVerified = tx.result.status === 'verified';
    const failingGate = tx.result.failingGateIndex || (!isVerified ? 2 : undefined);
    const targetStage = isVerified ? 8 : (failingGate === 2 ? 6 : 7);
    const finalStatus = isVerified ? 'verified' : (tx.result.status || 'tampered');

    setActiveAttackType((tx.attackType as AttackScenarioId) || undefined);

    // Smooth scroll to 3D Transaction Pipeline visualization
    const sceneElem = document.querySelector('section[aria-label="3D Transaction Pipeline"]');
    if (sceneElem) {
      sceneElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Trigger stage-by-stage 3D progression
    startStageProgression(targetStage, finalStatus, failingGate);
  };

  // Reset Sandbox
  const handleResetSandbox = async () => {
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      if (res.ok) {
        setCurrentStage(1);
        setStatus('idle');
        setFailingGateIndex(undefined);
        await fetchData();
      }
    } catch (err) {
      console.error('Failed to reset sandbox:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#080D18] text-[#F2F5FA] flex flex-col font-sans transition-colors duration-200">
      {/* Top Bar Header */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        currentUser={currentUser}
        onOpenLogin={() => setActiveTab('login')}
        senderBalance={account.balance}
        receiverBalance={receiverBalance}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenInteractiveTour={() => setIsTourModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* Persistent 3D Interactive Transaction Scene (shown except on login screen) */}
        {activeTab !== 'login' && (
          <section aria-label="3D Transaction Pipeline">
            <TransactionScene3D
              currentStage={currentStage}
              status={status}
              theme={theme}
              onStageSelect={(s) => {
                if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
                setIsAutoPlaying(false);
                setCurrentStage(s);
              }}
              isAutoPlaying={isAutoPlaying}
              onToggleAutoPlay={() => {
                if (isAutoPlaying) {
                  if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
                  setIsAutoPlaying(false);
                } else {
                  startStageProgression(
                    8,
                    status === 'tampered' ? 'tampered' : 'verified',
                    failingGateIndex
                  );
                }
              }}
              failingGateIndex={failingGateIndex}
              attackType={activeAttackType}
              transactionSummary={
                selectedTransaction
                  ? {
                      id: selectedTransaction.id,
                      amount: selectedTransaction.canonical.amount,
                      recipient: selectedTransaction.canonical.recipientName,
                    }
                  : undefined
              }
              onReset={() => {
                setCurrentStage(1);
                setStatus('idle');
                setFailingGateIndex(undefined);
              }}
            />
          </section>
        )}

        {/* View Switcher Content */}
        {activeTab === 'overview' && (
          <ShowcaseView
            onSelectRole={handleSelectRole}
            onSelectTab={setActiveTab}
            onTriggerQuickDemo={handleQuickDemo}
            isProcessing={isProcessing}
          />
        )}

        {activeTab === 'login' && (
          <LoginView
            onLogin={handleLogin}
            onCancel={() => setActiveTab('overview')}
          />
        )}

        {activeTab === 'customer' && (
          <SenderHome
            account={account}
            transactions={transactions}
            onInitiateTransfer={handleInitiateTransfer}
            isProcessing={isProcessing}
            activeTransactionRecord={selectedTransaction}
          />
        )}

        {activeTab === 'receiver' && (
          <ReceiverHome
            balance={receiverBalance}
            transactions={transactions}
            accountHolder="Rahul Sharma"
            accountNumber="•••• •••• •••• 1029"
          />
        )}

        {activeTab === 'soc' && (
          <BankerHome
            metrics={metrics}
            transactions={transactions}
            auditLogs={auditLogs}
            onSelectTransaction={setSelectedTransaction}
            selectedTransaction={selectedTransaction}
            onSimulateProbe={(scenarioId) => handleExecuteAttack(scenarioId as AttackScenarioId)}
            onReplayTransaction={handleReplayTransaction}
          />
        )}

        {activeTab === 'adversary' && (
          <HackerHome
            onExecuteAttack={handleExecuteAttack}
            isSimulating={isProcessing}
            lastAttackResult={lastAttackResult}
          />
        )}

        {activeTab === 'architecture' && <ArchitectureView />}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800 bg-[#080D18] py-6 px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-heading font-semibold text-slate-300">CIPHERGUARD 3D</span>
            <span>·</span>
            <span>Every Transaction Has a Guardian</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <span>TLS 1.3 RFC 8446</span>
            <span>·</span>
            <span>AES-256-GCM NIST SP 800-38D</span>
            <span>·</span>
            <button
              onClick={handleResetSandbox}
              className="text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Sandbox</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Interactive Guided Tour & Cryptographic Sandbox Modal */}
      <InteractiveTourModal
        isOpen={isTourModalOpen}
        onClose={() => setIsTourModalOpen(false)}
        onSelectTab={setActiveTab}
        onSelectRole={handleSelectRole}
        onTriggerQuickDemo={handleQuickDemo}
        onStep3DPipeline={(stage) => {
          if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
          setIsAutoPlaying(false);
          setCurrentStage(stage);
        }}
        onTriggerAttack={(attack) => handleExecuteAttack(attack as AttackScenarioId)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />
    </div>
  );
}

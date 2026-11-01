/**
 * CipherGuard 3D - SOC Threat Heatmap Visual Component
 * Powered by SimpleMaps SVG World Map Geometry (https://simplemaps.com/resources/svg-world)
 * Displays real-time geographic origin points of failed verification attempts,
 * in-flight packet interception vectors, and adversary deflection telemetry.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  TransactionRecord,
  ThreatOrigin,
} from '../../types/security';
import {
  WorldCountryPath,
  fetchWorldSvgPaths,
  projectRobinson,
  getCountryInfo,
  MAP_DIMENSIONS,
} from '../../utils/worldMapUtils';
import {
  Globe2,
  ShieldAlert,
  Radio,
  Crosshair,
  AlertTriangle,
  Zap,
  MapPin,
  ExternalLink,
  Filter,
  Layers,
  ChevronRight,
  ShieldCheck,
  Flame,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  TrendingUp,
  Server,
  Activity,
  Compass,
} from 'lucide-react';

interface ThreatHeatmapProps {
  transactions: TransactionRecord[];
  onSelectTransaction?: (tx: TransactionRecord) => void;
  onSimulateProbe?: (attackType: string) => void;
  onReplayTransaction?: (tx: TransactionRecord) => void;
}

// Fixed coordinates of Central Bank Vault (Core Defense HQ) in Mumbai, India
const VAULT_LOCATION: ThreatOrigin = {
  city: 'Mumbai',
  country: 'India',
  countryCode: 'IN',
  ip: '49.36.128.45',
  lat: 19.0760,
  lng: 72.8777,
  asn: 'AS55836 (Bank Core Infrastructure)',
  threatScore: 0,
};

// Regional viewport presets for rapid tactical focus
const VIEW_PRESETS: Record<string, { x: number; y: number; w: number; h: number; label: string }> = {
  global: { x: 0, y: 0, w: 2000, h: 857, label: 'Global World' },
  eurasia: { x: 850, y: 80, w: 950, h: 480, label: 'Eurasia Focus' },
  americas: { x: 150, y: 100, w: 800, h: 680, label: 'Americas Focus' },
  asia_pacific: { x: 1200, y: 150, w: 750, h: 550, label: 'Asia-Pacific' },
};

export const ThreatHeatmap: React.FC<ThreatHeatmapProps> = ({
  transactions,
  onSelectTransaction,
  onSimulateProbe,
  onReplayTransaction,
}) => {
  const [svgPaths, setSvgPaths] = useState<WorldCountryPath[]>([]);
  const [isLoadingPaths, setIsLoadingPaths] = useState<boolean>(true);
  const [selectedThreatTx, setSelectedThreatTx] = useState<TransactionRecord | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'mitm' | 'replay' | 'forgery' | 'expired'>('all');
  const [showTrajectoryArcs, setShowTrajectoryArcs] = useState<boolean>(true);
  const [showThermalGlow, setShowThermalGlow] = useState<boolean>(true);
  const [activeRegion, setActiveRegion] = useState<keyof typeof VIEW_PRESETS>('global');

  // Zoom & ViewBox State
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 2000, h: 857 });

  // Hover state for interactive tooltips
  const [hoveredCountry, setHoveredCountry] = useState<{
    code: string;
    name: string;
    threatCount: number;
    highestRisk: number;
    x: number;
    y: number;
  } | null>(null);

  const [hoveredThreatPin, setHoveredThreatPin] = useState<{
    origin: ThreatOrigin;
    count: number;
    attackTypes: string[];
    x: number;
    y: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Load SimpleMaps World SVG Paths on component mount
  useEffect(() => {
    let isMounted = true;
    fetchWorldSvgPaths()
      .then((paths) => {
        if (isMounted) {
          setSvgPaths(paths);
          setIsLoadingPaths(false);
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch SimpleMaps world.svg, using fallback:', err);
        if (isMounted) {
          setIsLoadingPaths(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter threat transactions (only non-verified, intercepted attempts)
  const threatTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const isFailed = tx.result.status !== 'verified';
      if (!isFailed) return false;

      if (activeFilter === 'mitm') {
        return tx.attackType === 'mitm_amount_tamper' || tx.attackType === 'mitm_recipient_tamper';
      }
      if (activeFilter === 'replay') {
        return tx.attackType === 'replay_attack' || tx.attackType === 'nonce_reuse';
      }
      if (activeFilter === 'forgery') {
        return tx.attackType === 'signature_forgery';
      }
      if (activeFilter === 'expired') {
        return tx.attackType === 'expired_timestamp';
      }
      return true;
    });
  }, [transactions, activeFilter]);

  // Aggregate threats by country code and origin coordinate cluster
  const { countryThreatStats, threatClusters } = useMemo(() => {
    const stats: Record<string, { count: number; highestScore: number; attackTypes: Set<string> }> = {};
    const clusters: Record<
      string,
      {
        origin: ThreatOrigin;
        count: number;
        transactions: TransactionRecord[];
        latestTx: TransactionRecord;
        attackTypes: Set<string>;
      }
    > = {};

    threatTransactions.forEach((tx) => {
      const origin: ThreatOrigin = tx.originGeo || {
        city: 'Bucharest',
        country: 'Romania',
        countryCode: 'RO',
        ip: '185.220.101.42',
        lat: 44.4268,
        lng: 26.1025,
        threatScore: 94,
        asn: 'AS9009 (Datacenter Ingress)',
      };

      const cCode = origin.countryCode.toUpperCase();
      if (!stats[cCode]) {
        stats[cCode] = { count: 0, highestScore: 0, attackTypes: new Set() };
      }
      stats[cCode].count += 1;
      stats[cCode].highestScore = Math.max(stats[cCode].highestScore, origin.threatScore ?? 75);
      if (tx.attackType) stats[cCode].attackTypes.add(tx.attackType);

      const clusterKey = `${origin.city}_${origin.countryCode}`;
      if (!clusters[clusterKey]) {
        clusters[clusterKey] = {
          origin,
          count: 0,
          transactions: [],
          latestTx: tx,
          attackTypes: new Set(),
        };
      }
      clusters[clusterKey].count += 1;
      clusters[clusterKey].transactions.push(tx);
      if (tx.attackType) clusters[clusterKey].attackTypes.add(tx.attackType);
      if (tx.createdAt > clusters[clusterKey].latestTx.createdAt) {
        clusters[clusterKey].latestTx = tx;
      }
    });

    return {
      countryThreatStats: stats,
      threatClusters: Object.values(clusters),
    };
  }, [threatTransactions]);

  // Projected vault location in SimpleMaps Robinson coordinates
  const vaultPoint = useMemo(
    () => projectRobinson(VAULT_LOCATION.lat, VAULT_LOCATION.lng),
    []
  );

  // Top threat nations leaderboard
  const topThreatCountries = useMemo(() => {
    return Object.entries(countryThreatStats)
      .map(([code, data]) => ({ code, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [countryThreatStats]);

  // Zoom handlers
  const handleZoom = (factor: number) => {
    setViewBox((prev) => {
      const newW = Math.max(500, Math.min(2000, prev.w * factor));
      const newH = Math.max(214, Math.min(857, prev.h * factor));
      const newX = Math.max(0, Math.min(2000 - newW, prev.x + (prev.w - newW) / 2));
      const newY = Math.max(0, Math.min(857 - newH, prev.y + (prev.h - newH) / 2));
      return { x: newX, y: newY, w: newW, h: newH };
    });
  };

  const handleSelectPreset = (key: keyof typeof VIEW_PRESETS) => {
    setActiveRegion(key);
    const p = VIEW_PRESETS[key];
    setViewBox({ x: p.x, y: p.y, w: p.w, h: p.h });
  };

  // Helper to determine country fill styling based on threat level
  const getCountryFill = (code: string): string => {
    if (code === 'IN') {
      // Central Bank Core HQ
      return 'rgba(16, 185, 129, 0.22)';
    }

    const threat = countryThreatStats[code];
    if (!threat) {
      return '#121e33'; // Calm cyber slate
    }

    if (threat.highestScore >= 90) {
      return 'rgba(239, 68, 68, 0.45)'; // Critical Threat Red
    }
    if (threat.highestScore >= 75) {
      return 'rgba(245, 158, 11, 0.38)'; // High Threat Amber
    }
    return 'rgba(139, 92, 246, 0.32)'; // Medium Threat Violet
  };

  const getCountryStroke = (code: string): string => {
    if (code === 'IN') return '#10B981';
    const threat = countryThreatStats[code];
    if (!threat) return '#1e2e4a';
    if (threat.highestScore >= 90) return '#EF4444';
    if (threat.highestScore >= 75) return '#F59E0B';
    return '#A78BFA';
  };

  return (
    <div
      ref={containerRef}
      className="rounded-xl bg-[#101827] border border-slate-800 overflow-hidden shadow-2xl relative"
    >
      {/* Top Header & Cyber Ingress Control Bar */}
      <div className="p-4 lg:p-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-[#131d2e] to-slate-900 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-[#FF4D5A]/10 border border-[#FF4D5A]/30 text-[#FF4D5A]">
              <Flame className="w-4 h-4" />
            </span>
            <h3 className="text-base font-heading font-bold text-white tracking-tight flex items-center gap-2">
              SimpleMaps SOC Threat Radar & Vector Interception
              <span className="text-[10px] font-mono uppercase bg-[#35D6C5]/10 text-[#35D6C5] px-2 py-0.5 rounded border border-[#35D6C5]/30">
                Robinson Projection
              </span>
            </h3>
            <span className="text-slate-600">·</span>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Ingress Deflection
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl">
            Geographic choropleth and real-time trajectory arcs rendered on the SimpleMaps high-precision vector grid. Tracks origin nodes of failed cryptographic checks.
          </p>
        </div>

        {/* Heatmap Action & Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Attack Vector Filter Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-950/80 rounded-lg border border-slate-800 text-[11px] font-sans">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeFilter === 'all'
                  ? 'bg-slate-800 text-white font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Vectors ({threatTransactions.length})
            </button>
            <button
              onClick={() => setActiveFilter('mitm')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeFilter === 'mitm'
                  ? 'bg-slate-800 text-[#FF4D5A] font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              MITM Bit-Flips
            </button>
            <button
              onClick={() => setActiveFilter('replay')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeFilter === 'replay'
                  ? 'bg-slate-800 text-[#F5B942] font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Replay Attacks
            </button>
            <button
              onClick={() => setActiveFilter('forgery')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeFilter === 'forgery'
                  ? 'bg-slate-800 text-[#A78BFA] font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Signature Forgeries
            </button>
          </div>

          {/* Toggle Trajectory Arcs */}
          <button
            onClick={() => setShowTrajectoryArcs(!showTrajectoryArcs)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-colors flex items-center gap-1.5 ${
              showTrajectoryArcs
                ? 'bg-[#35D6C5]/10 border-[#35D6C5]/40 text-[#35D6C5]'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle ballistic attack trajectory arcs"
          >
            <Radio className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Arcs</span>
          </button>

          {/* Thermal Glow Toggle */}
          <button
            onClick={() => setShowThermalGlow(!showThermalGlow)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-colors flex items-center gap-1.5 ${
              showThermalGlow
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle threat thermal glow"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Heatmap</span>
          </button>
        </div>
      </div>

      {/* Threat Summary KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-800 border-b border-slate-800 bg-slate-950/60 text-xs font-mono">
        <div className="p-3 px-4">
          <span className="text-slate-500 block text-[10px] uppercase">Interceptions Logged</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-base font-bold text-[#FF4D5A] tabular-nums font-heading">
              {threatTransactions.length} Adversary Vectors
            </span>
            <span className="text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.2 rounded border border-red-500/20 font-semibold">
              DEFLECTED
            </span>
          </div>
        </div>

        <div className="p-3 px-4">
          <span className="text-slate-500 block text-[10px] uppercase">Active Threat Nations</span>
          <div className="mt-0.5 text-white font-medium flex items-center gap-2">
            <span>{Object.keys(countryThreatStats).length} Sovereign Regions</span>
            {topThreatCountries.length > 0 && (
              <span className="text-[10px] text-amber-400 font-mono">
                (Top: {topThreatCountries[0].code})
              </span>
            )}
          </div>
        </div>

        <div className="p-3 px-4">
          <span className="text-slate-500 block text-[10px] uppercase">Vault Barrier Integrity</span>
          <div className="flex items-center gap-1.5 mt-0.5 text-[#36D399] font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>100.0% Zero-Trust Stop</span>
          </div>
        </div>

        <div className="p-3 px-4">
          <span className="text-slate-500 block text-[10px] uppercase">Core Settlement Gateway</span>
          <div className="mt-0.5 text-[#35D6C5] font-medium truncate flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            <span>Bank Central Vault (Mumbai, IN)</span>
          </div>
        </div>
      </div>

      {/* Main Interactive Map Canvas Container */}
      <div className="relative bg-[#080d17] overflow-hidden min-h-[420px] select-none">
        {/* Ambient Matrix Dot Grid */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #35D6C5 1px, transparent 0)`,
            backgroundSize: '28px 28px',
          }}
        />

        {/* Viewport Presets & Zoom Navigation Toolbar */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-md p-1.5 rounded-lg border border-slate-800 shadow-xl">
          <div className="flex items-center gap-1 pr-1 border-r border-slate-800">
            {(Object.keys(VIEW_PRESETS) as Array<keyof typeof VIEW_PRESETS>).map((key) => (
              <button
                key={key}
                onClick={() => handleSelectPreset(key)}
                className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                  activeRegion === key
                    ? 'bg-[#35D6C5]/20 text-[#35D6C5] font-semibold border border-[#35D6C5]/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {VIEW_PRESETS[key].label}
              </button>
            ))}
          </div>

          <button
            onClick={() => handleZoom(0.8)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleZoom(1.25)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleSelectPreset('global')}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Reset to 100% Global View"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Loading Spinner for SVG Paths */}
        {isLoadingPaths && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm gap-2 text-slate-400 font-mono text-xs">
            <Activity className="w-6 h-6 text-[#35D6C5] animate-spin" />
            <span>Loading SimpleMaps World Vector Geometry...</span>
          </div>
        )}

        {/* SVG World Map */}
        <svg
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
          className="w-full h-auto max-h-[500px] block transition-all duration-500 ease-out"
          style={{ filter: 'drop-shadow(0 4px 24px rgba(0,0,0,0.8))' }}
        >
          <defs>
            {/* Threat Glow Filter */}
            <filter id="threat-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Vault Beacon Glow Filter */}
            <filter id="vault-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Linear Gradient for Trajectory Deflection Ray */}
            <linearGradient id="attackVectorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF4D5A" stopOpacity="0.95" />
              <stop offset="45%" stopColor="#F5B942" stopOpacity="0.75" />
              <stop offset="85%" stopColor="#35D6C5" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.1" />
            </linearGradient>

            {/* Radial Thermal Gradient Pattern */}
            <radialGradient id="thermalRadial" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FF4D5A" stopOpacity="0.35" />
              <stop offset="60%" stopColor="#F5B942" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#FF4D5A" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Cartographic Coordinate Graticule (Robinson Latitudes & Longitudes) */}
          <g stroke="#1a253a" strokeWidth="0.6" strokeDasharray="4,6" opacity="0.65">
            {/* Major parallels: Equator, Tropics, Polar Circles */}
            <line x1="0" y1="428.5" x2="2000" y2="428.5" stroke="#2a3d5e" strokeWidth="0.8" /> {/* Equator */}
            <line x1="0" y1="214" x2="2000" y2="214" /> {/* Northern Tropic */}
            <line x1="0" y1="642" x2="2000" y2="642" /> {/* Southern Tropic */}
            <line x1="0" y1="107" x2="2000" y2="107" strokeDasharray="2,4" />
            <line x1="0" y1="750" x2="2000" y2="750" strokeDasharray="2,4" />
            {/* Meridians */}
            <line x1="1000" y1="0" x2="1000" y2="857" stroke="#2a3d5e" strokeWidth="0.8" /> {/* Prime Meridian */}
            <line x1="500" y1="0" x2="500" y2="857" />
            <line x1="1500" y1="0" x2="1500" y2="857" />
          </g>

          {/* SimpleMaps World SVG Country Polygons Layer */}
          <g id="simplemaps-countries" strokeLinecap="round" strokeLinejoin="round">
            {svgPaths.length > 0 ? (
              svgPaths.map((pathItem, idx) => {
                const info = getCountryInfo(pathItem);
                const threatData = countryThreatStats[info.code];
                const hasThreat = !!threatData;
                const isBankHQ = info.code === 'IN';
                const fillColor = getCountryFill(info.code);
                const strokeColor = getCountryStroke(info.code);

                return (
                  <path
                    key={`country-path-${idx}-${pathItem.id || pathItem.className || 'geom'}`}
                    id={pathItem.id}
                    className={`transition-colors duration-150 cursor-pointer ${
                      hasThreat ? 'hover:brightness-125' : 'hover:fill-[#1b2b48]'
                    }`}
                    d={pathItem.d}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={isBankHQ ? '1.2' : hasThreat ? '0.8' : '0.4'}
                    onMouseEnter={(e) => {
                      const rect = containerRef.current?.getBoundingClientRect();
                      const x = rect ? e.clientX - rect.left : e.clientX;
                      const y = rect ? e.clientY - rect.top : e.clientY;
                      setHoveredCountry({
                        code: info.code,
                        name: info.name,
                        threatCount: threatData?.count ?? 0,
                        highestRisk: threatData?.highestScore ?? 0,
                        x,
                        y,
                      });
                    }}
                    onMouseLeave={() => setHoveredCountry(null)}
                    onClick={() => {
                      if (hasThreat) {
                        const matchingTx = threatTransactions.find(
                          (t) => (t.originGeo?.countryCode || '').toUpperCase() === info.code
                        );
                        if (matchingTx) {
                          setSelectedThreatTx(matchingTx);
                          onSelectTransaction?.(matchingTx);
                        }
                      }
                    }}
                  />
                );
              })
            ) : (
              /* Fallback landmasses if SVG is loading */
              <g fill="#121e33" stroke="#1e2e4a" strokeWidth="0.5">
                <rect x="0" y="0" width="2000" height="857" fill="#080d17" />
              </g>
            )}
          </g>

          {/* Thermal Glow Halo Overlays for High-Density Threat Zones */}
          {showThermalGlow &&
            threatClusters.map((cluster, cIdx) => {
              const pt = projectRobinson(cluster.origin.lat, cluster.origin.lng);
              const radius = 35 + Math.min(cluster.count * 15, 60);

              return (
                <circle
                  key={`thermal-glow-${cIdx}-${cluster.origin.city || cluster.origin.countryCode}`}
                  cx={pt.x}
                  cy={pt.y}
                  r={radius}
                  fill="url(#thermalRadial)"
                  pointerEvents="none"
                />
              );
            })}

          {/* Central Defense Radar Perimeter Rings around Mumbai Vault */}
          <g stroke="#35D6C5" strokeWidth="0.75" fill="none" opacity="0.35">
            <circle cx={vaultPoint.x} cy={vaultPoint.y} r="70" />
            <circle cx={vaultPoint.x} cy={vaultPoint.y} r="140" strokeDasharray="5,5" />
            <circle cx={vaultPoint.x} cy={vaultPoint.y} r="240" strokeDasharray="3,6" />
            {/* Defensive Crosshair Axes */}
            <line
              x1={vaultPoint.x - 30}
              y1={vaultPoint.y}
              x2={vaultPoint.x + 30}
              y2={vaultPoint.y}
              stroke="#36D399"
              strokeWidth="0.8"
            />
            <line
              x1={vaultPoint.x}
              y1={vaultPoint.y - 30}
              x2={vaultPoint.x}
              y2={vaultPoint.y + 30}
              stroke="#36D399"
              strokeWidth="0.8"
            />
          </g>

          {/* Ballistic Trajectory Attack Vector Arcs from Threats to Bank Vault */}
          {showTrajectoryArcs &&
            threatClusters.map((cluster, cIdx) => {
              const originPoint = projectRobinson(cluster.origin.lat, cluster.origin.lng);

              // Calculate bezier control point curving toward northern pole for great-circle appearance
              const midX = (originPoint.x + vaultPoint.x) / 2;
              const dist = Math.hypot(vaultPoint.x - originPoint.x, vaultPoint.y - originPoint.y);
              const curveHeight = Math.min(dist * 0.28, 90);
              const midY = Math.min(originPoint.y, vaultPoint.y) - curveHeight;

              const pathString = `M ${originPoint.x} ${originPoint.y} Q ${midX} ${midY} ${vaultPoint.x} ${vaultPoint.y}`;

              return (
                <g key={`arc-vector-${cIdx}-${cluster.origin.city || cluster.origin.countryCode}`}>
                  {/* Outer Deflection Glow Vector */}
                  <path
                    d={pathString}
                    fill="none"
                    stroke="#FF4D5A"
                    strokeWidth="3"
                    opacity="0.15"
                  />
                  {/* Deflected Vector Trajectory Curve */}
                  <path
                    d={pathString}
                    fill="none"
                    stroke="url(#attackVectorGrad)"
                    strokeWidth="1.6"
                    strokeDasharray="6,4"
                    opacity="0.8"
                  />
                  {/* High-Speed Adversary Packet Particle Racing toward Vault */}
                  <circle r="3" fill="#FF4D5A" opacity="0.95" filter="url(#threat-glow)">
                    <animateMotion
                      path={pathString}
                      dur="2.5s"
                      repeatCount="indefinite"
                    />
                  </circle>
                  {/* Secondary Staggered Particle */}
                  <circle r="1.8" fill="#F5B942" opacity="0.85">
                    <animateMotion
                      path={pathString}
                      dur="2.5s"
                      begin="1.25s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </g>
              );
            })}

          {/* Central Bank Core Vault Node (Mumbai Defense Node) */}
          <g className="cursor-pointer" onClick={() => setSelectedThreatTx(null)}>
            {/* Defensive Radar Ping Wave */}
            <circle
              cx={vaultPoint.x}
              cy={vaultPoint.y}
              r="22"
              fill="#36D399"
              opacity="0.2"
              className="animate-ping"
              style={{ animationDuration: '3s' }}
            />
            {/* Outer Armor Ring */}
            <circle
              cx={vaultPoint.x}
              cy={vaultPoint.y}
              r="12"
              fill="#064e3b"
              stroke="#36D399"
              strokeWidth="2"
              filter="url(#vault-glow)"
            />
            {/* Inner Core Shield Node */}
            <circle
              cx={vaultPoint.x}
              cy={vaultPoint.y}
              r="5"
              fill="#35D6C5"
            />
            {/* Vault Gateway Label */}
            <g transform={`translate(${vaultPoint.x}, ${vaultPoint.y + 24})`}>
              <rect
                x="-64"
                y="-11"
                width="128"
                height="16"
                rx="3"
                fill="#052e16"
                stroke="#10b981"
                strokeWidth="0.8"
                opacity="0.92"
              />
              <text
                x="0"
                y="1"
                fill="#34d399"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
                textAnchor="middle"
                className="tracking-wider uppercase"
              >
                BANK CORE (GATEWAY 01)
              </text>
            </g>
          </g>

          {/* Threat Origin Clusters & Adversary Nodes */}
          {threatClusters.map((cluster, cIdx) => {
            const point = projectRobinson(cluster.origin.lat, cluster.origin.lng);
            const isSelected = selectedThreatTx?.id === cluster.latestTx.id;
            const isHighRisk = (cluster.origin.threatScore ?? 80) >= 90;
            const markerColor = isHighRisk ? '#FF4D5A' : '#F5B942';

            return (
              <g
                key={`threat-marker-${cIdx}-${cluster.origin.city || cluster.origin.countryCode}`}
                className="cursor-pointer group"
                onClick={() => {
                  setSelectedThreatTx(cluster.latestTx);
                  onSelectTransaction?.(cluster.latestTx);
                }}
                onMouseEnter={(e) => {
                  const rect = containerRef.current?.getBoundingClientRect();
                  const x = rect ? e.clientX - rect.left : e.clientX;
                  const y = rect ? e.clientY - rect.top : e.clientY;
                  setHoveredThreatPin({
                    origin: cluster.origin,
                    count: cluster.count,
                    attackTypes: Array.from(cluster.attackTypes),
                    x,
                    y,
                  });
                }}
                onMouseLeave={() => setHoveredThreatPin(null)}
              >
                {/* Radiating Ping Pulse */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={12 + cluster.count * 3}
                  fill={markerColor}
                  opacity="0.3"
                  className="animate-ping"
                  style={{ animationDuration: '2s' }}
                />

                {/* Outer Ring */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={8 + cluster.count * 2}
                  fill={markerColor}
                  opacity={isSelected ? '0.45' : '0.2'}
                  stroke={markerColor}
                  strokeWidth={isSelected ? '2' : '1'}
                />

                {/* Core Threat Crosshair Node */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isSelected ? 6 : 4.5}
                  fill={markerColor}
                  stroke="#080d17"
                  strokeWidth="1.8"
                  filter="url(#threat-glow)"
                />

                {/* Pin Label Banner */}
                <g transform={`translate(${point.x}, ${point.y - 12})`}>
                  <rect
                    x="-42"
                    y="-11"
                    width="84"
                    height="14"
                    rx="2"
                    fill="#1e1018"
                    stroke={markerColor}
                    strokeWidth="0.75"
                    opacity="0.9"
                  />
                  <text
                    x="0"
                    y="-1"
                    fill="#fecdd3"
                    fontSize="8.5"
                    fontFamily="monospace"
                    fontWeight="600"
                    textAnchor="middle"
                    className="drop-shadow pointer-events-none"
                  >
                    {cluster.origin.city} ({cluster.count})
                  </text>
                </g>
              </g>
            );
          })}
        </svg>

        {/* Dynamic Country Hover Tooltip */}
        {hoveredCountry && !hoveredThreatPin && (
          <div
            className="absolute z-30 pointer-events-none bg-slate-950/95 backdrop-blur-md border border-slate-700 p-2.5 rounded-lg shadow-2xl text-xs font-mono transform -translate-x-1/2 -translate-y-full mb-2"
            style={{ left: hoveredCountry.x, top: hoveredCountry.y }}
          >
            <div className="flex items-center gap-1.5 font-bold text-white mb-1">
              <span className="w-2 h-2 rounded-full bg-[#35D6C5]" />
              <span>{hoveredCountry.name}</span>
              <span className="text-slate-400 text-[10px]">[{hoveredCountry.code}]</span>
            </div>
            {hoveredCountry.threatCount > 0 ? (
              <div className="space-y-0.5 text-[11px]">
                <div className="text-red-400 font-semibold flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" />
                  <span>{hoveredCountry.threatCount} Inbound Adversary Probes</span>
                </div>
                <div className="text-slate-300">
                  Peak Risk Score: <span className="text-amber-400">{hoveredCountry.highestRisk}%</span>
                </div>
                <div className="text-[10px] text-emerald-400 pt-0.5">
                  100% Intercepted at Cryptographic Gate
                </div>
              </div>
            ) : hoveredCountry.code === 'IN' ? (
              <div className="text-emerald-400 text-[11px] font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>Central Vault HQ (Zero-Exposure)</span>
              </div>
            ) : (
              <div className="text-slate-400 text-[10px]">
                Zero active threats detected in current block window
              </div>
            )}
          </div>
        )}

        {/* Dynamic Threat Pin Hover Tooltip */}
        {hoveredThreatPin && (
          <div
            className="absolute z-30 pointer-events-none bg-slate-950/95 backdrop-blur-md border border-red-500/40 p-3 rounded-lg shadow-2xl text-xs font-mono transform -translate-x-1/2 -translate-y-full mb-3 max-w-xs"
            style={{ left: hoveredThreatPin.x, top: hoveredThreatPin.y }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-1.5 mb-1.5">
              <div className="flex items-center gap-1.5 font-bold text-red-400">
                <Crosshair className="w-3.5 h-3.5" />
                <span>{hoveredThreatPin.origin.city}, {hoveredThreatPin.origin.countryCode}</span>
              </div>
              <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.2 rounded border border-red-500/30">
                {hoveredThreatPin.count} Attack Vectors
              </span>
            </div>
            <div className="space-y-1 text-[11px] text-slate-300">
              <div>
                IP: <span className="text-white font-mono">{hoveredThreatPin.origin.ip}</span>
              </div>
              <div>
                Risk Score: <span className="text-red-400 font-bold">{hoveredThreatPin.origin.threatScore ?? 92}% CRITICAL</span>
              </div>
              <div className="text-slate-400 text-[10px] truncate">
                ASN: {hoveredThreatPin.origin.asn || 'AS9009 Edge Host'}
              </div>
              <div className="pt-1 text-[10px] text-[#35D6C5]">
                Click node to inspect cryptographic failure proof
              </div>
            </div>
          </div>
        )}

        {/* Floating Quick Legend in Bottom Left */}
        <div className="absolute bottom-3 left-3 bg-slate-950/85 backdrop-blur-md border border-slate-800 p-2.5 rounded-lg text-[10px] font-mono space-y-1.5 shadow-lg max-w-[260px] hidden sm:block">
          <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-800 pb-1 flex items-center justify-between">
            <span>SimpleMaps Legend</span>
            <span className="text-[#35D6C5]">W:2000 H:857</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] shrink-0" />
            <span className="text-slate-300">Bank Core Vault (Mumbai Settlement HQ)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] shrink-0" />
            <span className="text-slate-300">Critical Origin (MITM / Tag Forgery &gt;90%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] shrink-0" />
            <span className="text-slate-300">High Risk Origin (Replay / Nonce Reuse)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-0.5 bg-gradient-to-r from-[#FF4D5A] to-[#35D6C5] shrink-0" />
            <span className="text-slate-300">Intercepted Flight Vector Trajectory</span>
          </div>
        </div>

        {/* Simulation Probe Trigger Quick Buttons in Bottom Right */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          {onSimulateProbe && (
            <div className="flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-md p-1 rounded-lg border border-slate-800 shadow-xl">
              <span className="text-[10px] font-mono text-slate-400 px-1.5 hidden md:inline">
                Simulate:
              </span>
              <button
                onClick={() => onSimulateProbe('mitm_amount_tamper')}
                className="px-2.5 py-1 rounded bg-[#FF4D5A]/15 border border-[#FF4D5A]/40 hover:bg-[#FF4D5A]/25 text-[#FF4D5A] text-[11px] font-mono font-medium transition-all flex items-center gap-1"
                title="Simulate inbound MITM ciphertext bit-flip from Bucharest"
              >
                <Crosshair className="w-3 h-3" />
                <span>MITM Probe</span>
              </button>
              <button
                onClick={() => onSimulateProbe('signature_forgery')}
                className="px-2.5 py-1 rounded bg-[#A78BFA]/15 border border-[#A78BFA]/40 hover:bg-[#A78BFA]/25 text-[#A78BFA] text-[11px] font-mono font-medium transition-all flex items-center gap-1"
                title="Simulate ECDSA signature forgery from Ashburn"
              >
                <ShieldAlert className="w-3 h-3" />
                <span>Sig Probe</span>
              </button>
              <button
                onClick={() => onSimulateProbe('replay_attack')}
                className="px-2.5 py-1 rounded bg-[#F5B942]/15 border border-[#F5B942]/40 hover:bg-[#F5B942]/25 text-[#F5B942] text-[11px] font-mono font-medium transition-all flex items-center gap-1"
                title="Simulate nonce replay attack from Frankfurt"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Replay</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Selected Threat Point Detailed Forensic Drawer */}
      {selectedThreatTx && (
        <div className="p-5 border-t border-slate-800 bg-slate-900/95 backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-5 transition-all">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-[#FF4D5A] bg-[#FF4D5A]/10 px-2 py-0.5 rounded border border-[#FF4D5A]/30 font-semibold">
                INTERCEPTED IN-FLIGHT PACKET
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-xs text-white font-medium">
                {selectedThreatTx.originGeo?.city ?? 'Bucharest'}, {selectedThreatTx.originGeo?.country ?? 'Romania'}
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-xs font-mono text-slate-400">
                IP: {selectedThreatTx.originGeo?.ip ?? '185.220.101.42'}
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-xs font-mono text-amber-400">
                Risk: {selectedThreatTx.originGeo?.threatScore ?? 94}%
              </span>
            </div>

            <div className="text-xs text-slate-300">
              <strong className="text-white">Deflected Reason: </strong>
              <span className="text-[#FF4D5A] font-mono font-medium">
                {selectedThreatTx.result.failureReason || 'Cryptographic verification failure'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-400 pt-1">
              <span>Autonomous System: {selectedThreatTx.originGeo?.asn ?? 'AS9009 Edge Host'}</span>
              <span>·</span>
              <span className="text-slate-300">
                Defending Gate: Gate 0{selectedThreatTx.result.failingGateIndex ?? 2} (
                {selectedThreatTx.result.gates?.[(selectedThreatTx.result.failingGateIndex ?? 2) - 1]?.name || 'Cryptographic Shield'}
                )
              </span>
              <span>·</span>
              <span className="text-emerald-400 font-semibold">Ledger Impact: ₹0 (Zero Exposure)</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              onClick={() => setSelectedThreatTx(null)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors cursor-pointer"
            >
              Dismiss
            </button>
            {onReplayTransaction && (
              <button
                onClick={() => onReplayTransaction(selectedThreatTx)}
                className="px-3.5 py-1.5 rounded-lg bg-[#4C8DFF]/20 hover:bg-[#4C8DFF] text-[#4C8DFF] hover:text-white border border-[#4C8DFF]/40 text-xs font-semibold font-mono transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer group/threatreplay"
                title={`Forensically replay threat packet ${selectedThreatTx.id} in 3D security pipeline`}
              >
                <RotateCcw className="w-3.5 h-3.5 group-hover/threatreplay:-rotate-90 transition-transform duration-300" />
                <span>Replay in 3D</span>
              </button>
            )}
            <button
              onClick={() => onSelectTransaction?.(selectedThreatTx)}
              className="px-3.5 py-1.5 rounded-lg bg-[#35D6C5] hover:bg-[#28b8a8] text-slate-950 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
            >
              <span>Inspect 5-Gate Proof</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

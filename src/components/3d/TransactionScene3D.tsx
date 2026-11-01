/**
 * CipherGuard 3D - Interactive WebGL 3D Transaction Pipeline
 * Built with Three.js, RoomEnvironment, PBR Materials & Mechanical Kinematics
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  Shield,
  Lock,
  Key,
  Network,
  Cpu,
  AlertTriangle,
  CheckCircle,
  Eye,
  Maximize2,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface TransactionScene3DProps {
  currentStage: number; // 1 to 8
  status: 'idle' | 'in_progress' | 'verified' | 'rejected' | 'tampered' | 'replay_blocked';
  onStageSelect: (stage: number) => void;
  isAutoPlaying: boolean;
  onToggleAutoPlay: () => void;
  failingGateIndex?: number;
  attackType?: string;
  transactionSummary?: {
    id: string;
    amount: number;
    recipient: string;
  };
  onReset?: () => void;
  theme?: 'dark' | 'light';
}

export const STAGES_CONFIG = [
  {
    step: 1,
    title: 'Transaction Creation',
    shortTitle: 'Payload',
    subtitle: 'Formulation of canonical transaction parameters and cryptographic nonce.',
    icon: Shield,
    cameraPos: new THREE.Vector3(-24, 7, 14),
    targetPos: new THREE.Vector3(-20, 2, 0),
  },
  {
    step: 2,
    title: 'Customer Authentication',
    shortTitle: 'Auth',
    subtitle: 'Multi-factor biometric and credential verification.',
    icon: Lock,
    cameraPos: new THREE.Vector3(-18, 6, 12),
    targetPos: new THREE.Vector3(-14, 2, 0),
  },
  {
    step: 3,
    title: 'Digital Signature (ECDSA P-256)',
    shortTitle: 'Signature',
    subtitle: 'Canonical SHA-256 digest signed with client private key.',
    icon: Key,
    cameraPos: new THREE.Vector3(-11, 7, 12),
    targetPos: new THREE.Vector3(-8, 2, 0),
  },
  {
    step: 4,
    title: 'TLS 1.3 Secure Handshake',
    shortTitle: 'TLS 1.3',
    subtitle: 'ClientHello & ServerHello key exchange with PFS forward secrecy.',
    icon: Network,
    cameraPos: new THREE.Vector3(-4, 7, 12),
    targetPos: new THREE.Vector3(-2, 2, 0),
  },
  {
    step: 5,
    title: 'AES-256-GCM Encryption',
    shortTitle: 'AES-GCM',
    subtitle: 'Payload transformed to ciphertext with 96-bit IV & 128-bit auth tag.',
    icon: Cpu,
    cameraPos: new THREE.Vector3(4, 7, 12),
    targetPos: new THREE.Vector3(5, 2, 0),
  },
  {
    step: 6,
    title: 'Adversary Interception Check',
    shortTitle: 'Interception',
    subtitle: 'Active wiretapping & packet tamper defense along the fiber corridor.',
    icon: AlertTriangle,
    cameraPos: new THREE.Vector3(11, 8, 14),
    targetPos: new THREE.Vector3(12, 2, 0),
  },
  {
    step: 7,
    title: 'Bank Verification Gates (1–5)',
    shortTitle: 'Gates',
    subtitle: 'Sequential verification of TLS, GCM tag, ECDSA, Nonce, and Ledger.',
    icon: Shield,
    cameraPos: new THREE.Vector3(19, 7, 14),
    targetPos: new THREE.Vector3(20, 2, 0),
  },
  {
    step: 8,
    title: 'Settlement & Digital Receipt',
    shortTitle: 'Settlement',
    subtitle: 'Atomic database commitment, balance update, and cryptographic receipt.',
    icon: CheckCircle,
    cameraPos: new THREE.Vector3(25, 7, 14),
    targetPos: new THREE.Vector3(24, 2, 0),
  },
];

export const TransactionScene3D: React.FC<TransactionScene3DProps> = ({
  currentStage,
  status,
  onStageSelect,
  isAutoPlaying,
  onToggleAutoPlay,
  failingGateIndex,
  attackType,
  transactionSummary,
  onReset,
  theme = 'dark',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<'3d' | 'schematic'>('3d');
  const [inspectedNode, setInspectedNode] = useState<string | null>(null);

  // References for mutable animation state
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animatedObjectsRef = useRef<{
    packetMesh?: THREE.Group;
    authRing?: THREE.Group;
    signaturePlate?: THREE.Group;
    tlsGate?: THREE.Group;
    cipherCylinder?: THREE.Group;
    hackerClaw?: THREE.Group;
    securityGates: THREE.Group[];
    vaultDoor?: THREE.Group;
    dataTrackPillars: THREE.Mesh[];
  }>({ securityGates: [], dataTrackPillars: [] });

  const currentStageRef = useRef(currentStage);
  const statusRef = useRef(status);
  const failingGateRef = useRef(failingGateIndex);
  const targetCameraPosRef = useRef(STAGES_CONFIG[currentStage - 1].cameraPos);
  const targetLookAtRef = useRef(STAGES_CONFIG[currentStage - 1].targetPos);

  useEffect(() => {
    currentStageRef.current = currentStage;
    targetCameraPosRef.current = STAGES_CONFIG[currentStage - 1].cameraPos;
    targetLookAtRef.current = STAGES_CONFIG[currentStage - 1].targetPos;
  }, [currentStage]);

  useEffect(() => {
    statusRef.current = status;
    failingGateRef.current = failingGateIndex;
  }, [status, failingGateIndex]);

  // Dynamically synchronize 3D background & fog with Light/Dark presentation theme
  useEffect(() => {
    if (sceneRef.current) {
      const bgColor = theme === 'light' ? '#E2E8F0' : '#080D18';
      sceneRef.current.background = new THREE.Color(bgColor);
      sceneRef.current.fog = new THREE.FogExp2(bgColor, 0.015);
    }
  }, [theme]);

  // Three.js Scene Setup
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect software WebGL as per skill directive
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color('#080D18');
    scene.fog = new THREE.FogExp2('#080D18', 0.015);

    const width = container.clientWidth || 1200;
    const height = container.clientHeight || 700;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    cameraRef.current = camera;
    camera.position.copy(targetCameraPosRef.current);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Don't go below ground
    controls.minDistance = 4;
    controls.maxDistance = 65;
    controls.target.copy(targetLookAtRef.current);

    // Studio Environment Reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Studio 3-Point Lighting Rig
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(-15, 25, 20);
    keyLight.castShadow = !isSoftwareGl;
    if (!isSoftwareGl) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 80;
      keyLight.shadow.camera.left = -35;
      keyLight.shadow.camera.right = 35;
      keyLight.shadow.camera.top = 20;
      keyLight.shadow.camera.bottom = -20;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const fillLight = new THREE.HemisphereLight(0x4c8dff, 0x080d18, 1.2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x35d6c5, 1.6);
    rimLight.position.set(30, 15, -20);
    scene.add(rimLight);

    // Ground Grid & Runway
    const gridHelper = new THREE.GridHelper(90, 60, 0x172235, 0x0f172a);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    // Ground Runway Surface
    const runwayGeo = new THREE.PlaneGeometry(80, 8);
    const runwayMat = new THREE.MeshStandardMaterial({
      color: 0x0a101d,
      roughness: 0.85,
      metalness: 0.2,
    });
    const runway = new THREE.Mesh(runwayGeo, runwayMat);
    runway.rotation.x = -Math.PI / 2;
    runway.receiveShadow = true;
    scene.add(runway);

    // Neon Data Rail Line
    const railMat = new THREE.MeshBasicMaterial({ color: 0x35d6c5, wireframe: false });
    const railGeo = new THREE.BoxGeometry(78, 0.05, 0.1);
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.position.set(0, 0.03, 0);
    scene.add(rail);

    // ==========================================
    // PROCEDURAL 3D MESHES (Composite 3-12 parts)
    // ==========================================

    // 1. SMARTPHONE CLIENT (Stage 1: -20, 0, 0)
    const phoneGroup = new THREE.Group();
    phoneGroup.position.set(-20, 0, 0);

    // Phone body chassis
    const phoneBody = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 4.4, 0.25),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.2 })
    );
    phoneBody.position.y = 2.2;
    phoneBody.castShadow = true;
    phoneGroup.add(phoneBody);

    // Phone screen
    const screenMat = new THREE.MeshStandardMaterial({
      color: 0x080d18,
      roughness: 0.1,
      metalness: 0.9,
      emissive: 0x101f38,
      emissiveIntensity: 0.6,
    });
    const phoneScreen = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 4.0), screenMat);
    phoneScreen.position.set(0, 2.2, 0.13);
    phoneGroup.add(phoneScreen);

    // Screen UI Card simulation
    const screenCard = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x172554, emissive: 0x1d4ed8, emissiveIntensity: 0.3 })
    );
    screenCard.position.set(0, 2.6, 0.135);
    phoneGroup.add(screenCard);

    // Camera notch
    const notch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.02, 16),
      new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    notch.rotation.x = Math.PI / 2;
    notch.position.set(0, 4.15, 0.14);
    phoneGroup.add(notch);

    scene.add(phoneGroup);

    // 2. AUTHENTICATION RING (Stage 2: -14, 0, 0)
    const authGroup = new THREE.Group();
    authGroup.position.set(-14, 2, 0);

    const outerRingGeo = new THREE.TorusGeometry(1.6, 0.08, 16, 48);
    const outerRingMat = new THREE.MeshStandardMaterial({
      color: 0x4c8dff,
      metalness: 0.9,
      roughness: 0.15,
      emissive: 0x1e40af,
      emissiveIntensity: 0.4,
    });
    const authOuterRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    authGroup.add(authOuterRing);

    const innerRingGeo = new THREE.TorusGeometry(1.2, 0.05, 16, 32);
    const innerRingMat = new THREE.MeshStandardMaterial({
      color: 0x35d6c5,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x0d9488,
      emissiveIntensity: 0.3,
    });
    const authInnerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    authGroup.add(authInnerRing);

    // 4 Cardinal lock pins
    for (let i = 0; i < 4; i++) {
      const pin = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.4, 0.12),
        new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.9, roughness: 0.1 })
      );
      const angle = (i * Math.PI) / 2;
      pin.position.set(Math.cos(angle) * 1.4, Math.sin(angle) * 1.4, 0);
      pin.rotation.z = angle;
      authGroup.add(pin);
    }
    animatedObjectsRef.current.authRing = authGroup;
    scene.add(authGroup);

    // 3. DIGITAL SIGNATURE MATRIX (Stage 3: -8, 0, 0)
    const sigGroup = new THREE.Group();
    sigGroup.position.set(-8, 2, 0);

    const sigPlate = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.4, 0.15, 32),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.25 })
    );
    sigPlate.rotation.x = Math.PI / 2;
    sigGroup.add(sigPlate);

    const sigEngraving = new THREE.Mesh(
      new THREE.RingGeometry(0.6, 1.1, 32),
      new THREE.MeshBasicMaterial({ color: 0x35d6c5, side: THREE.DoubleSide })
    );
    sigEngraving.position.z = 0.08;
    sigGroup.add(sigEngraving);

    const sigQuill = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 0.7, 16),
      new THREE.MeshStandardMaterial({ color: 0x60a5fa, metalness: 0.9, roughness: 0.1 })
    );
    sigQuill.position.set(0, 0, 0.45);
    sigQuill.rotation.x = -Math.PI / 3;
    sigGroup.add(sigQuill);

    animatedObjectsRef.current.signaturePlate = sigGroup;
    scene.add(sigGroup);

    // 4. TLS 1.3 INTERLOCKING GATES (Stage 4: -2, 0, 0)
    const tlsGroup = new THREE.Group();
    tlsGroup.position.set(-2, 0, 0);

    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
    const leftPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 4.2, 20), pillarMat);
    leftPillar.position.set(-1.8, 2.1, 0);
    leftPillar.castShadow = true;
    tlsGroup.add(leftPillar);

    const rightPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 4.2, 20), pillarMat);
    rightPillar.position.set(1.8, 2.1, 0);
    rightPillar.castShadow = true;
    tlsGroup.add(rightPillar);

    const tlsTopBar = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.3, 0.4), pillarMat);
    tlsTopBar.position.set(0, 4.2, 0);
    tlsGroup.add(tlsTopBar);

    // Interlocking barrier beam
    const tlsBeamMat = new THREE.MeshStandardMaterial({
      color: 0x4c8dff,
      metalness: 0.9,
      roughness: 0.1,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.5,
    });
    const tlsBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.4, 16), tlsBeamMat);
    tlsBeam.rotation.z = Math.PI / 2;
    tlsBeam.position.set(0, 2.0, 0);
    tlsGroup.add(tlsBeam);

    animatedObjectsRef.current.tlsGate = tlsGroup;
    scene.add(tlsGroup);

    // 5. AES-256-GCM ENCRYPTION CYLINDER (Stage 5: +5, 0, 0)
    const cipherGroup = new THREE.Group();
    cipherGroup.position.set(5, 2, 0);

    // Rotating Core drum
    const drumGeo = new THREE.CylinderGeometry(1.6, 1.6, 2.2, 24);
    const drumMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.95,
      roughness: 0.15,
    });
    const cipherDrum = new THREE.Mesh(drumGeo, drumMat);
    cipherDrum.rotation.z = Math.PI / 2;
    cipherGroup.add(cipherDrum);

    // Segment rings (IV, AAD, Ciphertext, Tag)
    const ringColors = [0x35d6c5, 0x4c8dff, 0xa855f7, 0x36d399];
    for (let i = 0; i < 4; i++) {
      const segRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.63, 0.06, 16, 32),
        new THREE.MeshStandardMaterial({
          color: ringColors[i],
          metalness: 0.9,
          roughness: 0.2,
          emissive: ringColors[i],
          emissiveIntensity: 0.4,
        })
      );
      segRing.rotation.y = Math.PI / 2;
      segRing.position.x = -0.75 + i * 0.5;
      cipherGroup.add(segRing);
    }

    animatedObjectsRef.current.cipherCylinder = cipherGroup;
    scene.add(cipherGroup);

    // 6. ADVERSARY INTERCEPTION MECHANICAL CLAW (Stage 6: +12, 0, 0)
    const clawGroup = new THREE.Group();
    clawGroup.position.set(12, 4.5, 0);

    const clawBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.6, 0.3, 16),
      new THREE.MeshStandardMaterial({ color: 0x991b1b, metalness: 0.9, roughness: 0.2 })
    );
    clawGroup.add(clawBase);

    // 3 menacing mechanical claw prongs
    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3;
      const clawArm = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 1.4, 0.2),
        new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.85, roughness: 0.2 })
      );
      clawArm.position.set(Math.cos(angle) * 0.5, -0.7, Math.sin(angle) * 0.5);
      clawArm.rotation.z = Math.cos(angle) * 0.35;
      clawArm.rotation.x = -Math.sin(angle) * 0.35;
      clawGroup.add(clawArm);
    }

    // Malicious red laser probe beam
    const probeBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 2.8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.8 })
    );
    probeBeam.position.y = -1.6;
    clawGroup.add(probeBeam);

    animatedObjectsRef.current.hackerClaw = clawGroup;
    scene.add(clawGroup);

    // 7. BANK VERIFICATION GATES 1-5 (Stage 7: +17 to +21, 0, 0)
    const gatesList: THREE.Group[] = [];
    const gateLabels = ['TLS', 'TAG', 'SIG', 'NONCE', 'LEDGER'];

    for (let g = 0; g < 5; g++) {
      const gGroup = new THREE.Group();
      gGroup.position.set(17 + g * 1.1, 0, 0);

      const gArchMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.2 });
      const gArch = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.1, 16, 24, Math.PI), gArchMat);
      gArch.position.y = 1.3;
      gArch.rotation.z = 0;
      gGroup.add(gArch);

      // Gate door leaf that swings
      const doorMat = new THREE.MeshStandardMaterial({
        color: 0x35d6c5,
        metalness: 0.9,
        roughness: 0.2,
        emissive: 0x0f766e,
        emissiveIntensity: 0.3,
      });
      const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 0.08), doorMat);
      doorLeaf.position.set(0, 0.6, 0);
      gGroup.add(doorLeaf);

      scene.add(gGroup);
      gatesList.push(gGroup);
    }
    animatedObjectsRef.current.securityGates = gatesList;

    // 8. BANK CORE VAULT & RECEIPT TOWER (Stage 8: +24, 0, 0)
    const vaultGroup = new THREE.Group();
    vaultGroup.position.set(24, 0, 0);

    // Multi-tier server rack bank
    const serverRack = new THREE.Mesh(
      new THREE.BoxGeometry(3.0, 4.6, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.3 })
    );
    serverRack.position.y = 2.3;
    serverRack.castShadow = true;
    vaultGroup.add(serverRack);

    // Vault round door on front
    const vaultDoor = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.4, 0.25, 32),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.95, roughness: 0.15 })
    );
    vaultDoor.rotation.x = Math.PI / 2;
    vaultDoor.position.set(0, 2.3, 1.15);
    vaultGroup.add(vaultDoor);

    // Vault handle wheel
    const vaultWheel = new THREE.Mesh(
      new THREE.TorusGeometry(0.6, 0.06, 16, 24),
      new THREE.MeshStandardMaterial({ color: 0x35d6c5, metalness: 0.9, roughness: 0.1 })
    );
    vaultWheel.position.set(0, 2.3, 1.3);
    vaultGroup.add(vaultWheel);

    animatedObjectsRef.current.vaultDoor = vaultGroup;
    scene.add(vaultGroup);

    // HERO TRANSACTION PACKET (The moving actor)
    const packetGroup = new THREE.Group();
    packetGroup.position.set(-20, 2.0, 0);

    const packetCore = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.5, 0.3),
      new THREE.MeshStandardMaterial({
        color: 0x35d6c5,
        metalness: 0.9,
        roughness: 0.1,
        emissive: 0x0d9488,
        emissiveIntensity: 0.6,
      })
    );
    packetGroup.add(packetCore);

    // Protective energy halo
    const haloMesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.65, 1),
      new THREE.MeshBasicMaterial({ color: 0x4c8dff, wireframe: true })
    );
    packetGroup.add(haloMesh);

    animatedObjectsRef.current.packetMesh = packetGroup;
    scene.add(packetGroup);

    // Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const renderLoop = () => {
      animationFrameId = requestAnimationFrame(renderLoop);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Camera Damping (Exponential lerp towards target)
      camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCameraPosRef.current.x, 3.5, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCameraPosRef.current.y, 3.5, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, targetCameraPosRef.current.z, 3.5, delta);

      controls.target.x = THREE.MathUtils.damp(controls.target.x, targetLookAtRef.current.x, 4.0, delta);
      controls.target.y = THREE.MathUtils.damp(controls.target.y, targetLookAtRef.current.y, 4.0, delta);
      controls.target.z = THREE.MathUtils.damp(controls.target.z, targetLookAtRef.current.z, 4.0, delta);
      controls.update();

      // Calculate Target Packet Position along runway based on current stage
      const stageTargetsX = [-20, -14, -8, -2, 5, 12, 19, 24];
      const targetPacketX = stageTargetsX[currentStageRef.current - 1];

      if (packetGroup) {
        packetGroup.position.x = THREE.MathUtils.damp(packetGroup.position.x, targetPacketX, 4.0, delta);
        packetGroup.position.y = 2.0 + Math.sin(time * 3.5) * 0.12;
        haloMesh.rotation.y += delta * 1.5;
        haloMesh.rotation.x += delta * 0.8;

        // Change packet color if tampered or failing
        if (statusRef.current === 'tampered' || statusRef.current === 'rejected') {
          (packetCore.material as THREE.MeshStandardMaterial).color.setHex(0xff4d5a);
          (packetCore.material as THREE.MeshStandardMaterial).emissive.setHex(0x991b1b);
        } else {
          (packetCore.material as THREE.MeshStandardMaterial).color.setHex(0x35d6c5);
          (packetCore.material as THREE.MeshStandardMaterial).emissive.setHex(0x0d9488);
        }
      }

      // Rotate Authentication Ring (Stage 2)
      if (animatedObjectsRef.current.authRing) {
        animatedObjectsRef.current.authRing.rotation.z += delta * 1.8;
      }

      // Rotate Signature Matrix (Stage 3)
      if (animatedObjectsRef.current.signaturePlate) {
        animatedObjectsRef.current.signaturePlate.rotation.z -= delta * 1.2;
      }

      // Rotate Cipher Drum (Stage 5)
      if (animatedObjectsRef.current.cipherCylinder) {
        animatedObjectsRef.current.cipherCylinder.rotation.x += delta * 2.2;
      }

      // Adversary Claw Movement (Stage 6)
      if (animatedObjectsRef.current.hackerClaw) {
        const isClawActive = currentStageRef.current === 6;
        const targetClawY = isClawActive ? 2.8 : 4.5;
        animatedObjectsRef.current.hackerClaw.position.y = THREE.MathUtils.damp(
          animatedObjectsRef.current.hackerClaw.position.y,
          targetClawY,
          4.0,
          delta
        );
        animatedObjectsRef.current.hackerClaw.rotation.y += delta * (isClawActive ? 2.0 : 0.5);
      }

      // Bank Security Gates (Stage 7)
      if (animatedObjectsRef.current.securityGates.length === 5) {
        animatedObjectsRef.current.securityGates.forEach((gate, idx) => {
          const door = gate.children[1] as THREE.Mesh;
          if (door) {
            // Check if this gate opened or failed
            const gateNum = idx + 1;
            const isFailing = failingGateRef.current === gateNum;

            if (currentStageRef.current > 7 || (currentStageRef.current === 7 && gateNum <= 4)) {
              if (isFailing) {
                // Slam shut and turn crimson
                (door.material as THREE.MeshStandardMaterial).color.setHex(0xff4d5a);
                (door.material as THREE.MeshStandardMaterial).emissive.setHex(0x991b1b);
                door.position.y = THREE.MathUtils.damp(door.position.y, 0.6, 8.0, delta);
              } else {
                // Open up
                (door.material as THREE.MeshStandardMaterial).color.setHex(0x36d399);
                (door.material as THREE.MeshStandardMaterial).emissive.setHex(0x065f46);
                door.position.y = THREE.MathUtils.damp(door.position.y, 2.2, 5.0, delta);
              }
            } else {
              // Idle closed state
              (door.material as THREE.MeshStandardMaterial).color.setHex(0x35d6c5);
              (door.material as THREE.MeshStandardMaterial).emissive.setHex(0x0f766e);
              door.position.y = THREE.MathUtils.damp(door.position.y, 0.6, 5.0, delta);
            }
          }
        });
      }

      // Vault Handle (Stage 8)
      if (animatedObjectsRef.current.vaultDoor && currentStageRef.current === 8) {
        const wheel = animatedObjectsRef.current.vaultDoor.children[2];
        if (wheel) wheel.rotation.z += delta * 3.0;
      }

      renderer.render(scene, camera);
    };

    renderLoop();

    // Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const currentStageConfig = STAGES_CONFIG[currentStage - 1];

  return (
    <div className="relative w-full h-[620px] rounded-xl overflow-hidden border border-slate-800 bg-[#080D18]">
      {/* 3D WebGL Canvas Container */}
      <div
        ref={mountRef}
        className={`w-full h-full transition-opacity duration-300 ${
          viewMode === '3d' ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* 2D Schematic Mode Fallback / Alternative View */}
      {viewMode === 'schematic' && (
        <div className="absolute inset-0 p-8 flex flex-col justify-between bg-[#080D18] z-10 overflow-y-auto">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs font-mono text-[#35D6C5] tracking-wider uppercase">
                Technical Schematic Overview
              </span>
              <h3 className="text-lg font-heading font-semibold text-slate-100">
                End-to-End Cryptographic Pathway
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-[#35D6C5]" />
              <span>TLS 1.3 Active</span>
              <span className="text-slate-600">·</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#4C8DFF]" />
              <span>ECDSA P-256 Validated</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 my-6">
            {STAGES_CONFIG.map((s) => {
              const Icon = s.icon;
              const isCurrent = s.step === currentStage;
              const isPast = s.step < currentStage;
              const isFailing = failingGateIndex && s.step === 7;

              return (
                <button
                  key={s.step}
                  onClick={() => onStageSelect(s.step)}
                  className={`p-4 rounded-lg text-left transition-all border ${
                    isCurrent
                      ? 'bg-slate-900 border-[#35D6C5] shadow-lg shadow-[#35D6C5]/10'
                      : isPast
                      ? 'bg-slate-900/60 border-slate-700 hover:border-slate-600'
                      : 'bg-slate-950/40 border-slate-800/80 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-slate-400">Step 0{s.step}</span>
                    <Icon
                      className={`w-4 h-4 ${
                        isCurrent
                          ? 'text-[#35D6C5]'
                          : isFailing
                          ? 'text-[#FF4D5A]'
                          : isPast
                          ? 'text-emerald-400'
                          : 'text-slate-500'
                      }`}
                    />
                  </div>
                  <h4 className="text-sm font-medium text-slate-200 mb-1">{s.shortTitle}</h4>
                  <p className="text-xs text-slate-400 line-clamp-2">{s.subtitle}</p>
                </button>
              );
            })}
          </div>

          <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">CIPHER SUITE: TLS_AES_256_GCM_SHA384</span>
            <span className="text-slate-400">SIGNING ALGO: ECDSA-P256-SHA256</span>
            <span className="text-slate-400">REPLAY WINDOW: 300 SECONDS</span>
          </div>
        </div>
      )}

      {/* Top Floating Telemetry Strip (Minimal & unobtrusive) */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-20">
        <div className="flex items-center gap-3 bg-[#101827]/80 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-slate-800 pointer-events-auto">
          <span className="text-xs font-mono text-[#35D6C5]">STAGE 0{currentStage}/08</span>
          <span className="text-slate-600">·</span>
          <span className="text-xs font-medium text-slate-200">{currentStageConfig.title}</span>
          {status === 'tampered' && (
            <span className="text-xs font-medium text-[#FF4D5A] bg-[#FF4D5A]/10 px-2 py-0.5 rounded border border-[#FF4D5A]/30">
              TAMPERING DETECTED
            </span>
          )}
          {status === 'verified' && (
            <span className="text-xs font-medium text-[#36D399] bg-[#36D399]/10 px-2 py-0.5 rounded border border-[#36D399]/30">
              VERIFIED
            </span>
          )}
        </div>

        {/* View Mode Toggle Buttons */}
        <div className="flex items-center gap-2 pointer-events-auto bg-[#101827]/80 backdrop-blur-md p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setViewMode('3d')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              viewMode === '3d'
                ? 'bg-slate-800 text-[#35D6C5] shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            3D Spatial
          </button>
          <button
            onClick={() => setViewMode('schematic')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              viewMode === 'schematic'
                ? 'bg-slate-800 text-[#35D6C5] shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            2D Schematic
          </button>
        </div>
      </div>

      {/* COLLAPSIBLE BOTTOM CONTROL DOCK (Zero Viewport Occlusion Directive) */}
      <div
        className={`absolute bottom-3 left-1/2 -translate-x-1/2 w-[95%] max-w-4xl z-30 transition-transform duration-300 ${
          isDockCollapsed ? 'translate-y-[calc(100%-36px)]' : 'translate-y-0'
        }`}
      >
        {/* Collapse Toggle Handle */}
        <div className="flex justify-center mb-1">
          <button
            onClick={() => setIsDockCollapsed(!isDockCollapsed)}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#101827]/90 backdrop-blur-md rounded-t-lg border border-b-0 border-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-colors"
          >
            {isDockCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-[#35D6C5]" />
                <span>Show Pipeline Controls</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                <span>Hide Controls</span>
              </>
            )}
          </button>
        </div>

        {/* Dock Interior Card */}
        <div className="bg-[#101827]/95 backdrop-blur-md border border-slate-800 rounded-xl p-3 shadow-2xl">
          {/* Stage Scrubber Pills */}
          <div className="flex items-center justify-between gap-1 mb-2.5 overflow-x-auto pb-1">
            {STAGES_CONFIG.map((stage) => {
              const isCurrent = stage.step === currentStage;
              const isPast = stage.step < currentStage;
              return (
                <button
                  key={stage.step}
                  onClick={() => onStageSelect(stage.step)}
                  className={`flex-1 min-w-[90px] py-1.5 px-2 rounded-lg text-left transition-all ${
                    isCurrent
                      ? 'bg-slate-800 border border-[#35D6C5] text-slate-100'
                      : isPast
                      ? 'bg-slate-900/50 hover:bg-slate-800/60 border border-slate-800 text-slate-300'
                      : 'bg-slate-950/40 border border-slate-800/40 text-slate-500 hover:text-slate-400'
                  }`}
                >
                  <div className="text-[10px] font-mono text-slate-400">0{stage.step}</div>
                  <div className="text-xs font-medium truncate">{stage.shortTitle}</div>
                </button>
              );
            })}
          </div>

          {/* Subtitle & Playback Controls Row */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
            <div className="flex items-center gap-3 truncate pr-4">
              <span className="text-xs text-slate-400 truncate">
                {currentStageConfig.subtitle}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={onToggleAutoPlay}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  isAutoPlaying
                    ? 'bg-[#35D6C5]/20 border-[#35D6C5] text-[#35D6C5]'
                    : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                }`}
              >
                {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isAutoPlaying ? 'Pause' : 'Play Flow'}</span>
              </button>

              {onReset && (
                <button
                  onClick={onReset}
                  title="Replay Transaction Flow"
                  className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

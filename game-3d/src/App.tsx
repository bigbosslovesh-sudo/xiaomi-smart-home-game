import React, { useState, useRef, Suspense, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Html, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import FullApartmentScene from './scenes/FullApartment';
import { allLevels, LevelConfig, DeviceInfo } from './levels';

// ===== Device model map (global fallback) =====
const DEVICE_MODELS: Record<string, { glb: string; scale: number; rotateY?: number }> = {
  'Xiaomi 手环 10': { glb: '/assets/models/band.glb', scale: 0.15 },
  '米家智能窗帘 2': { glb: '/assets/models/curtain.glb', scale: 0.3 },
  '米家智能IH电饭煲P1 3L': { glb: '/assets/models/rice-cooker-new.glb', scale: 0.25 },
  '米家智能电热水器 Pro 60L': { glb: '/assets/models/water-heater.glb', scale: 0.4 },
  'Xiaomi 智能音箱 Pro': { glb: '/assets/models/speaker.glb', scale: 0.25 },
  '小米空调 1.5匹': { glb: '/assets/models/ac.glb', scale: 0.4 },
  '米家空气净化器 4 Lite': { glb: '/assets/models/purifier.glb', scale: 0.35 },
  '米家门窗传感器 2': { glb: '/assets/models/door-sensor.glb', scale: 0.15 },
  '米家飞利浦智睿吸顶灯': { glb: '/assets/models/ceiling-light.glb', scale: 0.3 },
  '小米智能摄像机 云台版2K': { glb: '/assets/models/camera.glb', scale: 0.2 },
  'Xiaomi 17': { glb: '/assets/models/phone.glb', scale: 0.15 },
  '米家扫拖机器人 M40 S': { glb: '/assets/models/vacuum.glb', scale: 0.3 },
  '新一代小米 SU7': { glb: '/assets/models/su7.glb', scale: 0.6 },
};

function DeviceGLB({ src, targetScale, rotateY = 0 }: { src: string; targetScale: number; rotateY?: number }) {
  const { scene } = useGLTF(src);
  const cloned = useMemo(() => {
    const s = scene.clone(true);
    const box = new THREE.Box3().setFromObject(s);
    const size = new THREE.Vector3(); box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const sf = maxDim > 0 ? targetScale / maxDim : 1;
    s.scale.setScalar(sf); box.setFromObject(s);
    const c = new THREE.Vector3(); box.getCenter(c);
    s.position.sub(c); s.position.y += targetScale / 2; s.rotation.y = rotateY;
    return s;
  }, [scene, targetScale, rotateY]);
  return <primitive object={cloned} />;
}

function PlacedDevice({ position, name, lvl }: { position: [number, number, number]; name: string; lvl: LevelConfig }) {
  const ref = useRef<THREE.Group>(null);
  const mi = lvl.deviceModels?.[name] || DEVICE_MODELS[name];
  useFrame((state) => { if (ref.current) ref.current.position.y = position[1] + Math.sin(state.clock.getElapsedTime() * 2 + position[0]) * 0.03; });
  return (
    <group ref={ref} position={position}>
      {mi ? (
        <Suspense fallback={<mesh><boxGeometry args={[0.15, 0.15, 0.15]} /><meshStandardMaterial color="#FF6700" emissive="#FF6700" emissiveIntensity={0.3} /></mesh>}>
          <DeviceGLB src={mi.glb} targetScale={mi.scale} rotateY={mi.rotateY} />
        </Suspense>
      ) : (
        <mesh castShadow><boxGeometry args={[0.22, 0.22, 0.22]} /><meshStandardMaterial color="#FF6700" emissive="#FF6700" emissiveIntensity={0.5} roughness={0.2} metalness={0.5} /></mesh>
      )}
      <pointLight intensity={0.6} color="#FF6700" distance={1.8} />
      <Html position={[0, mi ? 0.25 : 0.35, 0]} center distanceFactor={3} zIndexRange={[1, 5]}>
        <div style={{ background: 'rgba(52,199,89,0.9)', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '8px', fontWeight: 600, whiteSpace: 'nowrap', pointerEvents: 'none' }}>{name}</div>
      </Html>
    </group>
  );
}

function CameraController({ position }: { position: [number, number, number] }) {
  const { camera } = useThree();
  useEffect(() => { camera.position.set(...position); }, [position, camera]);
  return null;
}

function GameScene({ hoveredRoom, setHoveredRoom, placedDevices, lvl }: {
  hoveredRoom: string | null; setHoveredRoom: (id: string | null) => void;
  placedDevices: Record<string, string[]>; lvl: LevelConfig;
}) {
  const cam = lvl.camera || { position: [0, 10, 6] as [number, number, number], target: [0, 2.9, -2.15] as [number, number, number] };
  return (
    <>
      <CameraController position={cam.position} />
      <FullApartmentScene hoveredRoom={hoveredRoom} setHoveredRoom={setHoveredRoom} placedDevices={placedDevices} activeRooms={lvl.activeRooms} cameraTarget={cam.target} currentLevel={lvl.id} />
      {Object.entries(placedDevices).flatMap(([roomId, names]) =>
        names.map((devName, i) => <PlacedDevice key={roomId + devName + i} position={lvl.devicePositions[devName] || [0, 0.5, 0]} name={devName} lvl={lvl} />)
      )}
    </>
  );
}

const glass: React.CSSProperties = {
  background: 'rgba(20, 20, 25, 0.55)', backdropFilter: 'blur(40px) saturate(120%)',
  WebkitBackdropFilter: 'blur(40px) saturate(120%)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff',
};

function Overlay({ visible, children, wide }: { visible: boolean; children: React.ReactNode; wide?: boolean }) {
  if (!visible) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ ...glass, borderRadius: 28, padding: '36px 32px', maxWidth: wide ? 680 : 460, width: '90%', textAlign: 'center', boxShadow: '0 32px 64px rgba(0,0,0,0.5)', borderTopColor: 'rgba(255,255,255,0.15)', maxHeight: '85vh', overflowY: 'auto' }}>{children}</div>
    </div>
  );
}

const orangeBtn: React.CSSProperties = { background: 'linear-gradient(180deg, #FF8A33, #FF6700)', border: 'none', borderTop: '2px solid rgba(255,255,255,0.35)', borderRadius: 50, padding: '12px 36px', fontSize: 15, fontWeight: 700, color: '#fff', cursor: 'pointer', boxShadow: '0 6px 0 #CC5200, 0 12px 24px rgba(255,103,0,0.35)', fontFamily: 'inherit' };

// ===== Cinematic Transition =====
function CinematicTransition({ storyText, levelName, levelId, onComplete }: { storyText: string; levelName: string; levelId: number; onComplete: () => void }) {
  const [stage, setStage] = useState<'black' | 'title' | 'text' | 'fadeout'>('black');
  const [textOpacity, setTextOpacity] = useState(0);
  const [maskOpacity, setMaskOpacity] = useState(1);
  const [canSkip, setCanSkip] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const typeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const t1 = setTimeout(() => { setStage('title'); setTextOpacity(1); }, 500);
    const t2 = setTimeout(() => { setStage('text'); }, 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Typewriter effect
  useEffect(() => {
    if (stage !== 'text') return;
    setCharCount(0);
    const totalChars = storyText.length;
    let current = 0;
    const tick = () => {
      current++;
      setCharCount(current);
      if (current < totalChars) {
        typeTimerRef.current = window.setTimeout(tick, 35);
      } else {
        setCanSkip(true);
        setTimeout(() => setShowHint(true), 1500);
      }
    };
    typeTimerRef.current = window.setTimeout(tick, 200);
    return () => { if (typeTimerRef.current) clearTimeout(typeTimerRef.current); };
  }, [stage, storyText]);

  const handleContinue = () => {
    if (stage === 'text' && charCount < storyText.length) {
      if (typeTimerRef.current) clearTimeout(typeTimerRef.current);
      setCharCount(storyText.length);
      setCanSkip(true);
      setTimeout(() => setShowHint(true), 1500);
      return;
    }
    if (!canSkip) return;
    setStage('fadeout');
    setTextOpacity(0);
    setTimeout(() => { setMaskOpacity(0); }, 400);
    setTimeout(() => { onComplete(); }, 1200);
  };

  return (
    <div onClick={handleContinue} style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 200,
      background: `rgba(0,0,0,${maskOpacity})`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      cursor: stage === 'text' || canSkip ? 'pointer' : 'default',
      transition: 'background 0.8s ease',
    }}>
      <div style={{
        maxWidth: 520, padding: '0 32px', textAlign: 'center',
        opacity: textOpacity, transition: 'opacity 0.8s ease',
      }}>
        {/* Level badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 24,
          opacity: stage === 'black' ? 0 : 1, transition: 'opacity 0.6s ease',
        }}>
          <span style={{ background: '#FF6700', color: '#fff', padding: '4px 14px', fontSize: 11, fontWeight: 700, borderRadius: 6, letterSpacing: '2px' }}>第{levelId}关</span>
          <span style={{ fontSize: 24, fontWeight: 700, color: '#fff', letterSpacing: '4px' }}>{levelName}</span>
        </div>

        {/* Story text — typewriter effect */}
        <div style={{
          fontSize: 15, lineHeight: 2.2, color: 'rgba(255,255,255,0.65)', whiteSpace: 'pre-line',
          opacity: stage === 'text' || stage === 'fadeout' ? 1 : 0,
          transition: 'opacity 0.8s ease 0.2s',
          fontFamily: "system-ui, -apple-system, 'PingFang SC', sans-serif",
          minHeight: 120,
        }}>
          {storyText.slice(0, charCount)}
          {stage === 'text' && charCount < storyText.length && (
            <span style={{ opacity: 0.4, animation: 'blink 0.8s step-end infinite' }}>|</span>
          )}
        </div>

        {/* Skip hint — fixed position below text, no layout shift */}
        <div style={{
          marginTop: 32, fontSize: 12, color: 'rgba(255,255,255,0.6)', letterSpacing: '3px',
          opacity: showHint && stage === 'text' ? 1 : 0,
          transition: 'opacity 1s ease',
          height: 20,
          animation: showHint && stage === 'text' ? 'breathe 2.5s ease-in-out infinite' : 'none',
        }}>
          点击任意位置继续
        </div>
      </div>
    </div>
  );
}

// ===== Finale Video =====
function FinaleVideo() {
  const [stage, setStage] = useState<'darken' | 'video' | 'videofade' | 'credits'>('darken');
  const [videoOpacity, setVideoOpacity] = useState(0);
  const [creditsOpacity, setCreditsOpacity] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // 2s black, then start video
    const t1 = setTimeout(() => { setStage('video'); videoRef.current?.play(); }, 2000);
    // 3s: video fades in
    const t2 = setTimeout(() => setVideoOpacity(1), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const handleVideoEnd = () => {
    // Video ends → fade to black → show credits
    setStage('videofade');
    setVideoOpacity(0);
    setTimeout(() => {
      setStage('credits');
      setTimeout(() => setCreditsOpacity(1), 300);
    }, 2000);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 300,
      background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Video */}
      {stage !== 'credits' && (
        <video ref={videoRef} src="/assets/ecosystem-video.mp4" playsInline
          style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: videoOpacity, transition: 'opacity 2s ease' }}
          onEnded={handleVideoEnd} />
      )}

      {/* Credits */}
      {stage === 'credits' && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          opacity: creditsOpacity, transition: 'opacity 2.5s ease',
          textAlign: 'center', padding: '0 40px',
        }}>
          {/* Xiaomi logo */}
          <img src="/assets/milogo.png" alt="" style={{ height: 44, marginBottom: 56, opacity: 0.7 }} />

          {/* Tagline */}
          <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.25)', letterSpacing: '8px', textTransform: 'uppercase', marginBottom: 56 }}>
            人车家全生态互动游戏
          </div>

          {/* Divider */}
          <div style={{ width: 60, height: 1, background: 'rgba(255,255,255,0.1)', marginBottom: 56 }} />

          {/* Proudly Presented By */}
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.2)', letterSpacing: '5px', textTransform: 'uppercase', marginBottom: 28 }}>
            Proudly Presented By
          </div>

          {/* Names */}
          <div style={{ display: 'flex', gap: 64, marginBottom: 64 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 300, color: 'rgba(255,255,255,0.7)', letterSpacing: '4px' }}>周峻逸</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', marginTop: 8, letterSpacing: '3px' }}>项目负责人 · 开发</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 300, color: 'rgba(255,255,255,0.7)', letterSpacing: '4px' }}>邱武文</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', marginTop: 8, letterSpacing: '3px' }}>场景设计 · 关卡创意</div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: 60, height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 48 }} />

          {/* Closing */}
          <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.15)', letterSpacing: '4px', fontStyle: 'italic' }}>
            永远相信美好的事情即将发生
          </div>

          {/* Year */}
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.08)', marginTop: 40, letterSpacing: '5px' }}>
            2026 · 小米 AI 大赛 · 春季赛
          </div>
        </div>
      )}
    </div>
  );
}

type GamePhase = 'cover' | 'story' | 'play' | 'link' | 'cards' | 'success' | 'finale';

export default function App() {
  const [currentLevel, setCurrentLevel] = useState(1);
  const lvl: LevelConfig = allLevels.find(l => l.id === currentLevel) || allLevels[0];
  const isCardMode = !!lvl.cardMode;
  const isMultiRule = !!lvl.multiRule;

  const [phase, setPhase] = useState<GamePhase>('cover');
  const [tutStep, setTutStep] = useState(0);
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);
  const [placedDevices, setPlacedDevices] = useState<Record<string, string[]>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [hintIdx, setHintIdx] = useState(0);
  const [challengeCollapsed, setChallengeCollapsed] = useState(false);
  // Single-rule link state (levels 1, 2)
  const [triggerId, setTriggerId] = useState<string | null>(null);
  const [actionIds, setActionIds] = useState<Set<string>>(new Set());
  const [linkFb, setLinkFb] = useState<{ text: string; ok: boolean } | null>(null);
  // Multi-rule link state (level 3)
  const [ruleStates, setRuleStates] = useState<{ triggerId: string | null; actionIds: Set<string> }[]>([]);
  const [multiRuleFb, setMultiRuleFb] = useState<{ text: string; ok: boolean } | null>(null);
  const [activeRuleIdx, setActiveRuleIdx] = useState(0);
  // Card mode state (level 4)
  const [cardChoices, setCardChoices] = useState<Record<string, 'enable' | 'disable'>>({});
  const [cardFb, setCardFb] = useState<{ text: string; ok: boolean } | null>(null);
  // Common
  const [tlIdx, setTlIdx] = useState(0);
  const [dragDev, setDragDev] = useState<DeviceInfo | null>(null);
  const [dragXY, setDragXY] = useState<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const challengeRef = useRef<HTMLDivElement>(null);
  const hintBtnsRef = useRef<HTMLDivElement>(null);
  const linkBtnRef = useRef<HTMLButtonElement>(null);

  const devices = lvl.devices;
  const hints = lvl.hints;
  const timeline = lvl.timeline;
  const correctN = devices.filter(d => !d.isDecoy).length;
  const placedN = Object.values(placedDevices).flat().length;
  const allPlaced = isCardMode || placedN >= correctN;
  const cam = lvl.camera || { position: [0, 10, 6] as [number, number, number], target: [0, 2.9, -2.15] as [number, number, number], fov: 38 };

  // Drag handling (levels 1-3)
  useEffect(() => {
    if (!dragDev) return;
    const mv = (e: MouseEvent) => setDragXY({ x: e.clientX, y: e.clientY });
    const up = (e: MouseEvent) => {
      if (!canvasRef.current) { setDragDev(null); setDragXY(null); return; }
      const r = canvasRef.current.getBoundingClientRect();
      const mx = e.clientX - r.left;
      if (mx >= 0 && mx <= r.width && e.clientY >= r.top && e.clientY <= r.bottom) {
        const nx = mx / r.width;
        let tgt: string | null = null;
        for (const z of lvl.roomZones) if (nx >= z.range[0] && nx <= z.range[1]) { tgt = z.id; break; }
        if (tgt && dragDev) {
          if (dragDev.isDecoy) { setFeedback(dragDev.decoyFeedback || ''); setTimeout(() => setFeedback(null), 3000); }
          else if (dragDev.targetRoom === tgt) { setPlacedDevices(p => ({ ...p, [tgt!]: [...(p[tgt!] || []), dragDev!.name] })); }
          else { setFeedback('这个设备不适合放在这个房间'); setTimeout(() => setFeedback(null), 2000); }
        }
      }
      setDragDev(null); setDragXY(null);
    };
    document.addEventListener('mousemove', mv);
    document.addEventListener('mouseup', up);
    return () => { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); };
  }, [dragDev, lvl.roomZones]);

  // Timeline animation
  useEffect(() => {
    if (phase !== 'success' || tlIdx >= timeline.length) return;
    const t = setTimeout(() => setTlIdx(i => i + 1), 800);
    return () => clearTimeout(t);
  }, [phase, tlIdx, timeline.length]);

  // Auto-trigger finale after last level's success screen is fully shown
  useEffect(() => {
    if (phase !== 'success' || currentLevel < allLevels.length || tlIdx < timeline.length) return;
    // Wait for user to read the summary, then auto-transition
    const t = setTimeout(() => setPhase('finale'), 1000);
    return () => clearTimeout(t);
  }, [phase, currentLevel, tlIdx, timeline.length]);

  // Single-rule confirm (levels 1, 2)
  const onConfirmLink = () => {
    const trig = lvl.triggers.find(t => t.id === triggerId);
    if (!trig) return;
    if (!trig.correct) { setLinkFb({ text: trig.fb, ok: false }); return; }
    // Check incorrect actions first
    for (const a of lvl.actions) if (!a.correct && actionIds.has(a.id)) { setLinkFb({ text: a.fb, ok: false }); return; }
    // Check missing correct actions — show specific feedback if available
    const missing = lvl.actions.filter(a => a.correct && !actionIds.has(a.id));
    if (missing.length > 0) {
      const withFb = missing.find(a => a.fb);
      setLinkFb({ text: withFb?.fb || '联动触发了，但只有部分设备响应。试试把所有相关设备都勾上。', ok: false });
      return;
    }
    setLinkFb({ text: '联动设置完成！', ok: true });
    setTimeout(() => { setPhase('success'); setTlIdx(0); }, 1200);
  };

  // Multi-rule confirm (level 3)
  const onConfirmMultiRule = () => {
    const rules = lvl.multiRule!.rules;
    for (let i = 0; i < rules.length; i++) {
      const rs = ruleStates[i];
      if (!rs || !rs.triggerId) { setMultiRuleFb({ text: `请先为「${rules[i].name}」选择触发条件`, ok: false }); setActiveRuleIdx(i); return; }
      const trig = rules[i].triggers.find(t => t.id === rs.triggerId);
      if (trig && !trig.correct) { setMultiRuleFb({ text: trig.fb, ok: false }); setActiveRuleIdx(i); return; }
      for (const a of rules[i].actions) if (!a.correct && rs.actionIds.has(a.id)) { setMultiRuleFb({ text: a.fb, ok: false }); setActiveRuleIdx(i); return; }
      if (!rules[i].actions.filter(a => a.correct).every(a => rs.actionIds.has(a.id))) { setMultiRuleFb({ text: `「${rules[i].name}」还有设备没有勾选`, ok: false }); setActiveRuleIdx(i); return; }
    }
    setMultiRuleFb({ text: '所有联动规则设置完成！', ok: true });
    setTimeout(() => { setPhase('success'); setTlIdx(0); }, 1200);
  };

  // Card mode confirm (level 4) — with error priority
  const onConfirmCards = () => {
    const cards = lvl.cardMode!.cards;
    const allChosen = cards.every(c => cardChoices[c.id]);
    if (!allChosen) { setCardFb({ text: '还有建议没有选择，请为每条建议做出决定', ok: false }); return; }
    // Check must-be-correct first (highest priority)
    for (const c of cards) {
      if (c.mustBeCorrect && cardChoices[c.id] !== c.correctChoice) { setCardFb({ text: c.feedback, ok: false }); return; }
    }
    // Error priority order for remaining cards
    const errorPriority = ['loud-welcome', 'order-food', 'music-handoff', 'warm-water', 'photo-sync', 'pet-report', 'ac-precool', 'lights-curtain'];
    const correctCount = cards.filter(c => cardChoices[c.id] === c.correctChoice).length;
    if (correctCount < lvl.cardMode!.passThreshold) {
      // Find highest priority error
      for (const eid of errorPriority) {
        const c = cards.find(cc => cc.id === eid);
        if (c && cardChoices[c.id] !== c.correctChoice && c.feedback) { setCardFb({ text: c.feedback, ok: false }); return; }
      }
      setCardFb({ text: '还有一些建议的选择不太对，再想想？', ok: false }); return;
    }
    // Pass
    if (correctCount === cards.length) {
      setCardFb({ text: '我记住了。以后每次你回家，我都会这样准备。', ok: true });
    } else {
      setCardFb({ text: `${correctCount}/${cards.length} 正确——小明的周六已经很美好了，但如果再细心一点，会更完美。`, ok: true });
    }
    setTimeout(() => { setPhase('success'); setTlIdx(0); }, 1200);
  };

  const reset = () => {
    setPlacedDevices({}); setFeedback(null); setHintIdx(0);
    setTriggerId(null); setActionIds(new Set()); setLinkFb(null);
    setRuleStates(lvl.multiRule ? lvl.multiRule.rules.map(() => ({ triggerId: null, actionIds: new Set<string>() })) : []);
    setMultiRuleFb(null); setActiveRuleIdx(0);
    setCardChoices({}); setCardFb(null);
    setTutStep(0); setPhase(isCardMode ? 'cards' : 'play');
  };

  const goNextLevel = () => {
    const nextId = currentLevel + 1;
    if (nextId > allLevels.length) return; // last level
    setCurrentLevel(nextId); setPhase('story'); setPlacedDevices({});
    setTutStep(0); setTriggerId(null); setActionIds(new Set()); setLinkFb(null);
    setRuleStates([]); setMultiRuleFb(null); setActiveRuleIdx(0);
    setCardChoices({}); setCardFb(null); setTlIdx(0); setChallengeCollapsed(false);
  };

  const enterPlay = () => {
    if (isCardMode) {
      setPhase('cards');
    } else {
      setPhase('play');
      if (currentLevel === 1) setTutStep(1);
    }
    if (isMultiRule) {
      setRuleStates(lvl.multiRule!.rules.map(() => ({ triggerId: null, actionIds: new Set<string>() })));
    }
  };

  const enterLink = () => {
    if (isMultiRule) {
      setActiveRuleIdx(0); setMultiRuleFb(null);
    } else {
      setTriggerId(null); setActionIds(new Set()); setLinkFb(null);
    }
    setPhase('link');
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', background: '#050508', fontFamily: "system-ui, -apple-system, 'PingFang SC', sans-serif" }}>
      <style>{`
        @keyframes breathe { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
      {/* Header */}
      <div ref={headerRef} style={{ ...glass, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <img src="/assets/milogo.png" alt="小米" style={{ height: 24, objectFit: 'contain', opacity: 0.9 }} />
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.12)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>{`小明的周六 · 第${lvl.id}关 · ${lvl.timeRange}`}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ background: '#FF6700', color: '#fff', padding: '2px 10px', fontSize: 9, fontWeight: 700, borderRadius: 4, letterSpacing: '1px', boxShadow: '0 0 12px rgba(255,103,0,0.3)' }}>{`第${lvl.id}关`}</span>
              <span style={{ fontSize: 16, fontWeight: 600 }}>{lvl.name}</span>
            </div>
          </div>
        </div>
        <div ref={hintBtnsRef} style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => {
            const placedNames = Object.values(placedDevices).flat();
            const unplaced = devices.filter(d => !d.isDecoy && !placedNames.includes(d.name));
            let hint: string;
            if (unplaced.length > 0) {
              const dev = unplaced[0];
              hint = `还需要「${dev.name}」——${dev.description}。想想它应该放在哪个房间？`;
            } else if (hints.length > 0) {
              hint = hints[hintIdx % hints.length];
              setHintIdx(i => i + 1);
            } else {
              hint = '设备都放好了，试试配置联动吧';
            }
            setFeedback(hint);
            setTimeout(() => setFeedback(null), 4000);
          }} style={{ background: '#FF6700', border: 'none', borderRadius: 50, padding: '7px 20px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', color: '#fff', fontWeight: 600 }}>提示</button>
          <button onClick={reset} style={{ background: '#FF6700', border: 'none', borderRadius: 50, padding: '7px 20px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', color: '#fff', fontWeight: 600 }}>重置</button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* 3D Canvas */}
        <div ref={canvasRef} style={{ flex: 1, position: 'relative' }}>
          {/* Level 4 card mode: show cockpit instead of 3D scene */}
          {isCardMode && phase === 'cards' ? (
            <div style={{ width: '100%', height: '100%', position: 'relative', background: '#000', overflow: 'hidden' }}>
              <style>{`
                @keyframes cockpitZoom {
                  0% { transform: scale(1) translate(0, 0); }
                  100% { transform: scale(2.2) translate(-8%, -5%); }
                }
                @keyframes cardsFadeIn { to { opacity: 1; } }
              `}</style>
              <img src="/assets/su7-cockpit.webp" alt="" style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                objectFit: 'cover', opacity: 0.5,
                animation: 'cockpitZoom 2.5s ease-out forwards',
                transformOrigin: '52% 42%',
              }} />
              {/* Card panel overlaid on screen area */}
              <div style={{
                position: 'absolute', left: '10%', top: '5%', width: '80%', height: '90%',
                background: 'rgba(10,10,15,0.92)', borderRadius: 16, overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
                boxShadow: '0 0 60px rgba(0,0,0,0.9), 0 0 80px rgba(255,103,0,0.08)',
                opacity: 0, animation: 'cardsFadeIn 0.8s ease 2s forwards',
              }}>
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px' }}>
                  <div style={{ textAlign: 'left' }}>
                    {lvl.cardMode?.introText && (
                      <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 12, background: 'rgba(255,103,0,0.06)', border: '1px solid rgba(255,103,0,0.15)' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#FF6700', marginBottom: 6 }}>HyperMind 智能建议</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.8, whiteSpace: 'pre-line' }}>{lvl.cardMode.introText}</div>
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                      {lvl.cardMode?.cards.map(card => {
                        const choice = cardChoices[card.id];
                        const isEnable = choice === 'enable';
                        const isDisable = choice === 'disable';
                        return (
                          <div key={card.id} style={{ ...glass, borderRadius: 14, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 5, borderColor: isEnable ? 'rgba(52,199,89,0.3)' : isDisable ? 'rgba(255,69,58,0.3)' : 'rgba(255,255,255,0.05)', background: isEnable ? 'rgba(52,199,89,0.06)' : isDisable ? 'rgba(255,69,58,0.06)' : 'rgba(255,255,255,0.02)', transition: 'all 0.3s' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.3 }}>{card.title}</div>
                            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>{card.description}</div>
                            {card.source && <div style={{ fontSize: 8, color: 'rgba(0,229,255,0.5)', lineHeight: 1.3 }}>AI: {card.source}</div>}
                            {card.clue && <div style={{ fontSize: 8, color: 'rgba(255,103,0,0.7)', fontStyle: 'italic' }}>"{card.clue}"</div>}
                            <div style={{ display: 'flex', gap: 4, marginTop: 'auto', paddingTop: 3 }}>
                              <button onClick={() => { setCardChoices(p => ({ ...p, [card.id]: 'enable' })); setCardFb(null); }} style={{ flex: 1, padding: '4px 0', borderRadius: 6, border: `1.5px solid ${isEnable ? 'rgba(52,199,89,0.5)' : 'rgba(255,255,255,0.08)'}`, background: isEnable ? 'rgba(52,199,89,0.15)' : 'transparent', color: isEnable ? '#34C759' : 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>启用</button>
                              <button onClick={() => { setCardChoices(p => ({ ...p, [card.id]: 'disable' })); setCardFb(null); }} style={{ flex: 1, padding: '4px 0', borderRadius: 6, border: `1.5px solid ${isDisable ? 'rgba(255,69,58,0.5)' : 'rgba(255,255,255,0.08)'}`, background: isDisable ? 'rgba(255,69,58,0.15)' : 'transparent', color: isDisable ? '#FF453A' : 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>禁用</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {cardFb && <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, fontSize: 12, lineHeight: 1.5, background: cardFb.ok ? 'rgba(52,199,89,0.08)' : 'rgba(255,69,58,0.08)', color: cardFb.ok ? '#34C759' : '#FF453A', border: `1px solid ${cardFb.ok ? 'rgba(52,199,89,0.15)' : 'rgba(255,69,58,0.15)'}` }}>{cardFb.text}</div>}
                    <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
                      <button onClick={() => { setCardChoices({}); setCardFb(null); }} style={{ ...glass, borderRadius: 50, padding: '7px 16px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>重置</button>
                      <button onClick={onConfirmCards} style={{ ...orangeBtn, padding: '7px 20px', fontSize: 11 }}>确认提交</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <Canvas shadows dpr={[1, 2]}>
                <PerspectiveCamera makeDefault position={cam.position} fov={cam.fov || 38} />
                <Suspense fallback={null}>
                  <GameScene hoveredRoom={hoveredRoom} setHoveredRoom={setHoveredRoom} placedDevices={placedDevices} lvl={lvl} />
                </Suspense>
              </Canvas>
              <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', fontSize: 11, color: 'rgba(255,255,255,0.15)', letterSpacing: '3px', pointerEvents: 'none' }}>拖拽旋转 · 滚轮缩放</div>
            </>
          )}
          <div ref={challengeRef} onClick={() => setChallengeCollapsed(c => !c)} style={{ ...glass, position: 'absolute', top: 16, left: 16, borderRadius: '20px 20px 20px 4px', padding: challengeCollapsed ? '10px 16px' : '14px 20px', maxWidth: 380, zIndex: 10, boxShadow: '0 16px 40px rgba(0,0,0,0.4)', cursor: 'pointer', transition: 'all 0.3s ease' }}>
            {challengeCollapsed ? (
              <div style={{ fontSize: 12, fontWeight: 600, color: '#FF6700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ flexShrink: 0 }}>目标</span>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis' }}>{lvl.challengeText.split('：')[0] || lvl.challengeText.slice(0, 20)}</span>
                <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, flexShrink: 0 }}>展开</span>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#FF6700', lineHeight: 1.6 }}>{lvl.challengeText}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 6 }}>点击折叠</div>
              </div>
            )}
          </div>
          {feedback && (
            <div style={{ position: 'absolute', bottom: 60, left: '50%', transform: 'translateX(-50%)', ...glass, borderRadius: 50, padding: '10px 24px', fontSize: 13, fontWeight: 500, boxShadow: '0 12px 32px rgba(0,0,0,0.4)', zIndex: 20, maxWidth: 400, textAlign: 'center' }}>{feedback}</div>
          )}
          <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', fontSize: 11, color: 'rgba(255,255,255,0.15)', letterSpacing: '3px', pointerEvents: 'none' }}>拖拽旋转 · 滚轮缩放</div>
        </div>

        {/* Device Panel — hidden for card mode */}
        {!isCardMode && (
          <div ref={panelRef} style={{ ...glass, width: 290, borderRadius: 0, borderLeft: '1px solid rgba(255,255,255,0.08)', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', flexShrink: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '0.5px' }}>设备库</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: -6 }}>拖拽设备到对应房间</div>
            {devices.map(dev => {
              const placed = Object.values(placedDevices).flat().includes(dev.name);
              return (
                <button key={dev.id} onMouseDown={(e) => !placed && (() => { e.preventDefault(); setDragDev(dev); setDragXY({ x: e.clientX, y: e.clientY }); })()} disabled={placed}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, width: '100%', background: placed ? 'rgba(52,199,89,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${placed ? 'rgba(52,199,89,0.15)' : 'rgba(255,255,255,0.05)'}`, borderRadius: 18, cursor: placed ? 'default' : 'grab', opacity: placed ? 0.45 : 1, color: '#fff', textAlign: 'left' as const, fontFamily: 'inherit', transition: 'all 0.3s' }}>
                  {dev.imageSrc ? <img src={dev.imageSrc} alt={dev.name} style={{ width: 44, height: 44, objectFit: 'contain', borderRadius: 12, background: 'rgba(255,255,255,0.04)', padding: 4, flexShrink: 0 }} /> : <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{placed ? '✓' : '·'}</div>}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{dev.name}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2, lineHeight: 1.3 }}>{dev.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer — hidden for card mode */}
      {!isCardMode && (
        <div ref={footerRef} style={{ ...glass, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 28px', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 6, height: 6, background: '#00E5FF', borderRadius: '50%', boxShadow: '0 0 8px #00E5FF', display: 'inline-block' }} />
            已放置 {placedN} / {correctN} 个设备
          </div>
          <button ref={linkBtnRef} onClick={() => allPlaced ? enterLink() : setFeedback('设备还没放完')} disabled={placedN === 0}
            style={{ background: allPlaced ? 'linear-gradient(180deg, #FF8A33, #FF6700)' : 'rgba(255,255,255,0.05)', border: allPlaced ? 'none' : '1px solid rgba(255,255,255,0.08)', borderTop: allPlaced ? '2px solid rgba(255,255,255,0.35)' : 'none', borderRadius: 50, padding: '12px 36px', fontSize: 15, fontWeight: 700, color: '#fff', cursor: placedN > 0 ? 'pointer' : 'not-allowed', opacity: placedN > 0 ? 1 : 0.25, boxShadow: allPlaced ? '0 6px 0 #CC5200, 0 12px 24px rgba(255,103,0,0.35)' : 'none', fontFamily: 'inherit', transition: 'all 0.2s' }}>
            {allPlaced ? '配置联动' : '试试看'}
          </button>
        </div>
      )}

      {/* Drag ghost */}
      {dragDev && dragXY && (
        <div style={{ position: 'fixed', left: dragXY.x, top: dragXY.y, transform: 'translate(-50%,-50%)', pointerEvents: 'none', zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          {dragDev.imageSrc ? <img src={dragDev.imageSrc} alt="" style={{ width: 48, height: 48, objectFit: 'contain', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }} /> : <div style={{ width: 48, height: 48, background: 'rgba(255,103,0,0.8)', borderRadius: 12 }} />}
          <div style={{ fontSize: 10, color: '#fff', background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: 4 }}>{dragDev.name}</div>
        </div>
      )}

      {/* Cover page */}
      {phase === 'cover' && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 200,
          background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ textAlign: 'center', maxWidth: 500, padding: '0 32px' }}>
            {/* Xiaomi logo */}
            <img src="/assets/milogo.png" alt="小米" style={{ height: 36, objectFit: 'contain', marginBottom: 32, opacity: 0.9 }} />

            {/* Title */}
            <div style={{ fontSize: 32, fontWeight: 700, color: '#fff', letterSpacing: '6px', marginBottom: 12 }}>
              人车家全生态
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', letterSpacing: '4px', marginBottom: 40 }}>
              智能生活解谜游戏
            </div>

            {/* Description */}
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 2.2, marginBottom: 48 }}>
              在小米的世界里，家里的每一个设备、口袋里的手机、车库里的汽车，都不再是孤立的个体。
              它们通过小米澎湃OS互相连接，像有默契的伙伴一样，读懂你的需求，为你的生活自动准备好一切。
              <br /><br />
              接下来，你将通过四个场景，体验小明的一天——
              <br />
              从清晨起床到傍晚回家，感受人、车、家之间的无缝协作。
            </div>

            {/* Start button */}
            <button onClick={() => setPhase('story')} style={{
              ...orangeBtn, padding: '14px 48px', fontSize: 16, letterSpacing: '3px',
            }}>
              开始体验
            </button>

            {/* Footer */}
            <div style={{ marginTop: 48, fontSize: 11, color: 'rgba(255,255,255,0.15)', letterSpacing: '2px' }}>
              小米 · 人车家全生态互动游戏
            </div>
          </div>
        </div>
      )}

      {/* Cinematic story transition */}
      {phase === 'story' && <CinematicTransition key={currentLevel} storyText={lvl.storyText} levelName={lvl.name} levelId={lvl.id} onComplete={enterPlay} />}

      {/* Single-rule link overlay (levels 1, 2) */}
      <Overlay visible={phase === 'link' && !isMultiRule}>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#34C759', marginBottom: 16 }}>设备已就位，设置联动规则：</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>当以下条件触发时：</div>
          {lvl.triggers.map(t => (
            <div key={t.id} onClick={() => { setTriggerId(t.id); setLinkFb(null); }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', margin: '4px 0', background: triggerId === t.id ? 'rgba(0,229,255,0.08)' : 'rgba(255,255,255,0.02)', border: `1.5px solid ${triggerId === t.id ? 'rgba(0,229,255,0.3)' : 'rgba(255,255,255,0.05)'}`, borderRadius: 14, cursor: 'pointer', fontSize: 13, transition: 'all 0.2s' }}>
              <input type="radio" checked={triggerId === t.id} readOnly style={{ accentColor: '#00E5FF' }} /><span>{t.label}</span>
            </div>
          ))}
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: '16px 0 8px' }}>自动执行：</div>
          {lvl.actions.map(a => (
            <div key={a.id} onClick={() => { const s = new Set(actionIds); s.has(a.id) ? s.delete(a.id) : s.add(a.id); setActionIds(s); setLinkFb(null); }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', margin: '4px 0', background: actionIds.has(a.id) ? 'rgba(52,199,89,0.08)' : 'rgba(255,255,255,0.02)', border: `1.5px solid ${actionIds.has(a.id) ? 'rgba(52,199,89,0.2)' : 'rgba(255,255,255,0.05)'}`, borderRadius: 14, cursor: 'pointer', fontSize: 13, transition: 'all 0.2s' }}>
              <input type="checkbox" checked={actionIds.has(a.id)} readOnly style={{ accentColor: '#34C759' }} /><span>{a.label}</span>
            </div>
          ))}
          {linkFb && <div style={{ marginTop: 14, padding: '12px 16px', borderRadius: 10, fontSize: 13, lineHeight: 1.5, background: linkFb.ok ? 'rgba(52,199,89,0.08)' : 'rgba(255,69,58,0.08)', color: linkFb.ok ? '#34C759' : '#FF453A', border: `1px solid ${linkFb.ok ? 'rgba(52,199,89,0.15)' : 'rgba(255,69,58,0.15)'}` }}>{linkFb.text}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 18, justifyContent: 'flex-end' }}>
            <button onClick={() => setPhase('play')} style={{ ...glass, borderRadius: 50, padding: '9px 20px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>返回调整</button>
            <button onClick={onConfirmLink} disabled={!triggerId || actionIds.size === 0} style={{ background: (triggerId && actionIds.size > 0) ? 'linear-gradient(180deg, #FF8A33, #FF6700)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 50, padding: '9px 24px', fontSize: 13, fontWeight: 600, color: '#fff', cursor: (triggerId && actionIds.size > 0) ? 'pointer' : 'not-allowed', opacity: (triggerId && actionIds.size > 0) ? 1 : 0.3, fontFamily: 'inherit' }}>确认联动</button>
          </div>
        </div>
      </Overlay>

      {/* Multi-rule link overlay (level 3) */}
      <Overlay visible={phase === 'link' && isMultiRule} wide>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#34C759', marginBottom: 16 }}>设备已就位，设置 {lvl.multiRule?.rules.length} 条联动规则：</div>
          {/* Rule tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {lvl.multiRule?.rules.map((rule, idx) => (
              <button key={idx} onClick={() => setActiveRuleIdx(idx)} style={{ ...glass, borderRadius: 50, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: activeRuleIdx === idx ? 'rgba(0,229,255,0.12)' : 'rgba(255,255,255,0.02)', borderColor: activeRuleIdx === idx ? 'rgba(0,229,255,0.3)' : 'rgba(255,255,255,0.05)' }}>
                {rule.name}
                {ruleStates[idx]?.triggerId && ruleStates[idx]?.actionIds.size > 0 ? ' ✓' : ''}
              </button>
            ))}
          </div>
          {/* Active rule content */}
          {lvl.multiRule?.rules.map((rule, idx) => {
            if (idx !== activeRuleIdx) return null;
            const rs = ruleStates[idx] || { triggerId: null, actionIds: new Set<string>() };
            return (
              <div key={idx}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>当以下条件触发时：</div>
                {rule.triggers.map(t => (
                  <div key={t.id} onClick={() => { const ns = [...ruleStates]; ns[idx] = { ...ns[idx], triggerId: t.id }; setRuleStates(ns); setMultiRuleFb(null); }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', margin: '4px 0', background: rs.triggerId === t.id ? 'rgba(0,229,255,0.08)' : 'rgba(255,255,255,0.02)', border: `1.5px solid ${rs.triggerId === t.id ? 'rgba(0,229,255,0.3)' : 'rgba(255,255,255,0.05)'}`, borderRadius: 14, cursor: 'pointer', fontSize: 13 }}>
                    <input type="radio" checked={rs.triggerId === t.id} readOnly style={{ accentColor: '#00E5FF' }} /><span>{t.label}</span>
                  </div>
                ))}
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: '16px 0 8px' }}>自动执行：</div>
                {rule.actions.map(a => (
                  <div key={a.id} onClick={() => { const ns = [...ruleStates]; const s = new Set(rs.actionIds); s.has(a.id) ? s.delete(a.id) : s.add(a.id); ns[idx] = { ...ns[idx], actionIds: s }; setRuleStates(ns); setMultiRuleFb(null); }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', margin: '4px 0', background: rs.actionIds.has(a.id) ? 'rgba(52,199,89,0.08)' : 'rgba(255,255,255,0.02)', border: `1.5px solid ${rs.actionIds.has(a.id) ? 'rgba(52,199,89,0.2)' : 'rgba(255,255,255,0.05)'}`, borderRadius: 14, cursor: 'pointer', fontSize: 13 }}>
                    <input type="checkbox" checked={rs.actionIds.has(a.id)} readOnly style={{ accentColor: '#34C759' }} /><span>{a.label}</span>
                  </div>
                ))}
              </div>
            );
          })}
          {multiRuleFb && <div style={{ marginTop: 14, padding: '12px 16px', borderRadius: 10, fontSize: 13, lineHeight: 1.5, background: multiRuleFb.ok ? 'rgba(52,199,89,0.08)' : 'rgba(255,69,58,0.08)', color: multiRuleFb.ok ? '#34C759' : '#FF453A', border: `1px solid ${multiRuleFb.ok ? 'rgba(52,199,89,0.15)' : 'rgba(255,69,58,0.15)'}` }}>{multiRuleFb.text}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 18, justifyContent: 'flex-end' }}>
            <button onClick={() => setPhase('play')} style={{ ...glass, borderRadius: 50, padding: '9px 20px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>返回调整</button>
            <button onClick={onConfirmMultiRule} style={{ ...orangeBtn, padding: '9px 24px', fontSize: 13 }}>确认全部联动</button>
          </div>
        </div>
      </Overlay>

      {/* Success overlay */}
      <Overlay visible={phase === 'success'}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>{lvl.successTitle}</div>
        <div style={{ textAlign: 'left', margin: '0 auto', maxWidth: 340 }}>
          {timeline.slice(0, tlIdx).map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderLeft: '2px solid rgba(52,199,89,0.2)', paddingLeft: 16, marginLeft: 4, position: 'relative' }}>
              <span style={{ position: 'absolute', left: -4, top: 13, width: 6, height: 6, background: '#34C759', borderRadius: '50%', boxShadow: '0 0 8px rgba(52,199,89,0.4)' }} />
              <span style={{ fontSize: 11, color: '#FFD60A', fontWeight: 600, minWidth: 36 }}>{t.time}</span>
              <span style={{ fontSize: 12, color: '#fff' }}>{t.text}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.8, whiteSpace: 'pre-line', marginTop: 20 }}>{lvl.successText}</div>
        {lvl.transitionText && tlIdx >= timeline.length && (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.8, whiteSpace: 'pre-line', marginTop: 16, padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', fontStyle: 'italic' }}>{lvl.transitionText}</div>
        )}
        {tlIdx >= timeline.length && currentLevel < allLevels.length && (
          <button onClick={goNextLevel} style={{ ...orangeBtn, marginTop: 20 }}>{lvl.nextText}</button>
        )}
        {tlIdx >= timeline.length && currentLevel >= allLevels.length && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#FF6700', marginBottom: 16 }}>恭喜通关！小明的周六，因为你而变得完美。</div>
            <div style={{ textAlign: 'left', fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 2 }}>
              <div>无声默契 — 手环感知起床，热粥和热水已就绪</div>
              <div>光影时刻 — 一句话，客厅秒变私人影院</div>
              <div>安心出门 — 关门离家，家自动守护；走近SU7，车自动迎接</div>
              <div>家的记忆 — HyperMind学会了你的习惯，家已为你准备好一切</div>
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 16, fontStyle: 'italic' }}>永远相信美好的事情即将发生。</div>
          </div>
        )}
      </Overlay>

      {/* Finale — ecosystem video */}
      {phase === 'finale' && <FinaleVideo />}

      {/* Tutorial spotlight (level 1 only) */}
      {tutStep > 0 && tutStep <= 6 && phase === 'play' && currentLevel === 1 && (() => {
        // Get real DOM positions
        const getRect = (ref: React.RefObject<HTMLElement | null>) => ref.current?.getBoundingClientRect() || { top: 0, left: 0, width: 0, height: 0 };
        const canvas = getRect(canvasRef);
        const panel = getRect(panelRef);
        const challenge = getRect(challengeRef);
        const hintBtns = getRect(hintBtnsRef);
        const linkBtn = getRect(linkBtnRef);

        const pad = 6; // padding around highlight
        const spots: Record<number, { top: number; left: number; width: number; height: number; tip: string; sub: string; tipPos: 'bottom' | 'top' | 'left' | 'right' }> = {
          1: { top: challenge.top - pad, left: challenge.left - pad, width: challenge.width + pad*2, height: challenge.height + pad*2, tip: '关卡目标', sub: '这里显示你需要完成的任务\n仔细阅读，理解要解决什么问题', tipPos: 'bottom' },
          2: { top: canvas.top - pad, left: canvas.left - pad, width: canvas.width + pad*2, height: canvas.height + pad*2, tip: '这是小明的家', sub: '拖拽旋转、滚轮缩放来查看场景\n把合适的设备拖到对应的房间里', tipPos: 'right' },
          3: { top: panel.top - pad, left: panel.left - pad, width: panel.width + pad*2, height: panel.height + pad*2, tip: '智能设备库', sub: '从这里拖拽设备到左边的房间\n注意：有些设备是干扰项', tipPos: 'left' },
          4: { top: hintBtns.top - pad, left: hintBtns.left - pad, width: hintBtns.width + pad*2, height: hintBtns.height + pad*2, tip: '提示与重置', sub: '卡住了点「提示」获取线索\n想重来点「重置」', tipPos: 'bottom' },
          5: { top: linkBtn.top - pad, left: linkBtn.left - pad, width: linkBtn.width + pad*2, height: linkBtn.height + pad*2, tip: '配置联动', sub: '设备全部放好后这里会亮起\n点击后设置自动化规则', tipPos: 'top' },
          6: { top: canvas.top - pad, left: canvas.left - pad, width: canvas.width + pad*2, height: canvas.height + pad*2, tip: '开始吧！', sub: '拖拽设备到房间里，完成联动配置\n祝你通关顺利', tipPos: 'right' },
        };
        const s = spots[tutStep];
        if (!s || s.width === 0) return null;
        return (
          <div onClick={() => setTutStep(prev => prev >= 6 ? 0 : prev + 1)} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 90, cursor: 'pointer' }}>
            <div style={{ position: 'fixed', top: s.top, left: s.left, width: s.width, height: s.height, boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.65)', borderRadius: 12, border: '2px solid rgba(255, 103, 0, 0.5)', zIndex: 91, pointerEvents: 'none' }} />
            <div style={{
              position: 'fixed', zIndex: 92,
              ...(s.tipPos === 'right' ? { top: s.top + s.height * 0.3, left: s.left + s.width + 12 } :
                 s.tipPos === 'left' ? { top: s.top + s.height * 0.3, left: s.left - 272 } :
                 s.tipPos === 'top' ? { top: s.top - 140, left: s.left } :
                 { top: s.top + s.height + 12, left: s.left }),
              ...glass, borderRadius: 16, padding: '18px 22px', maxWidth: 260, boxShadow: '0 16px 40px rgba(0,0,0,0.5)', borderColor: 'rgba(255, 103, 0, 0.3)' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#FF6700', marginBottom: 6 }}>{s.tip}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{s.sub}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 10 }}>点击继续 ({tutStep}/6)</div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

import React, { useRef, useMemo, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, ContactShadows, Html, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// ===== Room Dimensions =====
const ROOM_W = 8;
const ROOM_D = 6;
const WALL_H = 3.0;
const WALL_T = 0.12;

// ===== Procedural Textures =====
function createWoodFloor(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#A08868';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 50; i++) {
    const y = Math.random() * 512;
    ctx.strokeStyle = `rgba(${130 + Math.random() * 30}, ${110 + Math.random() * 20}, ${70 + Math.random() * 20}, ${0.12 + Math.random() * 0.12})`;
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath(); ctx.moveTo(0, y);
    for (let x = 0; x < 512; x += 20) ctx.lineTo(x, y + Math.sin(x * 0.02) * 3);
    ctx.stroke();
  }
  const plankW = 64;
  ctx.strokeStyle = 'rgba(80, 60, 40, 0.15)';
  ctx.lineWidth = 1;
  for (let x = plankW; x < 512; x += plankW) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke(); }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

function createWallTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#F0EBE4';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2000; i++) {
    ctx.fillStyle = `rgba(${Math.random() > 0.5 ? 255 : 0},${Math.random() > 0.5 ? 255 : 0},${Math.random() > 0.5 ? 255 : 0},${Math.random() * 0.03})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1, 1);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 2);
  return tex;
}

// ===== Living Room Shell =====
function LivingRoomShell({ isTheaterMode }: { isTheaterMode: boolean }) {
  const woodTex = useMemo(() => createWoodFloor(), []);
  const wallTex = useMemo(() => createWallTex(), []);

  return (
    <group>
      {/* Floor */}
      <mesh receiveShadow position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial map={woodTex} roughness={0.55} metalness={0.05} />
      </mesh>

      {/* Back wall */}
      <mesh castShadow position={[0, WALL_H / 2, -ROOM_D / 2]}>
        <boxGeometry args={[ROOM_W, WALL_H, WALL_T]} />
        <meshStandardMaterial map={wallTex} roughness={0.85} />
      </mesh>

      {/* Left wall */}
      <mesh castShadow position={[-ROOM_W / 2, WALL_H / 2, 0]}>
        <boxGeometry args={[WALL_T, WALL_H, ROOM_D]} />
        <meshStandardMaterial map={wallTex} roughness={0.85} color="#E8E0D4" />
      </mesh>

      {/* Right wall — lower half only (dollhouse) */}
      <mesh castShadow position={[ROOM_W / 2, WALL_H * 0.25, 0]}>
        <boxGeometry args={[WALL_T, WALL_H * 0.5, ROOM_D]} />
        <meshStandardMaterial map={wallTex} roughness={0.85} color="#E8E0D4" />
      </mesh>

      {/* Baseboard */}
      <mesh position={[0, 0.04, -ROOM_D / 2 + WALL_T / 2 + 0.01]}>
        <boxGeometry args={[ROOM_W, 0.08, 0.02]} />
        <meshStandardMaterial color="#C8C0B4" roughness={0.4} />
      </mesh>

      {/* Crown molding */}
      <mesh position={[0, WALL_H - 0.03, -ROOM_D / 2 + WALL_T / 2 + 0.01]}>
        <boxGeometry args={[ROOM_W, 0.06, 0.03]} />
        <meshStandardMaterial color="#E0D8CC" roughness={0.3} />
      </mesh>
    </group>
  );
}

// ===== Furniture =====

function Sofa() {
  return (
    <group position={[0, 0, 1.5]}>
      {/* Base */}
      <mesh castShadow position={[0, 0.22, 0]}>
        <boxGeometry args={[2.8, 0.44, 1.0]} />
        <meshStandardMaterial color="#8A9A7A" roughness={0.85} />
      </mesh>
      {/* Back cushion */}
      <mesh castShadow position={[0, 0.55, -0.35]}>
        <boxGeometry args={[2.6, 0.4, 0.3]} />
        <meshStandardMaterial color="#7A8A6A" roughness={0.9} />
      </mesh>
      {/* Seat cushions */}
      <mesh castShadow position={[-0.7, 0.46, 0.05]}>
        <boxGeometry args={[1.1, 0.08, 0.8]} />
        <meshStandardMaterial color="#8A9A7A" roughness={0.92} />
      </mesh>
      <mesh castShadow position={[0.7, 0.46, 0.05]}>
        <boxGeometry args={[1.1, 0.08, 0.8]} />
        <meshStandardMaterial color="#8A9A7A" roughness={0.92} />
      </mesh>
      {/* Armrests */}
      <mesh castShadow position={[-1.35, 0.35, 0]}>
        <boxGeometry args={[0.15, 0.3, 0.9]} />
        <meshStandardMaterial color="#7A8A6A" roughness={0.85} />
      </mesh>
      <mesh castShadow position={[1.35, 0.35, 0]}>
        <boxGeometry args={[0.15, 0.3, 0.9]} />
        <meshStandardMaterial color="#7A8A6A" roughness={0.85} />
      </mesh>
      {/* Throw pillows */}
      <mesh castShadow position={[-0.9, 0.58, -0.15]}>
        <boxGeometry args={[0.35, 0.3, 0.08]} />
        <meshStandardMaterial color="#C8B898" roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0.9, 0.58, -0.15]}>
        <boxGeometry args={[0.35, 0.3, 0.08]} />
        <meshStandardMaterial color="#A8C0B0" roughness={0.9} />
      </mesh>
    </group>
  );
}

function CoffeeTable() {
  return (
    <group position={[0, 0, 0.2]}>
      {/* Top */}
      <mesh castShadow position={[0, 0.32, 0]}>
        <boxGeometry args={[1.0, 0.04, 0.6]} />
        <meshStandardMaterial color="#6B5B4A" roughness={0.4} />
      </mesh>
      {/* Legs */}
      {[[-0.42, -0.22], [0.42, -0.22], [-0.42, 0.22], [0.42, 0.22]].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, 0.16, lz]}>
          <cylinderGeometry args={[0.025, 0.025, 0.32, 8]} />
          <meshStandardMaterial color="#5A4A3A" roughness={0.4} metalness={0.1} />
        </mesh>
      ))}
      {/* Items on table */}
      <mesh position={[-0.2, 0.37, 0]}>
        <boxGeometry args={[0.2, 0.03, 0.15]} />
        <meshStandardMaterial color="#E8E0D4" roughness={0.8} />
      </mesh>
    </group>
  );
}

function TVWall() {
  return (
    <group position={[0, 0, -ROOM_D / 2 + 0.3]}>
      {/* TV console/stand */}
      <mesh castShadow position={[0, 0.25, 0]}>
        <boxGeometry args={[2.4, 0.5, 0.45]} />
        <meshStandardMaterial color="#2A2A2A" roughness={0.4} metalness={0.3} />
      </mesh>
      {/* TV screen (off by default) */}
      <mesh position={[0, 1.2, -0.05]}>
        <boxGeometry args={[2.0, 1.15, 0.04]} />
        <meshStandardMaterial color="#0A0A0A" roughness={0.2} metalness={0.5} />
      </mesh>
      {/* TV bezel */}
      <mesh position={[0, 1.2, -0.04]}>
        <boxGeometry args={[2.08, 1.22, 0.02]} />
        <meshStandardMaterial color="#1A1A1A" roughness={0.3} metalness={0.6} />
      </mesh>
    </group>
  );
}

function WindowWithCurtains({ isOpen }: { isOpen: boolean }) {
  return (
    <group position={[-ROOM_W / 2 + 0.06, WALL_H * 0.55, -0.5]}>
      {/* Window frame */}
      <mesh>
        <boxGeometry args={[0.04, 1.6, 2.0]} />
        <meshStandardMaterial color="#D0C8BC" roughness={0.35} metalness={0.1} />
      </mesh>
      {/* Cross bars */}
      <mesh position={[0.02, 0, 0]}>
        <boxGeometry args={[0.03, 0.02, 1.9]} />
        <meshStandardMaterial color="#C8C0B4" roughness={0.35} />
      </mesh>
      <mesh position={[0.02, 0, 0]}>
        <boxGeometry args={[0.03, 1.5, 0.02]} />
        <meshStandardMaterial color="#C8C0B4" roughness={0.35} />
      </mesh>
      {/* Window sill */}
      <mesh position={[0.1, -0.82, 0]}>
        <boxGeometry args={[0.2, 0.04, 2.1]} />
        <meshStandardMaterial color="#E0D8CC" roughness={0.3} />
      </mesh>
      {/* Curtains */}
      {isOpen ? (
        <>
          {/* Curtains bunched to sides */}
          <mesh position={[0.08, 0, -0.9]}>
            <boxGeometry args={[0.08, 1.6, 0.25]} />
            <meshStandardMaterial color="#D4C8B8" roughness={0.9} />
          </mesh>
          <mesh position={[0.08, 0, 0.9]}>
            <boxGeometry args={[0.08, 1.6, 0.25]} />
            <meshStandardMaterial color="#D4C8B8" roughness={0.9} />
          </mesh>
        </>
      ) : (
        /* Curtains closed */
        <mesh position={[0.08, 0, 0]}>
          <boxGeometry args={[0.06, 1.6, 2.0]} />
          <meshStandardMaterial color="#D4C8B8" roughness={0.9} />
        </mesh>
      )}
      {/* Light from outside */}
      {isOpen && (
        <pointLight position={[0.5, 0, 0]} intensity={1.5} color="#FFE8C0" distance={5} />
      )}
    </group>
  );
}

function AmbientLightStrip({ isOn }: { isOn: boolean }) {
  // LED strip along the ceiling edge of back wall
  return (
    <group position={[0, WALL_H - 0.08, -ROOM_D / 2 + 0.2]}>
      <mesh>
        <boxGeometry args={[ROOM_W - 0.5, 0.03, 0.03]} />
        <meshStandardMaterial
          color={isOn ? '#FFD4A0' : '#333'}
          emissive={isOn ? '#FF8A33' : '#000'}
          emissiveIntensity={isOn ? 0.8 : 0}
          roughness={0.9}
        />
      </mesh>
      {isOn && (
        <pointLight position={[0, -0.1, 0.2]} intensity={0.8} color="#FFD4A0" distance={4} />
      )}
    </group>
  );
}

function FloorLamp() {
  return (
    <group position={[ROOM_W / 2 - 0.6, 0, 1.0]}>
      {/* Base */}
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.15, 0.18, 0.04, 12]} />
        <meshStandardMaterial color="#2A2A2A" roughness={0.3} metalness={0.5} />
      </mesh>
      {/* Pole */}
      <mesh position={[0, 0.75, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 1.5, 8]} />
        <meshStandardMaterial color="#C0C0C0" metalness={0.8} roughness={0.15} />
      </mesh>
      {/* Shade */}
      <mesh position={[0, 1.55, 0]}>
        <cylinderGeometry args={[0.2, 0.15, 0.25, 12]} />
        <meshStandardMaterial color="#F5F0E8" roughness={0.9} emissive="#FFF4D6" emissiveIntensity={0.3} />
      </mesh>
      <pointLight position={[0, 1.5, 0]} intensity={0.6} color="#FFF4D6" distance={3} />
    </group>
  );
}

function Bookshelf() {
  return (
    <group position={[ROOM_W / 2 - 0.3, 0, -ROOM_D / 2 + 0.3]}>
      {/* Frame */}
      <mesh castShadow position={[0, 1.0, 0]}>
        <boxGeometry args={[0.8, 2.0, 0.35]} />
        <meshStandardMaterial color="#8B7B6A" roughness={0.5} />
      </mesh>
      {/* Shelves */}
      {[0.3, 0.7, 1.1, 1.5].map((y, i) => (
        <mesh key={i} position={[0, y, 0.02]}>
          <boxGeometry args={[0.72, 0.03, 0.3]} />
          <meshStandardMaterial color="#7B6B5A" roughness={0.5} />
        </mesh>
      ))}
      {/* Books */}
      {[0.4, 0.8, 1.2].map((y, i) => (
        <mesh key={'b' + i} position={[-0.1 + i * 0.15, y + 0.12, 0.02]}>
          <boxGeometry args={[0.08, 0.2, 0.2]} />
          <meshStandardMaterial color={['#C44', '#48A', '#4A8'][i]} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function Plant({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.15, 0.12, 0.4, 8]} />
        <meshStandardMaterial color="#C4A882" roughness={0.65} />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.25, 8, 6]} />
        <meshStandardMaterial color="#5A8A5A" roughness={0.75} />
      </mesh>
      <mesh position={[0.1, 0.68, 0.05]}>
        <sphereGeometry args={[0.18, 8, 6]} />
        <meshStandardMaterial color="#4A7A4A" roughness={0.75} />
      </mesh>
    </group>
  );
}

function Rug() {
  return (
    <mesh position={[0, 0.005, 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[3.0, 2.0]} />
      <meshStandardMaterial color="#B8A898" roughness={0.95} />
    </mesh>
  );
}

// ===== Static Scene =====
const StaticLivingRoom = React.memo(function StaticLivingRoom({ isTheaterMode }: { isTheaterMode: boolean }) {
  return (
    <>
      <LivingRoomShell isTheaterMode={isTheaterMode} />
      <Sofa />
      <CoffeeTable />
      <TVWall />
      <WindowWithCurtains isOpen={!isTheaterMode} />
      <AmbientLightStrip isOn={isTheaterMode} />
      <FloorLamp />
      <Bookshelf />
      <Plant position={[-ROOM_W / 2 + 0.5, 0, 1.5]} />
      <Plant position={[ROOM_W / 2 - 0.5, 0, -1.5]} />
      <Rug />
    </>
  );
});

// ===== Room Label =====
function RoomLabel({ isHovered }: { isHovered: boolean }) {
  return (
    <Html position={[0, WALL_H + 0.4, 0]} center distanceFactor={8} zIndexRange={[1, 5]}>
      <div style={{
        background: isHovered ? 'rgba(255,103,0,0.9)' : 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(10px)',
        color: '#fff', padding: '5px 18px', borderRadius: '10px',
        fontSize: '14px', fontWeight: 600, letterSpacing: '2px',
        whiteSpace: 'nowrap', pointerEvents: 'none',
        transition: 'all 0.3s',
        boxShadow: isHovered ? '0 0 24px rgba(255,103,0,0.35)' : '0 4px 12px rgba(0,0,0,0.3)',
      }}>客厅</div>
    </Html>
  );
}

// ===== Exported Scene =====
export default function Level2Scene({ hoveredRoom, setHoveredRoom, placedDevices, isTheaterMode = false }: {
  hoveredRoom: string | null;
  setHoveredRoom: (id: string | null) => void;
  placedDevices: Record<string, string[]>;
  isTheaterMode?: boolean;
}) {
  return (
    <>
      {/* Lighting — changes based on theater mode */}
      <color attach="background" args={[isTheaterMode ? '#0a0a12' : '#1a2a40']} />
      <fog attach="fog" args={[isTheaterMode ? '#0a0a12' : '#1a2a40', 12, 30]} />

      <ambientLight intensity={isTheaterMode ? 0.15 : 0.65} color={isTheaterMode ? '#1a1a2a' : '#F0E8E0'} />
      <directionalLight
        position={[6, 14, 12]} intensity={isTheaterMode ? 0.2 : 1.4}
        castShadow shadow-mapSize={[2048, 2048]}
        shadow-camera-far={40} shadow-camera-left={-10} shadow-camera-right={10}
        shadow-camera-top={8} shadow-camera-bottom={-8} shadow-bias={-0.0005}
        color={isTheaterMode ? '#2a2a4a' : '#FFF8F0'}
      />
      <directionalLight position={[-4, 6, 8]} intensity={isTheaterMode ? 0.1 : 0.5} color="#E8F0FF" />
      <hemisphereLight args={[isTheaterMode ? '#1a1a3a' : '#FFF8F0', '#B8A898', isTheaterMode ? 0.1 : 0.4]} />

      {/* Ceiling light */}
      <pointLight position={[0, WALL_H - 0.3, 0]} intensity={isTheaterMode ? 0.1 : (hoveredRoom === 'living' ? 1.8 : 0.8)} color="#FFF4E8" distance={8} />

      {/* Static scene */}
      <StaticLivingRoom isTheaterMode={isTheaterMode} />

      {/* Interaction zone */}
      <mesh
        position={[0, 0.05, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerOver={(e) => { e.stopPropagation(); setHoveredRoom('living'); }}
        onPointerOut={() => setHoveredRoom(null)}
      >
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial transparent opacity={hoveredRoom === 'living' ? 0.04 : 0} color="#FF6700" depthWrite={false} />
      </mesh>

      <RoomLabel isHovered={hoveredRoom === 'living'} />

      {/* Ground */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color={isTheaterMode ? '#060608' : '#1a2a3a'} roughness={1} />
      </mesh>

      <ContactShadows position={[0, -0.02, 0]} opacity={0.3} scale={20} blur={2.5} far={6} />

      <OrbitControls
        makeDefault
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 3}
        minAzimuthAngle={-Math.PI / 6}
        maxAzimuthAngle={Math.PI / 6}
        minDistance={6}
        maxDistance={14}
        enableDamping dampingFactor={0.05}
        rotateSpeed={0.4}
        target={[0, 1.2, 0]}
      />
    </>
  );
}

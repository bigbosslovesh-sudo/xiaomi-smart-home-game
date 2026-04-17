import React, { useRef, useMemo, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Html, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// ===== Layout Constants =====
const WALL_H = 2.8;
const WALL_T = 0.12;
const SLAB_T = 0.18; // thick floor slab between floors

// Upper floor rooms
const U_BATH_W = 3;
const U_BED_W = 4;
const U_KITCH_W = 4;
const UPPER_W = U_BATH_W + U_BED_W + U_KITCH_W + WALL_T * 2;
const UPPER_D = 4;
const UPPER_Y = WALL_H + SLAB_T; // upper floor base Y (sits on top of slab)

// Upper room centers
const U_BATH_X = -UPPER_W / 2 + U_BATH_W / 2;
const U_BED_X = U_BATH_X + U_BATH_W / 2 + WALL_T + U_BED_W / 2;
const U_KITCH_X = U_BED_X + U_BED_W / 2 + WALL_T + U_KITCH_W / 2;

// Lower floor rooms — same width, stacked directly below
const L_LIVING_W = 5;
const L_HALL_W = 2.5;
const L_PARK_W = 3.5;
const LOWER_W = L_LIVING_W + L_HALL_W + L_PARK_W + WALL_T * 2;
const LOWER_D = 4;
const LOWER_Y = 0;

// Lower room centers
const L_LIVING_X = -LOWER_W / 2 + L_LIVING_W / 2;
const L_HALL_X = L_LIVING_X + L_LIVING_W / 2 + WALL_T + L_HALL_W / 2;
const L_PARK_X = L_HALL_X + L_HALL_W / 2 + WALL_T + L_PARK_W / 2;

// Both floors share the same Z — stacked vertically like a real building
const UPPER_Z = -LOWER_D / 2 - UPPER_D / 2 - 0.3;
const LOWER_Z = 0;

// ===== Textures =====
function makeWoodTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#A08868'; ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 40; i++) {
    const y = Math.random() * 512;
    ctx.strokeStyle = `rgba(${130+Math.random()*30},${110+Math.random()*20},${70+Math.random()*20},${0.1+Math.random()*0.12})`;
    ctx.lineWidth = 1 + Math.random() * 2; ctx.beginPath(); ctx.moveTo(0, y);
    for (let x = 0; x < 512; x += 20) ctx.lineTo(x, y + Math.sin(x * 0.02) * 3);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(80,60,40,0.15)'; ctx.lineWidth = 1;
  for (let x = 64; x < 512; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); return t;
}

function makeTileTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512;
  const ctx = c.getContext('2d')!;
  const ts = 64;
  for (let y = 0; y < 512; y += ts) for (let x = 0; x < 512; x += ts) {
    const b = 195 + Math.random() * 15;
    ctx.fillStyle = `rgb(${b},${b+10},${b+15})`; ctx.fillRect(x+1, y+1, ts-2, ts-2);
  }
  ctx.strokeStyle = 'rgba(160,170,175,0.6)'; ctx.lineWidth = 2;
  for (let x = 0; x <= 512; x += ts) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke(); }
  for (let y = 0; y <= 512; y += ts) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); return t;
}

function makeWallTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#E8E0D4'; ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2000; i++) {
    ctx.fillStyle = `rgba(${Math.random()>0.5?255:0},${Math.random()>0.5?255:0},${Math.random()>0.5?255:0},${Math.random()*0.03})`;
    ctx.fillRect(Math.random()*256, Math.random()*256, 1, 1);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 1.5); return t;
}

function makeConcreteTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 3000; i++) {
    ctx.fillStyle = `rgba(${Math.random()>0.5?200:100},${Math.random()>0.5?200:100},${Math.random()>0.5?200:100},${Math.random()*0.05})`;
    ctx.fillRect(Math.random()*256, Math.random()*256, 1, 1);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); return t;
}

// ===== Wall helper =====
function Wall({ pos, size, tex, color }: { pos: [number, number, number]; size: [number, number, number]; tex: THREE.Texture; color?: string }) {
  return (
    <mesh castShadow receiveShadow position={pos}>
      <boxGeometry args={size} />
      <meshStandardMaterial map={tex} roughness={0.85} color={color} />
    </mesh>
  );
}

// ===== Upper Floor (Bathroom + Bedroom + Kitchen) =====
function UpperFloor({ woodTex, tileTex, wallTex }: { woodTex: THREE.Texture; tileTex: THREE.Texture; wallTex: THREE.Texture }) {
  const uy = UPPER_Y;
  const uz = UPPER_Z;
  return (
    <group position={[0, 0, uz]}>
      {/* Floors */}
      <mesh receiveShadow position={[U_BATH_X, uy + 0.01, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[U_BATH_W, UPPER_D]} />
        <meshStandardMaterial map={tileTex} roughness={0.3} />
      </mesh>
      <mesh receiveShadow position={[U_BED_X, uy + 0.01, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[U_BED_W, UPPER_D]} />
        <meshStandardMaterial map={woodTex} roughness={0.6} />
      </mesh>
      <mesh receiveShadow position={[U_KITCH_X, uy + 0.01, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[U_KITCH_W, UPPER_D]} />
        <meshStandardMaterial map={woodTex} roughness={0.55} color="#C4A882" />
      </mesh>

      {/* Back wall - split for bedroom window opening */}
      {/* Bathroom back wall (solid) */}
      <Wall pos={[U_BATH_X, uy + WALL_H/2, -UPPER_D/2]} size={[U_BATH_W, WALL_H, WALL_T]} tex={wallTex} />
      {/* Bedroom back wall - left of window (from bedroom left edge to window left) */}
      <Wall pos={[-1.9, uy + WALL_H/2, -UPPER_D/2]} size={[1.2, WALL_H, WALL_T]} tex={wallTex} />
      {/* Bedroom back wall - right of window (from window right to bedroom right edge) */}
      <Wall pos={[0.9, uy + WALL_H/2, -UPPER_D/2]} size={[1.2, WALL_H, WALL_T]} tex={wallTex} />
      {/* Bedroom back wall - above window */}
      <Wall pos={[U_BED_X, uy + WALL_H - 0.3, -UPPER_D/2]} size={[1.6, 0.6, WALL_T]} tex={wallTex} />
      {/* Bedroom back wall - below window */}
      <Wall pos={[U_BED_X, uy + 0.35, -UPPER_D/2]} size={[1.6, 0.7, WALL_T]} tex={wallTex} />
      {/* Kitchen back wall (solid) */}
      <Wall pos={[U_KITCH_X, uy + WALL_H/2, -UPPER_D/2]} size={[U_KITCH_W, WALL_H, WALL_T]} tex={wallTex} />

      {/* Interior walls with doorways */}
      {/* Bath-Bed wall */}
      <Wall pos={[U_BATH_X + U_BATH_W/2 + WALL_T/2, uy + WALL_H - 0.3, 0]} size={[WALL_T, 0.6, UPPER_D]} tex={wallTex} color="#D8D0C4" />
      <Wall pos={[U_BATH_X + U_BATH_W/2 + WALL_T/2, uy + WALL_H/2, -UPPER_D/2 + 0.75]} size={[WALL_T, WALL_H, 1.5]} tex={wallTex} color="#D8D0C4" />
      <Wall pos={[U_BATH_X + U_BATH_W/2 + WALL_T/2, uy + WALL_H/2, UPPER_D/2 - 0.5]} size={[WALL_T, WALL_H, 1.0]} tex={wallTex} color="#D8D0C4" />
      {/* Bed-Kitchen wall */}
      <Wall pos={[U_BED_X + U_BED_W/2 + WALL_T/2, uy + WALL_H - 0.3, 0]} size={[WALL_T, 0.6, UPPER_D]} tex={wallTex} color="#D8D0C4" />
      <Wall pos={[U_BED_X + U_BED_W/2 + WALL_T/2, uy + WALL_H/2, -UPPER_D/2 + 0.75]} size={[WALL_T, WALL_H, 1.5]} tex={wallTex} color="#D8D0C4" />
      <Wall pos={[U_BED_X + U_BED_W/2 + WALL_T/2, uy + WALL_H/2, UPPER_D/2 - 0.5]} size={[WALL_T, WALL_H, 1.0]} tex={wallTex} color="#D8D0C4" />

      {/* Floor slab — thick concrete slab visible between floors */}
      <mesh castShadow receiveShadow position={[0, uy - SLAB_T / 2, 0]}>
        <boxGeometry args={[UPPER_W + 0.04, SLAB_T, UPPER_D + 0.04]} />
        <meshStandardMaterial color="#D0C8BC" roughness={0.75} />
      </mesh>

      {/* ===== BEDROOM FURNITURE ===== */}
      <group position={[U_BED_X, uy, 0]}>
        {/* Bed */}
        <group position={[0.3, 0, -0.3]}>
          <mesh castShadow position={[0, 0.7, -1.0]}><boxGeometry args={[1.8, 0.85, 0.06]} /><meshStandardMaterial color="#6B5B4A" roughness={0.55} /></mesh>
          <mesh castShadow position={[0, 0.22, 0]}><boxGeometry args={[1.8, 0.44, 2.1]} /><meshStandardMaterial color="#8B7B6A" roughness={0.5} /></mesh>
          <mesh castShadow position={[0, 0.48, 0.05]}><boxGeometry args={[1.65, 0.14, 1.9]} /><meshStandardMaterial color="#F0EBE4" roughness={0.95} /></mesh>
          {/* Pillows */}
          <mesh castShadow position={[-0.35, 0.58, -0.65]}><boxGeometry args={[0.45, 0.1, 0.3]} /><meshStandardMaterial color="#FFF" roughness={0.95} /></mesh>
          <mesh castShadow position={[0.35, 0.58, -0.65]}><boxGeometry args={[0.45, 0.1, 0.3]} /><meshStandardMaterial color="#FFF" roughness={0.95} /></mesh>
          {/* Duvet */}
          <mesh castShadow position={[0, 0.57, 0.35]}><boxGeometry args={[1.6, 0.08, 1.0]} /><meshStandardMaterial color="#A8B8C8" roughness={0.9} /></mesh>
        </group>
        {/* Nightstands with lamps */}
        {[-0.7, 1.3].map((nx, i) => (
          <group key={i} position={[nx, 0, -0.8]}>
            <mesh castShadow position={[0, 0.25, 0]}><boxGeometry args={[0.45, 0.5, 0.4]} /><meshStandardMaterial color="#8B7B6A" roughness={0.5} /></mesh>
            <mesh position={[0, 0.72, 0]}><cylinderGeometry args={[0.14, 0.1, 0.16, 12]} /><meshStandardMaterial color="#FFF4D6" roughness={0.9} emissive="#FFE8A0" emissiveIntensity={0.8} /></mesh>
            <pointLight position={[0, 0.8, 0]} intensity={1.2} color="#FFE8C0" distance={3} />
          </group>
        ))}
        {/* Wardrobe — against back wall, right side */}
        <group position={[1.5, 0, -1.6]}>
          <mesh castShadow position={[0, 1.0, 0]}><boxGeometry args={[0.8, 2.0, 0.55]} /><meshStandardMaterial color="#8B7B6A" roughness={0.5} /></mesh>
          {/* Door line */}
          <mesh position={[0, 1.0, 0.28]}><boxGeometry args={[0.01, 1.8, 0.01]} /><meshStandardMaterial color="#6B5B4A" /></mesh>
          {/* Handles */}
          <mesh position={[-0.04, 1.0, 0.29]}><boxGeometry args={[0.02, 0.12, 0.02]} /><meshStandardMaterial color="#A0A0A0" metalness={0.7} /></mesh>
          <mesh position={[0.04, 1.0, 0.29]}><boxGeometry args={[0.02, 0.12, 0.02]} /><meshStandardMaterial color="#A0A0A0" metalness={0.7} /></mesh>
        </group>
        {/* Rug */}
        <mesh position={[0.3, 0.005, 1.0]} rotation={[-Math.PI/2, 0, 0]}><circleGeometry args={[0.9, 24]} /><meshStandardMaterial color="#C4B8A8" roughness={0.95} /></mesh>
        {/* Plant */}
        <group position={[1.6, 0, 1.5]}>
          <mesh position={[0, 0.18, 0]}><cylinderGeometry args={[0.13, 0.1, 0.36, 8]} /><meshStandardMaterial color="#C4A882" roughness={0.65} /></mesh>
          <mesh position={[0, 0.5, 0]}><sphereGeometry args={[0.22, 8, 6]} /><meshStandardMaterial color="#5A8A5A" roughness={0.75} /></mesh>
        </group>
      </group>

      {/* ===== BATHROOM FURNITURE ===== */}
      <group position={[U_BATH_X, uy, 0]}>
        {/* Shower with showerhead */}
        <group position={[-0.4, 0, -0.8]}>
          <mesh position={[0, 0.03, 0]}><boxGeometry args={[1.3, 0.06, 1.3]} /><meshStandardMaterial color="#E8E4E0" roughness={0.25} /></mesh>
          <mesh position={[-0.65, 0.95, 0]}><boxGeometry args={[0.02, 1.9, 1.3]} /><meshPhysicalMaterial color="#D4E8F0" transparent opacity={0.15} roughness={0.02} /></mesh>
          {/* Shower pipe + head */}
          <mesh position={[-0.45, 1.55, -0.58]}><cylinderGeometry args={[0.012, 0.012, 0.4, 6]} /><meshStandardMaterial color="#C8C8C8" metalness={0.9} roughness={0.1} /></mesh>
          <mesh position={[-0.45, 1.78, -0.58]}><cylinderGeometry args={[0.1, 0.12, 0.03, 12]} /><meshStandardMaterial color="#C8C8C8" metalness={0.9} roughness={0.1} /></mesh>
          {/* Faucet knobs */}
          <mesh position={[-0.45, 1.2, -0.58]}><cylinderGeometry args={[0.03, 0.03, 0.02, 8]} /><meshStandardMaterial color="#C0C0C0" metalness={0.8} /></mesh>
        </group>
        {/* Sink + mirror + light */}
        <group position={[0.8, 0, -1.65]}>
          <mesh castShadow position={[0, 0.4, 0]}><boxGeometry args={[0.85, 0.8, 0.5]} /><meshStandardMaterial color="#FFF" roughness={0.35} /></mesh>
          {/* Sink basin */}
          <mesh position={[0, 0.82, 0.05]}><boxGeometry args={[0.5, 0.04, 0.35]} /><meshStandardMaterial color="#F0F0F0" roughness={0.15} /></mesh>
          {/* Faucet */}
          <mesh position={[0, 0.92, -0.08]}><cylinderGeometry args={[0.012, 0.012, 0.18, 6]} /><meshStandardMaterial color="#C8C8C8" metalness={0.9} roughness={0.08} /></mesh>
          {/* Mirror */}
          <mesh position={[0, 1.5, -0.22]}><boxGeometry args={[0.65, 0.85, 0.025]} /><meshStandardMaterial color="#E0E8F0" roughness={0.03} metalness={0.7} /></mesh>
          {/* Mirror light fixture */}
          <mesh position={[0, 1.98, -0.19]}><boxGeometry args={[0.5, 0.06, 0.08]} /><meshStandardMaterial color="#C8C8C8" metalness={0.8} roughness={0.15} /></mesh>
          <mesh position={[0, 1.94, -0.13]}><boxGeometry args={[0.45, 0.025, 0.03]} /><meshStandardMaterial color="#FFF8F0" emissive="#FFF4E8" emissiveIntensity={1.0} roughness={0.9} /></mesh>
          <pointLight position={[0, 1.9, -0.05]} intensity={1.0} color="#F0F4FF" distance={2.5} />
        </group>
        {/* Toilet */}
        <group position={[0.8, 0, 0.8]}>
          <mesh castShadow position={[0, 0.2, 0]}><boxGeometry args={[0.4, 0.4, 0.55]} /><meshStandardMaterial color="#F8F8F8" roughness={0.2} /></mesh>
          <mesh castShadow position={[0, 0.55, -0.25]}><boxGeometry args={[0.36, 0.25, 0.06]} /><meshStandardMaterial color="#F0F0F0" roughness={0.2} /></mesh>
        </group>
        {/* Towel rack on side wall */}
        <group position={[U_BATH_W/2 - 0.15, 1.2, 0.3]}>
          <mesh><boxGeometry args={[0.02, 0.02, 0.5]} /><meshStandardMaterial color="#C0C0C0" metalness={0.8} roughness={0.15} /></mesh>
          <mesh position={[0, -0.08, 0.02]}><boxGeometry args={[0.02, 0.15, 0.45]} /><meshStandardMaterial color="#F0F0F0" roughness={0.9} /></mesh>
        </group>
        {/* Bath mat */}
        <mesh position={[-0.4, 0.005, 0.1]} rotation={[-Math.PI/2, 0, 0]}><planeGeometry args={[0.6, 0.4]} /><meshStandardMaterial color="#D0D8E0" roughness={0.95} /></mesh>
      </group>

      {/* ===== KITCHEN FURNITURE ===== */}
      <group position={[U_KITCH_X, uy, 0]}>
        {/* Cabinets + counter */}
        <group position={[0, 0, -UPPER_D/2 + 0.4]}>
          <mesh castShadow position={[0, 0.4, 0]}><boxGeometry args={[3.6, 0.8, 0.6]} /><meshStandardMaterial color="#D4C8B8" roughness={0.45} /></mesh>
          <mesh castShadow position={[0, 0.82, 0.02]}><boxGeometry args={[3.7, 0.04, 0.68]} /><meshStandardMaterial color="#E8E0D4" roughness={0.2} /></mesh>
          <mesh castShadow position={[0, 1.95, -0.05]}><boxGeometry args={[3.6, 0.7, 0.35]} /><meshStandardMaterial color="#D4C8B8" roughness={0.45} /></mesh>
          {/* Stove */}
          <mesh position={[-0.5, 0.85, 0.08]}><boxGeometry args={[0.6, 0.02, 0.5]} /><meshStandardMaterial color="#1A1A1A" roughness={0.25} metalness={0.7} /></mesh>
          {/* Range hood + light */}
          <mesh castShadow position={[-0.5, 2.15, 0.15]}><boxGeometry args={[0.7, 0.25, 0.45]} /><meshStandardMaterial color="#C0C0C0" metalness={0.75} roughness={0.15} /></mesh>
          <pointLight position={[-0.5, 2.0, 0.15]} intensity={0.5} color="#FFF4E8" distance={1.5} />
          {/* Fridge */}
          <mesh castShadow position={[1.55, 0.85, 0.05]}><boxGeometry args={[0.7, 1.7, 0.65]} /><meshStandardMaterial color="#E8E8E8" roughness={0.3} metalness={0.15} /></mesh>
          {/* Fridge handle */}
          <mesh position={[1.25, 1.0, 0.38]}><boxGeometry args={[0.02, 0.4, 0.03]} /><meshStandardMaterial color="#C0C0C0" metalness={0.8} roughness={0.15} /></mesh>
          {/* Kitchen sink */}
          <mesh position={[0.6, 0.84, 0.1]}><boxGeometry args={[0.5, 0.02, 0.4]} /><meshStandardMaterial color="#C8C8C8" metalness={0.6} roughness={0.2} /></mesh>
          <mesh position={[0.6, 0.92, -0.02]}><cylinderGeometry args={[0.012, 0.012, 0.15, 6]} /><meshStandardMaterial color="#C8C8C8" metalness={0.9} roughness={0.08} /></mesh>
        </group>
        {/* Round dining table + chairs */}
        <group position={[-0.3, 0, 1.0]}>
          {/* Table top */}
          <mesh castShadow position={[0, 0.38, 0]}><cylinderGeometry args={[0.5, 0.5, 0.04, 16]} /><meshStandardMaterial color="#A08060" roughness={0.4} /></mesh>
          {/* Table legs — 4 legs */}
          {[[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]].map(([lx, lz], i) => (
            <mesh key={i} position={[lx, 0.19, lz]}><cylinderGeometry args={[0.025, 0.025, 0.38, 8]} /><meshStandardMaterial color="#8B7355" roughness={0.4} /></mesh>
          ))}
          {[0.6, -0.6].map((cx, i) => (
            <group key={i} position={[cx, 0, 0]}>
              <mesh castShadow position={[0, 0.22, 0]}><boxGeometry args={[0.38, 0.04, 0.38]} /><meshStandardMaterial color="#8B7355" roughness={0.45} /></mesh>
              <mesh castShadow position={[cx > 0 ? 0.17 : -0.17, 0.45, 0]}><boxGeometry args={[0.04, 0.5, 0.36]} /><meshStandardMaterial color="#8B7355" /></mesh>
              {/* Chair legs */}
              {[[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]].map(([lx, lz], j) => (
                <mesh key={j} position={[lx, 0.11, lz]}><boxGeometry args={[0.03, 0.22, 0.03]} /><meshStandardMaterial color="#7B6345" /></mesh>
              ))}
            </group>
          ))}
        </group>
        <group position={[-1.6, 0, 1.5]}>
          <mesh position={[0, 0.18, 0]}><cylinderGeometry args={[0.13, 0.1, 0.36, 8]} /><meshStandardMaterial color="#C4A882" roughness={0.65} /></mesh>
          <mesh position={[0, 0.5, 0]}><sphereGeometry args={[0.22, 8, 6]} /><meshStandardMaterial color="#5A8A5A" roughness={0.75} /></mesh>
        </group>
      </group>

      {/* Window in bedroom — sky plane inside + outer cover */}
      <group position={[U_BED_X, uy + WALL_H * 0.55, -UPPER_D/2 + 0.06]}>
        {/* Sky gradient on inner side */}
        <mesh position={[0, 0, -0.03]}>
          <planeGeometry args={[1.6, 1.4]} />
          <meshBasicMaterial>
            <canvasTexture attach="map" image={(() => {
              const c = document.createElement('canvas'); c.width = 256; c.height = 256;
              const ctx = c.getContext('2d')!;
              const g = ctx.createLinearGradient(0, 0, 0, 256);
              g.addColorStop(0, '#2a4a6e'); g.addColorStop(0.3, '#5a8abe'); g.addColorStop(0.6, '#8abcde');
              g.addColorStop(0.8, '#FFD8B0'); g.addColorStop(1, '#FFA870');
              ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
              ctx.fillStyle = '#1a1a2a';
              for (let x = 0; x < 256; x += 8 + Math.random() * 10) {
                const bh = 8 + Math.random() * 25; const bw = 4 + Math.random() * 6;
                ctx.fillRect(x, 256 - bh, bw, bh);
              }
              return c;
            })()} />
          </meshBasicMaterial>
        </mesh>
        {/* Window frame */}
        <mesh position={[0, 0.72, 0.01]}><boxGeometry args={[1.68, 0.04, 0.04]} /><meshStandardMaterial color="#D0C8BC" roughness={0.35} metalness={0.1} /></mesh>
        <mesh position={[0, -0.72, 0.01]}><boxGeometry args={[1.68, 0.04, 0.04]} /><meshStandardMaterial color="#D0C8BC" roughness={0.35} /></mesh>
        <mesh position={[-0.82, 0, 0.01]}><boxGeometry args={[0.04, 1.48, 0.04]} /><meshStandardMaterial color="#D0C8BC" roughness={0.35} /></mesh>
        <mesh position={[0.82, 0, 0.01]}><boxGeometry args={[0.04, 1.48, 0.04]} /><meshStandardMaterial color="#D0C8BC" roughness={0.35} /></mesh>
        <mesh position={[0, 0, 0.02]}><boxGeometry args={[1.6, 0.02, 0.03]} /><meshStandardMaterial color="#C8C0B4" /></mesh>
        <mesh position={[0, 0, 0.02]}><boxGeometry args={[0.02, 1.44, 0.03]} /><meshStandardMaterial color="#C8C0B4" /></mesh>
      </group>

      {/* Baseboard trim — upper floor back wall */}
      <mesh position={[0, uy + 0.04, -UPPER_D/2 + WALL_T/2 + 0.01]}><boxGeometry args={[UPPER_W, 0.08, 0.02]} /><meshStandardMaterial color="#C8C0B4" roughness={0.4} /></mesh>
      {/* Crown molding — upper floor back wall */}
      <mesh position={[0, uy + WALL_H - 0.03, -UPPER_D/2 + WALL_T/2 + 0.01]}><boxGeometry args={[UPPER_W, 0.06, 0.03]} /><meshStandardMaterial color="#E0D8CC" roughness={0.3} /></mesh>

      {/* Room ceiling light fixtures — visible pendants */}
      {[U_BATH_X, U_BED_X, U_KITCH_X].map((rx, i) => (
        <group key={i} position={[rx, uy + WALL_H - 0.15, 0]}>
          {/* Ceiling mount */}
          <mesh><cylinderGeometry args={[0.06, 0.06, 0.04, 8]} /><meshPhysicalMaterial color="#E0D8CC" roughness={0.4} transparent opacity={0.3} /></mesh>
          {/* Pendant shade — glowing */}
          <mesh position={[0, -0.15, 0]}><cylinderGeometry args={[0.18, 0.12, 0.12, 12]} /><meshPhysicalMaterial color="#FFF8E8" roughness={0.8} emissive="#FFE8A0" emissiveIntensity={1.2} transparent opacity={0.3} /></mesh>
          {/* Bulb glow visible from below */}
          <mesh position={[0, -0.22, 0]}><sphereGeometry args={[0.06, 8, 6]} /><meshPhysicalMaterial color="#FFF" emissive="#FFEECC" emissiveIntensity={2.0} transparent opacity={0.3} /></mesh>
          <pointLight position={[0, -0.25, 0]} intensity={1.8} color="#FFF4E8" distance={7} />
        </group>
      ))}
    </group>
  );
}


// ===== Lower Floor (Living Room + Hallway + Parking) =====
function LowerFloor({ woodTex, wallTex, concreteTex }: { woodTex: THREE.Texture; wallTex: THREE.Texture; concreteTex: THREE.Texture }) {
  const ly = LOWER_Y;
  const lz = LOWER_Z;
  return (
    <group position={[0, 0, lz]}>
      {/* Floors */}
      <mesh receiveShadow position={[L_LIVING_X, ly + 0.01, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[L_LIVING_W, LOWER_D]} />
        <meshStandardMaterial map={woodTex} roughness={0.55} />
      </mesh>
      <mesh receiveShadow position={[L_HALL_X, ly + 0.01, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[L_HALL_W, LOWER_D]} />
        <meshStandardMaterial map={woodTex} roughness={0.5} color="#B89878" />
      </mesh>
      <mesh receiveShadow position={[L_PARK_X, ly + 0.01, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[L_PARK_W, LOWER_D]} />
        <meshStandardMaterial map={concreteTex} roughness={0.9} color="#707070" />
      </mesh>

      {/* Back wall */}
      <Wall pos={[0, ly + WALL_H/2, -LOWER_D/2]} size={[LOWER_W, WALL_H, WALL_T]} tex={wallTex} />
      {/* Left wall — removed, window is on exterior wall in BuildingConnector */}

      {/* Interior walls */}
      {/* Living-Hall wall */}
      <Wall pos={[L_LIVING_X + L_LIVING_W/2 + WALL_T/2, ly + WALL_H - 0.3, 0]} size={[WALL_T, 0.6, LOWER_D]} tex={wallTex} color="#D8D0C4" />
      <Wall pos={[L_LIVING_X + L_LIVING_W/2 + WALL_T/2, ly + WALL_H/2, -LOWER_D/2 + 0.75]} size={[WALL_T, WALL_H, 1.5]} tex={wallTex} color="#D8D0C4" />
      <Wall pos={[L_LIVING_X + L_LIVING_W/2 + WALL_T/2, ly + WALL_H/2, LOWER_D/2 - 0.5]} size={[WALL_T, WALL_H, 1.0]} tex={wallTex} color="#D8D0C4" />
      {/* Hall-Parking wall */}
      <Wall pos={[L_HALL_X + L_HALL_W/2 + WALL_T/2, ly + WALL_H - 0.3, 0]} size={[WALL_T, 0.6, LOWER_D]} tex={wallTex} color="#D8D0C4" />
      <Wall pos={[L_HALL_X + L_HALL_W/2 + WALL_T/2, ly + WALL_H/2, -LOWER_D/2 + 0.75]} size={[WALL_T, WALL_H, 1.5]} tex={wallTex} color="#D8D0C4" />

      {/* ===== LIVING ROOM FURNITURE ===== */}
      <group position={[L_LIVING_X, ly, 0]}>
        {/* Sofa — facing TV (back toward front/+Z, seat toward -Z/TV) */}
        <group position={[0, 0, 0.8]}>
          <mesh castShadow position={[0, 0.22, 0]}><boxGeometry args={[2.4, 0.44, 0.9]} /><meshStandardMaterial color="#8A9A7A" roughness={0.85} /></mesh>
          <mesh castShadow position={[0, 0.55, 0.3]}><boxGeometry args={[2.2, 0.4, 0.3]} /><meshStandardMaterial color="#7A8A6A" roughness={0.9} /></mesh>
          <mesh castShadow position={[-1.15, 0.35, 0]}><boxGeometry args={[0.12, 0.3, 0.8]} /><meshStandardMaterial color="#7A8A6A" /></mesh>
          <mesh castShadow position={[1.15, 0.35, 0]}><boxGeometry args={[0.12, 0.3, 0.8]} /><meshStandardMaterial color="#7A8A6A" /></mesh>
          {/* Throw pillows */}
          <mesh castShadow position={[-0.7, 0.55, 0.05]}><boxGeometry args={[0.3, 0.25, 0.06]} /><meshStandardMaterial color="#C8B898" roughness={0.9} /></mesh>
          <mesh castShadow position={[0.7, 0.55, 0.05]}><boxGeometry args={[0.3, 0.25, 0.06]} /><meshStandardMaterial color="#A8C0B0" roughness={0.9} /></mesh>
        </group>
        {/* Side table next to sofa */}
        <group position={[-1.5, 0, 0.5]}>
          <mesh castShadow position={[0, 0.28, 0]}><cylinderGeometry args={[0.2, 0.2, 0.03, 12]} /><meshStandardMaterial color="#6B5B4A" roughness={0.4} /></mesh>
          {[[-0.1, -0.1], [0.1, -0.1], [0, 0.12]].map(([lx, lz], i) => (
            <mesh key={i} position={[lx, 0.14, lz]}><cylinderGeometry args={[0.015, 0.015, 0.28, 6]} /><meshStandardMaterial color="#5A4A3A" /></mesh>
          ))}
        </group>
        {/* Coffee table */}
        <group position={[0, 0, 0.1]}>
          <mesh castShadow position={[0, 0.32, 0]}><boxGeometry args={[0.9, 0.04, 0.5]} /><meshStandardMaterial color="#6B5B4A" roughness={0.4} /></mesh>
          {[[-0.38,-0.18],[0.38,-0.18],[-0.38,0.18],[0.38,0.18]].map(([lx,lz],i) => (
            <mesh key={i} position={[lx, 0.16, lz]}><cylinderGeometry args={[0.02, 0.02, 0.32, 8]} /><meshStandardMaterial color="#5A4A3A" /></mesh>
          ))}
        </group>
        {/* TV wall */}
        <group position={[0, 0, -LOWER_D/2 + 0.3]}>
          <mesh castShadow position={[0, 0.25, 0]}><boxGeometry args={[2.0, 0.5, 0.4]} /><meshStandardMaterial color="#2A2A2A" roughness={0.4} metalness={0.3} /></mesh>
          <mesh position={[0, 1.1, -0.05]}><boxGeometry args={[1.8, 1.0, 0.04]} /><meshStandardMaterial color="#0A0A0A" roughness={0.2} metalness={0.5} /></mesh>
          <mesh position={[0, 1.1, -0.04]}><boxGeometry args={[1.88, 1.08, 0.02]} /><meshStandardMaterial color="#1A1A1A" roughness={0.3} metalness={0.6} /></mesh>
        </group>
        {/* Bookshelf */}
        <group position={[L_LIVING_W/2 - 0.3, 0, -LOWER_D/2 + 0.3]}>
          <mesh castShadow position={[0, 1.0, 0]}><boxGeometry args={[0.7, 2.0, 0.3]} /><meshStandardMaterial color="#8B7B6A" roughness={0.5} /></mesh>
        </group>
        {/* Floor lamp */}
        <group position={[L_LIVING_W/2 - 0.5, 0, 0.8]}>
          <mesh position={[0, 0.75, 0]}><cylinderGeometry args={[0.015, 0.015, 1.5, 8]} /><meshStandardMaterial color="#C0C0C0" metalness={0.8} roughness={0.15} /></mesh>
          <mesh position={[0, 1.55, 0]}><cylinderGeometry args={[0.2, 0.15, 0.25, 12]} /><meshStandardMaterial color="#FFF8E8" roughness={0.85} emissive="#FFE8A0" emissiveIntensity={1.0} /></mesh>
          <pointLight position={[0, 1.5, 0]} intensity={1.2} color="#FFF4D6" distance={4} />
        </group>
        {/* Plant */}
        <group position={[-L_LIVING_W/2 + 0.4, 0, 1.2]}>
          <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.15, 0.12, 0.4, 8]} /><meshStandardMaterial color="#C4A882" roughness={0.65} /></mesh>
          <mesh position={[0, 0.55, 0]}><sphereGeometry args={[0.25, 8, 6]} /><meshStandardMaterial color="#5A8A5A" roughness={0.75} /></mesh>
        </group>
        {/* Rug */}
        <mesh position={[0, 0.005, 0.4]} rotation={[-Math.PI/2, 0, 0]}><planeGeometry args={[2.5, 1.8]} /><meshStandardMaterial color="#B8A898" roughness={0.95} /></mesh>
      </group>

      {/* ===== HALLWAY FURNITURE ===== */}
      <group position={[L_HALL_X, ly, 0]}>
        {/* Door handle */}
        <mesh position={[0.35, WALL_H*0.4, LOWER_D/2 - 0.01]}><boxGeometry args={[0.08, 0.02, 0.04]} /><meshStandardMaterial color="#C0C0C0" metalness={0.8} roughness={0.15} /></mesh>
        {/* Shoe cabinet */}
        <mesh castShadow position={[-0.6, 0.3, -LOWER_D/2 + 0.3]}><boxGeometry args={[0.8, 0.6, 0.4]} /><meshStandardMaterial color="#D4C8B8" roughness={0.5} /></mesh>
        {/* Coat hooks */}
        {[-0.3, 0, 0.3].map((hx, i) => (
          <mesh key={i} position={[hx, WALL_H*0.6, -LOWER_D/2 + 0.08]}><boxGeometry args={[0.04, 0.04, 0.08]} /><meshStandardMaterial color="#C0C0C0" metalness={0.7} /></mesh>
        ))}
        {/* Wall mirror */}
        <group position={[0.6, WALL_H*0.55, -LOWER_D/2 + 0.08]}>
          <mesh><boxGeometry args={[0.5, 0.7, 0.02]} /><meshStandardMaterial color="#E0E8F0" roughness={0.03} metalness={0.7} /></mesh>
          <mesh position={[0, 0, -0.01]}><boxGeometry args={[0.56, 0.76, 0.02]} /><meshStandardMaterial color="#8B7B6A" roughness={0.4} /></mesh>
        </group>
        {/* Welcome mat */}
        <mesh position={[0, 0.005, LOWER_D/2 - 0.35]} rotation={[-Math.PI/2, 0, 0]}><planeGeometry args={[0.7, 0.4]} /><meshStandardMaterial color="#8A7A6A" roughness={0.95} /></mesh>
        {/* Key bowl on shoe cabinet */}
        <mesh position={[-0.6, 0.65, -LOWER_D/2 + 0.3]}><cylinderGeometry args={[0.1, 0.08, 0.05, 10]} /><meshStandardMaterial color="#C4A882" roughness={0.6} /></mesh>
      </group>

      {/* ===== PARKING FURNITURE ===== */}
      <group position={[L_PARK_X, ly, 0]}>
        {/* Parking lines */}
        <mesh position={[-L_PARK_W/2 + 0.3, 0.005, 0]} rotation={[-Math.PI/2, 0, 0]}><planeGeometry args={[0.06, LOWER_D - 0.5]} /><meshStandardMaterial color="#CCCC00" roughness={0.8} /></mesh>
        <mesh position={[L_PARK_W/2 - 0.3, 0.005, 0]} rotation={[-Math.PI/2, 0, 0]}><planeGeometry args={[0.06, LOWER_D - 0.5]} /><meshStandardMaterial color="#CCCC00" roughness={0.8} /></mesh>
        {/* Concrete pillar */}
        <mesh castShadow position={[-L_PARK_W/2 + 0.2, WALL_H/2, -LOWER_D/2 + 0.2]}><boxGeometry args={[0.3, WALL_H, 0.3]} /><meshStandardMaterial color="#888" roughness={0.9} /></mesh>
        {/* Fire extinguisher */}
        <mesh position={[L_PARK_W/2 - 0.15, 0.3, -LOWER_D/2 + 0.1]}><cylinderGeometry args={[0.06, 0.06, 0.4, 8]} /><meshStandardMaterial color="#CC2222" roughness={0.5} /></mesh>
      </group>

      {/* ===== LOWER FLOOR LIGHTING — 3-layer system ===== */}
      {/* Visible ceiling light fixtures */}
      {/* Living room */}
      <group position={[L_LIVING_X, ly + WALL_H - 0.1, 0]}>
        <mesh><cylinderGeometry args={[0.06, 0.06, 0.04, 8]} /><meshPhysicalMaterial color="#E0D8CC" roughness={0.4} transparent opacity={0.3} /></mesh>
        <mesh position={[0, -0.18, 0]}><cylinderGeometry args={[0.22, 0.15, 0.15, 12]} /><meshPhysicalMaterial color="#FFF8E8" roughness={0.8} emissive="#FFE8A0" emissiveIntensity={1.2} transparent opacity={0.3} /></mesh>
        <mesh position={[0, -0.27, 0]}><sphereGeometry args={[0.07, 8, 6]} /><meshPhysicalMaterial color="#FFF" emissive="#FFEECC" emissiveIntensity={2.0} transparent opacity={0.3} /></mesh>
      </group>
      {/* Hallway */}
      <group position={[L_HALL_X, ly + WALL_H - 0.05, 0]}>
        <mesh><cylinderGeometry args={[0.15, 0.15, 0.04, 12]} /><meshPhysicalMaterial color="#FFF8E8" roughness={0.7} emissive="#FFE8A0" emissiveIntensity={1.0} transparent opacity={0.3} /></mesh>
        <mesh position={[0, -0.04, 0]}><sphereGeometry args={[0.05, 8, 6]} /><meshPhysicalMaterial color="#FFF" emissive="#FFEECC" emissiveIntensity={1.5} transparent opacity={0.3} /></mesh>
      </group>
      {/* Parking */}
      <group position={[L_PARK_X, ly + WALL_H - 0.08, 0]}>
        <mesh><boxGeometry args={[1.2, 0.04, 0.15]} /><meshPhysicalMaterial color="#D8D8D8" roughness={0.3} transparent opacity={0.3} /></mesh>
        {/* Two fluorescent tubes */}
        <mesh position={[0, -0.035, -0.03]}><boxGeometry args={[1.1, 0.025, 0.035]} /><meshPhysicalMaterial color="#FFFFFF" emissive="#F0F8FF" emissiveIntensity={3.0} transparent opacity={0.3} /></mesh>
        <mesh position={[0, -0.035, 0.03]}><boxGeometry args={[1.1, 0.025, 0.035]} /><meshPhysicalMaterial color="#FFFFFF" emissive="#F0F8FF" emissiveIntensity={3.0} transparent opacity={0.3} /></mesh>
        <pointLight position={[0, -0.1, 0]} intensity={1.5} color="#F0F4FF" distance={8} />
      </group>

      {/* Layer 1: Ceiling lights (main illumination) — boosted */}
      <pointLight position={[L_LIVING_X, ly + WALL_H - 0.3, 0]} intensity={1.8} color="#FFF4E8" distance={8} />
      <pointLight position={[L_HALL_X, ly + WALL_H - 0.3, 0]} intensity={1.2} color="#FFF4E8" distance={6} />
      <pointLight position={[L_PARK_X, ly + WALL_H - 0.3, 0]} intensity={0.7} color="#E8F0FF" distance={7} />

      {/* Layer 2: Accent / task lights */}
      <pointLight position={[L_LIVING_X, ly + 1.1, -LOWER_D/2 + 0.5]} intensity={0.3} color="#4488CC" distance={2.5} />
      <pointLight position={[L_LIVING_X, ly + 0.1, 0.4]} intensity={0.15} color="#D4B898" distance={3} />
      <pointLight position={[L_HALL_X, ly + 2.0, 0.5]} intensity={0.4} color="#FFE8C0" distance={3} />
      <pointLight position={[L_PARK_X, ly + WALL_H - 0.5, 0]} intensity={0.25} color="#D8E0F0" distance={5} />

      {/* Layer 3: Decorative / mood lights */}
      <pointLight position={[L_LIVING_X + L_LIVING_W/2 - 0.5, ly + 1.5, 0.8]} intensity={0.5} color="#FFF4D6" distance={3.5} />
      <pointLight position={[L_LIVING_X + L_LIVING_W/2 - 0.3, ly + 1.5, -LOWER_D/2 + 0.5]} intensity={0.2} color="#FFE8C0" distance={2} />

      {/* Baseboard trim — lower floor */}
      <mesh position={[0, ly + 0.04, -LOWER_D/2 + WALL_T/2 + 0.01]}><boxGeometry args={[LOWER_W, 0.08, 0.02]} /><meshStandardMaterial color="#C8C0B4" roughness={0.4} /></mesh>
      {/* Crown molding — lower floor */}
      <mesh position={[0, ly + WALL_H - 0.03, -LOWER_D/2 + WALL_T/2 + 0.01]}><boxGeometry args={[LOWER_W, 0.06, 0.03]} /><meshStandardMaterial color="#E0D8CC" roughness={0.3} /></mesh>

      {/* Semi-transparent ceiling — lower floor */}
      <mesh position={[0, ly + WALL_H + 0.01, 0]}>
        <boxGeometry args={[LOWER_W + 0.1, 0.04, LOWER_D + 0.1]} />
        <meshPhysicalMaterial color="#E8E0D8" transparent opacity={0.30} roughness={0.6} depthWrite={false} />
      </mesh>
    </group>
  );
}

// ===== Building Connector (exterior shell, staircase, facade) =====
function BuildingConnector({ wallTex, concreteTex }: { wallTex: THREE.Texture; concreteTex: THREE.Texture }) {
  // The building width (use the larger of the two floors)
  const bw = Math.max(UPPER_W, LOWER_W);
  const totalH = UPPER_Y + WALL_H; // total building height

  // Exterior back wall — continuous from ground to top, behind both floors
  const backZ = Math.min(UPPER_Z - UPPER_D / 2, LOWER_Z - LOWER_D / 2) - 0.06;

  return (
    <group>
      {/* ===== EXTERIOR BACK WALL — full height ===== */}
      <mesh receiveShadow position={[0, totalH / 2, backZ]}>
        <boxGeometry args={[bw + 0.3, totalH + 0.1, WALL_T]} />
        <meshStandardMaterial map={wallTex} roughness={0.9} color="#C8C0B4" />
      </mesh>

      {/* ===== LEFT EXTERIOR WALL — with living room window ===== */}
      {(() => {
        const wallX = -bw / 2 - 0.08;
        const winY = WALL_H * 0.55; // 1.54
        const winH = 1.4;
        const winW = 1.6;
        const winZ = LOWER_Z; // 0
        return (
          <group>
            {/* Above window — full width strip */}
            <mesh receiveShadow position={[wallX, (winY + winH/2 + totalH) / 2, (UPPER_Z + LOWER_Z) / 2]}>
              <boxGeometry args={[WALL_T, totalH - (winY + winH/2), Math.abs(UPPER_Z - LOWER_Z) + UPPER_D/2 + LOWER_D/2 + 0.3]} />
              <meshStandardMaterial map={wallTex} roughness={0.9} color="#C0B8AC" />
            </mesh>
            {/* Below window — full width strip */}
            <mesh receiveShadow position={[wallX, (winY - winH/2) / 2, (UPPER_Z + LOWER_Z) / 2]}>
              <boxGeometry args={[WALL_T, winY - winH/2, Math.abs(UPPER_Z - LOWER_Z) + UPPER_D/2 + LOWER_D/2 + 0.3]} />
              <meshStandardMaterial map={wallTex} roughness={0.9} color="#C0B8AC" />
            </mesh>
            {/* Back of window (toward upper floor) */}
            <mesh receiveShadow position={[wallX, winY, -3.625]}>
              <boxGeometry args={[WALL_T, winH, 5.65]} />
              <meshStandardMaterial map={wallTex} roughness={0.9} color="#C0B8AC" />
            </mesh>
            {/* Front of window (toward viewer) */}
            <mesh receiveShadow position={[wallX, winY, 1.475]}>
              <boxGeometry args={[WALL_T, winH, 1.35]} />
              <meshStandardMaterial map={wallTex} roughness={0.9} color="#C0B8AC" />
            </mesh>
            {/* Sky gradient inside window */}
            <mesh position={[wallX + WALL_T/2 + 0.01, winY, winZ]} rotation={[0, Math.PI/2, 0]}>
              <planeGeometry args={[winW, winH]} />
              <meshBasicMaterial>
                <canvasTexture attach="map" image={(() => {
                  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
                  const ctx = c.getContext('2d')!;
                  const g = ctx.createLinearGradient(0, 0, 0, 256);
                  g.addColorStop(0, '#5a8abe'); g.addColorStop(0.5, '#8abcde'); g.addColorStop(1, '#b0d8f0');
                  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
                  return c;
                })()} />
              </meshBasicMaterial>
            </mesh>
            {/* Window frame */}
            <group position={[wallX + WALL_T/2 + 0.02, winY, winZ]} rotation={[0, Math.PI/2, 0]}>
              <mesh position={[0, winH/2, 0]}><boxGeometry args={[winW + 0.08, 0.04, 0.04]} /><meshStandardMaterial color="#D0C8BC" roughness={0.35} metalness={0.1} /></mesh>
              <mesh position={[0, -winH/2, 0]}><boxGeometry args={[winW + 0.08, 0.04, 0.04]} /><meshStandardMaterial color="#D0C8BC" roughness={0.35} /></mesh>
              <mesh position={[-winW/2, 0, 0]}><boxGeometry args={[0.04, winH, 0.04]} /><meshStandardMaterial color="#D0C8BC" roughness={0.35} /></mesh>
              <mesh position={[winW/2, 0, 0]}><boxGeometry args={[0.04, winH, 0.04]} /><meshStandardMaterial color="#D0C8BC" roughness={0.35} /></mesh>
              <mesh><boxGeometry args={[winW, 0.02, 0.03]} /><meshStandardMaterial color="#C8C0B4" /></mesh>
              <mesh><boxGeometry args={[0.02, winH, 0.03]} /><meshStandardMaterial color="#C8C0B4" /></mesh>
            </group>
            {/* Outer cover — prevents seeing blue from outside */}
            <mesh position={[wallX - WALL_T/2 - 0.01, winY, winZ]} rotation={[0, -Math.PI/2, 0]}>
              <planeGeometry args={[winW, winH]} />
              <meshStandardMaterial color="#C0B8AC" roughness={0.85} />
            </mesh>
          </group>
        );
      })()}

      {/* ===== RIGHT EXTERIOR WALL — connects both floors ===== */}
      <mesh receiveShadow position={[bw / 2 + 0.08, totalH / 2, (UPPER_Z + LOWER_Z) / 2]}>
        <boxGeometry args={[WALL_T, totalH + 0.1, Math.abs(UPPER_Z - LOWER_Z) + UPPER_D / 2 + LOWER_D / 2 + 0.3]} />
        <meshStandardMaterial map={wallTex} roughness={0.9} color="#C0B8AC" />
      </mesh>

      {/* ===== STAIRCASE between floors ===== */}
      {/* Located between hallway (lower) going up to bedroom area (upper) */}
      <group position={[L_HALL_X, 0, (UPPER_Z + LOWER_Z) / 2]}>
        {/* Stair steps — 10 steps going from lower floor to upper floor */}
        {Array.from({ length: 10 }).map((_, i) => {
          const stepH = (UPPER_Y) / 10;
          const stepD = (Math.abs(UPPER_Z - LOWER_Z) - 0.5) / 10;
          const sy = i * stepH + stepH / 2;
          const sz = LOWER_Z - LOWER_D / 2 + 0.3 - i * stepD;
          return (
            <mesh key={i} castShadow position={[0, sy, sz]}>
              <boxGeometry args={[1.0, stepH * 0.85, stepD * 0.9]} />
              <meshStandardMaterial color="#B8A898" roughness={0.5} />
            </mesh>
          );
        })}
        {/* Stair railing — left side */}
        <mesh position={[-0.55, UPPER_Y / 2, (LOWER_Z - LOWER_D / 2 + UPPER_Z + UPPER_D / 2) / 2 - 0.1]}>
          <boxGeometry args={[0.03, 0.8, Math.abs(UPPER_Z - LOWER_Z) + 0.5]} />
          <meshStandardMaterial color="#8B7B6A" roughness={0.4} />
        </mesh>
        {/* Railing posts */}
        {[0, 0.25, 0.5, 0.75, 1.0].map((t, i) => {
          const pz = LOWER_Z - LOWER_D / 2 + 0.3 - t * (Math.abs(UPPER_Z - LOWER_Z) - 0.5);
          const py = t * UPPER_Y;
          return (
            <mesh key={i} position={[-0.55, py + 0.3, pz]}>
              <boxGeometry args={[0.03, 0.6, 0.03]} />
              <meshStandardMaterial color="#8B7B6A" roughness={0.4} />
            </mesh>
          );
        })}
      </group>

      {/* ===== FOUNDATION — base strip ===== */}
      <mesh receiveShadow position={[0, -0.04, (UPPER_Z + LOWER_Z) / 2]}>
        <boxGeometry args={[bw + 0.5, 0.08, Math.abs(UPPER_Z - LOWER_Z) + UPPER_D / 2 + LOWER_D / 2 + 0.5]} />
        <meshStandardMaterial color="#8A8078" roughness={0.9} />
      </mesh>

      {/* ===== ROOF — semi-transparent ceiling on upper floor ===== */}
      <mesh position={[0, totalH + 0.02, UPPER_Z]}>
        <boxGeometry args={[UPPER_W + 0.2, 0.06, UPPER_D + 0.2]} />
        <meshPhysicalMaterial
          color="#E8E0D8"
          transparent
          opacity={0.30}
          roughness={0.6}
          depthWrite={false}
        />
      </mesh>
      {/* Roof edge trim — visible solid frame */}
      {/* Front edge */}
      <mesh position={[0, totalH + 0.02, UPPER_Z + UPPER_D/2 + 0.1]}>
        <boxGeometry args={[UPPER_W + 0.4, 0.08, 0.08]} />
        <meshStandardMaterial color="#9A9088" roughness={0.85} />
      </mesh>
      {/* Back edge */}
      <mesh position={[0, totalH + 0.02, UPPER_Z - UPPER_D/2 - 0.1]}>
        <boxGeometry args={[UPPER_W + 0.4, 0.08, 0.08]} />
        <meshStandardMaterial color="#9A9088" roughness={0.85} />
      </mesh>
      {/* Left edge */}
      <mesh position={[-UPPER_W/2 - 0.18, totalH + 0.02, UPPER_Z]}>
        <boxGeometry args={[0.08, 0.08, UPPER_D + 0.4]} />
        <meshStandardMaterial color="#9A9088" roughness={0.85} />
      </mesh>
      {/* Right edge */}
      <mesh position={[UPPER_W/2 + 0.18, totalH + 0.02, UPPER_Z]}>
        <boxGeometry args={[0.08, 0.08, UPPER_D + 0.4]} />
        <meshStandardMaterial color="#9A9088" roughness={0.85} />
      </mesh>

      {/* ===== FLOOR BETWEEN ZONES — connecting slab where staircase is ===== */}
      {/* This fills the gap between the upper and lower floor Z positions */}
      <mesh receiveShadow position={[0, WALL_H + SLAB_T / 2, (UPPER_Z + UPPER_D / 2 + LOWER_Z - LOWER_D / 2) / 2]}>
        <boxGeometry args={[bw + 0.04, SLAB_T, Math.abs(UPPER_Z + UPPER_D / 2 - (LOWER_Z - LOWER_D / 2)) + 0.04]} />
        <meshStandardMaterial color="#D0C8BC" roughness={0.75} />
      </mesh>
    </group>
  );
}

// ===== Doudou (Dog) Model =====
function DoudouModel() {
  const gltf = useGLTF('/assets/models/doudou.glb');
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);

  useMemo(() => {
    if (gltf.animations.length > 0) {
      const mixer = new THREE.AnimationMixer(gltf.scene);
      mixer.clipAction(gltf.animations[0]).play();
      mixerRef.current = mixer;
    }
  }, [gltf]);

  useFrame((_, delta) => {
    if (mixerRef.current) mixerRef.current.update(delta);
  });

  return <primitive object={gltf.scene} />;
}

// ===== SU7 Car in Parking =====
function SU7Car() {
  const { scene } = useGLTF('/assets/models/su7.glb');
  const cloned = useMemo(() => {
    const s = scene.clone(true);
    const box = new THREE.Box3().setFromObject(s);
    const size = new THREE.Vector3(); box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    // Scale to fit parking spot (~4m long)
    const scale = maxDim > 0 ? 3.9 / maxDim : 1;
    s.scale.setScalar(scale);
    box.setFromObject(s);
    const center = new THREE.Vector3(); box.getCenter(center);
    s.position.sub(center);
    // Sit on ground
    const newBox = new THREE.Box3().setFromObject(s);
    s.position.y -= newBox.min.y;
    return s;
  }, [scene]);
  return (
    <group position={[L_PARK_X, LOWER_Y, LOWER_Z + 0.1]}>
      <primitive object={cloned} />
    </group>
  );
}

// ===== Room definitions for export =====
export const ROOM_DEFS = {
  bedroom: { cx: U_BED_X, cy: UPPER_Y, cz: UPPER_Z, w: U_BED_W, d: UPPER_D },
  bathroom: { cx: U_BATH_X, cy: UPPER_Y, cz: UPPER_Z, w: U_BATH_W, d: UPPER_D },
  kitchen: { cx: U_KITCH_X, cy: UPPER_Y, cz: UPPER_Z, w: U_KITCH_W, d: UPPER_D },
  living: { cx: L_LIVING_X, cy: LOWER_Y, cz: LOWER_Z, w: L_LIVING_W, d: LOWER_D },
  hallway: { cx: L_HALL_X, cy: LOWER_Y, cz: LOWER_Z, w: L_HALL_W, d: LOWER_D },
  parking: { cx: L_PARK_X, cy: LOWER_Y, cz: LOWER_Z, w: L_PARK_W, d: LOWER_D },
};

// ===== Xiaomi Logo =====
function XiaomiLogo() {
  const { scene } = useGLTF('/assets/models/xiaomi-logo.glb');
  const ref = useRef<THREE.Group>(null);
  const cloned = useMemo(() => {
    const s = scene.clone(true);
    const box = new THREE.Box3().setFromObject(s);
    const size = new THREE.Vector3(); box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = maxDim > 0 ? 0.4 / maxDim : 1;
    s.scale.setScalar(scale);
    box.setFromObject(s);
    const center = new THREE.Vector3(); box.getCenter(center);
    s.position.sub(center);
    return s;
  }, [scene]);
  return (
    <group ref={ref} position={[LOWER_W / 2 - 0.3, 0.25, LOWER_Z + LOWER_D / 2 - 0.3]}>
      <group rotation={[0, -Math.PI / 2, 0]}><primitive object={cloned} /></group>
    </group>
  );
}

// ===== Main Exported Scene =====
const StaticApartment = React.memo(function StaticApartment() {
  const woodTex = useMemo(() => makeWoodTex(), []);
  const tileTex = useMemo(() => makeTileTex(), []);
  const wallTex = useMemo(() => makeWallTex(), []);
  const concreteTex = useMemo(() => makeConcreteTex(), []);
  return (
    <>
      <UpperFloor woodTex={woodTex} tileTex={tileTex} wallTex={wallTex} />
      <LowerFloor woodTex={woodTex} wallTex={wallTex} concreteTex={concreteTex} />
      <BuildingConnector wallTex={wallTex} concreteTex={concreteTex} />
      <Suspense fallback={null}><XiaomiLogo /></Suspense>
      <Suspense fallback={null}><SU7Car /></Suspense>
    </>
  );
});

export default function FullApartmentScene({ hoveredRoom, setHoveredRoom, placedDevices, activeRooms, cameraTarget, currentLevel }: {
  hoveredRoom: string | null;
  setHoveredRoom: (id: string | null) => void;
  placedDevices: Record<string, string[]>;
  activeRooms: string[];
  cameraTarget?: [number, number, number];
  currentLevel?: number;
}) {
  const allRooms = [
    { id: 'bathroom', name: '浴室' }, { id: 'bedroom', name: '卧室' }, { id: 'kitchen', name: '厨房' },
    { id: 'living', name: '客厅' }, { id: 'hallway', name: '玄关' }, { id: 'parking', name: '停车位' },
  ];

  return (
    <>
      {/* Lighting */}
      <color attach="background" args={['#1a2a40']} />
      <fog attach="fog" args={['#1a2a40', 18, 40]} />
      <ambientLight intensity={0.55} color="#F0E8E0" />
      <directionalLight position={[8, 18, 12]} intensity={1.4} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-far={50} shadow-camera-left={-15} shadow-camera-right={15} shadow-camera-top={15} shadow-camera-bottom={-15} shadow-bias={-0.0005} color="#FFF8F0" />
      <directionalLight position={[-6, 8, 10]} intensity={0.4} color="#E8F0FF" />
      <hemisphereLight args={['#FFF8F0', '#B8A898', 0.35]} />

      <StaticApartment />

      {/* Dynamic door — responds to hover */}
      <mesh castShadow position={[L_HALL_X, WALL_H*0.45, LOWER_Z + LOWER_D/2 - 0.06]}
        onPointerOver={(e) => { e.stopPropagation(); setHoveredRoom('hallway'); }}
        onPointerOut={() => setHoveredRoom(null)}>
        <boxGeometry args={[0.9, WALL_H*0.9, 0.08]} />
        <meshPhysicalMaterial color="#5A3A2A" roughness={0.5} transparent opacity={hoveredRoom === 'hallway' ? 1.0 : 0.45} />
      </mesh>

      {/* Doudou the dog */}
      <Suspense fallback={null}>
        <group position={currentLevel === 3 ? [-4.8, 0.0, -1.0] : [-1.7, 3.08, -3.0]} scale={[0.25, 0.25, 0.25]}>
          <DoudouModel />
          <Html position={[0, 3.2, 0]} center distanceFactor={10} zIndexRange={[1, 5]}>
            <div style={{ background: 'rgba(255,103,0,0.85)', color: '#fff', padding: '1px 6px', borderRadius: '4px', fontSize: '8px', fontWeight: 600, whiteSpace: 'nowrap', pointerEvents: 'none', letterSpacing: '1px' }}>豆豆</div>
          </Html>
        </group>
      </Suspense>

      {/* Room interaction zones + labels */}
      {allRooms.map(r => {
        const def = ROOM_DEFS[r.id as keyof typeof ROOM_DEFS];
        if (!def) return null;
        const isActive = activeRooms.includes(r.id);
        return (
          <group key={r.id}>
            <mesh
              position={[def.cx, def.cy + 0.05, def.cz]}
              rotation={[-Math.PI / 2, 0, 0]}
              onPointerOver={(e) => { if (isActive) { e.stopPropagation(); setHoveredRoom(r.id); } }}
              onPointerOut={() => setHoveredRoom(null)}
            >
              <planeGeometry args={[def.w, def.d]} />
              <meshStandardMaterial
                transparent
                opacity={!isActive ? 0.15 : hoveredRoom === r.id ? 0.04 : 0}
                color={!isActive ? '#000000' : '#FF6700'}
                depthWrite={false}
              />
            </mesh>
            <Html position={[def.cx, def.cy + WALL_H + 0.3, def.cz]} center distanceFactor={10} zIndexRange={[1, 5]}>
              <div style={{
                background: hoveredRoom === r.id ? 'rgba(255,103,0,0.9)' : 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(10px)',
                color: '#fff', padding: '4px 14px', borderRadius: '8px',
                fontSize: '12px', fontWeight: 600, letterSpacing: '1.5px',
                whiteSpace: 'nowrap', pointerEvents: 'none',
                transition: 'all 0.3s',
                opacity: isActive ? 1 : 0.3,
              }}>{r.name}</div>
            </Html>
          </group>
        );
      })}

      {/* Ground */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#1a2a3a" roughness={1} />
      </mesh>

      <ContactShadows position={[0, -0.02, 0]} opacity={0.3} scale={30} blur={2.5} far={10} />

      <OrbitControls
        makeDefault
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.5}
        minAzimuthAngle={-Math.PI / 4}
        maxAzimuthAngle={Math.PI / 4}
        minDistance={8}
        maxDistance={25}
        enableDamping dampingFactor={0.05}
        rotateSpeed={0.4}
        target={cameraTarget || [0, (UPPER_Y + WALL_H) / 2, (UPPER_Z + LOWER_Z) / 2]}
      />
    </>
  );
}

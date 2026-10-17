// DevMemory — 3D neon force-directed graph using Three.js.
// Nodes are glowing spheres with sprite halos in 3D space; a lightweight
// force simulation runs in 3 dimensions. Mouse drag orbits the camera,
// wheel zooms. Highlighted subgraphs glow brighter; the rest dims.

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ProjectMemory, GraphNode } from '../types';
import { NEON_NODE } from '../theme';

interface Props {
  memory: ProjectMemory;
  highlight?: Set<string>;
  onSelect?: (node: GraphNode) => void;
  height?: number;
}

interface P3 { x: number; y: number; z: number; vx: number; vy: number; vz: number; }

// Build a round glow sprite texture once.
function makeGlowTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.2, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.25)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

export const Graph3D: React.FC<Props> = ({ memory, highlight, onSelect, height = 440 }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<any>(null);
  const highlightRef = useRef<Set<string> | undefined>(highlight);
  const onSelectRef = useRef(onSelect);
  highlightRef.current = highlight;
  onSelectRef.current = onSelect;

  // Build scene once.
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const width = mount.clientWidth || 560;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05060f, 0.0012);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 4000);
    camera.position.set(0, 0, 520);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x05060f, 0);
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const point = new THREE.PointLight(0x00f0ff, 1.2, 2000);
    point.position.set(200, 200, 400);
    scene.add(point);

    const glowTex = makeGlowTexture();

    const state = {
      scene, camera, renderer, glowTex,
      positions: {} as Record<string, P3>,
      nodeMeshes: {} as Record<string, THREE.Mesh>,
      haloSprites: {} as Record<string, THREE.Sprite>,
      edgeLines: [] as { line: THREE.Line; from: string; to: string }[],
      labels: {} as Record<string, THREE.Sprite>,
      raf: 0,
      rot: { x: 0.2, y: 0.3 },
      drag: false,
      autoRotate: true,
      lastMouse: { x: 0, y: 0 },
      camDist: 520,
      nodes: [] as GraphNode[],
      edges: memory.edges,
      raycaster: new THREE.Raycaster(),
      pointer: new THREE.Vector2(),
      disposed: false,
    };
    stateRef.current = state;

    // --- interaction ---
    const el = renderer.domElement;
    const onDown = (e: MouseEvent) => { state.drag = true; state.autoRotate = false; state.lastMouse = { x: e.clientX, y: e.clientY }; };
    const onUp = () => { state.drag = false; };
    const onMoveMouse = (e: MouseEvent) => {
      if (!state.drag) return;
      const dx = e.clientX - state.lastMouse.x;
      const dy = e.clientY - state.lastMouse.y;
      state.rot.y += dx * 0.005;
      state.rot.x += dy * 0.005;
      state.rot.x = Math.max(-1.4, Math.min(1.4, state.rot.x));
      state.lastMouse = { x: e.clientX, y: e.clientY };
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      state.camDist = Math.max(180, Math.min(1200, state.camDist + e.deltaY * 0.5));
    };
    const onClick = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      state.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      state.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      state.raycaster.setFromCamera(state.pointer, state.camera);
      const meshes = Object.values(state.nodeMeshes);
      const hits = state.raycaster.intersectObjects(meshes);
      if (hits.length) {
        const id = (hits[0].object as any).userData.id;
        const node = state.nodes.find((n) => n.id === id);
        if (node && onSelectRef.current) onSelectRef.current(node);
      }
    };
    el.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mousemove', onMoveMouse);
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('click', onClick);
    el.style.cursor = 'grab';

    // --- animation loop ---
    const tick = () => {
      if (state.disposed) return;
      runPhysics(state);
      syncMeshes(state, highlightRef.current);
      if (state.autoRotate) state.rot.y += 0.0016;
      const r = state.camDist;
      state.camera.position.x = r * Math.sin(state.rot.y) * Math.cos(state.rot.x);
      state.camera.position.y = r * Math.sin(state.rot.x);
      state.camera.position.z = r * Math.cos(state.rot.y) * Math.cos(state.rot.x);
      state.camera.lookAt(0, 0, 0);
      state.renderer.render(state.scene, state.camera);
      state.raf = requestAnimationFrame(tick);
    };

    buildGraphObjects(state, memory);
    tick();

    const onResize = () => {
      const w = mount.clientWidth || 560;
      state.camera.aspect = w / height;
      state.camera.updateProjectionMatrix();
      state.renderer.setSize(w, height);
    };
    window.addEventListener('resize', onResize);

    return () => {
      state.disposed = true;
      cancelAnimationFrame(state.raf);
      el.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mousemove', onMoveMouse);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('click', onClick);
      window.removeEventListener('resize', onResize);
      state.renderer.dispose();
      if (el.parentNode) el.parentNode.removeChild(el);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rebuild objects when the graph structure changes.
  useEffect(() => {
    const state = stateRef.current;
    if (!state) return;
    buildGraphObjects(state, memory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memory.nodes.length, memory.edges.length]);

  return <div ref={mountRef} style={{ width: '100%', height, borderRadius: 14, overflow: 'hidden', background: 'radial-gradient(circle at 50% 40%, #0a1030 0%, #05060f 70%)', border: '1px solid rgba(0,240,255,0.18)' }} />;
};

// ---- helpers operating on the mutable state object ----

function buildGraphObjects(state: any, memory: ProjectMemory) {
  // Clear old
  state.edgeLines.forEach((e: any) => state.scene.remove(e.line));
  Object.values(state.nodeMeshes).forEach((m: any) => state.scene.remove(m));
  Object.values(state.haloSprites).forEach((s: any) => state.scene.remove(s));
  Object.values(state.labels).forEach((s: any) => state.scene.remove(s));
  state.edgeLines = [];
  state.nodeMeshes = {};
  state.haloSprites = {};
  state.labels = {};
  state.nodes = memory.nodes;
  state.edges = memory.edges;

  // Positions (keep existing, seed new on a sphere)
  const n = memory.nodes.length;
  memory.nodes.forEach((node, i) => {
    if (!state.positions[node.id]) {
      const phi = Math.acos(1 - 2 * (i + 0.5) / n);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const R = 180;
      state.positions[node.id] = {
        x: R * Math.sin(phi) * Math.cos(theta),
        y: R * Math.sin(phi) * Math.sin(theta),
        z: R * Math.cos(phi),
        vx: 0, vy: 0, vz: 0,
      };
    }
  });

  memory.nodes.forEach((node) => {
    const col = NEON_NODE[node.type]?.hex ?? 0x00f0ff;
    const isProject = node.type === 'Project';
    const r = isProject ? 11 : 7;
    const geo = new THREE.SphereGeometry(r, 24, 24);
    const mat = new THREE.MeshBasicMaterial({ color: col });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData = { id: node.id, baseColor: col };
    state.scene.add(mesh);
    state.nodeMeshes[node.id] = mesh;

    const haloMat = new THREE.SpriteMaterial({ map: state.glowTex, color: col, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
    const halo = new THREE.Sprite(haloMat);
    const hs = isProject ? 54 : 36;
    halo.scale.set(hs, hs, 1);
    state.scene.add(halo);
    state.haloSprites[node.id] = halo;

    // Text label sprite
    const label = makeLabelSprite(node.label.replace(/^[^:]+:\s*/, '').slice(0, 22), NEON_NODE[node.type]?.css ?? '#e6f7ff');
    state.scene.add(label);
    state.labels[node.id] = label;
  });

  memory.edges.forEach((e) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const mat = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.25 });
    const line = new THREE.Line(geo, mat);
    state.scene.add(line);
    state.edgeLines.push({ line, from: e.from, to: e.to });
  });
}

function makeLabelSprite(text: string, color: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const font = 44;
  canvas.width = 512; canvas.height = 128;
  ctx.font = `600 ${font}px -apple-system, Segoe UI, Roboto, sans-serif`;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 10, 64);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(80, 20, 1);
  sprite.userData = { w: 80 };
  return sprite;
}

function runPhysics(state: any) {
  const nodes: GraphNode[] = state.nodes;
  const pos = state.positions;
  if (!nodes.length) return;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = pos[nodes[i].id], b = pos[nodes[j].id];
      if (!a || !b) continue;
      let dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
      let d2 = dx * dx + dy * dy + dz * dz || 0.01;
      const f = 9000 / d2;
      const d = Math.sqrt(d2);
      const fx = (dx / d) * f, fy = (dy / d) * f, fz = (dz / d) * f;
      a.vx += fx; a.vy += fy; a.vz += fz;
      b.vx -= fx; b.vy -= fy; b.vz -= fz;
    }
  }
  for (const e of state.edges) {
    const a = pos[e.from], b = pos[e.to];
    if (!a || !b) continue;
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.01;
    const k = 0.02 * (d - 70);
    const fx = (dx / d) * k, fy = (dy / d) * k, fz = (dz / d) * k;
    a.vx += fx; a.vy += fy; a.vz += fz;
    b.vx -= fx; b.vy -= fy; b.vz -= fz;
  }
  for (const node of nodes) {
    const p = pos[node.id];
    p.vx += -p.x * 0.001; p.vy += -p.y * 0.001; p.vz += -p.z * 0.001;
    p.vx *= 0.8; p.vy *= 0.8; p.vz *= 0.8;
    p.x += p.vx; p.y += p.vy; p.z += p.vz;
  }
}

function syncMeshes(state: any, highlight?: Set<string>) {
  const hasHl = highlight && highlight.size > 0;
  for (const node of state.nodes as GraphNode[]) {
    const p = state.positions[node.id];
    const mesh = state.nodeMeshes[node.id];
    const halo = state.haloSprites[node.id];
    const label = state.labels[node.id];
    if (!p || !mesh) continue;
    mesh.position.set(p.x, p.y, p.z);
    const active = !hasHl || highlight!.has(node.id);
    (mesh.material as THREE.MeshBasicMaterial).opacity = active ? 1 : 0.15;
    (mesh.material as THREE.MeshBasicMaterial).transparent = true;
    if (halo) {
      halo.position.set(p.x, p.y, p.z);
      (halo.material as THREE.SpriteMaterial).opacity = active ? (hasHl ? 0.95 : 0.6) : 0.05;
    }
    if (label) {
      label.position.set(p.x, p.y + 14, p.z);
      (label.material as THREE.SpriteMaterial).opacity = active ? 1 : 0.1;
    }
  }
  for (const eo of state.edgeLines) {
    const a = state.positions[eo.from], b = state.positions[eo.to];
    if (!a || !b) continue;
    const arr = (eo.line.geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
    arr[0] = a.x; arr[1] = a.y; arr[2] = a.z;
    arr[3] = b.x; arr[4] = b.y; arr[5] = b.z;
    (eo.line.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    const bothActive = !hasHl || (highlight!.has(eo.from) && highlight!.has(eo.to));
    const m = eo.line.material as THREE.LineBasicMaterial;
    m.opacity = bothActive ? (hasHl ? 0.85 : 0.22) : 0.04;
    m.color.setHex(bothActive && hasHl ? 0xff2bd6 : 0x00f0ff);
  }
}

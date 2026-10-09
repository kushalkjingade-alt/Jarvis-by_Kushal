import * as THREE from "three";
import { audioBus } from "@/lib/audio-bus";
import type { GlowLevel, OrbSize } from "@/lib/types";

export type OrbMode = "idle" | "listening" | "processing" | "speaking" | "error" | "sleep";

export type OrbLive = {
  mode: OrbMode;
  size: OrbSize;
  speed: number;
  glow: GlowLevel;
  particles: boolean;
  rays: boolean;
  rings: boolean;
  voiceReactive: boolean;
  battery: boolean;
  reduceMotion: boolean;
};

const AMBER = 0xf0a11a;
const CORE = 0xfff3d2;
const ERROR = 0xff5a3a;
const DIM = 0x6d5830;

function glowAmount(level: GlowLevel): number {
  if (level === "low") return 0.55;
  if (level === "high") return 1.45;
  return 1;
}

function sizeScale(size: OrbSize): number {
  if (size === "small") return 0.78;
  if (size === "large") return 1.18;
  return 1;
}

export function mountOrb(canvas: HTMLCanvasElement, get: () => OrbLive): () => void {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 20);
  camera.position.z = 4.4;

  const group = new THREE.Group();
  scene.add(group);

  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x2a1604,
    emissive: AMBER,
    emissiveIntensity: 1.1,
    roughness: 0.35,
    metalness: 0.2,
  });
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.62, 48, 48), coreMat);
  group.add(core);
  const heartMat = new THREE.MeshBasicMaterial({ color: CORE });
  const heart = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 24), heartMat);
  group.add(heart);

  const ringMat = new THREE.MeshBasicMaterial({ color: AMBER, transparent: true, opacity: 0.85 });
  const rings = [0.95, 1.25, 1.55].map((radius, index) => {
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.012, 12, 80), ringMat.clone());
    mesh.rotation.x = 0.6 + index * 0.35;
    mesh.rotation.y = index * 0.4;
    group.add(mesh);
    return mesh;
  });

  const rayGroup = new THREE.Group();
  group.add(rayGroup);
  const rayMat = new THREE.LineBasicMaterial({ color: AMBER, transparent: true, opacity: 0.45 });
  for (let index = 0; index < 10; index += 1) {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(Math.cos(index) * 1.7, Math.sin(index * 1.7) * 1.7, Math.sin(index) * 0.4),
    ]);
    rayGroup.add(new THREE.Line(geometry, rayMat));
  }

  const count = 160;
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    const radius = 1.1 + Math.random() * 0.9;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[index * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[index * 3 + 2] = radius * Math.cos(phi);
  }
  const pointsGeo = new THREE.BufferGeometry();
  pointsGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(
    pointsGeo,
    new THREE.PointsMaterial({ color: AMBER, size: 0.035, transparent: true, opacity: 0.8 }),
  );
  group.add(points);

  const light = new THREE.PointLight(AMBER, 8, 10);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0xfff1d2, 0.25));

  const clock = new THREE.Clock();
  let raf = 0;
  let running = true;

  const resize = () => {
    const width = canvas.clientWidth || 280;
    const height = canvas.clientHeight || 280;
    const live = get();
    const ratio = Math.min(window.devicePixelRatio || 1, live.battery ? 1 : 1.5);
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  const frame = () => {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    if (document.hidden) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const live = get();
    const mode = live.mode;
    const motion = live.reduceMotion ? 0.15 : 1;
    const speed = (0.35 + live.speed / 100) * (live.battery ? 0.45 : 1) * motion;
    const audio = live.voiceReactive ? audioBus.get() : 0;
    const modeBoost = mode === "processing" ? 2.4 : mode === "listening" ? 1.5 : mode === "speaking" ? 1.2 : mode === "sleep" ? 0.25 : 1;
    group.rotation.y += dt * 0.35 * speed * modeBoost;
    group.rotation.x = Math.sin(clock.elapsedTime * 0.4 * speed) * 0.08;
    rings.forEach((ring, index) => {
      ring.visible = live.rings && (!live.battery || index === 0);
      ring.rotation.z += dt * (0.4 + index * 0.25) * speed * modeBoost;
      const pulse = mode === "listening" ? 1 + Math.sin(clock.elapsedTime * 3) * 0.04 : 1;
      ring.scale.setScalar(pulse);
    });
    points.visible = live.particles && !live.battery;
    points.rotation.y -= dt * 0.2 * speed;
    rayGroup.visible = live.rays && !live.battery && mode !== "sleep";
    rayGroup.rotation.z += dt * 0.3 * speed * (mode === "processing" ? 2 : 1);
    const base = glowAmount(live.glow) * (mode === "sleep" ? 0.25 : mode === "error" ? 1.2 : 1);
    const reactive = mode === "speaking" || mode === "listening" ? audio * 1.4 : mode === "processing" ? 0.35 : 0.08;
    coreMat.emissive.setHex(mode === "error" ? ERROR : mode === "sleep" ? DIM : AMBER);
    coreMat.emissiveIntensity = base + reactive;
    heart.scale.setScalar(1 + (mode === "speaking" ? audio * 0.35 : 0));
    group.scale.setScalar(sizeScale(live.size) * (1 + (mode === "processing" ? Math.sin(clock.elapsedTime * 6) * 0.03 : 0)));
    light.intensity = 4 + base * 4 + audio * 6;
    renderer.render(scene, camera);
  };
  frame();

  return () => {
    running = false;
    cancelAnimationFrame(raf);
    observer.disconnect();
    renderer.dispose();
    pointsGeo.dispose();
    core.geometry.dispose();
    heart.geometry.dispose();
    coreMat.dispose();
    heartMat.dispose();
    rings.forEach((ring) => {
      ring.geometry.dispose();
      (ring.material as THREE.Material).dispose();
    });
  };
}

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function HeartMesh() {
  const group = useRef(null);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    const pulse = 1 + Math.sin(t * 1.9) * 0.035;
    group.current.scale.setScalar(pulse);
    group.current.rotation.y = t * 0.18;
    group.current.rotation.x = Math.sin(t * 0.4) * 0.06;
  });

  return (
    <group ref={group} position={[0, 0.15, 0]}>
      <mesh position={[-0.72, 0.18, 0]}>
        <sphereGeometry args={[0.92, 48, 48]} />
        <meshStandardMaterial color="#6366f1" roughness={0.32} metalness={0.1} emissive="#4f46e5" emissiveIntensity={0.15} />
      </mesh>
      <mesh position={[0.72, 0.18, 0]}>
        <sphereGeometry args={[0.92, 48, 48]} />
        <meshStandardMaterial color="#7c3aed" roughness={0.32} metalness={0.1} emissive="#6d28d9" emissiveIntensity={0.12} />
      </mesh>
      <mesh position={[0, -0.92, 0]} rotation={[0, 0, THREE.MathUtils.degToRad(45)]}>
        <boxGeometry args={[1.5, 1.7, 1.2]} />
        <meshStandardMaterial color="#4f46e5" roughness={0.36} metalness={0.08} emissive="#4338ca" emissiveIntensity={0.18} />
      </mesh>
      <mesh rotation={[1.1, 0, 0.2]}>
        <torusGeometry args={[2.35, 0.04, 16, 96]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.45} />
      </mesh>
      <mesh rotation={[0.6, 0.45, 0.9]}>
        <torusGeometry args={[2.95, 0.025, 16, 96]} />
        <meshBasicMaterial color="#6366f1" transparent opacity={0.25} />
      </mesh>
    </group>
  );
}

function PulseLines() {
  const lineA = useMemo(
    () =>
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-3.8, 0.15, -1.2),
        new THREE.Vector3(-2.7, 0.15, -1.16),
        new THREE.Vector3(-2.35, 0.95, -1.1),
        new THREE.Vector3(-1.9, -0.88, -1.04),
        new THREE.Vector3(-1.15, 0.2, -0.98),
        new THREE.Vector3(-0.05, 0.2, -0.92),
        new THREE.Vector3(0.4, 1.08, -0.86),
        new THREE.Vector3(0.92, -0.65, -0.8),
        new THREE.Vector3(1.7, 0.18, -0.74),
        new THREE.Vector3(2.75, 0.18, -0.68),
        new THREE.Vector3(3.8, 0.82, -0.62),
      ]),
    [],
  );
  const lineB = useMemo(
    () =>
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-3.2, -1.5, 0.5),
        new THREE.Vector3(-2.25, -0.82, 0.46),
        new THREE.Vector3(-1.25, -1.18, 0.4),
        new THREE.Vector3(-0.1, -0.45, 0.35),
        new THREE.Vector3(1.18, -0.92, 0.3),
        new THREE.Vector3(2.45, -0.28, 0.24),
        new THREE.Vector3(3.55, -0.84, 0.18),
      ]),
    [],
  );

  return (
    <>
      <line geometry={lineA}>
        <lineBasicMaterial color="#22d3ee" transparent opacity={0.4} />
      </line>
      <line geometry={lineB}>
        <lineBasicMaterial color="#6366f1" transparent opacity={0.2} />
      </line>
    </>
  );
}

function ParticleField() {
  const positions = useMemo(() => {
    const pos = new Float32Array(80 * 3);
    for (let i = 0; i < 80; i += 1) {
      pos[i * 3] = (Math.random() - 0.5) * 11;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 7;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 7;
    }
    return pos;
  }, []);

  const ref = useRef(null);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.025;
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.06) * 0.06;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#c7d2fe" size={0.035} transparent opacity={0.35} />
    </points>
  );
}

function SceneInner() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 3]} intensity={0.9} color="#e0e7ff" />
      <pointLight position={[-3, -1, 2]} intensity={0.7} color="#22d3ee" />
      <pointLight position={[3, 1, -1]} intensity={0.8} color="#6366f1" />
      <ParticleField />
      <PulseLines />
      <HeartMesh />
    </>
  );
}

export function Hero3DScene() {
  return (
    <div className="scene3d-shell" aria-hidden="true">
      <Suspense fallback={<div className="scene3d-fallback" />}>
        <Canvas camera={{ position: [0, 0.05, 6.3], fov: 40 }} gl={{ alpha: true, antialias: true }} dpr={[1, 1.2]}>
          <SceneInner />
        </Canvas>
      </Suspense>
    </div>
  );
}

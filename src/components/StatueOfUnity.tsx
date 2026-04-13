import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, MeshWobbleMaterial, PerspectiveCamera, PresentationControls, Stage } from '@react-three/drei';
import * as THREE from 'three';

function StatueModel() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <group scale={0.5}>
      {/* Base */}
      <mesh position={[0, -2, 0]}>
        <cylinderGeometry args={[1.5, 2, 0.5, 32]} />
        <meshStandardMaterial color="#4A4A30" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Main Body (Simplified Statue Shape) */}
      <mesh ref={meshRef} position={[0, 1, 0]}>
        <capsuleGeometry args={[0.8, 3, 4, 32]} />
        <meshStandardMaterial color="#8B4513" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 3.2, 0]}>
        <sphereGeometry args={[0.6, 32, 32]} />
        <meshStandardMaterial color="#8B4513" metalness={0.9} roughness={0.1} />
      </mesh>

      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
    </group>
  );
}

export function StatueOfUnity() {
  return (
    <div className="w-48 h-64 pointer-events-none">
      <Canvas shadows camera={{ position: [0, 0, 10], fov: 35 }}>
        <PresentationControls
          global
          rotation={[0, 0.3, 0]}
          polar={[-Math.PI / 3, Math.PI / 3]}
          azimuth={[-Math.PI / 1.4, Math.PI / 1.4]}
        >
          <Float rotationIntensity={0.5} floatIntensity={0.5} speed={2}>
            <StatueModel />
          </Float>
        </PresentationControls>
      </Canvas>
    </div>
  );
}

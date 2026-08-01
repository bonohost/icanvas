'use client';

import { useGLTF, OrbitControls, Environment, Center } from '@react-three/drei';
import * as THREE from 'three';
import { useSofaStore } from '../../stores/sofaStore';

// Supondo que seu GLB tenha nós nomeados 'cushions' e 'legs'
function Sofa(props: any) {
    // const { nodes } = useGLTF('/models/sofa.glb'); // Substitua pelo seu modelo
    const { materials, currentMaterialName } = useSofaStore();
    const currentMaterial = materials[currentMaterialName];

    return (
        <group {...props}>
            {/* 
        Exemplo de uso com um modelo GLB real:
        <mesh 
          castShadow 
          receiveShadow 
          geometry={(nodes.cushions as THREE.Mesh).geometry} 
          material={currentMaterial} 
        />
        <mesh 
          castShadow 
          receiveShadow 
          geometry={(nodes.legs as THREE.Mesh).geometry}
        >
          <meshStandardMaterial color="#3a241a" />
        </mesh>
      */}

            {/* Placeholder */}
            <mesh material={currentMaterial} castShadow receiveShadow>
                <boxGeometry args={[3, 1.5, 1.5]} />
            </mesh>
        </group>
    );
}

export default function SofaScene() {
    return (
        <>
            <Environment preset="city" />
            <Center>
                <Sofa />
            </Center>
            <OrbitControls autoRotate autoRotateSpeed={0.4} />
        </>
    );
}
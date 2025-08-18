import { useFrame, useLoader } from '@react-three/fiber';
import React, { useEffect } from 'react';
import { AnimationMixer } from 'three';
import { GLTFLoader } from 'three-stdlib';

export default function Character({ url }) {
  const gltf = useLoader(GLTFLoader, url);
  const mixer = new AnimationMixer(gltf.scene);

  useEffect(() => {
    if (gltf.animations.length > 0) {
      const action = mixer.clipAction(gltf.animations[0]);
      action.play();
    }
  }, [gltf]);

  useFrame((_, delta) => mixer.update(delta));

  return <primitive object={gltf.scene} scale={1.5} />;
}

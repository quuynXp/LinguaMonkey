// import { GLView, ExpoWebGLRenderingContext } from 'expo-gl';
// import { Renderer } from 'expo-three';
// import { useEffect, useRef } from 'react';
// import { AmbientLight, DirectionalLight, PerspectiveCamera, Scene } from 'three';
// import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

// type ViewModelScreenProps = {
//   route: {
//     params: {
//       modelUrl: string;
//     };
//   };
// };

// export default function ViewModelScreen({ route }: ViewModelScreenProps) {
//   const { modelUrl } = route.params;
//   const timeout = useRef(0);

//   const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
//     const { drawingBufferWidth: width, drawingBufferHeight: height } = gl;
//     const renderer = new Renderer({ gl });
//     renderer.setSize(width, height);

//     const scene = new Scene();
//     const camera = new PerspectiveCamera(75, width / height, 0.1, 1000);
//     camera.position.z = 3;

//     scene.add(new AmbientLight(0xffffff, 1));
//     const dirLight = new DirectionalLight(0xffffff, 1);
//     dirLight.position.set(5, 5, 5);
//     scene.add(dirLight);

//     // Load model GLB
//     const loader = new GLTFLoader();
//     const gltf = await loader.loadAsync(modelUrl);
//     scene.add(gltf.scene);

//     const render = () => {
//       timeout.current = requestAnimationFrame(render);
//       renderer.render(scene, camera);
//       gl.endFrameEXP();
//     };
//     render();
//   };

//   useEffect(() => {
//     return () => cancelAnimationFrame(timeout.current);
//   }, []);

//   return <GLView style={{ flex: 1 }} onContextCreate={onContextCreate} />;
// }


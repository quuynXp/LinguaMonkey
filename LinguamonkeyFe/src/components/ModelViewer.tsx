// import React, { useEffect, useRef, useState } from "react";
// import {
//   View,
//   ActivityIndicator,
//   PanResponder,
//   GestureResponderEvent,
//   PanResponderGestureState,
//
//   LayoutChangeEvent,
// } from "react-native";
// import { GLView } from "expo-gl";
// import { Renderer, TextureLoader } from "expo-three";
// import * as THREE from "three";
// import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
// import { encode as base64Encode } from "base64-arraybuffer";
// import { Asset } from "expo-asset";
// import * as FileSystem from "expo-file-system";
// import { SRGBColorSpace } from "three";

// interface ModelViewerProps {
//   modelUrl: string;
//   width?: number;
//   height?: number;
//   rotateSpeed?: number;
//   pitchSpeed?: number;
//   minPitch?: number;
//   maxPitch?: number;
//   onTap?: () => void;
// }

// function toArrayBufferSafe(bufOrView: any): ArrayBuffer {
//   if (!bufOrView) return new ArrayBuffer(0);
//   if (bufOrView instanceof ArrayBuffer) return bufOrView;
//   if (typeof SharedArrayBuffer !== "undefined" && bufOrView instanceof SharedArrayBuffer) {
//     const u8 = new Uint8Array(bufOrView as any);
//     return u8.slice().buffer;
//   }
//   if (ArrayBuffer.isView(bufOrView)) {
//     const view = bufOrView as Uint8Array;
//     return view.slice().buffer;
//   }
//   return new ArrayBuffer(0);
// }

// // KHÔNG CẦN CHUYỂN DATA URI THÀNH FILE TẠM NỮA!
// // THREE.js GLTFLoader đã xử lý Texture nhúng (Base64/Binary) thông qua parser.
// // Chúng ta chỉ cần đảm bảo GLTFLoader sử dụng đúng logic tải của Expo.

// function disposeObject(obj: any) {
//   if (!obj) return;
//   try {
//     if (obj.geometry) obj.geometry.dispose();
//   } catch { }
//   if (obj.material) {
//     const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
//     mats.forEach((m: any) => {
//       try {
//         if (m.map) m.map.dispose();
//       } catch { }
//       try {
//         if (m.normalMap) m.normalMap.dispose();
//       } catch { }
//       try {
//         if (m.aoMap) m.aoMap.dispose();
//       } catch { }
//       try {
//         if (m.emissiveMap) m.emissiveMap.dispose();
//       } catch { }
//       try {
//         if (m.dispose) m.dispose();
//       } catch { }
//     });
//   }
// }

// export default function ModelViewer({
//   modelUrl,
//   width = 220,
//   height = 180,
//   rotateSpeed = 0.005,
//   pitchSpeed = 0.003,
//   minPitch = -0.8,
//   maxPitch = 0.8,
//   onTap,
// }: ModelViewerProps) {
//   const [isLoading, setIsLoading] = useState(true);

//   const modelRef = useRef<THREE.Group | null>(null);
//   const sceneRef = useRef<THREE.Scene | null>(null);
//   const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
//   const rafRef = useRef<number | null>(null);

//   const rotYRef = useRef(0);
//   const rotXRef = useRef(0);
//   const lastXRef = useRef(0);
//   const lastYRef = useRef(0);
//   const draggingRef = useRef(false);

//   // For tap detection
//   const touchStartTimeRef = useRef(0);
//   const touchStartXRef = useRef(0);
//   const touchStartYRef = useRef(0);

//   // For pinch
//   const isPinchingRef = useRef(false);
//   const initialPinchDistanceRef = useRef(0);
//   const initialCameraZRef = useRef(2.5);
//   const initialPinchAngleRef = useRef(0);

//   // hold-to-drag timer
//   const holdTimeoutRef = useRef<any>(null);
//   const HOLD_DELAY = 100;

//   // view layout (for converting coords)
//   const layoutRef = useRef({ x: 0, y: 0, w: width, h: height });

//   // raycaster/selection
//   const raycasterRef = useRef(new THREE.Raycaster());
//   const selectedObjRef = useRef<THREE.Object3D | null>(null);
//   const selectionHelperRef = useRef<THREE.BoxHelper | null>(null);

//   useEffect(() => {
//     return () => {
//       if (holdTimeoutRef.current) {
//         clearTimeout(holdTimeoutRef.current);
//         holdTimeoutRef.current = null;
//       }
//     };
//   }, []);

//   function onLayout(e: LayoutChangeEvent) {
//     const { x = 0, y = 0, width: w = width, height: h = height } = e.nativeEvent.layout as any;
//     layoutRef.current = { x, y, w, h };
//   }

//   // helper: compute distance between two touches (use locationX/Y)
//   function distanceBetweenTouches(t0: any, t1: any) {
//     const dx = (t0.locationX ?? t0.pageX) - (t1.locationX ?? t1.pageX);
//     const dy = (t0.locationY ?? t0.pageY) - (t1.locationY ?? t1.pageY);
//     return Math.sqrt(dx * dx + dy * dy);
//   }
//   function angleBetweenTouches(t0: any, t1: any) {
//     const dx = (t1.locationX ?? t1.pageX) - (t0.locationX ?? t0.pageX);
//     const dy = (t1.locationY ?? t1.pageY) - (t0.locationY ?? t0.pageY);
//     return Math.atan2(dy, dx);
//   }

//   function clearSelection(scene?: THREE.Scene) {
//     const sceneUse = scene || sceneRef.current;
//     if (selectionHelperRef.current && sceneUse) {
//       sceneUse.remove(selectionHelperRef.current);
//       selectionHelperRef.current = null;
//     }
//     selectedObjRef.current = null;
//   }

//   function applySelection(obj: THREE.Object3D | null) {
//     if (!sceneRef.current) return;
//     clearSelection(sceneRef.current);
//     if (!obj) return;
//     const helper = new THREE.BoxHelper(obj, 0xffff66);
//     helper.material.linewidth = 2;
//     sceneRef.current.add(helper);
//     selectionHelperRef.current = helper;
//     selectedObjRef.current = obj;
//   }

//   async function handleTapAt(x: number, y: number) {
//     const scene = sceneRef.current;
//     const camera = cameraRef.current;
//     if (!scene || !camera) return;

//     const { w, h } = layoutRef.current;
//     const ndcX = (x / w) * 2 - 1;
//     const ndcY = -((y / h) * 2 - 1);

//     raycasterRef.current.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

//     const root = modelRef.current;
//     const candidates: THREE.Object3D[] = [];
//     if (root) {
//       root.traverse((n: any) => {
//         if (n.isMesh) candidates.push(n);
//       });
//     } else {
//       scene.traverse((n: any) => {
//         if (n.isMesh) candidates.push(n);
//       });
//     }
//     const intersects = raycasterRef.current.intersectObjects(candidates, true);
//     if (intersects && intersects.length) {
//       const first = intersects[0].object;
//       let top = first as THREE.Object3D;
//       while (top.parent && top.parent !== root && top.parent.type !== "Scene") {
//         top = top.parent;
//       }
//       applySelection(top);
//     } else {
//       clearSelection();
//     }
//   }

//   const panResponder = PanResponder.create({
//     onStartShouldSetPanResponder: () => false,
//     onStartShouldSetPanResponderCapture: () => false,
//     onMoveShouldSetPanResponder: (evt, gestureState) =>
//       Math.abs(gestureState.dx) > 5 ||
//       Math.abs(gestureState.dy) > 5 ||
//       (gestureState.numberActiveTouches && gestureState.numberActiveTouches >= 2),
//     onMoveShouldSetPanResponderCapture: (evt, gestureState) =>
//       Math.abs(gestureState.dx) > 5 ||
//       Math.abs(gestureState.dy) > 5 ||
//       (gestureState.numberActiveTouches && gestureState.numberActiveTouches >= 2),

//     onPanResponderGrant: (evt) => {
//       const native = evt.nativeEvent as any;
//       const touches = native.touches || [];

//       touchStartTimeRef.current = Date.now();
//       touchStartXRef.current = native.locationX ?? native.pageX ?? 0;
//       touchStartYRef.current = native.locationY ?? native.pageY ?? 0;

//       // If two-finger, start pinch immediately
//       if (touches.length >= 2) {
//         isPinchingRef.current = true;
//         initialPinchDistanceRef.current = distanceBetweenTouches(touches[0], touches[1]);
//         initialCameraZRef.current = cameraRef.current ? cameraRef.current.position.z : 2.5;
//         initialPinchAngleRef.current = angleBetweenTouches(touches[0], touches[1]);
//         // cancel any hold timer
//         if (holdTimeoutRef.current) {
//           clearTimeout(holdTimeoutRef.current);
//           holdTimeoutRef.current = null;
//         }
//       } else {
//         // single finger: set a hold timer. only after HOLD_DELAY we allow dragging
//         isPinchingRef.current = false;
//         draggingRef.current = false;
//         lastXRef.current = native.locationX ?? native.pageX ?? 0;
//         lastYRef.current = native.locationY ?? native.pageY ?? 0;

//         if (holdTimeoutRef.current) {
//           clearTimeout(holdTimeoutRef.current);
//           holdTimeoutRef.current = null;
//         }
//         holdTimeoutRef.current = setTimeout(() => {
//           draggingRef.current = true;
//           // update last positions again to avoid jump
//           lastXRef.current = native.locationX ?? native.pageX ?? lastXRef.current;
//           lastYRef.current = native.locationY ?? native.pageY ?? lastYRef.current;
//           holdTimeoutRef.current = null;
//         }, HOLD_DELAY);
//       }
//     },

//     onPanResponderMove: (evt: GestureResponderEvent, gesture: PanResponderGestureState) => {
//       const native = evt.nativeEvent as any;
//       const touches = native.touches || [];

//       // Two-finger gestures
//       if (touches.length >= 2) {
//         isPinchingRef.current = true;
//         const curDist = distanceBetweenTouches(touches[0], touches[1]);
//         const curAngle = angleBetweenTouches(touches[0], touches[1]);
//         const initDist = initialPinchDistanceRef.current || curDist || 1;
//         const initAngle = initialPinchAngleRef.current || curAngle || 0;

//         const camera = cameraRef.current;
//         if (camera && initDist > 0) {
//           const factor = initDist / Math.max(0.0001, curDist);
//           let newZ = (initialCameraZRef.current || camera.position.z) * factor;
//           newZ = Math.max(1.0, Math.min(8.0, newZ));
//           camera.position.z = newZ;
//         }

//         const deltaAngle = curAngle - initAngle;
//         rotYRef.current += deltaAngle;
//         initialPinchAngleRef.current = curAngle;

//         // cancel any hold timer for single finger
//         if (holdTimeoutRef.current) {
//           clearTimeout(holdTimeoutRef.current);
//           holdTimeoutRef.current = null;
//         }
//       } else {
//         // Single finger: if draggingRef true (either by hold timeout or by move threshold), rotate
//         const x = native.locationX ?? native.pageX ?? 0;
//         const y = native.locationY ?? native.pageY ?? 0;
//         const dx = x - lastXRef.current;
//         const dy = y - lastYRef.current;
//         const moved = Math.hypot(x - touchStartXRef.current, y - touchStartYRef.current);

//         // quick start: if user moves finger significantly before HOLD_DELAY, start dragging immediately
//         const MOVE_TO_DRAG_THRESHOLD = 6; // px
//         if (!draggingRef.current && moved > MOVE_TO_DRAG_THRESHOLD) {
//           // cancel hold timer and enter dragging
//           if (holdTimeoutRef.current) {
//             clearTimeout(holdTimeoutRef.current);
//             holdTimeoutRef.current = null;
//           }
//           draggingRef.current = true;
//           // update last to current to avoid jump
//           lastXRef.current = x;
//           lastYRef.current = y;
//         }

//         if (!draggingRef.current) return;

//         lastXRef.current = x;
//         lastYRef.current = y;

//         rotYRef.current += dx * rotateSpeed;
//         rotXRef.current = Math.max(minPitch, Math.min(maxPitch, rotXRef.current + dy * pitchSpeed));
//       }
//     },

//     onPanResponderRelease: (evt) => {
//       const native = (evt.nativeEvent as any);
//       const endX = native.locationX ?? native.pageX ?? 0;
//       const endY = native.locationY ?? native.pageY ?? 0;
//       const dt = Date.now() - touchStartTimeRef.current;
//       const moved = Math.hypot(endX - touchStartXRef.current, endY - touchStartYRef.current);

//       // cleanup hold timer if exists
//       if (holdTimeoutRef.current) {
//         clearTimeout(holdTimeoutRef.current);
//         holdTimeoutRef.current = null;
//       }

//       // if pinch active, reset
//       if (isPinchingRef.current) {
//         isPinchingRef.current = false;
//       }

//       // if dragging was active, end dragging and DO NOT treat as tap
//       if (draggingRef.current) {
//         draggingRef.current = false;
//         return;
//       }

//       // Not dragging: consider as tap/click if quick enough and small move
//       const TAP_MAX_MOVE = 6; // px
//       const TAP_MAX_TIME = HOLD_DELAY; // use same threshold for clarity (<=100ms)
//       if (moved <= TAP_MAX_MOVE && dt <= TAP_MAX_TIME) {
//         handleTapAt(endX, endY);

//         onTap?.();
//       } else {
//         // otherwise nothing (long press without move but released after HOLD_DELAY may have set dragging; handled above)
//       }
//     },

//     onPanResponderTerminationRequest: () => true,
//     onPanResponderTerminate: () => {
//       if (holdTimeoutRef.current) {
//         clearTimeout(holdTimeoutRef.current);
//         holdTimeoutRef.current = null;
//       }
//       isPinchingRef.current = false;
//       draggingRef.current = false;
//     },
//   });

//   return (
//     <View onLayout={onLayout} style={{ width, height }}>
//       <GLView
//         style={[styles.gl, { width, height }]}
//         onContextCreate={async (gl) => {
//           const { drawingBufferWidth: bufW, drawingBufferHeight: bufH } = gl;

//           const renderer = new Renderer({ gl });
//           renderer.setSize(bufW, bufH);
//           (renderer as any).outputColorSpace = SRGBColorSpace;
//           renderer.setClearColor(0x000000, 0);

//           const scene = new THREE.Scene();
//           sceneRef.current = scene;

//           const camera = new THREE.PerspectiveCamera(60, bufW / bufH, 0.01, 1000);
//           camera.position.set(0, 0, 2.5);
//           cameraRef.current = camera;

//           scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.0));
//           const dl = new THREE.DirectionalLight(0xffffff, 1.0);
//           dl.position.set(3, 10, 10);
//           scene.add(dl);

//           const placeholder = new THREE.Mesh(
//             new THREE.BoxGeometry(0.8, 0.8, 0.8),
//             new THREE.MeshStandardMaterial({ color: 0xdddddd })
//           );
//           scene.add(placeholder);
//           setIsLoading(true);

//           try {
//             const asset = Asset.fromURI(modelUrl);
//             await asset.downloadAsync();
//             const localUri = asset.localUri || asset.uri || modelUrl;

//             // Đọc ArrayBuffer của file GLB đã tải về
//             const fileAb = await FileSystem.read
//               .readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 })
//               .then((base64) => base64ArrayBuffer.decode(base64))
//               .catch(() => {
//                 // Fallback nếu có lỗi đọc Base64 (ví dụ: file lớn hơn giới hạn)
//                 console.warn("Could not read file as Base64 for ArrayBuffer, trying fetch...");
//                 return fetch(localUri)
//                   .then(res => res.arrayBuffer());
//               });

//             const loader = new GLTFLoader();
//             // Bỏ qua logic custom load texture phức tạp, dùng parser của GLTFLoader
//             // để nó xử lý tốt hơn các embedded binary buffer.

//             // THÊM: Xử lý các Texture nhúng nếu có.
//             // Nếu GLB có chứa các Texture nhúng trong BufferViews (thay vì Data URI),
//             // loader.parse() sẽ tự xử lý nếu logic của Three.js & Expo-Three chuẩn.

//             loader.parse(
//               fileAb as ArrayBuffer,
//               "",
//               async (gltf: any) => {
//                 try {
//                   const model = gltf.scene;
//                   // Áp dụng các thay đổi màu sắc và flipY cho tất cả material trong mô hình
//                   model.traverse((o: any) => {
//                     if (o.isMesh) {
//                       const materials = Array.isArray(o.material) ? o.material : [o.material];
//                       materials.forEach((m: any) => {
//                         if (m.isMeshStandardMaterial) {
//                           if (m.map) {
//                             m.map.flipY = false;
//                             m.map.colorSpace = SRGBColorSpace;
//                             m.map.needsUpdate = true;
//                           }
//                           if (m.normalMap) {
//                             m.normalMap.flipY = false;
//                             m.normalMap.needsUpdate = true;
//                           }
//                           if (m.emissiveMap) {
//                             m.emissiveMap.flipY = false;
//                             m.emissiveMap.colorSpace = SRGBColorSpace;
//                             m.emissiveMap.needsUpdate = true;
//                           }
//                           m.needsUpdate = true;
//                         }
//                       });
//                     }
//                   });

//                   let box = new THREE.Box3().setFromObject(model);
//                   const size = box.getSize(new THREE.Vector3()).length();
//                   const center = box.getCenter(new THREE.Vector3());
//                   model.position.sub(center);
//                   // Tăng tỉ lệ scale mặc định lên 2.0/size
//                   model.scale.setScalar(size > 0 ? 2.0 / size : 1);

//                   box = new THREE.Box3().setFromObject(model);
//                   model.position.y -= box.min.y;
//                   const height = box.max.y - box.min.y;
//                   camera.position.y = height / 2;

//                   model.rotation.y = rotYRef.current;
//                   model.rotation.x = rotXRef.current;

//                   modelRef.current = model;
//                   scene.add(model);
//                   placeholder.visible = false;
//                   setIsLoading(false);
//                 } catch (e) {
//                   console.error("Error in parse callback:", e);
//                   setIsLoading(false);
//                 }
//               },
//               (xhr: any) => {
//                 // Xử lý sự kiện tiến trình tải (có thể dùng để cập nhật UI)
//                 const percentage = (xhr.loaded / xhr.total) * 100;
//                 console.log(`Model loading: ${percentage.toFixed(2)}%`);
//               },
//               (err: any) => {
//                 console.error("❌ GLTF load error:", err);
//                 setIsLoading(false);
//               }
//             );
//           } catch (err) {
//             console.error("❌ Error loading .glb:", err);
//             setIsLoading(false);
//           }

//           const animate = () => {
//             rafRef.current = requestAnimationFrame(animate);

//             if (modelRef.current) {
//               modelRef.current.rotation.y = rotYRef.current;
//               modelRef.current.rotation.x = rotXRef.current;
//             }

//             if (selectionHelperRef.current) selectionHelperRef.current.update();

//             renderer.render(scene, camera);
//             gl.endFrameEXP();
//           };
//           animate();

//           return () => {
//             if (rafRef.current) cancelAnimationFrame(rafRef.current);
//             try {
//               if (modelRef.current) {
//                 modelRef.current.traverse((o: any) => {
//                   if (o.isMesh) disposeObject(o);
//                 });
//                 scene.remove(modelRef.current);
//                 modelRef.current = null;
//               }
//               clearSelection(scene);
//               disposeObject(placeholder);
//               scene.remove(placeholder);
//               scene.traverse((o: any) => {
//                 try {
//                   if (o.geometry) o.geometry.dispose();
//                 } catch { }
//               });
//             } catch { }
//           };
//         }}
//         {...panResponder.panHandlers}
//       />

//       {isLoading && (
//         <View style={styles.loaderOverlay} pointerEvents="none">
//           <ActivityIndicator size="small" />
//         </View>
//       )}
//     </View>
//   );
// }

// const styles = createScaledSheet({
//   gl: {
//     backgroundColor: "transparent",
//   },
//   loaderOverlay: {
//     position: "absolute",
//     left: 0,
//     right: 0,
//     top: 0,
//     bottom: 0,
//     alignItems: "center",
//     justifyContent: "center",
//     backgroundColor: 'rgba(255, 255, 255, 0.6)', // Thêm overlay màu trắng mờ để thấy rõ hơn
//   },
// });
// ModelViewer.tsx
import React, { useEffect, useRef, useState } from "react";
import { View, ActivityIndicator, PanResponder, GestureResponderEvent, PanResponderGestureState, StyleSheet } from "react-native";
import { GLView } from "expo-gl";
import { Renderer } from "expo-three";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { encode as base64Encode } from "base64-arraybuffer";
import { Asset } from "expo-asset";

interface ModelViewerProps {
  modelUrl: string; // .glb với embedded textures
  width?: number;
  height?: number;
  // tốc độ xoay khi vuốt
  rotateSpeed?: number;   // default 0.005 (radians per px)
  pitchSpeed?: number;    // default 0.003
  // giới hạn ngửa/cúi
  minPitch?: number;      // default -0.8 rad
  maxPitch?: number;      // default 0.8 rad
}

function toArrayBufferSafe(bufOrView: any): ArrayBuffer {
  if (!bufOrView) return new ArrayBuffer(0);
  if (bufOrView instanceof ArrayBuffer) return bufOrView;
  if (typeof SharedArrayBuffer !== "undefined" && bufOrView instanceof SharedArrayBuffer) {
    const u8 = new Uint8Array(bufOrView as any);
    return u8.slice().buffer;
  }
  if (ArrayBuffer.isView(bufOrView)) {
    const view = bufOrView as Uint8Array;
    return view.slice().buffer;
  }
  return new ArrayBuffer(0);
}

function loadTextureFromDataUri(dataUri: string): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(
      dataUri,
      (tex) => {
        try {
          tex.flipY = false;
          (tex as any).encoding = (THREE as any).sRGBEncoding || (tex as any).encoding;
          tex.needsUpdate = true;
        } catch {}
        resolve(tex);
      },
      undefined,
      (err) => reject(err)
    );
  });
}

function disposeObject(obj: any) {
  if (!obj) return;
  try { if (obj.geometry) obj.geometry.dispose(); } catch {}
  if (obj.material) {
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.forEach((m: any) => {
      try { if (m.map) m.map.dispose(); } catch {}
      try { if (m.normalMap) m.normalMap.dispose(); } catch {}
      try { if (m.aoMap) m.aoMap.dispose(); } catch {}
      try { if (m.emissiveMap) m.emissiveMap.dispose(); } catch {}
      try { if (m.dispose) m.dispose(); } catch {}
    });
  }
}

export default function ModelViewer({
  modelUrl,
  width = 220,
  height = 260,
  rotateSpeed = 0.005,
  pitchSpeed = 0.003,
  minPitch = -0.8,
  maxPitch = 0.8,
}: ModelViewerProps) {
  const [isLoading, setIsLoading] = useState(true);

  const modelRef = useRef<THREE.Group | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rafRef = useRef<number | null>(null);

  // điều khiển bằng tay
  const rotYRef = useRef(0); // yaw
  const rotXRef = useRef(0); // pitch
  const lastXRef = useRef(0);
  const lastYRef = useRef(0);
  const draggingRef = useRef(false);

  // đảm bảo URL object tồn tại (tránh crash từ GLTFLoader nội bộ)
  useEffect(() => {
    if (typeof (global as any).URL === "undefined") {
      (global as any).URL = { createObjectURL: () => "", revokeObjectURL: () => {} };
    } else if (typeof (global as any).URL.revokeObjectURL !== "function") {
      (global as any).URL.revokeObjectURL = () => {};
    }
  }, []);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      draggingRef.current = true;
      lastXRef.current = evt.nativeEvent.pageX;
      lastYRef.current = evt.nativeEvent.pageY;
    },
    onPanResponderMove: (evt: GestureResponderEvent, gesture: PanResponderGestureState) => {
      if (!draggingRef.current) return;
      const x = evt.nativeEvent.pageX;
      const y = evt.nativeEvent.pageY;
      const dx = x - lastXRef.current;
      const dy = y - lastYRef.current;
      lastXRef.current = x;
      lastYRef.current = y;

      rotYRef.current += dx * rotateSpeed;                 // xoay quanh trục Y khi kéo ngang
      rotXRef.current = Math.max(minPitch, Math.min(maxPitch, rotXRef.current + dy * pitchSpeed)); // ngửa/cúi khi kéo dọc
    },
    onPanResponderRelease: () => {
      draggingRef.current = false;
    },
    onPanResponderTerminationRequest: () => true,
    onPanResponderTerminate: () => {
      draggingRef.current = false;
    },
  });

  return (
    <View style={{ width, height }}>
      <GLView
        style={[styles.gl, { width, height }]}
        onContextCreate={async (gl) => {
          const { drawingBufferWidth: bufW, drawingBufferHeight: bufH } = gl;

          // Renderer (alpha true để nền trong suốt)
          const renderer = new Renderer({ gl });
          renderer.setSize(bufW, bufH);
          try {
            (renderer as any).outputEncoding = (THREE as any).sRGBEncoding || (renderer as any).outputEncoding;
          } catch {}
          renderer.setClearColor(0x000000, 0); // alpha = 0 → background trong suốt

          // Scene, Camera, Lights
          const scene = new THREE.Scene();
          sceneRef.current = scene;

          const camera = new THREE.PerspectiveCamera(60, bufW / bufH, 0.01, 1000);
          camera.position.set(0, 1.2, 2.8);
          cameraRef.current = camera;

          scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.0));
          const dl = new THREE.DirectionalLight(0xffffff, 1.0);
          dl.position.set(3, 10, 10);
          scene.add(dl);

          // Placeholder trong khi loading (màu xám nhạt, vẫn trong suốt nền)
          const placeholder = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 0.8, 0.8),
            new THREE.MeshStandardMaterial({ color: 0xdddddd })
          );
          scene.add(placeholder);
          setIsLoading(true);

          // --- Load GLB và tự giải nén texture embedded ---
          try {
            console.log("🔄 Loading .glb:", modelUrl);

            const asset = Asset.fromURI(modelUrl);
            try { await asset.downloadAsync(); } catch (e) { /* ignore nếu đã cache */ }
            const localUri = asset.localUri || asset.uri || modelUrl;

            // fetch arrayBuffer
            const resp = await fetch(localUri);
            const fileAb = await resp.arrayBuffer();

            // parse glb
            const loader = new GLTFLoader();
            (loader as any).parse(
              fileAb,
              "",
              async (gltf: any) => {
                try {
                  const parser = gltf.parser;
                  const json = parser?.json || {};
                  const images = json.images || [];
                  const texturesJson = json.textures || [];
                  const materialsJson = json.materials || [];

                  // 1) chuyển từng image embedded thành THREE.Texture
                  const imageIndexToTexture: Record<number, THREE.Texture> = {};
                  for (let i = 0; i < images.length; i++) {
                    const img = images[i];
                    try {
                      if (img.uri) {
                        // có thể là data: hoặc external (hiếm khi trong .glb)
                        imageIndexToTexture[i] = await loadTextureFromDataUri(img.uri);
                      } else if (typeof img.bufferView === "number") {
                        const bv = await parser.getDependency("bufferView", img.bufferView);
                        const ab = toArrayBufferSafe(bv);
                        const mime = img.mimeType || "image/png";
                        const dataUri = `data:${mime};base64,${base64Encode(ab)}`;
                        imageIndexToTexture[i] = await loadTextureFromDataUri(dataUri);
                      }
                    } catch (e) {
                      console.warn("Texture load error at image index", i, e);
                    }
                  }

                  // 2) map texture index -> THREE.Texture
                  const textureIndexToTexture: Record<number, THREE.Texture> = {};
                  for (let ti = 0; ti < texturesJson.length; ti++) {
                    const tJson = texturesJson[ti];
                    if (tJson && typeof tJson.source === "number") {
                      const imgIdx = tJson.source;
                      const tex = imageIndexToTexture[imgIdx];
                      if (tex) textureIndexToTexture[ti] = tex;
                    }
                  }

                  // 3) assign textures cho materials runtime
                  const runtimeMaterials: THREE.Material[] = [];
                  gltf.scene.traverse((node: any) => {
                    if (node.isMesh) {
                      const mats = Array.isArray(node.material) ? node.material : [node.material];
                      mats.forEach((m: any) => { if (m && runtimeMaterials.indexOf(m) === -1) runtimeMaterials.push(m); });
                    }
                  });

                  // by material name
                  for (let mi = 0; mi < materialsJson.length; mi++) {
                    const mJson = materialsJson[mi];
                    const matName = mJson.name || "";
                    const runtime = runtimeMaterials.find(rm => (rm as any).name === matName);
                    if (!runtime) continue;

                    const pbr = mJson.pbrMetallicRoughness || {};
                    const baseInfo = pbr.baseColorTexture;
                    if (baseInfo && typeof baseInfo.index === "number") {
                      const texIdx = baseInfo.index;
                      const tex = textureIndexToTexture[texIdx];
                      if (tex) {
                        (runtime as any).map = tex;
                        try { (runtime as any).map.encoding = (THREE as any).sRGBEncoding; } catch {}
                        (runtime as any).map.flipY = false;
                        (runtime as any).map.needsUpdate = true;
                        runtime.needsUpdate = true;
                      }
                    }
                    if (mJson.normalTexture?.index != null) {
                      const t = textureIndexToTexture[mJson.normalTexture.index];
                      if (t) { (runtime as any).normalMap = t; (runtime as any).normalMap.flipY = false; (runtime as any).normalMap.needsUpdate = true; runtime.needsUpdate = true; }
                    }
                    if (mJson.occlusionTexture?.index != null) {
                      const t = textureIndexToTexture[mJson.occlusionTexture.index];
                      if (t) { (runtime as any).aoMap = t; (runtime as any).aoMap.flipY = false; (runtime as any).aoMap.needsUpdate = true; runtime.needsUpdate = true; }
                    }
                    if (mJson.emissiveTexture?.index != null) {
                      const t = textureIndexToTexture[mJson.emissiveTexture.index];
                      if (t) { (runtime as any).emissiveMap = t; (runtime as any).emissiveMap.flipY = false; (runtime as any).emissiveMap.needsUpdate = true; runtime.needsUpdate = true; }
                    }
                  }

                  // fallback: nếu material nào chưa có map, gán texture đầu tiên
                  const tKeys = Object.keys(textureIndexToTexture).map(n => +n).sort((a,b)=>a-b);
                  if (tKeys.length) {
                    const firstTex = textureIndexToTexture[tKeys[0]];
                    runtimeMaterials.forEach((rm) => {
                      if (!(rm as any).map) {
                        (rm as any).map = firstTex;
                        try { (rm as any).map.encoding = (THREE as any).sRGBEncoding; } catch {}
                        (rm as any).map.flipY = false;
                        (rm as any).map.needsUpdate = true;
                        rm.needsUpdate = true;
                      }
                    });
                  }

                  // thêm model
                  const model = gltf.scene;
                  // center + scale
                  const box = new THREE.Box3().setFromObject(model);
                  const size = box.getSize(new THREE.Vector3()).length();
                  const center = box.getCenter(new THREE.Vector3());
                  model.position.sub(center);
                  model.scale.setScalar(size > 0 ? 1.8 / size : 1);

                  // áp yaw/pitch ban đầu
                  model.rotation.y = rotYRef.current;
                  model.rotation.x = rotXRef.current;

                  modelRef.current = model;
                  scene.add(model);
                  placeholder.visible = false;
                  setIsLoading(false);

                  console.log("✅ Model loaded with textures (manual attach)");
                } catch (e) {
                  console.error("Error in parse callback:", e);
                  setIsLoading(false);
                }
              },
              (err: any) => {
                console.error("❌ GLTF parse error:", err);
                setIsLoading(false);
              }
            );
          } catch (err) {
            console.error("❌ Error loading .glb:", err);
            setIsLoading(false);
          }

          // render loop (không auto-rotate)
          const animate = () => {
            rafRef.current = requestAnimationFrame(animate);

            // áp rotation từ gesture
            if (modelRef.current) {
              modelRef.current.rotation.y = rotYRef.current;
              modelRef.current.rotation.x = rotXRef.current;
            } else {
              // xoay placeholder nhẹ cho vui mắt khi đang loading? theo yêu cầu: không tự xoay
              // => để yên, chỉ hiển thị spinner overlay.
            }

            renderer.render(scene, camera);
            gl.endFrameEXP();
          };
          animate();

          // cleanup
          return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            try {
              if (modelRef.current) {
                modelRef.current.traverse((o: any) => { if (o.isMesh) disposeObject(o); });
                scene.remove(modelRef.current);
                modelRef.current = null;
              }
              disposeObject(placeholder);
              scene.remove(placeholder);
              scene.traverse((o: any) => { try { if (o.geometry) o.geometry.dispose(); } catch {} });
            } catch {}
          };
        }}
        // gán pan responder lên GLView
        {...panResponder.panHandlers}
      />

      {/* Loading overlay */}
      {isLoading && (
        <View style={styles.loaderOverlay} pointerEvents="none">
          <ActivityIndicator size="small" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  gl: {
    backgroundColor: "transparent", // đảm bảo nền trong suốt ở RN layer
  },
  loaderOverlay: {
    position: "absolute",
    left: 0, right: 0, top: 0, bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});

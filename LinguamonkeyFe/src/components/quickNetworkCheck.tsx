// quickNetworkCheck.tsx (temporary, run on device/emulator)
import React, { useEffect } from "react";
import { Text, View } from "react-native";

export default function QuickNetworkCheck(){
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("https://cdn.jsdelivr.net/npm/three@0.164.0/build/three.min.js", { method: "GET" });
        console.log("NETWORK CHECK status:", res.status);
        const txt = await res.text();
        console.log("NETWORK CHECK length:", txt.length);
      } catch (e) {
        console.log("NETWORK CHECK ERROR:", e && e.message);
      }
    })();
  }, []);

  console.log("QuickNetworkCheck mounted");
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Quick Network Check</Text>
      <Text>Check console for results</Text>
    </View>
  );
}

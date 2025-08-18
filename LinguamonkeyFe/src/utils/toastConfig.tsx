import { Text, View } from "react-native";
import Toast, { BaseToast, ErrorToast } from "react-native-toast-message";

export const toastConfig = {
  error: (props) => (
    <ErrorToast
      {...props}
      style={{ borderLeftColor: "#EF4444", borderRadius: 12 }}
      text1Style={{ fontSize: 15, fontWeight: "600", color: "#DC2626" }}
      text2Style={{ fontSize: 13, color: "#6B7280" }}
    />
  ),
  success: (props) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: "#10B981", borderRadius: 12 }}
      text1Style={{ fontSize: 15, fontWeight: "600", color: "#059669" }}
      text2Style={{ fontSize: 13, color: "#6B7280" }}
    />
  ),
};

export default Toast;

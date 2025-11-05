import Toast, { BaseToast, ErrorToast } from "react-native-toast-message"
import { Alert } from "react-native"
import { ToastOptions } from "../hooks/useToast"

export const showToast = ({message, type = "info" }: ToastOptions) => {
  const title = type === "success" ? "Success" : type === "error" ? "Error" : type === "warning" ? "Warning" : "Info"

  Alert.alert(title, message)
}

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
}

export default Toast

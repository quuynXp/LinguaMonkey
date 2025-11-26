import Toast, { BaseToast } from "react-native-toast-message"

export const showToast = ({ message, type = "info" }) => {
  Toast.show({
    type: type,
    text1: message, // Hiển thị nội dung trực tiếp ở dòng 1
    position: 'top',
    visibilityTime: 4000,
    autoHide: true,
    topOffset: 50,
  })
}

const commonStyle = {
  height: 'auto',
  paddingVertical: 12,
  borderRadius: 8,
  borderLeftWidth: 5,
  width: '90%',
  alignSelf: 'center'
};

const commonTextStyle = {
  fontSize: 14,
  fontWeight: "500", // Độ đậm vừa phải, không quá đậm như Title
  color: "#374151",
};

export const toastConfig = {
  error: (props) => (
    <BaseToast
      {...props}
      // Màu đỏ cho lỗi Server (5xx)
      style={{ ...commonStyle, borderLeftColor: "#EF4444" }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={commonTextStyle}
      text1NumberOfLines={3} // Hỗ trợ hiển thị tối đa 3 dòng cho lỗi dài
    />
  ),
  success: (props) => (
    <BaseToast
      {...props}
      style={{ ...commonStyle, borderLeftColor: "#10B981" }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={commonTextStyle}
      text1NumberOfLines={3}
    />
  ),
  info: (props) => (
    <BaseToast
      {...props}
      style={{ ...commonStyle, borderLeftColor: "#3B82F6" }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={commonTextStyle}
      text1NumberOfLines={3}
    />
  ),
  warning: (props) => (
    <BaseToast
      {...props}
      // Màu vàng/cam cho lỗi Client (4xx)
      style={{ ...commonStyle, borderLeftColor: "#F59E0B" }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={commonTextStyle}
      text1NumberOfLines={3}
    />
  ),
}

export default Toast
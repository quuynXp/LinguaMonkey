import Toast from "react-native-toast-message";

const DEFAULT_DURATION = 3000;

export const showError = (message: string) => {
  Toast.show({
    type: "error",
    text1: message,
    visibilityTime: DEFAULT_DURATION,
  });
};

export const showSuccess = (message: string) => {
  Toast.show({
    type: "success",
    text1: message,
    visibilityTime: DEFAULT_DURATION,
  });
};

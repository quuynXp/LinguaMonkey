import Constants from 'expo-constants';
import { Platform } from 'react-native';

// URL production, lấy từ .env
const PROD_API_URL = process.env.EXPO_PUBLIC_API_PROD_URL;

const ADB_REVERSE_URL = process.env.EXPO_PUBLIC_ADB_REVERSE_URL;

// URL dev cho Android Emulator
const ANDROID_EMULATOR_URL = process.env.EXPO_PUBLIC_ANDROID_EMULATOR_URL;

// URL dev cho iOS Simulator
const IOS_SIMULATOR_URL = process.env.EXPO_PUBLIC_IOS_SIMULATOR_URL;

const getDevelopmentHost = (): string | undefined => {
    // --- ƯU TIÊN SỐ 1: ANDROID VẬT LÝ DÙNG USB (adb reverse) ---
    if (Platform.OS === 'android' && Constants.isDevice) {
        console.log("Using ADB Reverse URL (localhost)");
        return ADB_REVERSE_URL;
    }
    // --------------------------------------------------------

    // Ưu tiên số 2: Thiết bị thật qua Wi-Fi (nếu mạng cho phép)
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
        console.log("Using Wi-Fi Host URL");
        return `http://${hostUri.split(':')[0]}:8000`;
    }

    // Fallback: Chạy trên máy ảo (Emulator/Simulator)
    if (Platform.OS === 'android') {
        console.log("Using Android Emulator URL");
        return ANDROID_EMULATOR_URL;
    }

    console.log("Using iOS Simulator URL");
    return IOS_SIMULATOR_URL;
};

// Quyết định URL cuối cùng
export const API_BASE_URL =
    (process.env.NODE_ENV === 'production')
        ? PROD_API_URL
        : getDevelopmentHost();

console.log("===================================");
console.log("Running in:", process.env.NODE_ENV);
console.log("API_BASE_URL:", API_BASE_URL);
console.log("===================================");
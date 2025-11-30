import Constants from 'expo-constants';
import { Platform, StyleSheet } from 'react-native';

const ADB_REVERSE_URL = process.env.EXPO_PUBLIC_ADB_REVERSE_URL || 'http://localhost:8000';
const ANDROID_EMULATOR_URL = process.env.EXPO_PUBLIC_ANDROID_EMULATOR_URL || 'http://10.0.2.2:8000';
const IOS_SIMULATOR_URL = process.env.EXPO_PUBLIC_IOS_SIMULATOR_URL || 'http://localhost:8000';

const getHost = (): string => {

    if (__DEV__) {
        const hostUri = Constants.expoConfig?.hostUri;
        if (hostUri) {
            const ip = hostUri.split(':')[0];
            return `http://${ip}:8000`;
        }

        if (Platform.OS === 'android' && Constants.isDevice) {
            return ADB_REVERSE_URL;
        }

        if (Platform.OS === 'android') {
            return ANDROID_EMULATOR_URL;
        }

        return IOS_SIMULATOR_URL;
    }

    return 'https://api.linguamonkey.com';
};

export const API_BASE_URL = getHost();

console.log("===================================");
console.log("Environment:", process.env.NODE_ENV);
console.log("Is Dev:", __DEV__);
console.log("Platform:", Platform.OS);
console.log("Is Device (Physical/VM):", Constants.isDevice);
console.log("Expo Host URI:", Constants.expoConfig?.hostUri);
console.log("Resolved API_BASE_URL:", API_BASE_URL);
console.log("===================================");
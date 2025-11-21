import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_URL_FROM_ENV = process.env.EXPO_PUBLIC_API_BASE_URL;

const ADB_REVERSE_URL = process.env.EXPO_PUBLIC_ADB_REVERSE_URL || 'http://localhost:8000';
const ANDROID_EMULATOR_URL = process.env.EXPO_PUBLIC_ANDROID_EMULATOR_URL || 'http://10.0.2.2:8000';
const IOS_SIMULATOR_URL = process.env.EXPO_PUBLIC_IOS_SIMULATOR_URL || 'http://localhost:8000';

const getHost = (): string => {
    if (API_URL_FROM_ENV) {
        return API_URL_FROM_ENV;
    }

    if (__DEV__) {
        if (Platform.OS === 'android' && Constants.isDevice) {
            return ADB_REVERSE_URL;
        }

        const hostUri = Constants.expoConfig?.hostUri;
        if (hostUri) {
            const ip = hostUri.split(':')[0];
            return `http://${ip}:8000`;
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
console.log("Resolved API_BASE_URL:", API_BASE_URL);
console.log("===================================");
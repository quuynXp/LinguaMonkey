import * as Device from 'expo-device';

export async function getDeviceIdSafe(): Promise<string> {
    try {
        const deviceId =
            (Device as any).osInternalBuildId ||
            (Device as any).osBuildId ||
            Device.modelId ||
            Device.modelName ||
            Device.deviceName ||
            'unknown-device';

        return typeof deviceId === 'string' && deviceId.trim() ? deviceId : 'unknown-device';
    } catch (err) {
        console.warn('[getDeviceIdSafe] read error', err);
        return 'unknown-device';
    }
}

export function getDeviceIdSync(): string {
    try {
        const deviceId =
            (Device as any).osInternalBuildId ||
            (Device as any).osBuildId ||
            Device.modelId ||
            Device.modelName ||
            Device.deviceName ||
            'unknown-device';
        return typeof deviceId === 'string' && deviceId.trim() ? deviceId : 'unknown-device';
    } catch (err) {
        console.warn('[getDeviceIdSync] read error', err);
        return 'unknown-device';
    }
}

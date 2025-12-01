import { Platform, Alert, Linking, StyleSheet } from 'react-native';
import { check, request, PERMISSIONS, RESULTS, Permission, openSettings } from 'react-native-permissions';
import * as Notifications from 'expo-notifications';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Application from 'expo-application';
import i18n from '../i18n';

class PermissionService {

    async checkNotificationPermission(): Promise<boolean> {
        try {
            const { status } = await Notifications.getPermissionsAsync();
            if (status === 'granted') return true;

            const { status: newStatus } = await Notifications.requestPermissionsAsync();
            return newStatus === 'granted';
        } catch (error) {
            console.error('Error checking notification permission:', error);
            return false;
        }
    }

    async requestCameraPermission(): Promise<boolean> {
        const permission = Platform.OS === 'ios'
            ? PERMISSIONS.IOS.CAMERA
            : PERMISSIONS.ANDROID.CAMERA;

        return this.handlePermission(
            permission,
            i18n.t('permissions.camera.title'),
            i18n.t('permissions.camera.message')
        );
    }

    async requestMicrophonePermission(): Promise<boolean> {
        const permission = Platform.OS === 'ios'
            ? PERMISSIONS.IOS.MICROPHONE
            : PERMISSIONS.ANDROID.RECORD_AUDIO;

        return this.handlePermission(
            permission,
            i18n.t('permissions.microphone.title'),
            i18n.t('permissions.microphone.message')
        );
    }

    async requestPhotoLibraryPermission(): Promise<boolean> {
        let permission: Permission;

        if (Platform.OS === 'ios') {
            permission = PERMISSIONS.IOS.PHOTO_LIBRARY;
        } else {
            if (Platform.Version >= '33') {
                permission = PERMISSIONS.ANDROID.READ_MEDIA_IMAGES;
            } else {
                permission = PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;
            }
        }

        return this.handlePermission(
            permission,
            i18n.t('permissions.photo.title'),
            i18n.t('permissions.photo.message')
        );
    }

    async requestLocationPermission(): Promise<boolean> {
        const permission = Platform.OS === 'ios'
            ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
            : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;

        return this.handlePermission(
            permission,
            i18n.t('permissions.location.title'),
            i18n.t('permissions.location.message')
        );
    }

    async openOverlayPermissionSettings(): Promise<boolean> {
        if (Platform.OS !== 'android') {
            Alert.alert('Not supported', 'Overlay permission is only for Android.');
            return false;
        }
        try {
            const pkg = Application.applicationId;
            await IntentLauncher.startActivityAsync(
                'android.settings.action.MANAGE_OVERLAY_PERMISSION',
                { data: 'package:' + pkg }
            );
            return true;
        } catch (e) {
            Alert.alert(
                'Error',
                'Cannot open overlay settings. Please enable "Display over other apps" manually in Settings.'
            );
            return false;
        }
    }



    private async handlePermission(permission: Permission, title: string, message: string): Promise<boolean> {
        try {
            const result = await check(permission);

            switch (result) {
                case RESULTS.UNAVAILABLE:
                    Alert.alert(
                        i18n.t('common.error'),
                        i18n.t('permissions.unavailable')
                    );
                    return false;
                case RESULTS.DENIED:
                    const requestResult = await request(permission);
                    return requestResult === RESULTS.GRANTED;
                case RESULTS.LIMITED:
                    return true;
                case RESULTS.GRANTED:
                    return true;
                case RESULTS.BLOCKED:
                    Alert.alert(
                        i18n.t('permissions.blocked_title', { feature: title }),
                        message + ' ' + i18n.t('permissions.enable_in_settings'),
                        [
                            { text: i18n.t('common.cancel'), style: 'cancel' },
                            { text: i18n.t('common.open_settings'), onPress: () => openSettings() }
                        ]
                    );
                    return false;
            }
        } catch (error) {
            console.error(`Error requesting permission:`, error);
            return false;
        }
    }
}

export default new PermissionService();
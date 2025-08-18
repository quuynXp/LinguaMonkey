import Icon from 'react-native-vector-icons/MaterialIcons';
import { RootNavigationRef } from "../../utils/navigationRef";

import { StackNavigationProp } from '@react-navigation/stack';
import React, { useRef, useState } from 'react';
import {
    Alert,
    Animated,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
    Image,
    ActivityIndicator,
} from 'react-native';
import { create } from 'zustand';
import axiosInstance from '../../api/axiosInstance';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { uploadAvatarToTemp } from '../../services/cloudinary';
import { CommonActions } from '@react-navigation/native';


type RootStackParamList = {
    Auth: undefined;
    Main: undefined;
};
// Types
type ProfileStackParamList = {
    About: undefined;
    EditProfile: undefined;
    HelpSupport: undefined;
    LanguageManagement: undefined;
    LearningGoals: undefined;
    PrivacySettings: undefined;
};
type RootNav = StackNavigationProp<RootStackParamList>;

// Zustand store
interface ProfileState {
    notifications: boolean;
    soundEffects: boolean;
    darkMode: boolean;
    setNotifications: (value: boolean) => void;
    setSoundEffects: (value: boolean) => void;
    setDarkMode: (value: boolean) => void;
}

const handleLogout = () => {
    setTimeout(() => {
        if (RootNavigationRef.isReady()) {
            RootNavigationRef.reset({
                index: 0,
                routes: [{ name: "Auth" }],
            });
        }
    }, 100);
};

const useProfileStore = create<ProfileState>((set) => ({
    notifications: true,
    soundEffects: true,
    darkMode: false,
    setNotifications: (value) => set({ notifications: value }),
    setSoundEffects: (value) => set({ soundEffects: value }),
    setDarkMode: (value) => set({ darkMode: value }),
}));

// Logout
const logout = async (navigation: ProfileStackNav, t: any) => {
    try {
        const res = await axiosInstance.post('/auth/logout');
        if (res.status === 200) {
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        } else {
            Alert.alert(t('error'), res.data?.message || t('logoutFailed'));
        }
    } catch {
        Alert.alert(t('error'), t('logoutError'));
    }
};

const ProfileScreen = () => {
    const { t } = useTranslation();
    const { notifications, soundEffects, darkMode, setNotifications, setSoundEffects, setDarkMode } =
        useProfileStore();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;

    const queryClient = useQueryClient();




    // React Query load user profile
    const { data: userProfile, error, isLoading } = useQuery({
        queryKey: ['userProfile'],
        queryFn: async () => {
            const res = await axiosInstance.get('/user/profile');
            return res.data;
        },
    });

    // Mutation update avatar
    const saveAvatarMutation = useMutation({
        mutationFn: async ({ url, publicId }: { url: string; publicId: string }) => {
            return axiosInstance.put('/api/users/avatar', { url, publicId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['userProfile'] });
            Alert.alert(t('success'), t('avatarUpdated'));
        },
        onError: () => {
            Alert.alert(t('error'), t('avatarUpdateFailed'));
        },
    });

    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [tempPublicId, setTempPublicId] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    const pickImage = async () => {
        const res = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.9,
        });
        if (res.canceled || !res.assets?.length) return;
        const asset = res.assets[0];
        const file = {
            uri: asset.uri,
            name: asset.fileName ?? 'avatar.jpg',
            type: asset.mimeType ?? 'image/jpeg',
        };
        try {
            setUploading(true);
            const up = await uploadAvatarToTemp(file);
            setPreviewUrl(up.secureUrl);
            setTempPublicId(up.publicId);
        } catch (e: any) {
            Alert.alert(t('error'), e.message);
        } finally {
            setUploading(false);
        }
    };

    const commitAvatar = () => {
        if (!previewUrl || !tempPublicId) return;
        saveAvatarMutation.mutate({ url: previewUrl, publicId: tempPublicId });
    };

    React.useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]).start();
    }, []);

    if (isLoading) {
        return <ActivityIndicator style={{ flex: 1 }} />;
    }
    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{t('profileLoadFailed')}</Text>
            </View>
        );
    }

    const renderProfileHeader = () => (
        <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
                {previewUrl || userProfile?.avatarUrl ? (
                    <Image
                        source={{ uri: previewUrl ?? userProfile.avatarUrl }}
                        style={{ width: 80, height: 80, borderRadius: 40 }}
                    />
                ) : (
                    <View style={styles.avatar}>
                        <Icon name="person" size={40} color="#4F46E5" />
                    </View>
                )}
                <TouchableOpacity style={styles.editAvatarButton} onPress={pickImage}>
                    <Icon name="camera-alt" size={16} color="#FFFFFF" />
                </TouchableOpacity>
            </View>
            {previewUrl && (
                <TouchableOpacity onPress={commitAvatar} style={{ marginTop: 8 }}>
                    <Text style={{ color: '#4F46E5', fontWeight: '600' }}>{t('commitAvatar')}</Text>
                </TouchableOpacity>
            )}

            <Text style={styles.userName}>{userProfile?.name}</Text>
            <Text style={styles.userEmail}>{userProfile?.email}</Text>

            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{userProfile?.exp ?? 0}</Text>
                    <Text style={styles.statLabel}>{t('exp')}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{userProfile?.course ?? '-'}</Text>
                    <Text style={styles.statLabel}>{t('course')}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{userProfile?.streak ?? 0}</Text>
                    <Text style={styles.statLabel}>{t('streakDays')}</Text>
                </View>
            </View>
        </View>
    );

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                <View style={styles.header}>
                    <Text style={styles.title}>{t('profile')}</Text>
                    <TouchableOpacity style={styles.settingsButton}>
                        <Icon name="settings" size={24} color="#6B7280" />
                    </TouchableOpacity>
                </View>

                {renderProfileHeader()}

                <View style={styles.actionSection}>
                    <TouchableOpacity
                        style={styles.logoutButton}
                        onPress={handleLogout}
                    >
                        <Icon name="logout" size={20} color="#EF4444" />
                        <Text style={styles.logoutText}>{t("logout")}</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    content: { padding: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, marginBottom: 30 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#1F2937' },
    settingsButton: { padding: 8 },
    profileHeader: { backgroundColor: '#fff', padding: 24, borderRadius: 16, alignItems: 'center', marginBottom: 30 },
    avatarContainer: { position: 'relative', marginBottom: 16 },
    avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
    editAvatarButton: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
    userName: { fontSize: 20, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 },
    userEmail: { fontSize: 14, color: '#6B7280', marginBottom: 20 },
    statsRow: { flexDirection: 'row', alignItems: 'center' },
    statItem: { alignItems: 'center', paddingHorizontal: 20 },
    statValue: { fontSize: 18, fontWeight: 'bold', color: '#4F46E5' },
    statLabel: { fontSize: 12, color: '#6B7280', marginTop: 4 },
    statDivider: { width: 1, height: 30, backgroundColor: '#E5E7EB' },
    actionSection: { marginTop: 20, marginBottom: 30 },
    logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#FEE2E2' },
    logoutText: { fontSize: 16, fontWeight: '500', color: '#EF4444', marginLeft: 8 },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    errorText: { fontSize: 16, color: '#EF4444', textAlign: 'center' },
});

export default ProfileScreen;

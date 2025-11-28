import React, { useMemo, useEffect, useRef, useState } from 'react';
import { Text, View, Image, Animated, Easing } from 'react-native';
import ScreenLayout from '../../components/layout/ScreenLayout';
import { useTranslation } from 'react-i18next';
import { createScaledSheet } from '../../utils/scaledStyles';

const QUOTES_KEY = 'quotes';

interface SplashScreenProps {
    serverError?: string | null;
}

const SplashScreen = ({ serverError }: SplashScreenProps) => {
    const { t, i18n } = useTranslation(['translation', 'motivation']);
    const [loadingDots, setLoadingDots] = useState('');
    const progressAnim = useRef(new Animated.Value(0)).current;

    const randomQuote = useMemo(() => {
        const quotes = t(QUOTES_KEY, { ns: 'motivation', returnObjects: true }) as string[] | undefined;
        if (quotes && quotes.length > 0) {
            const randomIndex = Math.floor(Math.random() * quotes.length);
            return quotes[randomIndex];
        }
        return t('Loading...');
    }, [t, i18n.language]);

    useEffect(() => {
        const dotInterval = setInterval(() => {
            setLoadingDots(prev => prev.length >= 3 ? '' : prev + '.');
        }, 500);

        return () => clearInterval(dotInterval);
    }, []);

    const animateProgress = (isError: boolean) => {
        const baseDuration = 10000;
        const durationMultiplier = isError ? 2 : 1;
        const totalDuration = baseDuration * durationMultiplier;

        progressAnim.setValue(0);

        Animated.sequence([
            Animated.timing(progressAnim, {
                toValue: 0.6,
                duration: totalDuration * 0.5,
                easing: Easing.linear,
                useNativeDriver: false,
            }),
            Animated.timing(progressAnim, {
                toValue: 0.9,
                duration: totalDuration * 0.2,
                easing: Easing.out(Easing.quad),
                useNativeDriver: false,
            }),
            Animated.timing(progressAnim, {
                toValue: 1,
                duration: totalDuration * 0.3,
                easing: Easing.linear,
                useNativeDriver: false,
            }),
        ]).start();
    }

    useEffect(() => {
        animateProgress(!!serverError);
    }, [progressAnim, serverError]);

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    return (
        <ScreenLayout
            style={styles.container}
        >
            <View style={styles.logoContainer}>
                <Image
                    source={require('../../assets/images/icon.png')}
                    style={styles.logoImage}
                />
            </View>

            <View style={styles.bottomContainer}>
                {/* 🚨 SỬA LỖI JITTER: Tách Loading và ... và bao bọc trong View */}
                <View style={styles.loadingWrapper}>
                    <Text style={styles.loadingText}>
                        {serverError ? t('common.reconnecting', { defaultValue: 'Reconnecting' }) : 'Loading'}
                    </Text>
                    <Text style={[styles.loadingText, styles.dotsPlaceholder]}>
                        {loadingDots}
                    </Text>
                </View>

                <View style={styles.progressBarContainer}>
                    <Animated.View
                        style={[
                            styles.progressBarFill,
                            {
                                width: progressWidth,
                                backgroundColor: serverError ? '#F59E0B' : '#000000'
                            }
                        ]}
                    />
                </View>

                {serverError ? (
                    <Text style={styles.errorText}>
                        {serverError}
                    </Text>
                ) : (
                    <Text style={styles.quoteText}>{randomQuote}</Text>
                )}
            </View>
        </ScreenLayout>
    );
};

const styles = createScaledSheet({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    logoContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoImage: {
        width: 300,
        height: 300,
        resizeMode: 'contain',
    },
    bottomContainer: {
        width: '100%',
        paddingHorizontal: 40,
        paddingBottom: 60,
        alignItems: 'center',
    },
    // Style mới để bao bọc Loading và ...
    loadingWrapper: {
        flexDirection: 'row',
        marginBottom: 8, // Di chuyển marginBottom từ loadingText lên đây
    },
    loadingText: {
        fontSize: 14,
        color: '#666666',
        fontWeight: '500',
        // Đã loại bỏ marginBottom vì nó đã được chuyển lên loadingWrapper
    },
    // Style mới để cố định chiều rộng của dấu chấm
    dotsPlaceholder: {
        width: 16, // Chiều rộng cố định, đảm bảo chứa 3 dấu chấm
    },
    progressBarContainer: {
        width: '100%',
        height: 6,
        backgroundColor: '#F0F0F0',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#000000',
        borderRadius: 3,
    },
    quoteText: {
        fontSize: 14,
        color: '#333333',
        textAlign: 'center',
        lineHeight: 20,
        fontStyle: 'italic',
        opacity: 0.8,
    },
    errorText: {
        fontSize: 14,
        color: '#EF4444',
        textAlign: 'center',
        lineHeight: 22,
        fontWeight: '500',
    }
});

export default SplashScreen;
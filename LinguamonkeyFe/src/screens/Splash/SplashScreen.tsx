import React, { useMemo, useEffect, useRef, useState } from 'react';
import { Text, View, Image, Animated } from 'react-native';
import ScreenLayout from '../../components/layout/ScreenLayout';
import { useTranslation } from 'react-i18next';
import { createScaledSheet } from '../../utils/scaledStyles';

const QUOTES_KEY = 'quotes';

const SplashScreen = () => {
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

    useEffect(() => {
        Animated.timing(progressAnim, {
            toValue: 1,
            duration: 3500,
            useNativeDriver: false,
        }).start();
    }, [progressAnim]);

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    return (
        <ScreenLayout style={styles.container}>
            <View style={styles.logoContainer}>
                <Image
                    source={require('../../assets/images/icon.png')}
                    style={styles.logoImage}
                />
            </View>

            <View style={styles.bottomContainer}>
                <Text style={styles.loadingText}>
                    Loading{loadingDots}
                </Text>

                <View style={styles.progressBarContainer}>
                    <Animated.View
                        style={[
                            styles.progressBarFill,
                            { width: progressWidth }
                        ]}
                    />
                </View>

                <Text style={styles.quoteText}>{randomQuote}</Text>
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
        width: 150,
        height: 150,
        resizeMode: 'contain',
    },
    logoText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#000000',
        letterSpacing: 2,
    },
    bottomContainer: {
        width: '100%',
        paddingHorizontal: 40,
        paddingBottom: 60,
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 14,
        color: '#666666',
        marginBottom: 8,
        fontWeight: '500',
        alignSelf: 'flex-start',
        marginLeft: 2,
    },
    progressBarContainer: {
        width: '100%',
        height: 6,
        backgroundColor: '#F0F0F0',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 24,
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
});

export default SplashScreen;
import React, { useMemo } from 'react';
import { Text, ActivityIndicator, StyleSheet, ImageBackground } from 'react-native';
import ScreenLayout from '../../components/layout/ScreenLayout';
import { useTranslation } from 'react-i18next';

const QUOTES_KEY = 'quotes';

const SplashScreen = () => {
    const { t, i18n } = useTranslation(['translation', 'motivation']);

    const randomQuote = useMemo(() => {
        const currentLanguage = i18n.language;
        // Sử dụng t() với namespace 'motivation' và key 'quotes' để lấy mảng quotes
        const quotes = t(QUOTES_KEY, { ns: 'motivation', returnObjects: true }) as string[] | undefined;

        if (quotes && quotes.length > 0) {
            const randomIndex = Math.floor(Math.random() * quotes.length);
            return quotes[randomIndex];
        }

        // Fallback an toàn nếu không tìm thấy quote
        return t('Loading...');
    }, [t, i18n.language]);

    // const backgroundImage = require('../../assets/images/result_course_background.png');

    return (
        <ScreenLayout
            style={styles.container}
        >
            <ActivityIndicator size="small" color="#000000" />
            <Text style={styles.text}>{randomQuote}</Text>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        marginTop: 10,
        fontSize: 14,
        color: '#000000',
        textAlign: 'center',
        paddingHorizontal: 20,
    },
});

export default SplashScreen;
import React, { useState, useRef, useLayoutEffect } from 'react';
import { View, TouchableOpacity, Text, ActivityIndicator, BackHandler } from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { createScaledSheet } from '../../utils/scaledStyles';
import ScreenLayout from '../../components/layout/ScreenLayout';
import { useTranslation } from 'react-i18next';

interface WebViewScreenProps {
    navigation: any;
    route: {
        params: {
            url: string;
            title?: string;
            hideHeader?: boolean;
        };
    };
}

const WebViewScreen = ({ navigation, route }: WebViewScreenProps) => {
    const { url, title, hideHeader = false } = route.params;
    const webviewRef = useRef<WebView | null>(null);
    const { t } = useTranslation();

    const [isLoading, setIsLoading] = useState(true);
    const [canGoBack, setCanGoBack] = useState(false);
    const [currentUrl, setCurrentUrl] = useState(url);
    const [hasError, setHasError] = useState(false);

    const handleNavigationStateChange = (navState: WebViewNavigation) => {
        setCanGoBack(navState.canGoBack);
        setCurrentUrl(navState.url);
    };

    const handleGoBack = () => {
        if (canGoBack && webviewRef.current) {
            webviewRef.current.goBack();
            return true;
        }
        navigation.goBack();
        return true;
    };

    useLayoutEffect(() => {
        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            handleGoBack,
        );
        return () => backHandler.remove();
    }, [canGoBack]);

    const handleRefresh = () => {
        if (webviewRef.current) {
            setHasError(false);
            webviewRef.current.reload();
        }
    };

    const handleError = () => {
        setIsLoading(false);
        setHasError(true);
    };

    const renderError = () => (
        <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
                {t('errors.webview_load_failed')}
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
                <Text style={styles.retryButtonText}>{t('action.reload')}</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <ScreenLayout>
            <View style={styles.container}>
                {!hideHeader && (
                    <View style={styles.header}>
                        <TouchableOpacity onPress={handleGoBack} style={styles.headerBackButton}>
                            <Icon name="arrow-back" size={24} color="#374151" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle} numberOfLines={1}>
                            {title || t('common.webViewTitle')}
                        </Text>
                        <View style={styles.headerBackButton} />
                    </View>
                )}

                <View style={styles.content}>
                    {hasError ? (
                        renderError()
                    ) : (
                        <WebView
                            ref={webviewRef}
                            source={{ uri: url || 'about:blank' }}
                            onLoadStart={() => { setIsLoading(true); setHasError(false); }}
                            onLoadEnd={() => setIsLoading(false)}
                            onNavigationStateChange={handleNavigationStateChange}
                            onError={handleError}
                            onHttpError={handleError}
                            startInLoadingState={true}
                            renderLoading={() => (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="large" color="#4F46E5" />
                                </View>
                            )}
                            style={styles.webview}
                            allowsInlineMediaPlayback={true}
                            mediaPlaybackRequiresUserAction={false}
                        />
                    )}
                </View>
            </View>
        </ScreenLayout>
    );
};

const styles = createScaledSheet({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 10,
        paddingHorizontal: 20,
        paddingBottom: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerBackButton: {
        width: 24,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 16,
    },
    content: {
        flex: 1,
        position: 'relative',
    },
    webview: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    loadingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(248, 250, 252, 0.8)',
        zIndex: 10,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
        backgroundColor: '#FFFFFF',
    },
    errorText: {
        fontSize: 16,
        color: '#EF4444',
        textAlign: 'center',
        marginBottom: 20,
    },
    retryButton: {
        backgroundColor: '#4F46E5',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 16,
    },
});

export default WebViewScreen;
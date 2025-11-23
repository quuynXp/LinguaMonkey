import React, { useState } from 'react';
import { View, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { createScaledSheet } from '../../utils/scaledStyles';
import ScreenLayout from '../../components/layout/ScreenLayout';

interface WebViewScreenProps {
    navigation: any;
    route: {
        params: {
            url: string;
            title?: string;
        };
    };
}

const WebViewScreen = ({ navigation, route }: WebViewScreenProps) => {
    const { url, title } = route.params;
    const [isLoading, setIsLoading] = useState(true);

    return (
        <ScreenLayout>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Icon name="arrow-back" size={24} color="#374151" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        {title || 'MonkeyLingua'}
                    </Text>
                    <View style={styles.placeholder} />
                </View>

                <View style={styles.content}>
                    <WebView
                        source={{ uri: url || 'https://monkeyLingua.vercel.app' }}
                        onLoadStart={() => setIsLoading(true)}
                        onLoadEnd={() => setIsLoading(false)}
                        startInLoadingState={true}
                        renderLoading={() => (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#4F46E5" />
                            </View>
                        )}
                        style={styles.webview}
                    />
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
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 16,
    },
    placeholder: {
        width: 24,
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
        backgroundColor: '#F8FAFC',
        zIndex: 10,
    },
});

export default WebViewScreen;
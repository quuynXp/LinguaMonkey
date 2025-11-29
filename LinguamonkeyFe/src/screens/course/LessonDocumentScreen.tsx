import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ScreenLayout from '../../components/layout/ScreenLayout';
import { createScaledSheet } from '../../utils/scaledStyles';
import { useTranslation } from 'react-i18next';

const LessonDocumentScreen = ({ route, navigation }: any) => {
    const { url, title } = route.params;
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(true);

    const handleDownload = () => {
        // Documents in Google Viewer or direct links can be "downloaded" by opening in system browser
        if (url) {
            Linking.openURL(url);
        }
    };

    return (
        <ScreenLayout>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Icon name="close" size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
                    <TouchableOpacity onPress={handleDownload} style={styles.actionButton}>
                        <Icon name="file-download" size={24} color="#4F46E5" />
                    </TouchableOpacity>
                </View>

                <WebView
                    source={{ uri: url }}
                    style={styles.webview}
                    onLoadStart={() => setIsLoading(true)}
                    onLoadEnd={() => setIsLoading(false)}
                    scalesPageToFit
                />

                {isLoading && (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color="#4F46E5" />
                    </View>
                )}
            </View>
        </ScreenLayout>
    );
};

const styles = createScaledSheet({
    container: { flex: 1, backgroundColor: "#F9FAFB" },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 50,
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: "#FFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB"
    },
    backButton: { padding: 8 },
    headerTitle: { fontSize: 18, fontWeight: "bold", color: "#1F2937", flex: 1, textAlign: 'center' },
    actionButton: { padding: 8 },
    webview: { flex: 1 },
    loaderContainer: {
        position: 'absolute',
        top: 100,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center'
    }
});

export default LessonDocumentScreen;
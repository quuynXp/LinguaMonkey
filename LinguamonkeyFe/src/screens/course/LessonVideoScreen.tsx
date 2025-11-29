import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ScreenLayout from '../../components/layout/ScreenLayout';
import { createScaledSheet } from '../../utils/scaledStyles';
import { useTranslation } from 'react-i18next';

const LessonVideoScreen = ({ route, navigation }: any) => {
    const { url, title, lessonId } = route.params;
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(true);

    const handleDownload = () => {
        // Since we are in a WebView/Stream context, "Download" often means opening the source 
        // in an external browser or triggering a specific download intent.
        if (url) {
            Linking.openURL(url).catch(() =>
                Alert.alert(t("error"), t("course.cannotOpenUrl"))
            );
        }
    };

    return (
        <ScreenLayout>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Icon name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
                    <TouchableOpacity onPress={handleDownload} style={styles.downloadButton}>
                        <Icon name="file-download" size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>

                <View style={styles.videoContainer}>
                    <WebView
                        source={{ uri: url }}
                        style={styles.webview}
                        onLoadStart={() => setIsLoading(true)}
                        onLoadEnd={() => setIsLoading(false)}
                        allowsFullscreenVideo
                        javaScriptEnabled
                        domStorageEnabled
                    />
                    {isLoading && (
                        <View>
                            <ActivityIndicator size="large" color="#4F46E5" />
                        </View>
                    )}
                </View>

                <View style={styles.infoContainer}>
                    <Text style={styles.infoTitle}>{t("course.lessonInfo")}</Text>
                    <Text style={styles.infoText}>{t("course.lessonVideoDescription")}</Text>
                </View>
            </View>
        </ScreenLayout>
    );
};

const styles = createScaledSheet({
    container: { flex: 1, backgroundColor: "#000" },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 50,
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: "rgba(0,0,0,0.8)"
    },
    backButton: { padding: 8 },
    headerTitle: { color: "#FFF", fontSize: 16, fontWeight: "bold", flex: 1, marginHorizontal: 16 },
    downloadButton: { padding: 8 },

    videoContainer: { flex: 1, position: 'relative' },
    webview: { flex: 1, backgroundColor: "#000" },
    // loaderContainer: { ...createScaledSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: "#000" },

    infoContainer: { padding: 16, backgroundColor: "#1F2937" },
    infoTitle: { color: "#FFF", fontSize: 16, fontWeight: "bold", marginBottom: 8 },
    infoText: { color: "#9CA3AF", fontSize: 14 }
});

export default LessonVideoScreen;
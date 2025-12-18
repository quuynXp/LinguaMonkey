import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    TouchableOpacity,
    Image,
    Dimensions,
    Platform,
    ActivityIndicator,
    StyleSheet
} from 'react-native';
import Video from 'react-native-video';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getDirectMediaUrl, getDriveThumbnailUrl } from '../../utils/mediaUtils';

const { width, height } = Dimensions.get('window');

interface MediaViewerModalProps {
    visible: boolean;
    url: string | null;
    type: 'IMAGE' | 'VIDEO' | null;
    onClose: () => void;
}

const MediaViewerModal: React.FC<MediaViewerModalProps> = ({ visible, url, type, onClose }) => {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (visible) setIsLoading(true);
    }, [url, visible]);

    if (!url) return null;

    const finalUrl = getDirectMediaUrl(url, type);
    const posterUrl = type === 'VIDEO' ? (getDriveThumbnailUrl(url) || undefined) : undefined;

    return (
        <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
            <View style={styles.container}>
                <SafeAreaView style={styles.closeBtnArea}>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Icon name="close" size={30} color="#FFF" />
                    </TouchableOpacity>
                </SafeAreaView>

                {isLoading && (
                    <View style={styles.loader}>
                        <ActivityIndicator size="large" color="#FFF" />
                    </View>
                )}

                {type === 'VIDEO' ? (
                    <Video
                        source={{
                            uri: finalUrl,
                            bufferConfig: {
                                minBufferMs: 5000,
                                maxBufferMs: 30000,
                                bufferForPlaybackMs: 1000,
                                bufferForPlaybackAfterRebufferMs: 2000
                            }
                        }}
                        poster={posterUrl}
                        style={styles.media}
                        controls={true}
                        resizeMode="contain"
                        paused={false}
                        onLoadStart={() => setIsLoading(true)}
                        onLoad={() => setIsLoading(false)}
                        onError={(e) => {
                            console.log("[MediaViewer] Video Error:", e);
                            setIsLoading(false);
                        }}
                    />
                ) : (
                    <Image
                        source={{ uri: finalUrl }}
                        style={styles.media}
                        resizeMode="contain"
                        onLoadStart={() => setIsLoading(true)}
                        onLoadEnd={() => setIsLoading(false)}
                    />
                )}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeBtnArea: {
        position: 'absolute',
        top: Platform.OS === 'android' ? 10 : 0,
        right: 20,
        zIndex: 999,
    },
    closeBtn: {
        padding: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
    },
    loader: {
        position: 'absolute',
        zIndex: 10,
    },
    media: {
        width: width,
        height: height * 0.9,
    }
});

export default MediaViewerModal;
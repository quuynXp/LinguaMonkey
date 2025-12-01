import { Asset } from 'expo-asset';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';

const audioPlayer = AudioRecorderPlayer;

export const playInAppSound = async () => {
    try {
        const asset = Asset.fromModule(require('../assets/sounds/notification.mp3'));
        await asset.downloadAsync();

        const uri = asset.localUri ?? asset.uri;
        if (!uri) throw new Error('Asset URI not available');

        try { await audioPlayer.stopPlayer(); } catch (e) { }

        await audioPlayer.startPlayer(uri);

        audioPlayer.addPlayBackListener((e) => {
            if (e.currentPosition >= e.duration) {
                audioPlayer.stopPlayer().catch(() => { });
                audioPlayer.removePlayBackListener();
            }
        });
    } catch (error) {
        console.warn('Failed to play sound', error);
    }
};

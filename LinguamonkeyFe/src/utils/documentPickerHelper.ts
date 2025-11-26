import * as ExpoDocumentPicker from 'expo-document-picker';
import { Alert, StyleSheet } from 'react-native';

export interface PickedDocument {
  uri: string;
  name: string;
  mimeType?: string;
  size?: number;
}

export const pickSingleDocument = async (
  allowedTypes: string[] = ['*/*']
): Promise<PickedDocument | null> => {
  try {
    const result = await ExpoDocumentPicker.getDocumentAsync({
      type: allowedTypes,
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled) {
      return null;
    }

    const asset = result.assets[0];

    // Validation size (Example: Limit to 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (asset.size && asset.size > MAX_SIZE) {
      Alert.alert('File too large', 'Please select a file smaller than 10MB.');
      return null;
    }

    return {
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType,
      size: asset.size,
    };

  } catch (error) {
    console.error('DocumentPicker Error:', error);
    Alert.alert('Error', 'Failed to pick document');
    return null;
  }
};
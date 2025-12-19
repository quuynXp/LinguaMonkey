import React, { useMemo } from 'react';
import { Image, View, Text } from 'react-native';
import { createScaledSheet } from '../../utils/scaledStyles';
import { getAvatarSource } from '../../utils/avatarUtils';

export interface RoomAvatarMember {
    userId: string;
    avatarUrl?: string | null;
}

interface RoomAvatarProps {
    avatarUrl?: string | null;
    members?: RoomAvatarMember[] | null;
    size?: number;
    isGroup?: boolean;
}

const RoomAvatar: React.FC<RoomAvatarProps> = ({ avatarUrl, members, size = 50, isGroup = false }) => {
    const source = useMemo(() => {
        if (avatarUrl) return { uri: avatarUrl };
        if (members && members.length > 0) {
            return getAvatarSource(members[0].avatarUrl, null);
        }
        return require('../../assets/images/ImagePlacehoderCourse.png');
    }, [avatarUrl, members]);

    return (
        <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}>
            <Image
                source={source}
                style={{ width: size, height: size, borderRadius: size / 2, resizeMode: 'cover' }}
            />
        </View>
    );
};

const styles = createScaledSheet({
    container: {
        overflow: 'hidden',
        backgroundColor: '#E5E7EB',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F3F4F6'
    }
});

export default React.memo(RoomAvatar);
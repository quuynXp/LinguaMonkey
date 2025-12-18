import React from 'react';
import { View, Image, Text } from 'react-native';
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

    const safeMembers = members || [];

    if (avatarUrl) {
        return <Image source={{ uri: avatarUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
    }

    if (!isGroup || safeMembers.length <= 1) {
        const singleSource = safeMembers.length > 0 ? getAvatarSource(safeMembers[0].avatarUrl, null) : require('../../assets/images/ImagePlacehoderCourse.png');
        return <Image source={singleSource} style={{ width: size, height: size, borderRadius: size / 2 }} />;
    }

    const displayMembers = safeMembers.slice(0, 4);
    const count = safeMembers.length;
    const remaining = count > 4 ? count - 3 : 0;

    const renderGrid = () => {
        if (count === 2) {
            return (
                <View style={styles.gridContainer}>
                    {displayMembers.map((m, i) => (
                        <Image key={m.userId || i} source={getAvatarSource(m.avatarUrl, null)} style={styles.avatarHalf} />
                    ))}
                </View>
            );
        }

        if (count === 3) {
            return (
                <View style={styles.gridContainer}>
                    <Image source={getAvatarSource(displayMembers[0].avatarUrl, null)} style={styles.avatarHalf} />
                    <View style={styles.avatarHalfCol}>
                        <Image source={getAvatarSource(displayMembers[1].avatarUrl, null)} style={styles.avatarQuarter} />
                        <Image source={getAvatarSource(displayMembers[2].avatarUrl, null)} style={styles.avatarQuarter} />
                    </View>
                </View>
            );
        }

        return (
            <View style={styles.gridWrapContainer}>
                {displayMembers.map((m, i) => {
                    if (i === 3 && remaining > 0) {
                        return (
                            <View key="more" style={[styles.avatarQuarterGrid, styles.moreOverlay]}>
                                <Text style={[styles.moreText, { fontSize: size * 0.25 }]}>+{remaining}</Text>
                            </View>
                        );
                    }
                    return (
                        <Image key={m.userId || i} source={getAvatarSource(m.avatarUrl, null)} style={styles.avatarQuarterGrid} />
                    );
                })}
            </View>
        );
    };

    return (
        <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: '#E0E7FF' }}>
            {renderGrid()}
        </View>
    );
};

const styles = createScaledSheet({
    gridContainer: { flexDirection: 'row', width: '100%', height: '100%' },
    gridWrapContainer: { flexDirection: 'row', flexWrap: 'wrap', width: '100%', height: '100%' },
    avatarHalf: { width: '50%', height: '100%', resizeMode: 'cover' },
    avatarHalfCol: { width: '50%', height: '100%', flexDirection: 'column' },
    avatarQuarter: { width: '100%', height: '50%', resizeMode: 'cover' },
    avatarQuarterGrid: { width: '50%', height: '50%', resizeMode: 'cover' },
    moreOverlay: { backgroundColor: 'rgba(0,0,0,0.5)', position: 'absolute', bottom: 0, right: 0, justifyContent: 'center', alignItems: 'center' },
    moreText: { color: '#FFF', fontWeight: 'bold' }
});

export default RoomAvatar;
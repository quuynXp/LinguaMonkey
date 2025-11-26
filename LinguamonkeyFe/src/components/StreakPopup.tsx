import React from 'react';
import { View, Text, Modal, StyleSheet } from 'react-native';
import { createScaledSheet } from '../utils/scaledStyles';

export const showStreakPopup = (newStreak: string, message: string) => {
    console.log(`[STREAK POPUP]: Streak increased to ${newStreak}. Message: ${message}`);
};

const StreakPopup = ({ isVisible, streakValue, message, onClose }) => {
    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={isVisible}
            onRequestClose={onClose}
        >
            <View style={styles.centeredView}>
                <View style={styles.modalView}>
                    <Text style={styles.title}>🔥 STREAK: {streakValue} DAYS! 🔥</Text>
                    <Text style={styles.message}>{message}</Text>
                    <Text style={styles.subtext}>Goal 15 mins Achieved!</Text>
                </View>
            </View>
        </Modal>
    );
};

const styles = createScaledSheet({
    centeredView: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalView: { margin: 20, backgroundColor: 'white', borderRadius: 20, padding: 35, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#FF7043', marginBottom: 10 },
    message: { fontSize: 16, textAlign: 'center' },
    subtext: { fontSize: 12, marginTop: 10, color: '#888' },
});

// export default StreakPopup;
// export the control functions (like showStreakPopup) needed globally
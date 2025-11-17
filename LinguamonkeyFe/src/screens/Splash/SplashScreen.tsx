import React from 'react';
import { Text, ActivityIndicator, StyleSheet, ImageBackground } from 'react-native';

const SplashScreen = () => {
    const backgroundImage = require('../../assets/images/result_course_background.png');

    return (
        <ImageBackground
            source={backgroundImage}
            resizeMode="cover"
            style={styles.container}
        >
            <ActivityIndicator size="small" color="#000000" />
            <Text style={styles.text}>Loading...</Text>
        </ImageBackground>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        marginTop: 10,
        fontSize: 14,
        color: '#000000',
    },
});

export default SplashScreen;
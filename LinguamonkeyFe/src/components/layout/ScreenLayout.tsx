import React from 'react';
import { View, StyleSheet, StatusBar, ViewStyle, StatusBarStyle, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScreenLayoutProps {
    children: React.ReactNode;
    style?: ViewStyle;
    backgroundColor?: string;
    statusBarStyle?: StatusBarStyle;
    statusBarColor?: string;
    unsafe?: boolean;
    headerComponent?: React.ReactNode;
    bottomComponent?: React.ReactNode;
}

const ScreenLayout: React.FC<ScreenLayoutProps> = ({
    children,
    style,
    backgroundColor = '#F8FAFC',
    statusBarStyle = 'dark-content',
    statusBarColor = 'transparent',
    unsafe = false,
    headerComponent,
    bottomComponent,
}) => {
    const insets = useSafeAreaInsets();

    if (unsafe) {
        return (
            <View style={[styles.container, { backgroundColor }, style]}>
                <StatusBar
                    barStyle={statusBarStyle}
                    backgroundColor={statusBarColor}
                    translucent={Platform.OS === 'android'}
                />
                {children}
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor }]}>
            <StatusBar
                barStyle={statusBarStyle}
                backgroundColor={statusBarColor}
                translucent={Platform.OS === 'android'}
            />
            <View style={{ height: insets.top, backgroundColor: statusBarColor }} />

            {headerComponent && <View style={styles.header}>{headerComponent}</View>}

            <View style={[styles.content, style]}>
                {children}
            </View>

            {bottomComponent}
            <View style={{ height: insets.bottom, backgroundColor }} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
    },
    header: {
        zIndex: 10,
    },
});

export default ScreenLayout;
import React from 'react';
import { View, StatusBar, ViewStyle, StatusBarStyle, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets, EdgeInsets } from 'react-native-safe-area-context';
import { createScaledSheet } from '../../utils/scaledStyles';

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

    const getSafeInsets = (currentInsets: EdgeInsets): EdgeInsets => {
        if (unsafe) {
            return { top: 0, bottom: 0, left: 0, right: 0 };
        }
        return currentInsets;
    };

    const safeInsets = getSafeInsets(insets);

    return (
        <View style={[styles.container, { backgroundColor }]}>
            <StatusBar
                barStyle={statusBarStyle}
                backgroundColor={Platform.OS === 'android' ? statusBarColor : 'transparent'}
                translucent={true}
            />

            {/* Header: Chỉ áp dụng padding an toàn nếu có headerComponent */}
            {headerComponent ? (
                <View
                    style={[
                        styles.headerWrapper,
                        { paddingTop: safeInsets.top, backgroundColor: statusBarColor }
                    ]}
                >
                    {headerComponent}
                </View>
            ) : (
                /* Nếu không có headerComponent, thêm View để tạo khoảng cách an toàn cho StatusBar */
                <View style={{ height: safeInsets.top, backgroundColor: statusBarColor }} />
            )}

            {/* Nội dung chính: Đảm bảo flex: 1 để chiếm hết không gian còn lại */}
            <View style={[styles.content, style]}>
                {children}
            </View>

            {/* Footer: Chỉ áp dụng padding an toàn nếu có bottomComponent */}
            {bottomComponent ? (
                <View
                    style={[
                        styles.bottomWrapper,
                        { paddingBottom: safeInsets.bottom, backgroundColor: backgroundColor }
                    ]}
                >
                    {bottomComponent}
                </View>
            ) : (
                /* Nếu không có bottomComponent, thêm View để tạo khoảng cách an toàn cho vùng dưới */
                <View style={{ height: safeInsets.bottom, backgroundColor: backgroundColor }} />
            )}
        </View>
    );
};

const styles = createScaledSheet({
    container: {
        flex: 1,
        overflow: 'hidden',
    },
    content: {
        flex: 1,
        width: '100%',
        overflow: 'hidden',
    },
    headerWrapper: {
        zIndex: 10,
        width: '100%',
    },
    bottomWrapper: {
        zIndex: 10,
        width: '100%',
    }
});

export default ScreenLayout;
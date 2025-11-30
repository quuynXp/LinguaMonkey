import React from 'react';
import { View, StatusBar, ViewStyle, StatusBarStyle, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createScaledSheet } from '../../utils/scaledStyles';
import { GestureDetector, Gesture, Directions } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { goBack, gotoTab } from '../../utils/navigationRef';

interface ScreenLayoutProps {
    children: React.ReactNode;
    style?: ViewStyle;
    backgroundColor?: string;
    statusBarStyle?: StatusBarStyle;
    statusBarColor?: string;
    unsafe?: boolean;
    headerComponent?: React.ReactNode;
    bottomComponent?: React.ReactNode;
    swipeToTab?: string;
    enableSwipeBack?: boolean;
}

const SWIPE_AREA_WIDTH = 50;

const ScreenLayout: React.FC<ScreenLayoutProps> = ({
    children,
    style,
    backgroundColor = '#F8FAFC',
    statusBarStyle = 'dark-content',
    statusBarColor = 'transparent',
    unsafe = true,
    headerComponent,
    bottomComponent,
    swipeToTab,
    enableSwipeBack = true,
}) => {
    const insets = useSafeAreaInsets();

    // Logic vùng an toàn cho nội dung chính
    const safeInsets = unsafe
        ? { top: 0, bottom: 0, left: 0, right: 0 }
        : insets;

    const headerPaddingTop = headerComponent && !unsafe ? safeInsets.top : 0;
    // Cập nhật logic: Nếu có bottomComponent HOẶC cần spacer VÀ không phải unsafe,
    // thì sử dụng insets.bottom thực tế để đệm
    const bottomPaddingBottom = bottomComponent && !unsafe ? insets.bottom : 0;
    const headerSpacerHeight = !headerComponent && !unsafe ? safeInsets.top : 0;
    const bottomSpacerHeight = !bottomComponent && !unsafe ? insets.bottom : 0; // Sử dụng insets.bottom

    const handleNavigateTab = () => {
        if (swipeToTab) {
            gotoTab(swipeToTab);
        }
    };

    const handleGoBack = () => {
        if (enableSwipeBack) {
            goBack();
        }
    };

    const swipeLeftGesture = Gesture.Fling()
        .direction(Directions.LEFT)
        .onEnd(() => {
            if (swipeToTab) {
                runOnJS(handleNavigateTab)();
            }
        });

    const swipeRightGesture = Gesture.Fling()
        .direction(Directions.RIGHT)
        .onEnd(() => {
            if (enableSwipeBack) {
                runOnJS(handleGoBack)();
            }
        });

    return (
        <View style={[styles.container, { backgroundColor }]}>
            <StatusBar
                barStyle={statusBarStyle}
                backgroundColor={Platform.OS === 'android' ? statusBarColor : 'transparent'}
                translucent={true}
            />

            {headerComponent ? (
                <View
                    style={[
                        styles.headerWrapper,
                        { paddingTop: headerPaddingTop, backgroundColor: statusBarColor }
                    ]}
                >
                    {headerComponent}
                </View>
            ) : (
                <View style={{ height: headerSpacerHeight, backgroundColor: statusBarColor }} />
            )}

            <View style={[styles.contentWrapper, style]}>

                {enableSwipeBack && (
                    <GestureDetector gesture={swipeRightGesture}>
                        <View style={[styles.gestureAreaLeft, { left: 0 }]} />
                    </GestureDetector>
                )}

                <View style={styles.content}>
                    {children}
                </View>

                {swipeToTab && (
                    <GestureDetector gesture={swipeLeftGesture}>
                        <View style={[styles.gestureAreaRight, { right: 0 }]} />
                    </GestureDetector>
                )}
            </View>

            {bottomComponent ? (
                <View
                    style={[
                        styles.bottomWrapper,
                        { paddingBottom: bottomPaddingBottom, backgroundColor: backgroundColor } // Dùng bottomPaddingBottom đã được tính toán
                    ]}
                >
                    {bottomComponent}
                </View>
            ) : (
                <View style={{ height: bottomSpacerHeight, backgroundColor: backgroundColor }} /> // Dùng bottomSpacerHeight đã được tính toán
            )}
        </View>
    );
};

const styles = createScaledSheet({
    container: {
        flex: 1,
        overflow: 'hidden',
    },
    contentWrapper: {
        flex: 1,
        position: 'relative',
        width: '100%',
    },
    content: {
        flex: 1,
        width: '100%',
        zIndex: 1,
    },
    headerWrapper: {
        zIndex: 10,
        width: '100%',
    },
    bottomWrapper: {
        zIndex: 10,
        width: '100%',
    },
    gestureAreaLeft: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: SWIPE_AREA_WIDTH,
        zIndex: 5,
    },
    gestureAreaRight: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: SWIPE_AREA_WIDTH,
        zIndex: 5,
    }
});

export default ScreenLayout;
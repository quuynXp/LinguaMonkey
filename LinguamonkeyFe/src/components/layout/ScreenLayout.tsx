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
    /** Tên Tab muốn điều hướng tới khi vuốt sang trái (Right-to-Left swipe) */
    swipeToTab?: string;
    /** Cho phép vuốt sang phải để Go Back. Mặc định: true */
    enableSwipeBack?: boolean;
}

const SWIPE_AREA_WIDTH = 40;
// Loại bỏ MIN_SWIPE_DISTANCE vì không dùng được trong FlingGesture
// const MIN_SWIPE_DISTANCE = 5; 

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

    const safeInsets = unsafe
        ? { top: 0, bottom: 0, left: 0, right: 0 }
        : insets;

    const headerPaddingTop = headerComponent && !unsafe ? safeInsets.top : 0;
    const bottomPaddingBottom = bottomComponent && !unsafe ? safeInsets.bottom : 0;
    const headerSpacerHeight = !headerComponent && !unsafe ? safeInsets.top : 0;
    const bottomSpacerHeight = !bottomComponent && !unsafe ? safeInsets.bottom : 0;

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

    // 1. Cử chỉ vuốt sang Trái (Cho vùng mép phải)
    const swipeLeftGesture = Gesture.Fling()
        .direction(Directions.LEFT)
        // Loại bỏ .minDistance() để sửa lỗi
        .onEnd(() => {
            if (swipeToTab) {
                runOnJS(handleNavigateTab)();
            }
        });

    // 2. Cử chỉ vuốt sang Phải (Cho vùng mép trái)
    const swipeRightGesture = Gesture.Fling()
        .direction(Directions.RIGHT)
        // Loại bỏ .minDistance() để sửa lỗi
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

            {/* Header: Giữ nguyên */}
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

            {/* Nội dung chính: Đặt nội dung và các vùng gesture sát hai bên */}
            <View style={[styles.contentWrapper, style]}>

                {/* 1. Vùng Vuốt Phải (Go Back) */}
                {enableSwipeBack && (
                    <GestureDetector gesture={swipeRightGesture}>
                        {/* Area cho phép vuốt phải (Go Back) */}
                        <View style={[styles.gestureAreaLeft, { left: 0 }]} />
                    </GestureDetector>
                )}

                {/* 2. Nội dung Màn hình */}
                <View style={styles.content}>
                    {children}
                </View>

                {/* 3. Vùng Vuốt Trái (Goto Tab) */}
                {swipeToTab && (
                    <GestureDetector gesture={swipeLeftGesture}>
                        {/* Area cho phép vuốt trái (Goto Tab) */}
                        <View style={[styles.gestureAreaRight, { right: 0 }]} />
                    </GestureDetector>
                )}
            </View>

            {/* Footer: Giữ nguyên */}
            {bottomComponent ? (
                <View
                    style={[
                        styles.bottomWrapper,
                        { paddingBottom: bottomPaddingBottom, backgroundColor: backgroundColor }
                    ]}
                >
                    {bottomComponent}
                </View>
            ) : (
                <View style={{ height: bottomSpacerHeight, backgroundColor: backgroundColor }} />
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
        // Dùng `opacity: 0` nếu bạn muốn ẩn vùng này hoàn toàn
    },
    gestureAreaRight: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: SWIPE_AREA_WIDTH,
        zIndex: 5,
        // Dùng `opacity: 0` nếu bạn muốn ẩn vùng này hoàn toàn
    }
});

export default ScreenLayout;
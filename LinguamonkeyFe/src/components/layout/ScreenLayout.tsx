import React, { useEffect } from 'react';
import {
    View,
    StatusBar,
    ViewStyle,
    StatusBarStyle,
    Platform,
    BackHandler,
    Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createScaledSheet } from '../../utils/scaledStyles';
import {
    GestureDetector,
    Gesture,
    Directions,
} from 'react-native-gesture-handler';
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
    const { width: SCREEN_WIDTH } = Dimensions.get('window');

    const safeInsets = unsafe
        ? { top: 0, bottom: 0, left: 0, right: 0 }
        : insets;

    const headerPaddingTop = headerComponent && !unsafe ? safeInsets.top : 0;
    const bottomPaddingBottom =
        bottomComponent && !unsafe ? insets.bottom : 0;
    const headerSpacerHeight =
        !headerComponent && !unsafe ? safeInsets.top : 0;
    const bottomSpacerHeight =
        !bottomComponent && !unsafe ? insets.bottom : 0;

    // --- ACTIONS ---
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

    // --- ANDROID HARDWARE BACK BUTTON / SYSTEM GESTURE ---
    useEffect(() => {
        const onBackPress = () => {
            if (enableSwipeBack) {
                handleGoBack();
                return true; // Chặn hành động thoát app mặc định
            }
            return false;
        };

        if (Platform.OS === 'android') {
            const subscription = BackHandler.addEventListener(
                'hardwareBackPress',
                onBackPress
            );
            return () => subscription.remove();
        }
    }, [enableSwipeBack]);

    // --- GESTURE CONFIGURATION ---

    /**
     * Cấu hình Pan Gesture để xử lý vuốt mượt mà hơn Fling.
     * - failOffsetY: Huỷ gesture nếu ngón tay di chuyển dọc quá 10px (tránh conflict với ScrollView dọc).
     * - activeOffsetX: Chỉ kích hoạt khi đã vuốt ngang rõ ràng (20px).
     */
    const panGesture = Gesture.Pan()
        .failOffsetY([-10, 10]) // Quan trọng: Nhường quyền cho scroll dọc
        .activeOffsetX([-20, 20]) // Cần vuốt dứt khoát 20px mới kích hoạt
        .onEnd((e) => {
            // Logic xác định hướng vuốt dựa trên translation và velocity
            const isSwipeRight = e.translationX > 50 && e.velocityX > 500;
            const isSwipeLeft = e.translationX < -50 && e.velocityX < -500;

            // 1. Xử lý BACK (Vuốt từ trái sang phải)
            if (isSwipeRight) {
                // iOS: Chỉ back khi vuốt từ mép trái (giống native)
                // Android: Bỏ qua (hệ thống tự xử lý edge swipe)
                if (
                    Platform.OS === 'ios' &&
                    enableSwipeBack &&
                    e.x < 50 // CHỈ BACK NẾU BẮT ĐẦU TỪ MÉP (Fix conflict carousel)
                ) {
                    runOnJS(handleGoBack)();
                }
            }

            // 2. Xử lý NEXT TAB (Vuốt từ phải sang trái)
            if (isSwipeLeft && swipeToTab) {
                // Chỉ swipe tab khi bắt đầu từ mép phải (hoặc thả lỏng hơn tuỳ UX)
                // Ở đây để thả lỏng hơn 1 chút để dễ chuyển tab
                runOnJS(handleNavigateTab)();
            }
        });

    return (
        <View style={[styles.container, { backgroundColor }]}>
            <StatusBar
                barStyle={statusBarStyle}
                backgroundColor={
                    Platform.OS === 'android' ? statusBarColor : 'transparent'
                }
                translucent={true}
            />

            {/* HEADER AREA */}
            {headerComponent ? (
                <View
                    style={[
                        styles.headerWrapper,
                        {
                            paddingTop: headerPaddingTop,
                            backgroundColor: statusBarColor,
                        },
                    ]}
                >
                    {headerComponent}
                </View>
            ) : (
                <View
                    style={{
                        height: headerSpacerHeight,
                        backgroundColor: statusBarColor,
                    }}
                />
            )}

            {/* CONTENT AREA */}
            <View style={[styles.contentWrapper, style]}>
                {/* Sử dụng GestureDetector bao quanh content.
            Lưu ý: PanGesture đã được config failOffsetY để không chặn scroll dọc.
         */}
                <GestureDetector gesture={panGesture}>
                    <View style={styles.content}>{children}</View>
                </GestureDetector>
            </View>

            {/* BOTTOM AREA */}
            {bottomComponent ? (
                <View
                    style={[
                        styles.bottomWrapper,
                        {
                            paddingBottom: bottomPaddingBottom,
                            backgroundColor: backgroundColor,
                        },
                    ]}
                >
                    {bottomComponent}
                </View>
            ) : (
                <View
                    style={{
                        height: bottomSpacerHeight,
                        backgroundColor: backgroundColor,
                    }}
                />
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
});

export default ScreenLayout;
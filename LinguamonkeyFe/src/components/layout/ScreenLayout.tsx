// ScreenLayout.tsx (thay thế nguyên file)
import React, { useEffect, useState } from 'react';
import {
    View,
    StatusBar,
    ViewStyle,
    StatusBarStyle,
    Platform,
    Dimensions,
    KeyboardAvoidingView,
    LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createScaledSheet } from '../../utils/scaledStyles';
import {
    GestureDetector,
    Gesture,
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
    disableBottomInset?: boolean;
    swipeToTab?: string;
    enableSwipeBack?: boolean;
    keyboardAware?: boolean;
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
    keyboardAware = true,
    disableBottomInset = false,
}) => {
    const insets = useSafeAreaInsets();
    const { width: SCREEN_WIDTH } = Dimensions.get('window');

    const safeInsets = unsafe ? { top: 0, bottom: 0, left: 0, right: 0 } : insets;

    const headerPaddingTop = headerComponent && !unsafe ? safeInsets.top : 0;
    const bottomPaddingBottom = bottomComponent && !unsafe ? insets.bottom : 0;
    const headerSpacerHeight = !headerComponent && !unsafe ? safeInsets.top : 0;
    const bottomSpacerHeight =
        !bottomComponent && !unsafe && !disableBottomInset
            ? insets.bottom
            : 0;

    const [headerHeight, setHeaderHeight] = useState(0);

    const handleNavigateTab = () => { if (swipeToTab) gotoTab(swipeToTab); };
    const handleGoBack = (): boolean => { if (enableSwipeBack) { return goBack(); } return false; };

    useEffect(() => {
        // noop kept
    }, [enableSwipeBack]);

    const panGesture = Platform.OS === 'ios' ? Gesture.Pan()
        .failOffsetY([-10, 10])
        .activeOffsetX([-20, 20])
        .onEnd((e) => {
            const isSwipeRight = e.translationX > 50 && e.velocityX > 500;
            const isSwipeLeft = e.translationX < -50 && e.velocityX < -500;

            if (isSwipeRight) {
                if (enableSwipeBack && e.x < 50) {
                    runOnJS(handleGoBack)();
                }
            }
            if (isSwipeLeft && swipeToTab) {
                runOnJS(handleNavigateTab)();
            }
        }) : undefined;

    const content = (
        <View style={styles.content}>{children}</View>
    );

    const gestureContent = panGesture ? <GestureDetector gesture={panGesture}>{content}</GestureDetector> : content;

    // height của header để tính keyboardVerticalOffset chính xác
    const onHeaderLayout = (e: LayoutChangeEvent) => {
        const h = e.nativeEvent.layout.height || 0;
        setHeaderHeight(h);
    };

    // Nếu keyboardAware true thì bọc contentWrapper bằng KeyboardAvoidingView
    const inner = keyboardAware ? (
        <KeyboardAvoidingView
            style={[styles.contentWrapper, style]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={headerHeight + (unsafe ? 0 : insets.top) + 8} // +8 dư
        >
            {gestureContent}
        </KeyboardAvoidingView>
    ) : (
        <View style={[styles.contentWrapper, style]}>
            {gestureContent}
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor }]}>
            <StatusBar
                barStyle={statusBarStyle}
                backgroundColor={Platform.OS === 'android' ? statusBarColor : 'transparent'}
                translucent={true}
            />

            {headerComponent ? (
                <View
                    onLayout={onHeaderLayout}
                    style={[styles.headerWrapper, { paddingTop: headerPaddingTop, backgroundColor: statusBarColor }]}
                >
                    {headerComponent}
                </View>
            ) : (
                <View style={{ height: headerSpacerHeight, backgroundColor: statusBarColor }} />
            )}

            {inner}

            {bottomComponent ? (
                <View style={[styles.bottomWrapper, { paddingBottom: bottomPaddingBottom, backgroundColor }]}>
                    {bottomComponent}
                </View>
            ) : (
                <View style={{ height: bottomSpacerHeight, backgroundColor }} />
            )}
        </View>
    );
};

const styles = createScaledSheet({
    container: {
        flex: 1,
        // remove overflow hidden to avoid clipping when KeyboardAvoidingView shifts content
        // overflow: 'hidden',
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

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

    const handleNavigateTab = () => {
        if (swipeToTab) {
            gotoTab(swipeToTab);
        }
    };

    const handleGoBack = (): boolean => {
        if (enableSwipeBack) {
            return goBack();
        }
        return false;
    };

    // --- ANDROID HARDWARE BACK BUTTON / SYSTEM GESTURE ---
    // NOTE: actual android back handling is centralized in RootNavigation to avoid
    // conflicts across screens. We keep this hook minimal to avoid double-handling.
    useEffect(() => {
        // noop here — RootNavigation handles BackHandler on Android globally.
        // This keeps ScreenLayout from interfering.
    }, [enableSwipeBack]);

    const panGesture = Platform.OS === 'ios' ? Gesture.Pan()
        .failOffsetY([-10, 10])
        .activeOffsetX([-20, 20])
        .onEnd((e) => {
            const isSwipeRight = e.translationX > 50 && e.velocityX > 500;
            const isSwipeLeft = e.translationX < -50 && e.velocityX < -500;

            if (isSwipeRight) {
                if (
                    enableSwipeBack &&
                    e.x < 50
                ) {
                    runOnJS(handleGoBack)();
                }
            }

            if (isSwipeLeft && swipeToTab) {
                runOnJS(handleNavigateTab)();
            }
        }) : undefined; // KHÔNG ĐỊNH NGHĨA PAN GESTURE NẾU LÀ ANDROID

    const content = (
        <View style={styles.content}>{children}</View>
    );

    const gestureContent = panGesture ? (
        <GestureDetector gesture={panGesture}>
            {content}
        </GestureDetector>
    ) : (
        content
    );

    return (
        <View style={[styles.container, { backgroundColor }]}>
            <StatusBar
                barStyle={statusBarStyle}
                backgroundColor={
                    Platform.OS === 'android' ? statusBarColor : 'transparent'
                }
                translucent={true}
            />

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

            <View style={[styles.contentWrapper, style]}>
                {gestureContent}
            </View>

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

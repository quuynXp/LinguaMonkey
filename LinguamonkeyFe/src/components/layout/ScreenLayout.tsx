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
    const bottomPaddingBottom = bottomComponent && !unsafe ? insets.bottom : 0;
    const headerSpacerHeight = !headerComponent && !unsafe ? safeInsets.top : 0;
    const bottomSpacerHeight = !bottomComponent && !unsafe ? insets.bottom : 0;

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

    // Kết hợp gesture: Race để ưu tiên cái nào xảy ra trước
    const composedGestures = Gesture.Race(swipeLeftGesture, swipeRightGesture);

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
                <GestureDetector gesture={composedGestures}>
                    <View style={styles.content}>
                        {children}
                    </View>
                </GestureDetector>
            </View>

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
});

export default ScreenLayout;
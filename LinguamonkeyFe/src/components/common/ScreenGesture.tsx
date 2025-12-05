import React from 'react';
import { ViewStyle, View } from 'react-native';
import { GestureDetector, Gesture, Directions } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { goBack, gotoTab } from '../../utils/navigationRef';

interface ScreenGestureProps {
    children: React.ReactNode;
    nextTabName?: string;
    enableSwipeBack?: boolean;
    style?: ViewStyle;
}

const ScreenGesture: React.FC<ScreenGestureProps> = ({
    children,
    nextTabName,
    enableSwipeBack = true,
    style
}) => {

    const handleNavigateTab = () => {
        if (nextTabName) {
            gotoTab(nextTabName);
        }
    };

    const handleGoBack = () => {
        goBack();
    };

    const swipeLeft = Gesture.Fling()
        .direction(Directions.LEFT)
        .onEnd(() => {
            if (nextTabName) {
                runOnJS(handleNavigateTab)();
            }
        });

    const swipeRight = Gesture.Fling()
        .direction(Directions.RIGHT)
        .onEnd(() => {
            if (enableSwipeBack) {
                runOnJS(handleGoBack)();
            }
        });

    const composedGestures = Gesture.Race(swipeLeft, swipeRight);

    return (
        <GestureDetector gesture={composedGestures}>
            <View style={[{ flex: 1 }, style]}>
                {children}
            </View>
        </GestureDetector>
    );
};

export default ScreenGesture;
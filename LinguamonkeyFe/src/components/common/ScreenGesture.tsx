import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { GestureDetector, Gesture, Directions } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { goBack, gotoTab } from '../../utils/navigationRef';

interface ScreenGestureProps {
    children: React.ReactNode;
    /**
     * Tên Tab muốn điều hướng tới khi vuốt sang trái (Right-to-Left swipe)
     * Ví dụ: 'Chat', 'Learn'
     */
    nextTabName?: string;
    /**
     * Cho phép vuốt sang phải (Left-to-Right swipe) để Go Back
     * Mặc định: true (Native Stack đã hỗ trợ, nhưng dùng cái này nếu muốn override logic)
     */
    enableSwipeBack?: boolean;
    style?: ViewStyle;
}

/**
 * Wrapper component để xử lý cử chỉ vuốt (Swipe)
 * - Vuốt Trái (<-): Đi tới Tab chỉ định (nextTabName)
 * - Vuốt Phải (->): Go Back (Mặc định)
 */
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

    // Cử chỉ vuốt sang Trái (Direction LEFT)
    const swipeLeft = Gesture.Fling()
        .direction(Directions.LEFT)
        .onEnd(() => {
            if (nextTabName) {
                runOnJS(handleNavigateTab)();
            }
        });

    // Cử chỉ vuốt sang Phải (Direction RIGHT)
    const swipeRight = Gesture.Fling()
        .direction(Directions.RIGHT)
        .onEnd(() => {
            if (enableSwipeBack) {
                runOnJS(handleGoBack)();
            }
        });

    // Kết hợp các cử chỉ (Race: cái nào nhận diện trước thì chạy)
    const composedGestures = Gesture.Race(swipeLeft, swipeRight);

    return (
        <GestureDetector gesture={composedGestures}>
            {/* Cần style flex: 1 để vùng nhận diện bao phủ toàn màn hình */}
            <GestureDetector gesture={composedGestures}>
                {/* Wrapper View trong suốt để bắt gesture */}
                <React.Fragment>
                    {children}
                </React.Fragment>
            </GestureDetector>
        </GestureDetector>
    );
};

/**
 * Cách sử dụng:
 * * <ScreenGesture nextTabName="Chat">
 * <View style={{flex: 1}}> ...Nội dung màn hình... </View>
 * </ScreenGesture>
 */

export default ScreenGesture;
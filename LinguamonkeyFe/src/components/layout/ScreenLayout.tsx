import React from 'react';
import { View, StatusBar, ViewStyle, StatusBarStyle, Platform } from 'react-native';
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
    unsafe = true,
    headerComponent,
    bottomComponent,
}) => {
    const insets = useSafeAreaInsets();

    // Lấy khoảng cách an toàn. Nếu unsafe=true, tất cả đều bằng 0 để nội dung full màn hình.
    const safeInsets = unsafe
        ? { top: 0, bottom: 0, left: 0, right: 0 }
        : insets;

    // Khoảng cách an toàn chỉ được áp dụng nếu:
    // 1. `unsafe` là `false`
    // 2. Component tương ứng (Header/Bottom) không tồn tại, ta cần chèn một View spacer
    //    HOẶC Component tương ứng tồn tại và ta cần đẩy nó xuống/lên.
    //
    // Để nội dung full màn hình (khi unsafe=true), ta chỉ cần đảm bảo **KHÔNG** áp dụng
    // `paddingTop: safeInsets.top` hay `height: safeInsets.top`
    const headerPaddingTop = headerComponent && !unsafe ? safeInsets.top : 0;
    const bottomPaddingBottom = bottomComponent && !unsafe ? safeInsets.bottom : 0;
    const headerSpacerHeight = !headerComponent && !unsafe ? safeInsets.top : 0;
    const bottomSpacerHeight = !bottomComponent && !unsafe ? safeInsets.bottom : 0;


    return (
        <View style={[styles.container, { backgroundColor }]}>
            <StatusBar
                barStyle={statusBarStyle}
                backgroundColor={Platform.OS === 'android' ? statusBarColor : 'transparent'}
                translucent={true}
            />

            {/* Header: Chỉ áp dụng padding an toàn nếu có headerComponent VÀ unsafe=false */}
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
                /* Nếu không có headerComponent và unsafe=false, thêm View để tạo khoảng cách an toàn cho StatusBar */
                <View style={{ height: headerSpacerHeight, backgroundColor: statusBarColor }} />
            )}

            {/* Nội dung chính: Đảm bảo flex: 1 để chiếm hết không gian còn lại */}
            <View style={[styles.content, style]}>
                {children}
            </View>

            {/* Footer: Chỉ áp dụng padding an toàn nếu có bottomComponent VÀ unsafe=false */}
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
                /* Nếu không có bottomComponent và unsafe=false, thêm View để tạo khoảng cách an toàn cho vùng dưới */
                <View style={{ height: bottomSpacerHeight, backgroundColor: backgroundColor }} />
            )}
        </View>
    );
};

const styles = createScaledSheet({
    container: {
        flex: 1,
        // Khi dùng View này, nội dung đã full màn hình về kích thước (100% width/height)
        // và thuộc tính `flex: 1` sẽ giúp nó mở rộng tối đa.
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
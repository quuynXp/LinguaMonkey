import React from 'react';
import {
  Animated,
  StyleSheet,
  TouchableOpacity,
  View,
  Text
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
// Giả định: Import hàm dịch thuật của bạn. Thường là từ một tệp i18n/config.
import { useTranslation } from './i18n/i18n'; // THAY THẾ BẰNG IMPORT THỰC TẾ CỦA BẠN

interface TabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

const CustomTabBar: React.FC<TabBarProps> = ({ state, descriptors, navigation }) => {
  // 1. Khởi tạo hàm dịch thuật
  const { t } = useTranslation();

  const animatedValues = React.useRef(
    state.routes.map(() => new Animated.Value(0))
  ).current;

  React.useEffect(() => {
    animatedValues.forEach((anim, index) => {
      Animated.timing(anim, {
        toValue: state.index === index ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  }, [state.index]);

  const getIconName = (routeName: string) => {
    switch (routeName) {
      case 'Home':
        return 'home';
      case 'Learn':
        return 'school';
      case 'Progress':
        return 'trending-up';
      case 'ChatAI':
        return 'chat';
      case 'Profile':
        return 'person';
      default:
        return 'help';
    }
  };

  // 2. Thay thế hàm getTabLabel bằng hàm truy xuất i18n
  const getTabLabelKey = (routeName: string): string => {
    switch (routeName) {
      case 'Home':
        return 'tabbar.home';
      case 'Learn':
        return 'tabbar.learn';
      case 'Progress':
        return 'tabbar.progress';
      case 'ChatAI':
        return 'tabbar.chat_ai';
      case 'Profile':
        return 'tabbar.profile';
      default:
        return routeName;
    }
  };

  return (
    <View style={styles.tabBar}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        // Lấy key bản dịch
        const translationKey = getTabLabelKey(route.name);
        // Dịch nhãn
        const label = t(translationKey);


        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            style={styles.tabItem}
          >
            <Animated.View
              style={[
                styles.tabIconContainer,
                {
                  transform: [
                    {
                      scale: animatedValues[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.2],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Icon
                name={getIconName(route.name)}
                size={24}
                color={isFocused ? '#4F46E5' : '#9CA3AF'}
              />
            </Animated.View>
            <Animated.Text
              style={[
                styles.tabLabel,
                {
                  color: isFocused ? '#4F46E5' : '#9CA3AF',
                  opacity: animatedValues[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.7, 1],
                  }),
                },
              ]}
            >
              {/* 3. Sử dụng nhãn đã được dịch */}
              {label}
            </Animated.Text>
            {isFocused && (
              <Animated.View
                style={[
                  styles.activeIndicator,
                  {
                    opacity: animatedValues[index],
                  },
                ]}
              />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingBottom: 5,
    paddingTop: 5,
    height: 70,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    position: 'relative',
  },
  tabIconContainer: {
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    width: 32,
    height: 3,
    backgroundColor: '#4F46E5',
    borderRadius: 2,
  },
});

export default CustomTabBar;
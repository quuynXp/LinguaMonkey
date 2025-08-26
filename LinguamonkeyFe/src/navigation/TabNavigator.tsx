import { MaterialIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import ChatStack from './stack/ChatStack';
import HomeStack from './stack/HomeStack';
import ProfileStack from './stack/ProfileStack';
import ProgressStack from './stack/ProgressStack';
import SkillsLearnStack from './stack/SkillsLearnStack';


const Tab = createBottomTabNavigator();

const iconMap = {
  Home: 'home',
  Learn: 'school',
  Progress: 'trending-up',
  Chat: 'chat',
  Profile: 'person',
} as const;

type TabRoute = keyof typeof iconMap;
type IconName = typeof iconMap[TabRoute];

export default function TabNavigator() {
  
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          const iconName = iconMap[route.name as TabRoute] as IconName;
          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingBottom: 5,
          height: 60,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Learn" component={SkillsLearnStack} />
      <Tab.Screen name="Progress" component={ProgressStack} />
      <Tab.Screen name="Chat" component={ChatStack} />
      <Tab.Screen name="Profile" component={ProfileStack} />
    </Tab.Navigator>
  );
}
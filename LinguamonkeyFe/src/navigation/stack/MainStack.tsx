import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import DailyWelcomeScreen from '../../screens/appLaunch/DailyWelcomeScreen';
import ProficiencyTestScreen from '../../screens/appLaunch/ProficiencyTestScreen';
import SetupInitScreen from '../../screens/appLaunch/SetupInitScreen';
import TabNavigator from '../TabNavigator';
import AdminStack from './AdminStack';
import LearnStack from './LearnStack';
import PaymentStack from './PaymentStack';
import ChatStack from './ChatStack';
import ProfileStack from './ProfileStack';
import ProgressStack from './ProgressStack';
import CourseStack from './CourseStack';
import RoadmapStack from './RoadmapStack';
import ResetPasswordScreen from '../../screens/auth/ResetPasswordScreen';

export type MainStackParamList = {
  TabApp: undefined;
  LearnStack: { screen?: string; params?: any } | undefined;
  AdminStack: undefined;
  Teacher: undefined;
  DailyWelcomeScreen: undefined;
  ProficiencyTestScreen: undefined;
  SetupInitScreen: undefined;
  PaymentStack: undefined;
  ChatStack: undefined;
  ProfileStack: undefined;
  ProgressStack: undefined;
  CourseStack: undefined;
  RoadmapStack: undefined;
  ResetPasswordScreen: undefined;
};

const Stack = createNativeStackNavigator<MainStackParamList>();

interface MainStackProps {
  initialRouteName?: keyof MainStackParamList;
}

const MainStack = ({ initialRouteName = 'TabApp' }: MainStackProps) => {
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      id={undefined}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        fullScreenGestureEnabled: true,
      }}
    >
      {/* 1. Main Tabs */}
      <Stack.Screen name="TabApp" component={TabNavigator} />

      {/* 2. Feature Stacks */}
      <Stack.Screen name="LearnStack" component={LearnStack} />
      <Stack.Screen name="AdminStack" component={AdminStack} />
      <Stack.Screen name="ChatStack" component={ChatStack} />
      <Stack.Screen name="ProfileStack" component={ProfileStack} />
      <Stack.Screen name="ProgressStack" component={ProgressStack} />
      <Stack.Screen name="CourseStack" component={CourseStack} />
      <Stack.Screen name="RoadmapStack" component={RoadmapStack} />

      {/* 3. Onboarding / Setup Flows */}
      <Stack.Screen
        name="DailyWelcomeScreen"
        component={DailyWelcomeScreen}
        options={{ gestureEnabled: false }} // Chặn vuốt back ở màn hình này nếu cần
      />
      <Stack.Screen
        name="ProficiencyTestScreen"
        component={ProficiencyTestScreen}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen
        name="SetupInitScreen"
        component={SetupInitScreen}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen name="ResetPasswordScreen" component={ResetPasswordScreen} />

      {/* 4. Payment & Transactions */}
      <Stack.Screen name="PaymentStack" component={PaymentStack} />

    </Stack.Navigator>
  );
};

export default MainStack;
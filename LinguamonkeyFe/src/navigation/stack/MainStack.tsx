import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import DailyWelcomeScreen from '../../screens/appLaunch/DailyWelcomeScreen';
import ProficiencyTestScreen from '../../screens/appLaunch/ProficiencyTestScreen';
import SetupInitScreen from '../../screens/appLaunch/SetupInitScreen';
import TransactionHistoryScreen from '../../screens/payment/TransactionHistoryScreen';
import TabNavigator from '../TabNavigator';
import AdminStack from './AdminStack';
import LearnStack from './LearnStack';
import PaymentStack from './PaymentStack';
import ChatStack from './ChatStack';
import ProfileStack from './ProfileStack';
import ProgressStack from './ProgressStack';
import CourseStack from './CourseStack';
import RoadmapStack from './RoadmapStack';

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
};

const Stack = createNativeStackNavigator<MainStackParamList>();

interface MainStackProps {
  initialRouteName?: keyof MainStackParamList;
}

const MainStack = ({ initialRouteName = 'TabApp' }: MainStackProps) => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRouteName} id={undefined}>
      {/* 1. Main Tabs */}
      <Stack.Screen name="TabApp" component={TabNavigator} />

      {/* 2. Feature Stacks (Nằm ngoài Tab để hiển thị Full Screen) */}
      <Stack.Screen name="LearnStack" component={LearnStack} />
      <Stack.Screen name="AdminStack" component={AdminStack} />
      <Stack.Screen name="ChatStack" component={ChatStack} />
      <Stack.Screen name="ProfileStack" component={ProfileStack} />
      <Stack.Screen name="ProgressStack" component={ProgressStack} />
      <Stack.Screen name="CourseStack" component={CourseStack} />
      <Stack.Screen name="RoadmapStack" component={RoadmapStack} />

      {/* 3. Onboarding / Setup Flows */}
      <Stack.Screen name="DailyWelcomeScreen" component={DailyWelcomeScreen} />
      <Stack.Screen name="ProficiencyTestScreen" component={ProficiencyTestScreen} />
      <Stack.Screen name="SetupInitScreen" component={SetupInitScreen} />

      {/* 4. Payment & Transactions */}
      <Stack.Screen name="PaymentStack" component={PaymentStack} />

    </Stack.Navigator>
  );
};

export default MainStack;
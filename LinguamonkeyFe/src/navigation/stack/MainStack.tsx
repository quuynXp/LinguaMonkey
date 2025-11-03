// navigation/MainStack.tsx
import DailyWelcomeScreen from '../../screens/appLaunch/DailyWelcomeScreen';
import ProficiencyTestScreen from '../../screens/appLaunch/ProficiencyTestScreen';
import SetupInitScreen from '../../screens/appLaunch/SetupInitScreen';
import { createNativeStackNavigator } from '@react-navigation/native-stack'; // Sử dụng native stack
import TabNavigator from '../TabNavigator';
import AuthStack from './AuthStack';
import AdminStack from './AdminStack';
import TeacherStack from './TeacherStack';
import withRoleGuard from '../../utils/withRoleGuard';
import TransactionHistoryScreen from '../../screens/payment/TransactionHistoryScreen';
import PaymentScreen from '../../screens/payment/PaymentScreen';
import AppLaunchScreen from '../../screens/appLaunch/AppLaunchScreen';

export type RootStackParamList = {
  Auth: undefined;
  DailyWelcome: undefined;
  ProficiencyTestScreen: undefined;
  SetupInitScreen: undefined;
  AppLaunchScreen: { initialParams?: any } | undefined;
  TabApp: undefined;
  PaymentScreen: undefined;
  Admin: undefined;
  Teacher: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const MainStack = ({ initialRouteName, initialParams }: any) => (
  <Stack.Navigator
    {...({
      screenOptions: { headerShown: false },
      initialRouteName,
    } as any)}
  >
    <Stack.Screen name="Auth" component={AuthStack} />
    <Stack.Screen name="DailyWelcome" component={DailyWelcomeScreen} />
    <Stack.Screen name="ProficiencyTestScreen" component={ProficiencyTestScreen} />
    <Stack.Screen name="SetupInitScreen" component={SetupInitScreen} />
    <Stack.Screen name="AppLaunchScreen" component={AppLaunchScreen} initialParams={initialParams} />
    <Stack.Screen name="TabApp" component={TabNavigator} />
    <Stack.Screen name="PaymentScreen" component={PaymentScreen} />
    <Stack.Screen
      name="Admin"
      component={AdminStack}
    />
    <Stack.Screen
      name="Teacher"
      component={TeacherStack}
    />

  </Stack.Navigator>
);

export default MainStack;
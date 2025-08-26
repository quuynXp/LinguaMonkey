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

const Stack = createNativeStackNavigator();

const MainStack = ({ initialRouteName }) => (
  <Stack.Navigator
    screenOptions={{ headerShown: false }}
    initialRouteName={initialRouteName}
  >
    <Stack.Screen name="Auth" component={AuthStack} />
    <Stack.Screen name="DailyWelcome" component={DailyWelcomeScreen} />
    <Stack.Screen name="ProficiencyTestScreen" component={ProficiencyTestScreen} />
    <Stack.Screen name="SetupInitScreen" component={SetupInitScreen} />
    <Stack.Screen name="AppLaunchScreen" component={AppLaunchScreen} />
    <Stack.Screen name="TabApp" component={TabNavigator} />
    <Stack.Screen name="PaymentScreen" component={PaymentScreen} />
    <Stack.Screen
      name="Admin"
      component={withRoleGuard(AdminStack, ["ROLE_ADMIN"])}
    />
    <Stack.Screen
      name="Teacher"
      component={withRoleGuard(TeacherStack, ["ROLE_TEACHER"])}
    />

  </Stack.Navigator>
);

export default MainStack;
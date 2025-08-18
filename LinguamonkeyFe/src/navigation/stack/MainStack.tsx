import DailyWelcomeScreen from '@/src/screens/appLaunch/DailyWelcomeScreen';
import ProficiencyTestScreen from '@/src/screens/appLaunch/ProficiencyTestScreen';
import QuickStartScreen from '@/src/screens/appLaunch/QuickStartScreen';
import SetupInitScreen from '@/src/screens/appLaunch/SetupInitScreen';
import { createStackNavigator } from '@react-navigation/stack';
import TabNavigator from '../TabNavigator';
import AuthStack from './AuthStack';

const Stack = createStackNavigator();

const MainStack = ({ initialRouteName }) => (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRouteName}>
        <Stack.Screen name="Login" component={AuthStack} />
        <Stack.Screen name="QuickStart" component={QuickStartScreen} />
        <Stack.Screen name="DailyWelcome" component={DailyWelcomeScreen} />
        <Stack.Screen name="ProficiencyTest" component={ProficiencyTestScreen} />
        <Stack.Screen name="SetupInitScreen" component={SetupInitScreen} />
        <Stack.Screen name="TabApp" component={TabNavigator} />
    </Stack.Navigator>
);

export default MainStack;

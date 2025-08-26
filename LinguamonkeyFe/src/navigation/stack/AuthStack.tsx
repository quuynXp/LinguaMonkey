// navigation/stack/AuthStack.tsx
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../../screens/auth/LoginScreen';
import RegisterScreen from '../../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../../screens/auth/ForgotPasswordScreen';
import VerifyCodeScreen from '../../screens/auth/VerifyCodeScreen';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  VerifyCodeScreen: { email: string };
  ForgotPassword: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="Login"
        component={LoginScreen}
      />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="VerifyCodeScreen" component={VerifyCodeScreen} />
    </Stack.Navigator>
  );
}
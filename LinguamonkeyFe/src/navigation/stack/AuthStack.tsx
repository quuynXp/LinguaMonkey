import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import LoginScreen from '../../screens/auth/LoginScreen';
import RegisterScreen from '../../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../../screens/auth/ForgotPasswordScreen';
import VerifyCodeScreen from '../../screens/auth/VerifyCodeScreen';
import ResetPasswordScreen from '../../screens/auth/ResetPasswordScreen';
import AppLaunchScreen from '../../screens/appLaunch/AppLaunchScreen';
import SetupInitScreen from '../../screens/appLaunch/SetupInitScreen';

export type AuthStackParamList = {
  AppLaunchScreen: { initialParams?: any } | undefined;
  LoginScreen: undefined;
  RegisterScreen: undefined;
  VerifyCodeScreen: { email: string };
  ForgotPasswordScreen: undefined;
  SetupInitScreen: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthStack({ initialParams }: { initialParams?: any }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="AppLaunchScreen" id={undefined}>
      <Stack.Screen
        name="AppLaunchScreen"
        component={AppLaunchScreen}
        initialParams={initialParams}
      />
      <Stack.Screen name="LoginScreen" component={LoginScreen} />
      <Stack.Screen name="RegisterScreen" component={RegisterScreen} />
      <Stack.Screen name="ForgotPasswordScreen" component={ForgotPasswordScreen} />
      <Stack.Screen name="VerifyCodeScreen" component={VerifyCodeScreen} />
      <Stack.Screen name="SetupInitScreen" component={SetupInitScreen} />
    </Stack.Navigator>
  );
}
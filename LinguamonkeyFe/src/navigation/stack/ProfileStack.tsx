import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import AboutScreen from '../../screens/profile/AboutScreen';
import EditProfileScreen from '../../screens/profile/EditProfileScreen';
import HelpSupportScreen from '../../screens/profile/HelpSupportScreen';
import LanguageManagementScreen from '../../screens/profile/LanguageManagementScreen';
import LearningGoalsScreen from '../../screens/profile/LearningGoalsScreen';
import PrivacySettingsScreen from '../../screens/profile/PrivacySettingScreen';
import ProfileScreen from '../../screens/profile/ProfileScreen';
import NotificationHistoryScreen from '../../screens/notification/NotificationHistoryScreen';
import NotificationSettingsScreen from '../../screens/notification/NotificationSettingsScreen';
import TransactionHistoryScreen from '../../screens/payment/TransactionHistoryScreen';
import TransactionDetailsScreen from '../../screens/payment/TransactionDetailsScreen';
import UserProfileViewScreen from '../../screens/profile/UserProfileViewScreen';
import SettingsScreen from '../../screens/profile/SettingsScreen';
import ResetPasswordScreen from '../../screens/auth/ResetPasswordScreen';
import WebViewScreen from '../../screens/profile/WebViewScreen';

type ProfileStackParamList = {
  ProfileScreen: undefined;
  EditProfileScreen: undefined;
  LearningGoalsScreen: undefined;
  LanguageManagementScreen: undefined;
  UserProfileViewScreen: undefined;
  PrivacySettingsScreen: undefined;
  HelpSupportScreen: undefined;
  AboutScreen: undefined;
  SettingsScreen: undefined;
  NotificationHistoryScreen: undefined;
  TransactionHistoryScreen: undefined;
  NotificationSettingsScreen: undefined;
  TransactionDetailsScreen: undefined;
  ResetPasswordScreen: undefined;
  WebViewScreen: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

const ProfileStack = () => (
  <Stack.Navigator initialRouteName='ProfileScreen' screenOptions={{ headerShown: false }} id={undefined}>
    <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
    <Stack.Screen name="EditProfileScreen" component={EditProfileScreen} />
    <Stack.Screen name="LanguageManagementScreen" component={LanguageManagementScreen} />
    <Stack.Screen name="LearningGoalsScreen" component={LearningGoalsScreen} />
    <Stack.Screen name="PrivacySettingsScreen" component={PrivacySettingsScreen} />
    <Stack.Screen name="HelpSupportScreen" component={HelpSupportScreen} />
    <Stack.Screen name="UserProfileViewScreen" component={UserProfileViewScreen} />
    <Stack.Screen name="AboutScreen" component={AboutScreen} />
    <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
    <Stack.Screen name="NotificationHistoryScreen" component={NotificationHistoryScreen} />
    <Stack.Screen name="NotificationSettingsScreen" component={NotificationSettingsScreen} />
    <Stack.Screen name="TransactionHistoryScreen" component={TransactionHistoryScreen} />
    <Stack.Screen name="TransactionDetailsScreen" component={TransactionDetailsScreen} />
    <Stack.Screen name="ResetPasswordScreen" component={ResetPasswordScreen} />
    <Stack.Screen name="WebViewScreen" component={WebViewScreen} />
  </Stack.Navigator>
);

export default ProfileStack;

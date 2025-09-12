import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import AboutScreen from '../../screens/profile/AboutScreen';
import EditProfileScreen from '../../screens/profile/EditProfileScreen';
import EnhancedUserManagementScreen from '../../screens/profile/EnhancedUserManagementScreen';
import HelpSupportScreen from '../../screens/profile/HelpSupportScreen';
import LanguageManagementScreen from '../../screens/profile/LanguageManagementScreen';
import LeaderboardScreen from '../../screens/profile/LeaderboardScreen';
import LearningGoalsScreen from '../../screens/profile/LearningGoalsScreen';
import PrivacySettingsScreen from '../../screens/profile/PrivacySettingScreen';
import ProfileScreen from '../../screens/profile/ProfileScreen';
import NotificationHistoryScreen from '../../screens/notification/NotificationHistoryScreen';
import NotificationSettingsScreen from '../../screens/notification/NotificationSettingsScreen';
import TransactionHistoryScreen from '../../screens/payment/TransactionHistoryScreen';
import TransactionDetailsScreen from '../../screens/payment/TransactionDetailsScreen';
import UserProfileViewScreen from '../../screens/profile/UserProfileViewScreen';

const Stack = createNativeStackNavigator();

const ProfileStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ProfileMain" component={ProfileScreen} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    <Stack.Screen name="LanguageManagement" component={LanguageManagementScreen} />
    <Stack.Screen name="LearningGoals" component={LearningGoalsScreen} />
    <Stack.Screen name="PrivacySettings" component={PrivacySettingsScreen} />
    <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
    <Stack.Screen name="UserProfileView" component={UserProfileViewScreen} />
    <Stack.Screen name="About" component={AboutScreen} />
    <Stack.Screen name="EnhancedUserManagement" component={EnhancedUserManagementScreen} />
    <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
    <Stack.Screen name="NotificationHistoryScreen" component={NotificationHistoryScreen} />
    <Stack.Screen name="NotificationSettingsScreen" component={NotificationSettingsScreen} />
    <Stack.Screen name="TransactionHistoryScreen" component={TransactionHistoryScreen} />
    <Stack.Screen name="TransactionDetailsScreen" component={TransactionDetailsScreen} />
  </Stack.Navigator>
);

export default ProfileStack;

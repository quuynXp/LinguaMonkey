import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import OnboardingScreen from '../../screens/appLaunch/OnboardingScreen';
import AboutScreen from '../../screens/profile/AboutScreen';
import EditProfileScreen from '../../screens/profile/EditProfileScreen';
import EnhancedUserManagementScreen from '../../screens/profile/EnhancedUserManagementScreen';
import HelpSupportScreen from '../../screens/profile/HelpSupportScreen';
import LanguageManagementScreen from '../../screens/profile/LanguageManagement';
import LeaderboardScreen from '../../screens/profile/LeaderboardScreen';
import LearningGoalsScreen from '../../screens/profile/LearningGoalsScreen';
import PrivacySettingsScreen from '../../screens/profile/PrivacySettingScreen';
import ProfileScreen from '../../screens/profile/ProfileScreen';

const Stack = createNativeStackNavigator();

const ProfileStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ProfileMain" component={ProfileScreen} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    <Stack.Screen name="LanguageManagement" component={LanguageManagementScreen} />
    <Stack.Screen name="LearningGoals" component={LearningGoalsScreen} />
    <Stack.Screen name="PrivacySettings" component={PrivacySettingsScreen} />
    <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
    <Stack.Screen name="About" component={AboutScreen} />
    <Stack.Screen name="EnhancedUserManagement" component={EnhancedUserManagementScreen} />
    <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
    <Stack.Screen name="Onboarding" component={OnboardingScreen} />
  </Stack.Navigator>
);

export default ProfileStack;

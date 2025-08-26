// navigation/stack/HomeStack.tsx
import AccountChoiceScreen from '../../screens/home/AccountChoiceScreen';
import AccountSetupScreen from '../../screens/home/AccountSetupScreen';
import EnhancedAccountCreationScreen from '../../screens/home/EnhancedAccountCreationScreen';
import EnhancedLeaderboardScreen from '../../screens/home/EnhancedLeaderboardScreen';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import HomeScreen from '../../screens/home/HomeScreen';
import RoadmapItemDetailScreen from '../../screens/roadmap/RoadmapItemDetailScreen';
import RoadmapScreen from '../../screens/roadmap/RoadmapScreen';

const Stack = createNativeStackNavigator();

export default function HomeStack() {
  console.log("HomeStack rendered");
  return (
    <Stack.Navigator initialRouteName="HomeMain" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="EnhancedAccountCreation" component={EnhancedAccountCreationScreen} />
      <Stack.Screen name="EnhancedLeaderboard" component={EnhancedLeaderboardScreen} />
      <Stack.Screen name="AccountSetup" component={AccountSetupScreen} />
      <Stack.Screen name="AccountChoice" component={AccountChoiceScreen} />
      <Stack.Screen name="RoadmapItemDetailScreen" component={RoadmapItemDetailScreen} />
      <Stack.Screen name="RoadmapScreen" component={RoadmapScreen} />
    </Stack.Navigator>
  );
}
import AccountChoiceScreen from '../../screens/home/AccountChoiceScreen';
import EnhancedLeaderboardScreen from '../../screens/home/EnhancedLeaderboardScreen';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import HomeScreen from '../../screens/home/HomeScreen';

export type HomeStackParamList = {
  HomeScreen: undefined;
  EnhancedLeaderboardScreen: undefined;
  AccountChoiceScreen: undefined;
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

const HomeStack = () => {
  return (
    <Stack.Navigator initialRouteName="HomeScreen" screenOptions={{ headerShown: false }} id={undefined}>
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="EnhancedLeaderboardScreen" component={EnhancedLeaderboardScreen} />
      <Stack.Screen name="AccountChoiceScreen" component={AccountChoiceScreen} />
    </Stack.Navigator>
  );
}

export default HomeStack;
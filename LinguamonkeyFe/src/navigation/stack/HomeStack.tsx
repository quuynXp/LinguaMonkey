import AccountChoiceScreen from '../../screens/home/AccountChoiceScreen';
import EnhancedLeaderboardScreen from '../../screens/home/EnhancedLeaderboardScreen';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import HomeScreen from '../../screens/home/HomeScreen';
import SpecialOfferScreen from '../../screens/home/SpecialOfferScreen';

export type HomeStackParamList = {
  HomeScreen: undefined;
  EnhancedLeaderboardScreen: undefined;
  AccountChoiceScreen: undefined;
  SpecialOfferScreen: undefined;
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

const HomeStack = () => {
  return (
    <Stack.Navigator initialRouteName="HomeScreen" screenOptions={{ headerShown: false }} id={undefined}>
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="EnhancedLeaderboardScreen" component={EnhancedLeaderboardScreen} />
      <Stack.Screen name="AccountChoiceScreen" component={AccountChoiceScreen} />
      <Stack.Screen name="SpecialOfferScreen" component={SpecialOfferScreen} />
    </Stack.Navigator>
  );
}

export default HomeStack;
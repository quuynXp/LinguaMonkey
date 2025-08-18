
import AccountChoiceScreen from '../../screens/home/AccountChoiceScreen';
import AccountSetupScreen from '../../screens/home/AccountSetupScreen';
import DailyWelcomeScreen from '../../screens/appLaunch/DailyWelcomeScreen';
import EnhancedAccountCreationScreen from '../../screens/home/EnhancedAccountCreationScreen';
import EnhancedLeaderboardScreen from '../../screens/home/EnhancedLeaderboardScreen';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import HomeScreen from '../../screens/home/HomeScreen';

const Stack = createNativeStackNavigator();

export default function HomeStack(){
    return(
        <Stack.Navigator initialRouteName="DailyWelcome" screenOptions={{ headerShown: false }}>
            <Stack.Screen name="HomeMain" component={HomeScreen} />
            <Stack.Screen name="DailyWelcome" component={DailyWelcomeScreen} />
            <Stack.Screen name="EnhancedAccountCreation" component={EnhancedAccountCreationScreen} />
            <Stack.Screen name="EnhancedLeaderboard" component={EnhancedLeaderboardScreen} />
            <Stack.Screen name="AccountSetup" component={AccountSetupScreen} />
            <Stack.Screen name="AccountChoice" component={AccountChoiceScreen} />
        </Stack.Navigator>
    );  
}


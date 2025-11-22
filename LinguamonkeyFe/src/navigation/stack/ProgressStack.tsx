import React from 'react';
import StudyHistoryScreen from '../../screens/progress/StudyHistoryScreen';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProgressScreen from '../../screens/progress/ProgressScreen';

type ProgressStackParamList = {
  ProgressScreen: undefined;
  StudyHistoryScreen: undefined;
};

const Stack = createNativeStackNavigator<ProgressStackParamList>();

const ProgressStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="ProgressScreen" id={undefined}>
    <Stack.Screen name="ProgressScreen" component={ProgressScreen} />
    <Stack.Screen name="StudyHistoryScreen" component={StudyHistoryScreen} />
  </Stack.Navigator>
);

export default ProgressStack;

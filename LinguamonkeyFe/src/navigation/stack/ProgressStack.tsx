import StudyHistoryScreen from '../../screens/progress/StudyHistoryScreen';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import ProgressScreen from '../../screens/progress/ProgressScreen';

const ProgressStack = createNativeStackNavigator();

const ProgressNavigator = () => (
  <ProgressStack.Navigator screenOptions={{ headerShown: false }}>
    <ProgressStack.Screen name="ProgressMain" component={ProgressScreen} />
    <ProgressStack.Screen name="StudyHistory" component={StudyHistoryScreen} />
  </ProgressStack.Navigator>
);

export default ProgressNavigator;
import StudyHistoryScreen from '../../screens/progress/StudyHistoryScreen';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import ProgressScreen from '../../screens/progress/ProgressScreen';

type ProgressStackParamList = {
  ProgressMain: undefined;
  StudyHistory: undefined;
};

const ProgressStack = createNativeStackNavigator<ProgressStackParamList>();

const ProgressNavigator = () => (
  <ProgressStack.Navigator screenOptions={{ headerShown: false }} initialRouteName="ProgressMain" id={undefined}>
    <ProgressStack.Screen name="ProgressMain" component={ProgressScreen} />
    <ProgressStack.Screen name="StudyHistory" component={StudyHistoryScreen} />
  </ProgressStack.Navigator>
);

export default ProgressNavigator;

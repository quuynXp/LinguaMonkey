import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import TeacherDashboardScreen from "../../screens/teacher/TeacherDashboardScreen";

const Stack = createNativeStackNavigator();

export default function TeacherStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TeacherDashboardScreen" component={TeacherDashboardScreen} />
    </Stack.Navigator>
  );
}

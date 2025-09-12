import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import AdminDashboardScreen from "../../screens/admin/AdminDashboardScreen";
import AdminUserManagementScreen from "../../screens/admin/AdminUserManagementScreen";
import AdminCourseManagementScreen from "../../screens/admin/AdminCourseManagementScreen";
import AdminRevenueAnalyticsScreen from "../../screens/admin/AdminRevenueAnalyticsScreen";
import AdminLessonManagement from "../../screens/admin/AdminLessonManagement";


const Stack = createNativeStackNavigator();

export default function AdminStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="AdminDashboardScreen" component={AdminDashboardScreen} />
            <Stack.Screen name="AdminUserManagementScreen" component={AdminUserManagementScreen} />
            <Stack.Screen name="AdminCourseManagementScreen" component={AdminCourseManagementScreen} />
            <Stack.Screen name="AdminRevenueAnalyticsScreen" component={AdminRevenueAnalyticsScreen} />
            <Stack.Screen name="AdminLessonManagement" component={AdminLessonManagement} />

        </Stack.Navigator>
    );
}

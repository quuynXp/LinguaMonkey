import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import AdminDashboardScreen from "../../screens/admin/AdminDashboardScreen";
import AdminUserManagementScreen from "../../screens/admin/AdminUserManagementScreen";
import AdminCourseManagementScreen from "../../screens/admin/AdminCourseManagementScreen";
import AdminRevenueAnalyticsScreen from "../../screens/admin/AdminRevenueAnalyticsScreen";
import AdminLessonManagement from "../../screens/admin/AdminLessonManagement";
import AdminCourseDetailScreen from "../../screens/admin/AdminCourseDetailScreen";
import AdminCreateVideoScreen from "../../screens/admin/AdminCreateVideoScreen";
import AdminTransactionScreen from "../../screens/admin/AdminTransactionScreen";
import AdminSettingsScreen from "../../screens/admin/AdminSettingsScreen";

const Stack = createNativeStackNavigator();

export default function AdminStack() {
    return (
        <Stack.Navigator initialRouteName="AdminDashboardScreen" screenOptions={{ headerShown: false }} id={undefined}>
            <Stack.Screen name="AdminDashboardScreen" component={AdminDashboardScreen} />
            <Stack.Screen name="AdminUserManagementScreen" component={AdminUserManagementScreen} />
            <Stack.Screen name="AdminCourseManagementScreen" component={AdminCourseManagementScreen} />
            <Stack.Screen name="AdminRevenueAnalyticsScreen" component={AdminRevenueAnalyticsScreen} />
            <Stack.Screen name="AdminLessonManagement" component={AdminLessonManagement} />
            <Stack.Screen name="AdminCourseDetailScreen" component={AdminCourseDetailScreen} />
            <Stack.Screen name="AdminCreateVideoScreen" component={AdminCreateVideoScreen} />
            <Stack.Screen name="AdminTransactionScreen" component={AdminTransactionScreen} />
            <Stack.Screen name="AdminSettingsScreen" component={AdminSettingsScreen} />
        </Stack.Navigator>
    );
}
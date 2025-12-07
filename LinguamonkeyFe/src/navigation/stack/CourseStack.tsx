import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import CourseManagerScreen from '../../screens/course/CourseManagerScreen';
import CourseDetailsScreen from '../../screens/course/CourseDetailsScreen';
import EditCourseScreen from '../../screens/course/EditCourseScreen';
import CreatorDashboardScreen from '../../screens/course/CreatorDashboardScreen';
import StudentCoursesScreen from '../../screens/course/StudentCoursesScreen';
import SuggestedCoursesScreen from '../../screens/course/SuggestedCoursesScreen';
import SuggestedTutorsScreen from '../../screens/course/SuggestedTutorsScreen';
import WriteReviewCourseScreen from '../../screens/course/WriteReviewCourseScreen';
import LessonDocumentScreen from '../../screens/course/LessonDocumentScreen';
import LessonVideoScreen from '../../screens/course/LessonVideoScreen';
import LessonEditorScreen from '../../screens/course/LessonEditorScreen';
import LessonScreen from '../../screens/course/LessonScreen';
import CreateLessonScreen from '../../screens/course/CreateLessonScreen';


export type CourseStackParamList = {
    CourseManagerScreen: undefined;
    CourseDetailsScreen: undefined;
    EditCourseScreen: undefined;
    CreatorDashboardScreen: undefined;
    StudentCoursesScreen: undefined;
    SuggestedCoursesScreen: undefined;
    SuggestedTutorsScreen: undefined;
    WriteReviewCourseScreen: undefined;
    LessonVideoScreen: undefined;
    LessonDocumentScreen: undefined;
    LessonEditorScreen: undefined;
    LessonScreen: undefined;
    CreateLessonScreen: undefined;
};

const Stack = createNativeStackNavigator<CourseStackParamList>();

const CourseStack = () => (
    <Stack.Navigator initialRouteName="CourseManagerScreen" screenOptions={{ headerShown: false }} id={undefined}>
        <Stack.Screen name="CourseManagerScreen" component={CourseManagerScreen} />
        <Stack.Screen name="CourseDetailsScreen" component={CourseDetailsScreen} />
        <Stack.Screen name="EditCourseScreen" component={EditCourseScreen} />
        <Stack.Screen name="CreatorDashboardScreen" component={CreatorDashboardScreen} />
        <Stack.Screen name="StudentCoursesScreen" component={StudentCoursesScreen} />
        <Stack.Screen name="SuggestedCoursesScreen" component={SuggestedCoursesScreen} />
        <Stack.Screen name="SuggestedTutorsScreen" component={SuggestedTutorsScreen} />
        <Stack.Screen name="WriteReviewCourseScreen" component={WriteReviewCourseScreen} />
        <Stack.Screen name="LessonDocumentScreen" component={LessonDocumentScreen} />
        <Stack.Screen name="LessonVideoScreen" component={LessonVideoScreen} />
        <Stack.Screen name="LessonEditorScreen" component={LessonEditorScreen} />
        <Stack.Screen name="LessonScreen" component={LessonScreen} />
        <Stack.Screen name="CreateLessonScreen" component={CreateLessonScreen} />
    </Stack.Navigator>
);

export default CourseStack;

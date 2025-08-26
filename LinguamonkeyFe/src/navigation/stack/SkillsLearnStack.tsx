import AdvancedListeningScreen from '../../screens/learn/AdvancedListeningScreen';
import AdvancedSpeakingScreen from '../../screens/learn/AdvancedSpeakingScreen';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import CertificationLearningScreen from '../../screens/learn/CertificationLearningScreen';
import InteractiveQuizScreen from '../../screens/learn/InteractiveQuizScreen';
import LearnScreen from '../../screens/learn/LearnScreen';
import LessonScreen from '../../screens/learn/LessonScreen';
import ListeningScreen from '../../screens/learn/ListeningScreen';
import QuizLearningScreen from '../../screens/learn/QuizLearningScreen';
import ReadingScreen from '../../screens/learn/ReadingScreen';
import SpeakingScreen from '../../screens/learn/SpeakingScreen';
import VocabularyFlashcardsScreen from '../../screens/learn/VocabularyFlashcardsScreen';
import WritingScreen from '../../screens/learn/WritingScreen';
import CourseDetailsScreen from '../../screens/course/CourseDetailsScreen';
import StudentCoursesScreen from '../../screens/course/StudentCoursesScreen';
import NotesScreen from '../../screens/learn/NotesScreen';
import VocabularyLearningScreen from '../../screens/learn/VocabularyLearningScreen';
import FreeLessonScreen from '../../screens/learn/FreeLessonScreen';
import BilingualVideoScreen from '../../screens/learn/BilingualVideoScreen';

const Stack = createNativeStackNavigator();

const SkillsLearnStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="LearnMain" component={LearnScreen} />
    <Stack.Screen name="CertificationLearning" component={CertificationLearningScreen} />
    <Stack.Screen name="InteractiveQuiz" component={InteractiveQuizScreen} />
    <Stack.Screen name="Lesson" component={LessonScreen} />
    <Stack.Screen name="QuizLearning" component={QuizLearningScreen} />
    <Stack.Screen name="VocabularyFlashcards" component={VocabularyFlashcardsScreen} />
    <Stack.Screen name="AdvancedListening" component={AdvancedListeningScreen} />
    <Stack.Screen name="AdvancedSpeaking" component={AdvancedSpeakingScreen} />
    <Stack.Screen name="ListeningScreen" component={ListeningScreen} />
    <Stack.Screen name="CourseDetailsScreen" component={CourseDetailsScreen} />
    <Stack.Screen name="StudentCoursesScreen" component={StudentCoursesScreen} />
    <Stack.Screen name="NotesScreen" component={NotesScreen} />
    <Stack.Screen name="VocabularyLearningScreen" component={VocabularyLearningScreen} />
    <Stack.Screen name="FreeLessonScreen" component={FreeLessonScreen} />
    <Stack.Screen name="BilingualVideoScreen" component={BilingualVideoScreen} />
    <Stack.Screen name="SpeakingScreen" component={SpeakingScreen} />
    <Stack.Screen name="ReadingScreen" component={ReadingScreen} />
    <Stack.Screen name="WritingScreen" component={WritingScreen} />
  </Stack.Navigator>
);

export default SkillsLearnStack;

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import RoadmapScreen from '../../screens/roadmap/RoadmapScreen';
import EditRoadmapScreen from '../../screens/roadmap/EditRoadmapScreen';
import RoadmapItemDetailScreen from '../../screens/roadmap/RoadmapItemDetailScreen';
import RoadmapSuggestionsScreen from '../../screens/roadmap/RoadmapSuggestionsScreen';
import PublicRoadmapsScreen from '../../screens/roadmap/PublicRoadmapsScreen';

export type HomeStackParamList = {
    RoadmapScreen: undefined;
    EditRoadmapScreen: undefined;
    RoadmapItemDetailScreen: undefined;
    RoadmapSuggestionsScreen: undefined;
    PublicRoadmapsScreen: undefined;
};

const Stack = createNativeStackNavigator<HomeStackParamList>();


const RoadmapStack = () => {
    return (
        <Stack.Navigator initialRouteName="RoadmapScreen" screenOptions={{ headerShown: false }} id={undefined}>
            <Stack.Screen name="RoadmapScreen" component={RoadmapScreen} />
            <Stack.Screen name="EditRoadmapScreen" component={EditRoadmapScreen} />
            <Stack.Screen name="RoadmapItemDetailScreen" component={RoadmapItemDetailScreen} />
            <Stack.Screen name="RoadmapSuggestionsScreen" component={RoadmapSuggestionsScreen} />
            <Stack.Screen name="PublicRoadmapsScreen" component={PublicRoadmapsScreen} />
        </Stack.Navigator>
    );
}

export default RoadmapStack;
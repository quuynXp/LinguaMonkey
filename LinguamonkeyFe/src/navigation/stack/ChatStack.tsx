import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import CallSearchScreen from '../../screens/chat/CallSearchScreen';
import CallSetupScreen from '../../screens/chat/CallSetupScreen';
import ChatAIScreen from '../../screens/chat/ChatAIScreen';
import ChatRoomListScreen from '../../screens/chat/ChatRoomListScreen';
import ChatScreen from '../../screens/chat/ChatScreen';
import ChatSettingsScreen from '../../screens/chat/ChatSettingsScreen';
import CreateRoomScreen from '../../screens/chat/CreateRoomScreen';
import GroupStudyScreen from '../../screens/chat/GroupStudyScreen';
import JitsiCallScreen from '../../screens/chat/JitsiCallScreen';
import UserChatScreen from '../../screens/chat/UserChatSreen';
import VideoCallManagerScreen from '../../screens/chat/VideoCallManagerScreen';

const Stack = createNativeStackNavigator();

const ChatStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ChatMain" component={ChatScreen} />
    <Stack.Screen name="ChatAI" component={ChatAIScreen} />
    <Stack.Screen name="UserChat" component={UserChatScreen} />
    <Stack.Screen name="CallSetup" component={CallSetupScreen} />
    <Stack.Screen name="ChatSettings" component={ChatSettingsScreen} />
    <Stack.Screen name="ChatRoomList" component={ChatRoomListScreen} />
    <Stack.Screen name="CreateRoom" component={CreateRoomScreen} />
    <Stack.Screen name="CallSearch" component={CallSearchScreen} />
    <Stack.Screen name="VideoCallManagerScreen" component={VideoCallManagerScreen} />
    <Stack.Screen name="GroupStudy" component={GroupStudyScreen} />
    <Stack.Screen name="JitsiCall" component={JitsiCallScreen} />
  </Stack.Navigator>
);

export default ChatStack;

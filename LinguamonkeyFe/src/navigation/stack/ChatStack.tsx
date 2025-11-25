import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CallSearchScreen from '../../screens/chat/CallSearchScreen';
import CallSetupScreen from '../../screens/chat/CallSetupScreen';
import ChatAIScreen from '../../screens/chat/ChatAIScreen';
import ChatRoomListScreen from '../../screens/chat/ChatRoomListScreen';
import ChatScreen from '../../screens/chat/ChatScreen';
import ChatSettingsScreen from '../../screens/chat/ChatSettingsScreen';
import CreateRoomScreen from '../../screens/chat/CreateRoomScreen';
import JitsiCallScreen from '../../screens/chat/JitsiCallScreen';
import VideoCallManagerScreen from '../../screens/chat/VideoCallManagerScreen';
import GroupChatScreen from '../../screens/chat/GroupChatScreen';
import PrivateChatListScreen from '../../screens/chat/PrivateChatListScreen';

const Stack = createNativeStackNavigator();

const ChatStack = () => (
  <Stack.Navigator initialRouteName='ChatScreen' screenOptions={{ headerShown: false }} id={undefined}>
    <Stack.Screen name="ChatScreen" component={ChatScreen} />
    <Stack.Screen name="ChatAIScreen" component={ChatAIScreen} />
    <Stack.Screen name="CallSetupScreen" component={CallSetupScreen} />
    <Stack.Screen name="ChatSettingsScreen" component={ChatSettingsScreen} />
    <Stack.Screen name="ChatRoomListScreen" component={ChatRoomListScreen} />
    <Stack.Screen name="CreateRoomScreen" component={CreateRoomScreen} />
    <Stack.Screen name="CallSearchScreen" component={CallSearchScreen} />
    <Stack.Screen name="VideoCallManagerScreen" component={VideoCallManagerScreen} />
    <Stack.Screen name="JitsiCallScreen" component={JitsiCallScreen} />
    <Stack.Screen name="GroupChatScreen" component={GroupChatScreen} />
    <Stack.Screen name="PrivateChatListScreen" component={PrivateChatListScreen} />
  </Stack.Navigator>
);

export default ChatStack;

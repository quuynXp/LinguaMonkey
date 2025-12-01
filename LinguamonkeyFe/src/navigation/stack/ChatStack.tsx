import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ChatRoomListScreen from '../../screens/chat/ChatRoomListScreen';
import GroupChatScreen from '../../screens/chat/GroupChatScreen';
import ChatAIScreen from '../../screens/chat/ChatAIScreen';
import CreateRoomScreen from '../../screens/chat/CreateRoomScreen';
import CallSetupScreen from '../../screens/chat/CallSetupScreen';
import ChatSettingsScreen from '../../screens/chat/ChatSettingsScreen';
import PublicRoomListScreen from '../../screens/chat/PublicRoomListScreen';
import ChatScreen from '../../screens/chat/ChatScreen';
import CallSearchScreen from '../../screens/chat/CallSearchScreen';
import JitsiCallScreen from '../../screens/chat/JitsiCallScreen';
import VideoCallManagerScreen from '../../screens/chat/VideoCallManagerScreen';
import { useChatStore } from '../../stores/ChatStore';

const Stack = createNativeStackNavigator();

const ChatStack = () => {

  const initStompClient = useChatStore(state => state.initStompClient);

  useEffect(() => {
    initStompClient();
  }, [initStompClient]);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} id={undefined}>
      <Stack.Screen name="ChatScreen" component={ChatScreen} />
      <Stack.Screen name="ChatRoomListScreen" component={ChatRoomListScreen} />
      <Stack.Screen name="GroupChatScreen" component={GroupChatScreen} />
      <Stack.Screen name="ChatAIScreen" component={ChatAIScreen} />
      <Stack.Screen name="CreateRoomScreen" component={CreateRoomScreen} />
      <Stack.Screen name="CallSetupScreen" component={CallSetupScreen} />
      <Stack.Screen name="CallSearchScreen" component={CallSearchScreen} />
      <Stack.Screen name="JitsiCallScreen" component={JitsiCallScreen} />
      <Stack.Screen name="VideoCallManagerScreen" component={VideoCallManagerScreen} />
      <Stack.Screen name="ChatSettingsScreen" component={ChatSettingsScreen} />
      <Stack.Screen name="PublicRoomListScreen" component={PublicRoomListScreen} />
    </Stack.Navigator>
  );
};

export default ChatStack;
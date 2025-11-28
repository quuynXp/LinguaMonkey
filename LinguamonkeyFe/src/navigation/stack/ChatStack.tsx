import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useChatStore } from '../../stores/ChatStore';

// Screens
import ChatRoomListScreen from '../../screens/chat/ChatRoomListScreen';
import GroupChatScreen from '../../screens/chat/GroupChatScreen';
import ChatAIScreen from '../../screens/chat/ChatAIScreen';
import CreateRoomScreen from '../../screens/chat/CreateRoomScreen';
import CallSetupScreen from '../../screens/chat/CallSetupScreen';
import ChatSettingsScreen from '../../screens/chat/ChatSettingsScreen';
import PrivateChatListScreen from '../../screens/chat/PrivateChatListScreen';
import ChatScreen from '../../screens/chat/ChatScreen';

const Stack = createNativeStackNavigator();

const ChatStack = () => {
  const initChatService = useChatStore((state) => state.initChatService);
  const disconnectChatService = useChatStore((state) => state.disconnect);

  useEffect(() => {
    initChatService();

    return () => {
      disconnectChatService();
    };
  }, [initChatService, disconnectChatService]);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} id={undefined}>
      <Stack.Screen name="ChatScreen" component={ChatScreen} />
      <Stack.Screen name="ChatRoomListScreen" component={ChatRoomListScreen} />
      <Stack.Screen name="GroupChatScreen" component={GroupChatScreen} />
      <Stack.Screen name="ChatAIScreen" component={ChatAIScreen} />
      <Stack.Screen name="CreateRoomScreen" component={CreateRoomScreen} />
      <Stack.Screen name="CallSetupScreen" component={CallSetupScreen} />
      <Stack.Screen name="ChatSettingsScreen" component={ChatSettingsScreen} />
      <Stack.Screen name="PrivateChatListScreen" component={PrivateChatListScreen} />
    </Stack.Navigator>
  );
};

export default ChatStack;
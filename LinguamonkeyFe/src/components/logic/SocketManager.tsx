import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useUserStore } from '../../stores/UserStore';
import { useChatStore } from '../../stores/ChatStore';

const SocketManager = () => {
    const appState = useRef(AppState.currentState);
    const { user } = useUserStore();
    const { initStompClient, disconnectStompClient } = useChatStore();

    useEffect(() => {
        // Handle initial connection if user is already logged in
        if (user) {
            initStompClient();
        }

        // Handle App State changes (Background vs Foreground)
        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            if (
                appState.current.match(/inactive|background/) &&
                nextAppState === 'active'
            ) {
                // App came to foreground -> Reconnect
                console.log('App active, reconnecting socket...');
                if (user) initStompClient();
            } else if (nextAppState.match(/inactive|background/)) {
                // App went to background -> Disconnect to save battery/resources
                // OR: You can keep it alive if you need background updates, 
                // but usually Push Notification is preferred for background.
                console.log('App background, disconnecting socket...');
                disconnectStompClient();
            }

            appState.current = nextAppState;
        });

        return () => {
            subscription.remove();
            disconnectStompClient();
        };
    }, [user, initStompClient, disconnectStompClient]);

    return null;
};

export default SocketManager;
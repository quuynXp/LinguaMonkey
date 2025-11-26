import { LogBox, StyleSheet } from 'react-native';

if (__DEV__) {
    const ignoreWarns = [
        'new NativeEventEmitter() was called with a non-null argument without the required `addListener` method.',
        'new NativeEventEmitter() was called with a non-null argument without the required `removeListeners` method.',
    ];

    const warn = console.warn;
    console.warn = (...arg) => {
        for (const warning of ignoreWarns) {
            if (arg[0].startsWith(warning)) {
                return;
            }
        }
        warn(...arg);
    };

    LogBox.ignoreLogs(ignoreWarns);
}
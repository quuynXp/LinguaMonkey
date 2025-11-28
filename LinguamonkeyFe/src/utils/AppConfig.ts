import { LogBox, NativeEventEmitter } from 'react-native';

const eventEmitterPrototype = NativeEventEmitter.prototype as any;

const originalAddListener = eventEmitterPrototype.addListener;
const originalRemoveListeners = eventEmitterPrototype.removeListeners;

eventEmitterPrototype.addListener = function (eventType: string, listener: any, context: any) {
    if (this._nativeModule && !this._nativeModule.addListener) {
        this._nativeModule.addListener = (_event: any) => { };
    }
    if (this._nativeModule && !this._nativeModule.removeListeners) {
        this._nativeModule.removeListeners = (_count: number) => { };
    }
    return originalAddListener.call(this, eventType, listener, context);
};

eventEmitterPrototype.removeListeners = function (count: number) {
    if (this._nativeModule && !this._nativeModule.removeListeners) {
        this._nativeModule.removeListeners = (_count: number) => { };
    }

    if (originalRemoveListeners) {
        return originalRemoveListeners.call(this, count);
    }
};

if (__DEV__) {
    const ignoreWarns = [
        'new NativeEventEmitter() was called with a non-null argument',
        'This method is deprecated',
        'fcm-token',
        'EventEmitter.removeListener',
        'ViewPropTypes will be removed',
        'Non-serializable values were found',
    ];

    const originalWarn = console.warn;
    console.warn = (...args) => {
        const log = args[0];
        if (typeof log === 'string') {
            for (const warning of ignoreWarns) {
                if (log.includes(warning)) {
                    return;
                }
            }
        }
        originalWarn(...args);
    };

    LogBox.ignoreLogs(ignoreWarns);
}
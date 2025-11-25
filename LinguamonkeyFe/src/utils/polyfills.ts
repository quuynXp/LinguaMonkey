import { LogBox, NativeEventEmitter } from 'react-native';

const originalRegister = NativeEventEmitter.prototype.addListener;

// Fix lỗi: "new NativeEventEmitter() was called with a non-null argument without the required addListener method."
NativeEventEmitter.prototype.addListener = function (eventType, listener, context) {
    if (this._nativeModule && !this._nativeModule.addListener) {
        this._nativeModule.addListener = (_event: any) => { };
        this._nativeModule.removeListeners = (_count: number) => { };
    }
    // @ts-ignore
    return originalRegister.call(this, eventType, listener, context);
};

LogBox.ignoreLogs([
    "`new NativeEventEmitter()` was called with a non-null argument",
    "This method is deprecated",
    "fcm-token",
]);
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import TransactionHistoryScreen from '../../screens/payment/TransactionHistoryScreen';
import TransactionDetailsScreen from '../../screens/payment/TransactionDetailsScreen';
import WalletScreen from '../../screens/payment/WalletScreen';
import TopUpScreen from '../../screens/payment/TopUpScreen';
import WithdrawScreen from '../../screens/payment/WithdrawScreen';

export type PaymentStackParamList = {
    WalletScreen: undefined;
    TopUpScreen: undefined;
    WithdrawScreen: undefined;
    TransactionHistoryScreen: undefined;
    TransactionDetailsScreen: undefined;
};

const Stack = createNativeStackNavigator<PaymentStackParamList>();

const PaymentStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }} id={undefined}>
        <Stack.Screen name="WalletScreen" component={WalletScreen} />
        <Stack.Screen name="TopUpScreen" component={TopUpScreen} />
        <Stack.Screen name="WithdrawScreen" component={WithdrawScreen} />
        <Stack.Screen name="TransactionHistoryScreen" component={TransactionHistoryScreen} />
        <Stack.Screen name="TransactionDetailsScreen" component={TransactionDetailsScreen} />
    </Stack.Navigator>
);

export default PaymentStack;

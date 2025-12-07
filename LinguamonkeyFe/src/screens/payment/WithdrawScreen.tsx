import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { createScaledSheet } from '../../utils/scaledStyles';
import ScreenLayout from '../../components/layout/ScreenLayout';
import { useUserStore } from '../../stores/UserStore';
import { useWallet, walletKeys } from '../../hooks/useWallet';
import * as Enums from '../../types/enums';
import { WithdrawRequest } from '../../types/dto';
import { useCurrencyConverter } from '../../hooks/useCurrencyConverter';
import { useQueryClient } from '@tanstack/react-query';

const WithdrawScreen = ({ navigation }: any) => {
    const { t } = useTranslation();
    const { user } = useUserStore();
    const formatCurrency = useCurrencyConverter().convert;
    const withdrawMutation = useWallet().useWithdraw();
    const queryClient = useQueryClient();

    const {
        data: walletData,
        isLoading: loadingBalance
    } = useWallet().useWalletBalance(user?.userId);

    const [amountText, setAmountText] = useState('');
    const [bankCode, setBankCode] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [accountName, setAccountName] = useState('');

    const availableBalance = walletData?.balance || 0;

    const MIN_WITHDRAWAL = 1000;

    const handleWithdraw = async () => {
        const userId = user?.userId;

        if (!userId || loadingBalance) {
            return Alert.alert(t('errors.auth') ?? 'Error', t('errors.userNotFound') ?? 'User not ready or session expired.');
        }

        const amount = parseFloat(amountText.replace(/,/g, ''));

        if (isNaN(amount) || amount < MIN_WITHDRAWAL || amount > availableBalance) {
            return Alert.alert(
                t('withdraw.error.invalidAmount') ?? 'Invalid Amount',
                t('withdraw.error.amountDetails', { available: formatCurrency(availableBalance, 'USD'), min: formatCurrency(MIN_WITHDRAWAL, 'USD') }) ?? `Minimum withdrawal is ${formatCurrency(MIN_WITHDRAWAL, 'USD')}. Available: ${formatCurrency(availableBalance, 'USD')}.`
            );
        }

        if (!bankCode.trim() || !accountNumber.trim() || !accountName.trim()) {
            return Alert.alert(
                t('withdraw.error.invalidBank') ?? 'Error',
                t('withdraw.error.bankDetailsRequired') ?? 'Please enter all bank details (Bank Code, Account Number, Account Name).'
            );
        }

        Alert.alert(
            t('withdraw.confirmTitle') ?? 'Confirm Withdrawal',
            t('withdraw.confirmMessage', { amount: formatCurrency(amount, 'USD'), accountName: accountName }),
            [
                { text: t('common.cancel') ?? 'Cancel', style: 'cancel' },
                {
                    text: t('common.confirm') ?? 'Confirm',
                    onPress: async () => {
                        try {
                            const payload: WithdrawRequest = {
                                userId: userId as any,
                                amount: amount,
                                provider: Enums.TransactionProvider.INTERNAL,
                                bankCode: bankCode.trim(),
                                accountNumber: accountNumber.trim(),
                                accountName: accountName.trim(),
                            };

                            await withdrawMutation.mutateAsync(payload);

                            queryClient.invalidateQueries({ queryKey: walletKeys.balance(userId) });
                            queryClient.invalidateQueries({ queryKey: walletKeys.history(userId, {}) });

                            Alert.alert(
                                t('withdraw.successTitle') ?? 'Success',
                                t('withdraw.successMessage') ?? 'Your withdrawal request has been submitted.'
                            );
                            navigation.goBack();

                        } catch (error: any) {
                            const errorMessage = error.response?.data?.message || error.message || 'An unknown error occurred.';
                            Alert.alert(t('errors.api') ?? 'Withdrawal failed.', errorMessage);
                        }
                    },
                },
            ]
        );
    };

    if (loadingBalance) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4F46E5" />
                <Text style={styles.loadingText}>{t('wallet.loading')}</Text>
            </View>
        );
    }

    const isSubmitDisabled = withdrawMutation.isPending || !amountText.trim() || !bankCode.trim() || !accountNumber.trim() || !accountName.trim();

    return (
        <ScreenLayout>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-back" size={24} color="#374151" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('withdraw.title') ?? 'Withdraw'}</Text>
                <View style={styles.placeholder} />
            </View>

            <View style={styles.container}>
                <View style={styles.balanceInfo}>
                    <Text style={styles.availableLabel}>{t('withdraw.availableBalance') ?? 'Available Balance'}:</Text>
                    <Text style={styles.availableAmount}>{formatCurrency(availableBalance, 'USD')}</Text>
                </View>

                <Text style={styles.label}>{t('withdraw.amountLabel') ?? 'Amount to withdraw'}</Text>
                <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={amountText}
                    onChangeText={setAmountText}
                    placeholder={t('withdraw.amountPlaceholder') ?? `Min: ${formatCurrency(MIN_WITHDRAWAL, 'USD')}`}
                />

                <Text style={styles.label}>{t('withdraw.bankCodeLabel') ?? 'Bank Code (e.g., VCB, TCB)'}</Text>
                <TextInput
                    style={styles.input}
                    value={bankCode}
                    onChangeText={setBankCode}
                    placeholder={t('withdraw.bankCodePlaceholder') ?? 'Enter Bank Code'}
                    autoCapitalize="characters"
                />

                <Text style={styles.label}>{t('withdraw.accountNumberLabel') ?? 'Account Number'}</Text>
                <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={accountNumber}
                    onChangeText={setAccountNumber}
                    placeholder={t('withdraw.accountNumberPlaceholder') ?? 'Enter Account Number'}
                />

                <Text style={styles.label}>{t('withdraw.accountNameLabel') ?? 'Account Holder Name'}</Text>
                <TextInput
                    style={styles.input}
                    value={accountName}
                    onChangeText={setAccountName}
                    placeholder={t('withdraw.accountNamePlaceholder') ?? 'Enter Account Holder Name'}
                    autoCapitalize="words"
                />

                <Text style={styles.note}>{t('withdraw.note') ?? 'Note: Withdrawal requests are processed within 1-3 business days.'}</Text>

                <TouchableOpacity
                    style={[styles.btn, isSubmitDisabled ? styles.btnDisabled : null]}
                    onPress={handleWithdraw}
                    disabled={isSubmitDisabled}
                >
                    {withdrawMutation.isPending ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.btnText}>{t('withdraw.submit') ?? 'Submit Request'}</Text>
                    )}
                </TouchableOpacity>
            </View>
        </ScreenLayout>
    );
};

const styles = createScaledSheet({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
    placeholder: { width: 24 },

    container: { flex: 1, padding: 20, backgroundColor: '#F8FAFC' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
    loadingText: { marginTop: 10, fontSize: 16, color: '#4F46E5' },

    balanceInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 15,
        backgroundColor: '#E0E7FF',
        borderRadius: 10,
        marginBottom: 20,
    },
    availableLabel: { fontSize: 14, color: '#4F46E5', fontWeight: '500' },
    availableAmount: { fontSize: 16, color: '#4F46E5', fontWeight: 'bold' },

    label: { fontSize: 14, color: '#374151', marginBottom: 8, marginTop: 15, fontWeight: '500' },
    input: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#1F2937',
        backgroundColor: '#fff',
    },
    note: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 15,
        marginBottom: 10,
    },
    btn: {
        backgroundColor: '#4F46E5',
        padding: 15,
        borderRadius: 8,
        marginTop: 30,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    btnDisabled: {
        backgroundColor: '#A5B4FC',
    },
    btnText: { color: '#fff', fontWeight: '600', fontSize: 16 }
});

export default WithdrawScreen;
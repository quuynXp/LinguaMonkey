import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { createScaledSheet } from '../../utils/scaledStyles';
import ScreenLayout from '../../components/layout/ScreenLayout';
import { useUserStore } from '../../stores/UserStore';
import { useWallet } from '../../hooks/useWallet';
import { formatCurrency } from '../../utils/currency';
import * as Enums from '../../types/enums';
import { WithdrawRequest } from '../../types/dto';

const parseBankInfo = (info: string) => {
    const parts = info.split('-').map(p => p.trim());
    return {
        bankCode: parts[0] || 'UNKNOWN_BANK',
        accountNumber: parts[1] || '',
        accountName: parts[2] || '',
    };
};

const WithdrawScreen = ({ navigation }) => {
    const { t } = useTranslation();
    const { user } = useUserStore();
    const withdrawMutation = useWallet().useWithdraw();

    const {
        data: walletData,
        isLoading: loadingBalance
    } = useWallet().useWalletBalance(user?.userId);

    const [amountText, setAmountText] = useState('');
    const [bankInfo, setBankInfo] = useState('');

    const availableBalance = walletData?.balance || 0;

    const MIN_WITHDRAWAL = 1;
    const handleWithdraw = async () => {
        if (!user?.userId || loadingBalance) {
            return Alert.alert(t('errors.auth') ?? 'Error', t('errors.userNotFound') ?? 'User not ready.');
        }

        const amount = parseFloat(amountText.replace(/,/g, ''));

        if (isNaN(amount) || amount < MIN_WITHDRAWAL || amount > availableBalance) {
            return Alert.alert(
                t('withdraw.error.invalidAmount') ?? 'Invalid Amount',
                t('withdraw.error.amountDetails', { available: formatCurrency(availableBalance) })
            );
        }

        const bankDetails = parseBankInfo(bankInfo);

        if (!bankDetails.accountNumber || !bankDetails.accountName) {
            return Alert.alert(t('withdraw.error.invalidBank') ?? 'Error', t('withdraw.error.bankDetailsRequired') ?? 'Please enter valid bank details (Bank - Account - Name).');
        }

        Alert.alert(
            t('withdraw.confirmTitle') ?? 'Confirm Withdrawal',
            t('withdraw.confirmMessage', { amount: formatCurrency(amount), bank: bankDetails.accountName }),
            [
                { text: t('common.cancel') ?? 'Cancel', style: 'cancel' },
                {
                    text: t('common.confirm') ?? 'Confirm',
                    onPress: async () => {
                        try {
                            const payload: WithdrawRequest = {
                                userId: user.userId,
                                amount: amount,
                                provider: Enums.TransactionProvider.INTERNAL, // Giả định INTERNAL là nhà cung cấp cho chuyển khoản
                                bankCode: bankDetails.bankCode,
                                accountNumber: bankDetails.accountNumber,
                                accountName: bankDetails.accountName,
                            };

                            await withdrawMutation.mutateAsync(payload);

                            Alert.alert(
                                t('withdraw.successTitle') ?? 'Success',
                                t('withdraw.successMessage') ?? 'Your withdrawal request has been submitted.'
                            );
                            navigation.goBack();

                        } catch (error: any) {
                            Alert.alert(t('errors.api') ?? 'Withdrawal failed.');
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
                    <Text style={styles.availableAmount}>{formatCurrency(availableBalance)}</Text>
                </View>

                <Text style={styles.label}>{t('withdraw.amountLabel') ?? 'Amount to withdraw'}</Text>
                <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={amountText}
                    onChangeText={setAmountText}
                    placeholder={t('withdraw.amountPlaceholder') ?? 'Enter amount'}
                />

                <Text style={styles.label}>{t('withdraw.bankInfoLabel') ?? 'Bank Details / Account No.'}</Text>
                <TextInput
                    style={[styles.input, styles.bankInfoInput]}
                    multiline
                    value={bankInfo}
                    onChangeText={setBankInfo}
                    placeholder={t('withdraw.bankInfoPlaceholder') ?? 'Bank Name - Account Number - Account Holder Name'}
                    textAlignVertical="top"
                />

                <Text style={styles.note}>{t('withdraw.note') ?? 'Note: Withdrawal requests are processed within 1-3 business days.'}</Text>

                <TouchableOpacity
                    style={[styles.btn, withdrawMutation.isPending || !amountText.trim() || !bankInfo.trim() ? styles.btnDisabled : null]}
                    onPress={handleWithdraw}
                    disabled={withdrawMutation.isPending || !amountText.trim() || !bankInfo.trim()}
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

// Sử dụng createScaledSheet cho đồng bộ
const styles = createScaledSheet({
    // Header
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

    // Content
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
    bankInfoInput: {
        height: 100,
        paddingTop: 12,
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
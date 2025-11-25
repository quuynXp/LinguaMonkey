import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, Keyboard } from 'react-native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useUserStore } from '../../stores/UserStore';
import { useWallet } from '../../hooks/useWallet';
import { createScaledSheet } from '../../utils/scaledStyles';
import ScreenLayout from '../../components/layout/ScreenLayout';
import { TransferRequest } from '../../types/dto';

const TransferScreen = ({ navigation }) => {
    const { t } = useTranslation();
    const { user } = useUserStore();
    const transferMutation = useWallet().useTransfer();
    const { data: walletData } = useWallet().useWalletBalance(user?.userId);

    const [receiverId, setReceiverId] = useState('');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');

    const handleTransfer = () => {
        if (!user?.userId) return;
        const transferAmount = parseFloat(amount.replace(/[^0-9]/g, ''));

        if (!receiverId.trim()) {
            Alert.alert(t('common.error'), t('transfer.receiverRequired'));
            return;
        }
        if (isNaN(transferAmount) || transferAmount <= 0) {
            Alert.alert(t('common.error'), t('transfer.invalidAmount'));
            return;
        }
        if (transferAmount > (walletData?.balance || 0)) {
            Alert.alert(t('common.error'), t('transfer.insufficientBalance'));
            return;
        }
        if (receiverId === user.userId) {
            Alert.alert(t('common.error'), t('transfer.selfTransfer'));
            return;
        }

        Alert.alert(
            t('transfer.confirmTitle'),
            t('transfer.confirmMessage', { amount: transferAmount.toLocaleString(), receiver: receiverId }),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.confirm'),
                    onPress: () => executeTransfer(transferAmount)
                }
            ]
        );
    };

    const executeTransfer = (transferAmount: number) => {
        const payload: TransferRequest = {
            senderId: user!.userId,
            receiverId: receiverId.trim(),
            amount: transferAmount,
            description: description || 'Money Transfer',
            idempotencyKey: `${user!.userId}-${Date.now()}` // Simple key gen
        };

        transferMutation.mutate(payload, {
            onSuccess: () => {
                Alert.alert(t('common.success'), t('transfer.success'));
                navigation.goBack();
            },
            onError: (error: any) => {
                // Xử lý lỗi từ backend (ví dụ: User not found)
                const msg = error?.response?.data?.message || t('transfer.failed');
                Alert.alert(t('common.error'), msg);
            }
        });
    };

    return (
        <ScreenLayout style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('transfer.title')}</Text>
                <View style={styles.placeholder} />
            </View>

            <View style={styles.content}>
                {/* Balance Card */}
                <View style={styles.balanceCard}>
                    <Text style={styles.balanceLabel}>{t('wallet.availableBalance')}</Text>
                    <Text style={styles.balanceValue}>{walletData?.balance.toLocaleString()} VND</Text>
                </View>

                {/* Form */}
                <View style={styles.form}>
                    <Text style={styles.label}>{t('transfer.receiverId')}</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="UUID"
                        value={receiverId}
                        onChangeText={setReceiverId}
                        autoCapitalize="none"
                    />

                    <Text style={styles.label}>{t('transfer.amount')}</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="0"
                        keyboardType="numeric"
                        value={amount}
                        onChangeText={setAmount}
                    />

                    <Text style={styles.label}>{t('transfer.message')}</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder={t('transfer.messagePlaceholder')}
                        multiline
                        value={description}
                        onChangeText={setDescription}
                    />

                    <TouchableOpacity
                        style={[styles.button, transferMutation.isPending && styles.buttonDisabled]}
                        onPress={() => {
                            Keyboard.dismiss();
                            handleTransfer();
                        }}
                        disabled={transferMutation.isPending}
                    >
                        {transferMutation.isPending ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.buttonText}>{t('transfer.sendNow')}</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </ScreenLayout>
    );
};

const styles = createScaledSheet({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 16, backgroundColor: '#FFF' },
    headerTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
    placeholder: { width: 24 },
    content: { flex: 1, padding: 20 },

    balanceCard: { backgroundColor: '#4F46E5', borderRadius: 12, padding: 20, marginBottom: 24, alignItems: 'center' },
    balanceLabel: { color: '#E0E7FF', fontSize: 14, marginBottom: 4 },
    balanceValue: { color: '#FFF', fontSize: 24, fontWeight: '700' },

    form: { backgroundColor: '#FFF', borderRadius: 12, padding: 20 },
    label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 },
    input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, fontSize: 16, color: '#1F2937', marginBottom: 16 },
    textArea: { height: 80, textAlignVertical: 'top' },

    button: { backgroundColor: '#4F46E5', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 8 },
    buttonDisabled: { backgroundColor: '#9CA3AF' },
    buttonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});

export default TransferScreen;
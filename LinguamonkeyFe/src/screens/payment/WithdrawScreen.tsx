import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

const WithdrawScreen = () => {
    const [amount, setAmount] = useState('');
    const [bankInfo, setBankInfo] = useState('');

    const handleWithdraw = () => {
        // Gọi API WithdrawRequest (tham chiếu đến WithdrawRequest DTO)
        console.log('Yêu cầu rút tiền:', amount, bankInfo);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Rút tiền về tài khoản</Text>

            <Text style={styles.label}>Số tiền muốn rút</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={amount} onChangeText={setAmount} placeholder="Nhập số tiền" />

            <Text style={styles.label}>Thông tin ngân hàng / STK</Text>
            <TextInput
                style={[styles.input, { height: 80 }]}
                multiline
                value={bankInfo}
                onChangeText={setBankInfo}
                placeholder="Tên NH - Số TK - Chủ TK"
            />

            <TouchableOpacity style={styles.btn} onPress={handleWithdraw}>
                <Text style={styles.btnText}>Gửi yêu cầu</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#fff' },
    title: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
    label: { fontSize: 16, marginTop: 15, marginBottom: 5 },
    input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10 },
    btn: { backgroundColor: '#FF9500', padding: 15, borderRadius: 8, marginTop: 30, alignItems: 'center' },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});

export default WithdrawScreen;
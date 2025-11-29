import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '../../stores/UserStore';
import instance from '../../api/axiosClient';
import { gotoTab } from '../../utils/navigationRef';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createScaledSheet } from '../../utils/scaledStyles';
import * as Enums from '../../types/enums';
import { getCountryFlag } from '../../utils/flagUtils';

const ENUM_OPTIONS = {
  country: Object.values(Enums.Country).map(v => ({
    value: v,
    label: v.replace(/_/g, ' '),
    flag: getCountryFlag(v)
  })),
  learningPace: Object.values(Enums.LearningPace).map(v => ({
    value: v,
    label: v.charAt(0) + v.slice(1).toLowerCase()
  })),
  proficiency: Object.values(Enums.ProficiencyLevel).map(v => ({
    value: v,
    label: v
  })),
  gender: Object.values(Enums.Gender).map(v => ({
    value: v,
    label: v.charAt(0) + v.slice(1).toLowerCase()
  })),
};

const OptionModal = ({ visible, onClose, options, onSelect, title, t }: any) => (
  <Modal visible={visible} animationType="slide" transparent>
    <View style={styles.modalWrap}>
      <View style={styles.modalCard}>
        <Text style={styles.modalTitle}>{title}</Text>
        <FlatList
          data={options}
          keyExtractor={(i: any) => i.value}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.optionRow} onPress={() => { onSelect(item); onClose(); }}>
              {item.flag && <Text style={{ marginRight: 8, fontSize: 20 }}>{item.flag}</Text>}
              <Text style={styles.optionText}>{item.label}</Text>
            </TouchableOpacity>
          )}
        />
        <TouchableOpacity style={styles.modalClose} onPress={onClose}>
          <Text style={styles.modalCloseText}>{t('common.close') ?? 'Close'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const DatePickerModal = ({ visible, onClose, onSelect, currentDate, t }: any) => {
  const [day, setDay] = useState(currentDate ? currentDate.getDate() : 1);
  const [month, setMonth] = useState(currentDate ? currentDate.getMonth() + 1 : 1);
  const [year, setYear] = useState(currentDate ? currentDate.getFullYear() : 2000);

  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i);

  const handleConfirm = () => {
    const validDate = new Date(year, month - 1, day);
    if (validDate.getMonth() + 1 !== month) {
      onSelect(new Date(year, month, 0));
    } else {
      onSelect(validDate);
    }
    onClose();
  };

  const PickerColumn = ({ data, selected, onSelectVal, suffix }: any) => (
    <View style={styles.pickerColumn}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {data.map((item: number) => (
          <TouchableOpacity
            key={item}
            style={[styles.pickerItem, selected === item && styles.pickerItemSelected]}
            onPress={() => onSelectVal(item)}
          >
            <Text style={[styles.pickerText, selected === item && styles.pickerTextSelected]}>
              {item < 10 ? `0${item}` : item}{suffix}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.modalWrap}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{t('profile.selectDateOfBirth') ?? 'Select Date of Birth'}</Text>
          <View style={{ flexDirection: 'row', height: 200, marginBottom: 20 }}>
            <PickerColumn data={days} selected={day} onSelectVal={setDay} suffix="" />
            <PickerColumn data={months} selected={month} onSelectVal={setMonth} suffix="/" />
            <PickerColumn data={years} selected={year} onSelectVal={setYear} suffix="" />
          </View>
          <TouchableOpacity style={styles.saveBtn} onPress={handleConfirm}>
            <Text style={styles.saveBtnText}>{t('common.confirm') ?? 'Confirm'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.modalClose} onPress={onClose}>
            <Text style={styles.modalCloseText}>{t('common.close') ?? 'Close'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const ConfirmDeleteModal = ({ visible, onClose, onDelete, t, remainingDays }: any) => (
  <Modal visible={visible} animationType="fade" transparent>
    <View style={styles.confirmModalWrap}>
      <View style={styles.confirmModalCard}>
        <Text style={styles.confirmModalTitle}>{t('profile.deactivateAccount') ?? 'Deactivate Account'}</Text>
        <Text style={styles.confirmModalText}>
          {t('profile.deactivateWarning', { days: remainingDays }) ?? `Your account will be deactivated and permanently deleted after ${remainingDays} days if not restored. Are you sure?`}
        </Text>
        <View style={styles.confirmButtonGroup}>
          <TouchableOpacity style={styles.confirmCancelBtn} onPress={onClose}>
            <Text style={styles.confirmCancelBtnText}>{t('common.cancel') ?? 'Cancel'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmDeleteBtn} onPress={onDelete}>
            <Text style={styles.confirmDeleteBtnText}>{t('common.confirm') ?? 'Confirm'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

const EditProfileScreen: React.FC = () => {
  const { t } = useTranslation();
  const { user, saveProfileToServer, logout } = useUserStore();
  const [local, setLocal] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<{ key?: keyof typeof ENUM_OPTIONS, visible: boolean }>({ visible: false });
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [isProcessingDelete, setIsProcessingDelete] = useState(false);

  useEffect(() => {
    if (user) {
      setLocal({
        fullname: user.fullname ?? '',
        nickname: user.nickname ?? '',
        bio: user.bio ?? '',
        country: user.country ?? null,
        email: user?.email ?? '',
        dayOfBirth: user.dayOfBirth ? new Date(user.dayOfBirth) : null,
        learningPace: user.learningPace ?? null,
        proficiency: user.proficiency ?? null,
        phone: user.phone ?? '',
        gender: user.gender ?? null,
        vip: user.vip ?? false,
        userId: user.userId,
      });
    }
  }, [user]);

  const showPicker = (key: keyof typeof ENUM_OPTIONS) => setModal({ key, visible: true });
  const closePicker = () => setModal({ visible: false });

  const onSelectOption = (item: { value: string, label: string }) => {
    if (!modal.key) return;
    setLocal((s: any) => ({ ...s, [modal.key!]: item.value }));
  };

  const handleDateSelect = (date: Date) => {
    setLocal((s: any) => ({ ...s, dayOfBirth: date }));
  };

  const handleLinkProvider = (provider: string) => {
    Alert.alert(t('profile.linkAccount'), `Feature to link ${provider} is coming soon.`);
  };

  const handleSave = async () => {
    if (!user?.userId || !local) return Alert.alert(t('errors.missingData') ?? 'Error', t('errors.userNotFound') ?? 'User data not loaded');
    setSaving(true);

    try {
      const payload: any = {
        fullname: local.fullname,
        nickname: local.nickname,
        bio: local.bio,
        phone: local.phone,
        country: local.country,
        learningPace: local.learningPace,
        proficiency: local.proficiency,
        gender: local.gender,
        dayOfBirth: local.dayOfBirth ? local.dayOfBirth.toISOString().split('T')[0] : null,
      };

      await saveProfileToServer(user.userId, payload);

      Alert.alert(t('profile.saved') ?? 'Saved', t('profile.savedSuccess') ?? 'Profile updated');
      gotoTab('Profile', 'ProfileScreen');

    } catch (err: any) {
      Alert.alert(t('errors.server') ?? 'Save failed', err?.response?.data?.message || 'Please try again later.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = () => {
    gotoTab("AuthStack", "ResetPasswordScreen");
  };

  const handleDeactivateAccount = async () => {
    if (!user?.userId) return;
    setIsProcessingDelete(true);
    setDeleteModalVisible(false);

    try {
      const daysToKeep = 30;
      await instance.delete(`/api/v1/users/${user.userId}/deactivate`, {
        params: { daysToKeep: daysToKeep }
      });

      Alert.alert(
        t('profile.deactivateSuccessTitle') ?? 'Account Deactivated',
        t('profile.deactivateSuccessMessage', { days: daysToKeep }) ?? `Tài khoản của bạn đã bị vô hiệu hóa và sẽ bị xóa vĩnh viễn sau ${daysToKeep} ngày. Đang đăng xuất...`,
      );
      logout();

    } catch (err: any) {
      Alert.alert(t('errors.server') ?? 'Deactivation failed', err?.response?.data?.message || 'Vui lòng thử lại sau.');
    } finally {
      setIsProcessingDelete(false);
    }
  };

  const currentOptions = useMemo(() => {
    if (!modal.key) return [];
    return ENUM_OPTIONS[modal.key];
  }, [modal.key]);

  const getDisplayValue = (key: keyof typeof ENUM_OPTIONS, value: string | null) => {
    if (!value) return t('common.select') ?? 'Select';
    const translatedValue = t(`enums.${key}.${value}`, { defaultValue: value });
    return translatedValue;
  };

  if (!local) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#4F46E5" />;

  const isEmailAuth = user?.authProvider === 'EMAIL';
  const isGoogleAuth = user?.authProvider === 'GOOGLE';
  const isFacebookAuth = user?.authProvider === 'FACEBOOK';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={styles.card}>
          <Text style={styles.title}>{t('profile.editProfile') ?? 'Edit profile'}</Text>

          {/* User ID (Read-only) */}
          <View style={styles.field}>
            <Text style={styles.label}>User ID</Text>
            <TextInput value={local.userId} style={[styles.input, styles.readOnlyInput]} editable={false} />
          </View>

          {/* VIP Status (Read-only) */}
          <View style={styles.field}>
            <Text style={styles.label}>VIP Status</Text>
            <View style={[styles.input, styles.readOnlyInput, { flexDirection: 'row', justifyContent: 'space-between' }]}>
              <Text style={{ color: local.vip ? '#D97706' : '#9CA3AF', fontWeight: 'bold' }}>
                {local.vip ? 'ACTIVE VIP' : 'FREE ACCOUNT'}
              </Text>
              {local.vip && <Icon name="verified" size={20} color="#D97706" />}
            </View>
          </View>

          {/* Email (Read-only) */}
          <View style={styles.field}>
            <Text style={styles.label}>{t('profile.email') ?? 'Email'}</Text>
            <TextInput value={local.email} style={[styles.input, styles.readOnlyInput]} editable={false} />
          </View>

          {/* Full name */}
          <View style={styles.field}>
            <Text style={styles.label}>{t('profile.fullname') ?? 'Full name'}</Text>
            <TextInput value={local.fullname} onChangeText={(v) => setLocal((s: any) => ({ ...s, fullname: v }))} style={styles.input} />
          </View>

          {/* Nickname */}
          <View style={styles.field}>
            <Text style={styles.label}>{t('profile.nickname') ?? 'Nickname'}</Text>
            <TextInput value={local.nickname} onChangeText={(v) => setLocal((s: any) => ({ ...s, nickname: v }))} style={styles.input} />
          </View>

          {/* Bio */}
          <View style={styles.field}>
            <Text style={styles.label}>{t('profile.bio') ?? 'Bio'}</Text>
            <TextInput multiline numberOfLines={3} value={local.bio} onChangeText={(v) => setLocal((s: any) => ({ ...s, bio: v }))} style={[styles.input, styles.bioInput]} />
          </View>

          {/* Phone */}
          <View style={styles.field}>
            <Text style={styles.label}>{t('profile.phone') ?? 'Phone'}</Text>
            <TextInput value={local.phone} keyboardType="phone-pad" onChangeText={(v) => setLocal((s: any) => ({ ...s, phone: v }))} style={styles.input} />
          </View>

          {/* Date of Birth */}
          <TouchableOpacity style={styles.fieldRow} onPress={() => setDateModalVisible(true)}>
            <Text style={styles.label}>{t('profile.dayOfBirth') ?? 'Date of Birth'}</Text>
            <View style={styles.pillRight}>
              <Text style={styles.rightText}>
                {local.dayOfBirth ? local.dayOfBirth.toLocaleDateString() : (t('common.select') ?? 'Select')}
              </Text>
              <Icon name="calendar-today" size={20} color="#9CA3AF" />
            </View>
          </TouchableOpacity>

          {/* Gender */}
          <TouchableOpacity style={styles.fieldRow} onPress={() => showPicker('gender')}>
            <Text style={styles.label}>{t('profile.gender') ?? 'Gender'}</Text>
            <View style={styles.pillRight}>
              <Text style={styles.rightText}>{getDisplayValue('gender', local.gender)}</Text>
              <Icon name="chevron-right" size={20} color="#9CA3AF" />
            </View>
          </TouchableOpacity>

          {/* Country */}
          <TouchableOpacity style={styles.fieldRow} onPress={() => showPicker('country')}>
            <Text style={styles.label}>{t('profile.country') ?? 'Country'}</Text>
            <View style={styles.pillRight}>
              <Text style={styles.flagStyle}>
                {getCountryFlag(local.country)}
              </Text>
              <Text style={styles.rightText}>{getDisplayValue('country', local.country)}</Text>
              <Icon name="chevron-right" size={20} color="#9CA3AF" />
            </View>
          </TouchableOpacity>

          {/* Learning Pace */}
          <TouchableOpacity style={styles.fieldRow} onPress={() => showPicker('learningPace')}>
            <Text style={styles.label}>{t('profile.learningPace') ?? 'Learning pace'}</Text>
            <View style={styles.pillRight}>
              <Text style={styles.rightText}>{getDisplayValue('learningPace', local.learningPace)}</Text>
              <Icon name="chevron-right" size={20} color="#9CA3AF" />
            </View>
          </TouchableOpacity>

          {/* Proficiency */}
          <TouchableOpacity style={styles.fieldRow} onPress={() => showPicker('proficiency')}>
            <Text style={styles.label}>{t('profile.proficiency') ?? 'Proficiency'}</Text>
            <View style={styles.pillRight}>
              <Text style={styles.rightText}>{getDisplayValue('proficiency', local.proficiency)}</Text>
              <Icon name="chevron-right" size={20} color="#9CA3AF" />
            </View>
          </TouchableOpacity>

          <View style={styles.buttonGroup}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{t('profile.save') ?? 'Save'}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => gotoTab('Profile', "ProfileScreen")}>
              <Text style={styles.cancelBtnText}>{t('profile.cancel') ?? 'Cancel'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.actionCard}>
          <Text style={styles.title}>{t('profile.linkedAccounts') ?? 'Linked Accounts'}</Text>

          <View style={styles.linkedRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="email" size={24} color={isEmailAuth ? "#4F46E5" : "#9CA3AF"} />
              <Text style={[styles.linkedText, isEmailAuth && styles.linkedTextActive]}>Email</Text>
            </View>
            {isEmailAuth && <Text style={styles.connectedBadge}>{t('common.connected') ?? 'Connected'}</Text>}
          </View>

          <TouchableOpacity style={styles.linkedRow} onPress={() => !isGoogleAuth && handleLinkProvider("Google")} disabled={isGoogleAuth}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="language" size={24} color={isGoogleAuth ? "#DB4437" : "#9CA3AF"} />
              <Text style={[styles.linkedText, isGoogleAuth && styles.linkedTextActive]}>Google</Text>
            </View>
            {isGoogleAuth
              ? <Text style={styles.connectedBadge}>{t('common.connected') ?? 'Connected'}</Text>
              : <Text style={styles.connectLink}>{t('common.connect') ?? 'Connect'}</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={[styles.linkedRow, { borderBottomWidth: 0 }]} onPress={() => !isFacebookAuth && handleLinkProvider("Facebook")} disabled={isFacebookAuth}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="facebook" size={24} color={isFacebookAuth ? "#4267B2" : "#9CA3AF"} />
              <Text style={[styles.linkedText, isFacebookAuth && styles.linkedTextActive]}>Facebook</Text>
            </View>
            {isFacebookAuth
              ? <Text style={styles.connectedBadge}>{t('common.connected') ?? 'Connected'}</Text>
              : <Text style={styles.connectLink}>{t('common.connect') ?? 'Connect'}</Text>
            }
          </TouchableOpacity>
        </View>

        <View style={styles.actionCard}>
          <Text style={styles.title}>{t('profile.accountActions') ?? 'Account Actions'}</Text>

          <TouchableOpacity style={styles.actionRow} onPress={handleChangePassword}>
            <Text style={styles.actionText}>{t('profile.changePassword') ?? 'Change Password'}</Text>
            <Icon name="vpn-key" size={24} color="#374151" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRow, { borderBottomWidth: 0, marginTop: 10 }]}
            onPress={() => setDeleteModalVisible(true)}
            disabled={isProcessingDelete}
          >
            <Text style={[styles.actionText, { color: '#EF4444' }]}>
              {isProcessingDelete ? (t('profile.deactivating') ?? 'Deactivating...') : (t('profile.deactivateAccount') ?? 'Deactivate Account')}
            </Text>
            {isProcessingDelete ? <ActivityIndicator color="#EF4444" /> : <Icon name="delete-forever" size={24} color="#EF4444" />}
          </TouchableOpacity>
        </View>

        <OptionModal
          visible={modal.visible}
          onClose={closePicker}
          options={currentOptions}
          onSelect={onSelectOption}
          title={modal.key ? t(`profile.${modal.key}`) ?? modal.key : 'Select option'}
          t={t}
        />

        <DatePickerModal
          visible={dateModalVisible}
          onClose={() => setDateModalVisible(false)}
          onSelect={handleDateSelect}
          currentDate={local.dayOfBirth}
          t={t}
        />

        <ConfirmDeleteModal
          visible={deleteModalVisible}
          onClose={() => setDeleteModalVisible(false)}
          onDelete={handleDeactivateAccount}
          t={t}
          remainingDays={30}
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default EditProfileScreen;

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { padding: 0 },
  card: { backgroundColor: '#fff', padding: 16, marginBottom: 12 },
  actionCard: { backgroundColor: '#fff', padding: 16, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 12 },

  field: { marginBottom: 12 },
  label: { fontSize: 13, color: '#6B7280', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#1F2937',
    backgroundColor: '#fff'
  },
  readOnlyInput: { backgroundColor: '#F3F4F6', color: '#9CA3AF' },
  bioInput: { height: 80, textAlignVertical: 'top' },

  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  pillRight: { flexDirection: 'row', alignItems: 'center' },
  rightText: { color: '#374151', marginRight: 8, fontSize: 15, fontWeight: '500' },
  flagStyle: { marginRight: 8, fontSize: 20 },

  linkedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  linkedText: { marginLeft: 10, fontSize: 16, color: '#9CA3AF', fontWeight: '500' },
  linkedTextActive: { color: '#374151', fontWeight: '600' },
  connectedBadge: { fontSize: 13, color: '#10B981', fontWeight: '600' },
  connectLink: { fontSize: 14, color: '#4F46E5', fontWeight: '600' },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  actionText: { color: '#374151', fontSize: 16, fontWeight: '500' },

  buttonGroup: { marginTop: 18, flexDirection: 'row', gap: 8 },
  saveBtn: { flex: 1, backgroundColor: '#4F46E5', padding: 12, borderRadius: 8, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '600' },
  cancelBtn: { padding: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D1D5DB', marginLeft: 8 },
  cancelBtnText: { color: '#374151', fontWeight: '600' },

  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', padding: 16, borderTopLeftRadius: 12, borderTopRightRadius: 12, maxHeight: '80%' },
  modalTitle: { fontWeight: '700', fontSize: 18, color: '#1F2937', marginBottom: 12, textAlign: 'center' },
  optionRow: { paddingVertical: 12, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  optionText: { color: '#1F2937', fontSize: 16 },
  modalClose: { marginTop: 12, alignItems: 'center', paddingVertical: 8 },
  modalCloseText: { color: '#4F46E5', fontWeight: '600' },

  pickerColumn: { flex: 1, alignItems: 'center' },
  pickerItem: { paddingVertical: 10, paddingHorizontal: 20, alignItems: 'center' },
  pickerItemSelected: { backgroundColor: '#EEF2FF', borderRadius: 8, width: '100%' },
  pickerText: { fontSize: 16, color: '#9CA3AF' },
  pickerTextSelected: { fontSize: 18, color: '#4F46E5', fontWeight: 'bold' },

  confirmModalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  confirmModalCard: { backgroundColor: '#fff', padding: 20, borderRadius: 12, width: '85%' },
  confirmModalTitle: { fontWeight: '700', fontSize: 18, color: '#EF4444', marginBottom: 10 },
  confirmModalText: { color: '#374151', fontSize: 14, marginBottom: 20, lineHeight: 20 },
  confirmButtonGroup: { flexDirection: 'row', justifyContent: 'flex-end' },
  confirmCancelBtn: { paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8, alignItems: 'center' },
  confirmCancelBtnText: { color: '#374151', fontWeight: '600' },
  confirmDeleteBtn: { backgroundColor: '#EF4444', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8, alignItems: 'center', marginLeft: 10 },
  confirmDeleteBtnText: { color: '#fff', fontWeight: '600' },
});
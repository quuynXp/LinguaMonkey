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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '../../stores/UserStore';
import instance from '../../api/axiosInstance';
import { gotoTab } from '../../utils/navigationRef';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createScaledSheet } from '../../utils/scaledStyles';
import * as Enums from '../../types/enums';

// Helper function để lấy mã quốc gia 2 ký tự từ tên Enum (e.g., UNITED_STATES -> US)
const getCountryCode = (countryEnum: Enums.Country) => {
  // Bắt buộc phải bao gồm tất cả các giá trị của Enum Country để thỏa mãn TypeScript
  const codeMap: Record<Enums.Country, string> = {
    [Enums.Country.VIETNAM]: 'VN',
    [Enums.Country.UNITED_STATES]: 'US',
    [Enums.Country.JAPAN]: 'JP',
    [Enums.Country.SOUTH_KOREA]: 'KR',
    [Enums.Country.CHINA]: 'CN',
    [Enums.Country.FRANCE]: 'FR',
    [Enums.Country.GERMANY]: 'DE',
    [Enums.Country.ITALY]: 'IT',
    [Enums.Country.SPAIN]: 'ES',
    [Enums.Country.INDIA]: 'IN',
    [Enums.Country.TONGA]: 'TO',
    [Enums.Country.ICELAND]: 'IS',
    // Xử lý các lỗi chính tả/case trong Enum Country (nếu cần)
    [Enums.Country.Tonga]: 'TO',
    [Enums.Country.Korea]: 'KR',
    [Enums.Country.Japan]: 'JP',
    [Enums.Country.KOREA]: 'KR', // Đảm bảo KOREA (uppercase) cũng được handle
  };
  return codeMap[countryEnum] || null;
};

// Helper function to convert Country Code to Flag Emoji
const ccToFlag = (code?: string | null) => {
  if (!code) return '🏳️';
  const cc = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return '🏳️';
  const A = 127397;
  return String.fromCodePoint(...[...cc].map(c => A + c.charCodeAt(0)));
};

// Map Enums thành format hiển thị cho Modal
const ENUM_OPTIONS = {
  country: Object.values(Enums.Country).map(v => ({
    value: v,
    label: v.replace(/_/g, ' '),
    flag: ccToFlag(getCountryCode(v))
  })),
  ageRange: Object.values(Enums.AgeRange).map(v => ({
    value: v,
    label: v.replace('AGE_', '').replace('_', '-')
  })),
  learningPace: Object.values(Enums.LearningPace).map(v => ({
    value: v,
    label: v.charAt(0) + v.slice(1).toLowerCase()
  })),
  proficiency: Object.values(Enums.ProficiencyLevel).map(v => ({
    value: v,
    label: v
  })),
  level: Array.from({ length: 20 }, (_, i) => String(i + 1)).map(l => ({
    value: l,
    label: `Level ${l}`
  })),
};

// --- Small local pickers components ------------------------------------------------
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

// --- Main Component ------------------------------------------------------------
const EditProfileScreen: React.FC = () => {
  const { t } = useTranslation();
  const { user, saveProfileToServer } = useUserStore();
  const [local, setLocal] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<{ key?: keyof typeof ENUM_OPTIONS, visible: boolean }>({ visible: false });

  // Khởi tạo state local từ store user
  useEffect(() => {
    if (user) {
      setLocal({
        fullname: user.fullname ?? user.nickname ?? '',
        bio: user.bio ?? '',
        country: user.country ?? null,
        email: user.email ?? null,
        ageRange: user.ageRange ?? null,
        learningPace: user.learningPace ?? null,
        proficiency: user.proficiency ?? null,
        level: user.level ?? null,
        phone: user.phone ?? '',
      });
    }
  }, [user]);

  const showPicker = (key: keyof typeof ENUM_OPTIONS) => setModal({ key, visible: true });
  const closePicker = () => setModal({ visible: false });

  const onSelectOption = (item: { value: string, label: string }) => {
    if (!modal.key) return;
    setLocal((s: any) => ({ ...s, [modal.key!]: item.value }));
  };

  const handleSave = async () => {
    if (!user?.userId || !local) return Alert.alert(t('errors.missingData') ?? 'Error', t('errors.userNotFound') ?? 'User data not loaded');
    setSaving(true);

    try {
      const payload: any = {
        fullname: local.fullname,
        bio: local.bio,
        phone: local.phone,
        country: local.country,
        ageRange: local.ageRange,
        learningPace: local.learningPace,
        proficiency: local.proficiency,
        level: local.level ? Number(local.level) : user.level,
      };

      await saveProfileToServer(user.userId, payload);

      Alert.alert(t('profile.saved') ?? 'Saved', t('profile.savedSuccess') ?? 'Profile updated');
      gotoTab('Profile', 'ProfileScreen');

    } catch (err: any) {
      Alert.alert(t('errors.server') ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // Vẫn gọi useMemo ở cấp cao nhất của component (Hooks rule)
  const currentOptions = useMemo(() => {
    if (!modal.key) return [];
    return ENUM_OPTIONS[modal.key];
  }, [modal.key]);

  // Helper để hiển thị giá trị label thân thiện hơn
  const getDisplayValue = (key: keyof typeof ENUM_OPTIONS, value: string | null) => {
    if (!value) return t('common.select') ?? 'Select';

    // Đã sửa lỗi cú pháp '||' và '??'
    const translatedValue = t(`enums.${key}.${value}`, { defaultValue: value });

    // Xử lý Level đặc biệt
    if (key === 'level') return `${t('profile.level') ?? 'Level'} ${value}`;

    return translatedValue;
  };

  if (!local) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#4F46E5" />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.title}>{t('profile.editProfile') ?? 'Edit profile'}</Text>

          {/* Full name */}
          <View style={styles.field}>
            <Text style={styles.label}>{t('profile.fullname') ?? 'Full name'}</Text>
            <TextInput value={local.fullname} onChangeText={(v) => setLocal((s: any) => ({ ...s, fullname: v }))} style={styles.input} />
          </View>

          {/* Bio */}
          <View style={styles.field}>
            <Text style={styles.label}>{t('profile.bio') ?? 'Bio'}</Text>
            <TextInput multiline numberOfLines={3} value={local.bio} onChangeText={(v) => setLocal((s: any) => ({ ...s, bio: v }))} style={[styles.input, styles.bioInput]} />
          </View>

          {/* Country */}
          <TouchableOpacity style={styles.fieldRow} onPress={() => showPicker('country')}>
            <Text style={styles.label}>{t('profile.country') ?? 'Country'}</Text>
            <View style={styles.pillRight}>
              <Text style={styles.flagStyle}>
                {local.country ? ccToFlag(getCountryCode(local.country)) : '—'}
              </Text>
              <Text style={styles.rightText}>{getDisplayValue('country', local.country)}</Text>
              <Icon name="chevron-right" size={20} color="#9CA3AF" />
            </View>
          </TouchableOpacity>

          {/* Age Range */}
          <TouchableOpacity style={styles.fieldRow} onPress={() => showPicker('ageRange')}>
            <Text style={styles.label}>{t('profile.ageRange') ?? 'Age range'}</Text>
            <View style={styles.pillRight}>
              <Text style={styles.rightText}>{getDisplayValue('ageRange', local.ageRange)}</Text>
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

          {/* Phone */}
          <View style={styles.field}>
            <Text style={styles.label}>{t('profile.phone') ?? 'Phone'}</Text>
            <TextInput value={local.phone} keyboardType="phone-pad" onChangeText={(v) => setLocal((s: any) => ({ ...s, phone: v }))} style={styles.input} />
          </View>

          <View style={styles.buttonGroup}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{t('profile.save') ?? 'Save'}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => gotoTab('Profile', "ProfileMain")}>
              <Text style={styles.cancelBtnText}>{t('profile.cancel') ?? 'Cancel'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Option modal */}
        <OptionModal
          visible={modal.visible}
          onClose={closePicker}
          options={currentOptions}
          onSelect={onSelectOption}
          title={modal.key ? t(`profile.${modal.key}`) ?? modal.key : 'Select option'}
          t={t}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default EditProfileScreen;

const styles = createScaledSheet({
  // Global Styles
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { padding: 20 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12 },
  title: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 12 },

  // Input/Field Styles
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
  bioInput: { height: 80, textAlignVertical: 'top' },

  // Row Styles (Picker/Display)
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  pillRight: { flexDirection: 'row', alignItems: 'center' },
  rightText: { color: '#374151', marginRight: 8, fontSize: 14 },
  flagStyle: { marginRight: 8, fontSize: 20 }, // Style cho cờ

  // Button Group Styles
  buttonGroup: { marginTop: 18, flexDirection: 'row', gap: 8 },
  saveBtn: { flex: 1, backgroundColor: '#4F46E5', padding: 12, borderRadius: 8, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '600' },
  cancelBtn: { padding: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D1D5DB', marginLeft: 8 },
  cancelBtnText: { color: '#374151', fontWeight: '600' },

  // Modal Styles (Gộp từ localStyles)
  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', padding: 16, borderTopLeftRadius: 12, borderTopRightRadius: 12, maxHeight: '70%' },
  modalTitle: { fontWeight: '700', fontSize: 18, color: '#1F2937', marginBottom: 12 },
  optionRow: { paddingVertical: 12, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  optionText: { color: '#1F2937', fontSize: 16 },
  modalClose: { marginTop: 12, alignItems: 'center', paddingVertical: 8 },
  modalCloseText: { color: '#4F46E5', fontWeight: '600' },
});
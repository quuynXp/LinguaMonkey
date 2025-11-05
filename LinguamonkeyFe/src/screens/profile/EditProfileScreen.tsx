import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  FlatList
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '../../stores/UserStore';
import instance from '../../api/axiosInstance';
import { gotoTab } from '../../utils/navigationRef';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createScaledSheet } from '../../utils/scaledStyles';




const ccToFlag = (code?: string | null) => {
  if (!code) return '🏳️';
  const cc = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return '🏳️';
  const A = 127397;
  return String.fromCodePoint(...[...cc].map(c => A + c.charCodeAt(0)));
};

// Small local pickers (no external deps) ------------------------------------------------
const SimpleSelect = ({ label, value, options, onChange }: any) => (
  <View style={localStyles.fieldRow}>
    <Text style={localStyles.fieldLabel}>{label}</Text>
    <TouchableOpacity style={localStyles.selectBox} onPress={() => onChange(null)}>
      <Text style={localStyles.selectText}>{value ?? '—'}</Text>
      <Icon name="edit" size={18} color="#6B7280" />
    </TouchableOpacity>
  </View>
);

const OptionModal = ({ visible, onClose, options, onSelect, title }: any) => (
  <Modal visible={visible} animationType="slide" transparent>
    <View style={localStyles.modalWrap}>
      <View style={localStyles.modalCard}>
        <Text style={localStyles.modalTitle}>{title}</Text>
        <FlatList
          data={options}
          keyExtractor={(i: any) => i.value ?? i}
          renderItem={({ item }) => (
            <TouchableOpacity style={localStyles.optionRow} onPress={() => { onSelect(item); onClose(); }}>
              {item.flag && <Text style={{ marginRight: 8 }}>{item.flag}</Text>}
              <Text>{item.label ?? item}</Text>
            </TouchableOpacity>
          )}
        />
        <TouchableOpacity style={localStyles.modalClose} onPress={onClose}>
          <Text style={{ color: '#4F46E5', fontWeight: '600' }}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const COUNTRIES = [
  { value: 'VIETNAM', label: 'Vietnam', flag: '🇻🇳' },
  { value: 'UNITED_STATES', label: 'United States', flag: '🇺🇸' },
  { value: 'JAPAN', label: 'Japan', flag: '🇯🇵' },
  { value: 'SOUTH_KOREA', label: 'Korea', flag: '🇰🇷' },
  { value: 'CHINA', label: 'China', flag: '🇨🇳' },
  { value: 'FRANCE', label: 'France', flag: '🇫🇷' },
  { value: 'GERMANY', label: 'Germany', flag: '🇩🇪' },
  { value: 'ITALY', label: 'Italy', flag: '🇮🇹' },
  { value: 'SPAIN', label: 'Spain', flag: '🇪🇸' },
  { value: 'INDIA', label: 'India', flag: '🇮🇳' },
];

const COUNTRY_CODE_MAP: Record<string, string> = {
  VIETNAM: 'VN',
  UNITED_STATES: 'US',
  JAPAN: 'JP',
  SOUTH_KOREA: 'KR',
  CHINA: 'CN',
  FRANCE: 'FR',
  GERMANY: 'DE',
  ITALY: 'IT',
  SPAIN: 'ES',
  INDIA: 'IN',
};
const AGE_RANGES = [
  { value: 'AGE_13_17', label: '13-17' },
  { value: 'AGE_18_24', label: '18-24' },
  { value: 'AGE_25_34', label: '25-34' },
  { value: 'AGE_35_44', label: '35-44' },
  { value: 'AGE_45_54', label: '45-54' },
  { value: 'AGE_55_PLUS', label: '55+' },
];
const LEARNING_PACES = [
  { value: 'SLOW', label: 'Slow' },
  { value: 'MAINTAIN', label: 'Maintain' },
  { value: 'FAST', label: 'Fast' },
  { value: 'ACCELERATED', label: 'Accelerated' },
];

const PROFICIENCIES = [
  { value: 'A1', label: 'A1' },
  { value: 'A2', label: 'A2' },
  { value: 'B1', label: 'B1' },
  { value: 'B2', label: 'B2' },
  { value: 'C1', label: 'C1' },
  { value: 'C2', label: 'C2' },
  { value: 'NATIVE', label: 'Native' },
];const LEVELS = Array.from({ length: 20 }, (_, i) => String(i + 1));

const EditProfileScreen: React.FC = () => {
  const { t } = useTranslation();
  const { user, setProfileData } = useUserStore();
  const [local, setLocal] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<{ key?: string, visible: boolean }>({ visible: false });

  useEffect(() => {
    setLocal({
      fullname: user?.fullname ?? user?.nickname ?? '',
      bio: user?.bio ?? '',
      country: user?.country ?? null,
      email : user?.email ?? null,
      ageRange: user?.ageRange ?? null,
      learningPace: user?.learningPace ?? null,
      proficiency: user?.proficiency ?? null,
      level: user?.level ?? null,
      phone: user?.phone ?? '',
    });
  }, [user?.userId]);

  const showPicker = (key: string) => setModal({ key, visible: true });
  const closePicker = () => setModal({ visible: false });

  const onSelectOption = (item: any) => {
    if (!modal.key) return;
    const value = item.value ?? item;
    setLocal((s: any) => ({ ...s, [modal.key!]: value }));
  };

  const handleSave = async () => {
    if (!user?.userId) return Alert.alert('Error', 'Missing userId');
    setSaving(true);
    try {
      // Build payload only with editable fields
      const payload: any = {
        fullname: local.fullname,
        bio: local.bio,
        phone: local.phone,
        country: local.country,
        email : local.email,
        ageRange: local.ageRange,
        learningPace: local.learningPace,
        proficiency: local.proficiency,
        level: local.level ? Number(local.level) : undefined,
      };

      const response = await instance.put(`/users/${user.userId}`, payload);
      if (response?.data?.result) {
        setProfileData({ user: response.data.result });
        Alert.alert(t('profile.saved') ?? 'Saved', t('profile.savedSuccess') ?? 'Profile updated');
        gotoTab('Profile', 'Profile');
      } else {
        throw new Error(response?.data?.message ?? 'Unknown response');
      }
    } catch (err: any) {
      Alert.alert(t('errors.server') ?? 'Error', err?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (!local) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
        <View style={styles.card}>
          <Text style={styles.title}>{t('profile.editProfile') ?? 'Edit profile'}</Text>

          <View style={styles.field}>
            <Text style={styles.label}>{t('profile.fullname') ?? 'Full name'}</Text>
            <TextInput value={local.fullname} onChangeText={(v) => setLocal((s: any) => ({ ...s, fullname: v }))} style={styles.input} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t('profile.bio') ?? 'Bio'}</Text>
            <TextInput multiline numberOfLines={3} value={local.bio} onChangeText={(v) => setLocal((s: any) => ({ ...s, bio: v }))} style={[styles.input, { height: 80 }]} />
          </View>

          <TouchableOpacity style={styles.fieldRow} onPress={() => showPicker('country')}>
            <Text style={styles.label}>{t('profile.country') ?? 'Country'}</Text>
            <View style={styles.pillRight}>
              <Text style={{ marginRight: 8 }}>
      {local.country ? ccToFlag(COUNTRY_CODE_MAP[local.country]) : '—'}
    </Text>
              <Text style={styles.rightText}>{local.country ?? 'Select'}</Text>
              <Icon name="chevron-right" size={20} color="#9CA3AF" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.fieldRow} onPress={() => showPicker('ageRange')}>
            <Text style={styles.label}>{t('profile.ageRange') ?? 'Age range'}</Text>
            <View style={styles.pillRight}>
              <Text style={styles.rightText}>{local.ageRange ?? 'Select'}</Text>
              <Icon name="chevron-right" size={20} color="#9CA3AF" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.fieldRow} onPress={() => showPicker('learningPace')}>
            <Text style={styles.label}>{t('profile.learningPace') ?? 'Learning pace'}</Text>
            <View style={styles.pillRight}>
              <Text style={styles.rightText}>{local.learningPace ?? 'Select suggestion'}</Text>
              <Icon name="chevron-right" size={20} color="#9CA3AF" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.fieldRow} onPress={() => showPicker('proficiency')}>
            <Text style={styles.label}>{t('profile.proficiency') ?? 'Proficiency'}</Text>
            <View style={styles.pillRight}>
              <Text style={styles.rightText}>{local.proficiency ?? 'Select'}</Text>
              <Icon name="chevron-right" size={20} color="#9CA3AF" />
            </View>
          </TouchableOpacity>

          

          <View style={styles.field}>
            <Text style={styles.label}>{t('profile.phone') ?? 'Phone'}</Text>
            <TextInput value={local.phone} keyboardType="phone-pad" onChangeText={(v) => setLocal((s: any) => ({ ...s, phone: v }))} style={styles.input} />
          </View>

          <View style={{ marginTop: 18, flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '600' }}>{t('profile.save') ?? 'Save'}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => gotoTab('Profile', "ProfileMain")}>
              <Text style={{ color: '#374151', fontWeight: '600' }}>{t('profile.cancel') ?? 'Cancel'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Option modal */}
        <OptionModal
          visible={modal.visible}
          onClose={closePicker}
          options={modal.key === 'country' ? COUNTRIES : modal.key === 'ageRange' ? AGE_RANGES : modal.key === 'learningPace' ? LEARNING_PACES : modal.key === 'proficiency' ? PROFICIENCIES : LEVELS.map(l => ({ value: l, label: `Level ${l}` }))}
          onSelect={onSelectOption}
          title={modal.key}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default EditProfileScreen;

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  field: { marginBottom: 12 },
  label: { fontSize: 13, color: '#6B7280', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 10, fontSize: 14, backgroundColor: '#fff' },
  fieldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  pillRight: { flexDirection: 'row', alignItems: 'center' },
  rightText: { color: '#374151', marginRight: 8 },
  saveBtn: { flex: 1, backgroundColor: '#4F46E5', padding: 12, borderRadius: 8, alignItems: 'center' },
  cancelBtn: { padding: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB', marginLeft: 8 },
});

const localStyles = createScaledSheet({
  fieldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  fieldLabel: { color: '#6B7280' },
  selectBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectText: { color: '#111827', fontWeight: '600' },
  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', padding: 16, borderTopLeftRadius: 12, borderTopRightRadius: 12, maxHeight: '70%' },
  modalTitle: { fontWeight: '700', marginBottom: 12 },
  optionRow: { paddingVertical: 12, flexDirection: 'row', alignItems: 'center' },
  modalClose: { marginTop: 12, alignItems: 'center' },
});

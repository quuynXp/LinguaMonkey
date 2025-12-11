// import React, { useState, useEffect } from 'react';
// import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, Switch, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import { useTranslation } from 'react-i18next';
// import { createScaledSheet } from '../../utils/scaledStyles';
// import { useFlashcards } from '../../hooks/useFlashcards';
// import { CreateFlashcardRequest, FlashcardResponse } from '../../types/dto';

// interface CreateEditFlashcardModalProps {
//     visible: boolean;
//     onClose: () => void;
//     lessonId: string | null;
//     editingCard?: FlashcardResponse;
//     onSuccess: () => void;
// }

// const CreateEditFlashcardModal = ({ visible, onClose, lessonId, editingCard, onSuccess }: CreateEditFlashcardModalProps) => {
//     const { t } = useTranslation();
//     const [frontText, setFrontText] = useState(editingCard?.frontText || '');
//     const [backText, setBackText] = useState(editingCard?.backText || '');
//     const [isPublic, setIsPublic] = useState(editingCard?.isPublic || false);
//     const [mediaUrl, setMediaUrl] = useState(editingCard?.mediaUrl || ''); // Placeholder for image/audio/video URL

//     const { useCreateFlashcard } = useFlashcards();
//     const { mutate: createFlashcard, isPending: isCreating } = useCreateFlashcard();

//     useEffect(() => {
//         if (editingCard) {
//             setFrontText(editingCard.frontText);
//             setBackText(editingCard.backText);
//             setIsPublic(editingCard.isPublic);
//             setMediaUrl(editingCard.mediaUrl || '');
//         } else {
//             setFrontText('');
//             setBackText('');
//             setIsPublic(false);
//             setMediaUrl('');
//         }
//     }, [editingCard, visible]);

//     const handleSave = () => {
//         if (!frontText.trim() || !backText.trim() || !lessonId) {
//             Alert.alert('Error', 'Front and Back text are required.');
//             return;
//         }

//         const payload: CreateFlashcardRequest = {
//             lessonId: lessonId,
//             frontText: frontText.trim(),
//             backText: backText.trim(),
//             isPublic: isPublic,
//             mediaUrl: mediaUrl || null,
//         };

//         createFlashcard({ lessonId, payload }, {
//             onSuccess: () => {
//                 Alert.alert(t('common.success'), t('flashcard.saveSuccess'));
//                 onSuccess();
//                 onClose();
//             },
//             onError: (err) => {
//                 console.error('Create Flashcard Error:', err);
//                 Alert.alert('Error', t('common.error'));
//             }
//         });
//     };

//     const title = editingCard ? (t('flashcard.editTitle') ?? 'Edit Flashcard') : (t('flashcard.newTitle') ?? 'Create New Flashcard');
//     const saveButtonText = editingCard ? (t('common.update') ?? 'Update') : (t('common.create') ?? 'Create');

//     return (
//         <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
//             <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
//                 <View style={styles.modalContent}>
//                     <View style={styles.modalHeader}>
//                         <Text style={styles.modalTitle}>{title}</Text>
//                         <TouchableOpacity onPress={onClose}>
//                             <Icon name="close" size={24} color="#37352F" />
//                         </TouchableOpacity>
//                     </View>

//                     <ScrollView showsVerticalScrollIndicator={false}>
//                         {/* Front Side */}
//                         <Text style={styles.label}>Front (Word/Phrase)</Text>
//                         <TextInput
//                             style={styles.input}
//                             placeholder="e.g. Omnipresent"
//                             value={frontText}
//                             onChangeText={setFrontText}
//                         />

//                         {/* Back Side */}
//                         <Text style={styles.label}>Back (Definition/Example)</Text>
//                         <TextInput
//                             style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
//                             multiline
//                             placeholder="e.g. Existing or being everywhere at the same time."
//                             value={backText}
//                             onChangeText={setBackText}
//                         />

//                         {/* Media Upload (Simplified Placeholder) */}
//                         <Text style={styles.label}>Media URL (Image/Audio/Video)</Text>
//                         <TextInput
//                             style={styles.input}
//                             placeholder="Paste URL or Tap to Upload (Feature WIP)"
//                             value={mediaUrl}
//                             onChangeText={setMediaUrl}
//                         />
//                         <TouchableOpacity style={styles.mediaButton}>
//                             <Icon name="mic" size={18} color="#0077D6" style={{ marginRight: 8 }} />
//                             <Text style={styles.mediaButtonText}>Record/Upload Audio</Text>
//                         </TouchableOpacity>

//                         {/* Public/Private Toggle for Community */}
//                         <View style={styles.toggleRow}>
//                             <View>
//                                 <Text style={styles.label}>{t('flashcard.publicToggle') ?? 'Public Flashcard (Share to Community)'}</Text>
//                                 <Text style={styles.hintText}>{isPublic ? 'Visible to all users.' : 'Private, only visible to you.'}</Text>
//                             </View>
//                             <Switch
//                                 value={isPublic}
//                                 onValueChange={setIsPublic}
//                                 trackColor={{ false: "#E5E7EB", true: "#37352F" }}
//                             />
//                         </View>

//                         <TouchableOpacity
//                             style={[styles.saveButton, (!frontText.trim() || !backText.trim() || isCreating) && styles.disabledBtn]}
//                             onPress={handleSave}
//                             disabled={!frontText.trim() || !backText.trim() || isCreating}
//                         >
//                             {isCreating ?
//                                 <ActivityIndicator color="#FFF" /> :
//                                 <Text style={styles.saveButtonText}>{saveButtonText}</Text>
//                             }
//                         </TouchableOpacity>
//                         <View style={{ height: 20 }} />
//                     </ScrollView>
//                 </View>
//             </KeyboardAvoidingView>
//         </Modal>
//     );
// };

// const styles = createScaledSheet({
//     modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
//     modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '95%' },
//     modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
//     modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#37352F' },
//     label: { fontSize: 14, fontWeight: '600', color: '#37352F', marginTop: 15, marginBottom: 5 },
//     hintText: { fontSize: 12, color: '#9CA3AF' },
//     input: { backgroundColor: '#F7F7F5', borderRadius: 8, paddingHorizontal: 15, paddingVertical: 10, borderWidth: 1, borderColor: '#E5E7EB', fontSize: 16, color: '#37352F' },
//     toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F7F7F5', padding: 15, borderRadius: 8, marginTop: 15 },
//     saveButton: { backgroundColor: '#37352F', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 25 },
//     disabledBtn: { backgroundColor: '#A0A0A0' },
//     saveButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
//     mediaButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#0077D6', marginTop: 10, backgroundColor: '#E6F3FF' },
//     mediaButtonText: { color: '#0077D6', fontWeight: '600', fontSize: 14 }
// });

// export default CreateEditFlashcardModal;
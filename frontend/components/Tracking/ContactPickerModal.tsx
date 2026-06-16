import React, { useState } from 'react';
import {
    Modal, View, Text, TouchableOpacity, FlatList,
    StyleSheet, Image, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Theme from '@/constants/Theme';
import { useFriends } from '@/context/FriendProvider';

const INK = '#15223F';
const TEAL = Theme.colors.edit;

interface Props {
    visible: boolean;
    selectedIds: string[];
    onClose: (selectedIds: string[]) => void;
}

export default function ContactPickerModal({ visible, selectedIds, onClose }: Props) {
    const { friends } = useFriends();
    const [draft, setDraft] = useState<string[]>(selectedIds);

    // Sync draft when modal opens with new selectedIds
    React.useEffect(() => {
        if (visible) setDraft(selectedIds);
    }, [visible]);

    const toggle = (id: string) =>
        setDraft(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => onClose(draft)}>
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => onClose(selectedIds)} style={styles.cancelBtn}>
                        <Text style={styles.cancelText}>取消</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>選擇緊急聯絡人</Text>
                    <TouchableOpacity onPress={() => onClose(draft)} style={styles.doneBtn}>
                        <Text style={styles.doneText}>完成</Text>
                    </TouchableOpacity>
                </View>

                {friends.length === 0 ? (
                    <View style={styles.empty}>
                        <Ionicons name="people-outline" size={48} color={Theme.colors.gray300} />
                        <Text style={styles.emptyText}>尚無好友</Text>
                        <Text style={styles.emptyHint}>請先在好友頁面新增好友</Text>
                    </View>
                ) : (
                    <FlatList
                        data={friends}
                        keyExtractor={f => f.id}
                        contentContainerStyle={styles.list}
                        renderItem={({ item: f }) => {
                            const selected = draft.includes(f.id);
                            return (
                                <TouchableOpacity onPress={() => toggle(f.id)} style={styles.row}>
                                    {f.avatarUrl ? (
                                        <Image source={{ uri: f.avatarUrl }} style={styles.avatar} />
                                    ) : (
                                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                            <Text style={styles.avatarText}>
                                                {(f.username || 'U')[0].toUpperCase()}
                                            </Text>
                                        </View>
                                    )}
                                    <View style={styles.info}>
                                        <Text style={styles.name}>{f.displayName || f.username}</Text>
                                        {f.username && f.displayName && (
                                            <Text style={styles.username}>@{f.username}</Text>
                                        )}
                                    </View>
                                    <View style={[styles.check, selected && styles.checkActive]}>
                                        {selected && <Ionicons name="checkmark" size={16} color="#fff" />}
                                    </View>
                                </TouchableOpacity>
                            );
                        }}
                    />
                )}
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: Theme.colors.gray100,
    },
    cancelBtn: { width: 52 },
    cancelText: { fontSize: 16, color: Theme.colors.gray500 },
    title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: INK },
    doneBtn: { width: 52, alignItems: 'flex-end' },
    doneText: { fontSize: 16, fontWeight: '700', color: TEAL },

    list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },
    row: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: Theme.colors.gray100,
    },
    avatar: { width: 44, height: 44, borderRadius: 22 },
    avatarPlaceholder: {
        backgroundColor: Theme.colors.gray100,
        alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { fontSize: 18, fontWeight: '700', color: INK },
    info: { flex: 1 },
    name: { fontSize: 16, fontWeight: '600', color: INK },
    username: { fontSize: 13, color: Theme.colors.gray400, marginTop: 1 },
    check: {
        width: 26, height: 26, borderRadius: 13,
        borderWidth: 2, borderColor: Theme.colors.gray300,
        alignItems: 'center', justifyContent: 'center',
    },
    checkActive: { backgroundColor: TEAL, borderColor: TEAL },

    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
    emptyText: { fontSize: 16, fontWeight: '600', color: Theme.colors.gray500 },
    emptyHint: { fontSize: 13, color: Theme.colors.gray400 },
});

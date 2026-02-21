
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';

interface AdminUser {
    id: string;
    email: string;
    name: string;
    role: string;
    created_at: string;
}

export default function AdminUsersScreen() {
    const router = useRouter();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [filter, setFilter] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => { fetchUsers(); }, []);

    const fetchUsers = async () => {
        setLoading(true);
        console.log('Fetching users via RPC get_all_users...');
        try {
            const { data, error } = await supabase.rpc('get_all_users');
            if (error) {
                console.error('RPC Error:', error);
                Alert.alert('Error', error.message);
            } else {
                console.log('Users fetched:', data?.length);
                setUsers((data as AdminUser[]) || []);
            }
        } catch (e) {
            console.error('Unexpected RPC Error:', e);
            Alert.alert('Error', 'Unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (id: string) => {
        Alert.alert('삭제 확인', '정말 삭제하시겠습니까?', [
            { text: '취소', style: 'cancel' },
            {
                text: '삭제', style: 'destructive', onPress: async () => {
                    const { error } = await supabase.rpc('delete_user_by_admin', { target_user_id: id });
                    if (error) {
                        console.error('Admin Delete Error:', error);
                        Alert.alert('삭제 실패', error.message || '관리자 권한이 없거나 기능을 사용할 수 없습니다.\n(RPC 함수가 필요합니다)');
                    } else {
                        Alert.alert('완료', '사용자가 삭제되었습니다.');
                        fetchUsers();
                    }
                }
            }
        ]);
    };

    const handleReset = (email: string) => {
        Alert.alert('비밀번호 초기화', `${email} 로 재설정 메일을 보냅니다.`, [
            { text: '취소' },
            {
                text: '발송', onPress: async () => {
                    const { error } = await supabase.auth.resetPasswordForEmail(email);
                    if (error) Alert.alert('실패', error.message);
                    else Alert.alert('완료', '메일 발송됨');
                }
            }
        ]);
    };

    const filtered = users.filter(u => u.name?.includes(filter) || u.email?.includes(filter));

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={styles.header}>
                <Pressable onPress={() => router.replace('/(tabs)')}><Ionicons name="arrow-back" size={24} color={colors.textPrimary} /></Pressable>
                <Text style={styles.title}>회원 관리</Text>
                <View style={{ width: 24 }} />
            </View>
            <TextInput style={styles.search} placeholder="검색..." value={filter} onChangeText={setFilter} />
            {loading ? <ActivityIndicator color={colors.primary} /> : (
                <FlatList data={filtered} keyExtractor={i => i.id} renderItem={({ item }) => (
                    <View style={styles.card}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.name}>{item.name} <Text style={{ fontSize: 12, color: item.role === 'admin' ? 'red' : 'blue' }}>({item.role})</Text></Text>
                            <Text style={styles.email}>{item.email}</Text>
                        </View>
                        <Pressable onPress={() => handleReset(item.email)} style={{ padding: 8 }}><Ionicons name="key" size={20} color={colors.primary} /></Pressable>
                        <Pressable onPress={() => handleDelete(item.id)} style={{ padding: 8 }}><Ionicons name="trash" size={20} color={colors.error} /></Pressable>
                    </View>
                )} />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, alignItems: 'center' },
    title: { fontSize: 18, fontWeight: 'bold' },
    search: { backgroundColor: colors.cardBg, margin: 16, padding: 12, borderRadius: 8 },
    card: { flexDirection: 'row', backgroundColor: colors.cardBg, marginHorizontal: 16, marginBottom: 8, padding: 16, borderRadius: 8, alignItems: 'center' },
    name: { fontWeight: 'bold', marginBottom: 4 },
    email: { color: colors.textSecondary, fontSize: 12 }
});

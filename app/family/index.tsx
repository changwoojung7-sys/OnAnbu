import { colors } from '@/constants/Colors';
import { softShadow } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface FamilyMember {
    id: string;
    profile: {
        id: string;
        name: string;
        email: string;
        role: string;
        avatar_url?: string;
    };
    role: 'primary' | 'secondary'; // guardian role in family
}

export default function FamilyManagementScreen() {
    console.log('Rendering FamilyManagementScreen');
    const router = useRouter();
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [members, setMembers] = useState<FamilyMember[]>([]);
    const [parents, setParents] = useState<any[]>([]);
    const [pendingInvites, setPendingInvites] = useState<any[]>([]);
    const [debugInfo, setDebugInfo] = useState<string>('');
    const [isCodeModalVisible, setIsCodeModalVisible] = useState(false);
    const [inviteCode, setInviteCode] = useState('');
    const [isProcessingCode, setIsProcessingCode] = useState(false);

    useEffect(() => {
        fetchFamilyData();
    }, []);

    const fetchFamilyData = async () => {
        try {
            setLoading(true);
            if (!user) return;

            let localGroupData: any = null;
            let localFetchedParents: any = null;

            // 1. 보호자가 속한 가족 그룹 가져오기 (family_members 테이블 사용)
            const { data: memberOf, error: memberError } = await supabase
                .from('family_members')
                .select('group_id, role')
                .eq('guardian_id', user.id);

            if (memberError) throw memberError;

            const groupIds: string[] = memberOf?.map((m: any) => m.group_id) || [];

            // 초대한 부모님의 그룹도 모두 불러와서 병합한다 (Fallback & Multi-Parent)
            const { data: invitations } = await supabase
                .from('parent_invitations')
                .select('accepted_by')
                .eq('inviter_id', user.id)
                .eq('status', 'accepted');

            if (invitations && invitations.length > 0) {
                const parentIds = invitations.map((i: any) => i.accepted_by).filter((id: any) => id);
                if (parentIds.length > 0) {
                    const { data: groups } = await supabase
                        .from('family_groups')
                        .select('id')
                        .in('parent_id', parentIds);

                    if (groups) {
                        groups.forEach((g: any) => groupIds.push(g.id));
                    }
                }
            }

            const uniqueGroupIds = Array.from(new Set(groupIds));

            if (uniqueGroupIds.length === 0) {
                // 수락된 가족 그룹이 하나도 없다면, 대기 중인 초대 목록만 가져온다
                const { data: invites } = await supabase
                    .from('parent_invitations')
                    .select('*')
                    .eq('inviter_id', user.id)
                    .eq('status', 'pending');

                if (invites) setPendingInvites(invites);

                setLoading(false);
                return;
            }

            // 2. Get all guardians in these groups
            const { data: guardians, error: guardiansError } = await supabase
                .from('family_members')
                .select(`
                    id, 
                    role, 
                    guardian_id,
                    profiles:guardian_id (id, name, email, role, avatar_url)
                `)
                .in('group_id', uniqueGroupIds);

            if (guardiansError) throw guardiansError;

            // 3. Get parents in these groups
            const { data: groupData, error: groupDataError } = await supabase
                .from('family_groups')
                .select('id, parent_id')
                .in('id', uniqueGroupIds);

            localGroupData = groupData;

            if (groupDataError) throw groupDataError;

            const formattedGuardians = guardians?.map((g: any) => ({
                id: g.id,
                profile: g.profiles,
                role: g.role
            })) || [];

            // 중복 보호자 제거
            const uniqueGuardians = Array.from(new Map(formattedGuardians.map((g: any) => [g.profile?.id, g])).values()) as any[];
            setMembers(uniqueGuardians);

            if (groupData && groupData.length > 0) {
                const parentIds = groupData.map((g: any) => g.parent_id).filter((id: any) => id);

                if (parentIds.length > 0) {
                    const { data: fetchedParents } = await supabase
                        .from('profiles')
                        .select('id, name, email, role, avatar_url')
                        .in('id', parentIds);

                    localFetchedParents = fetchedParents;

                    if (fetchedParents && fetchedParents.length > 0) {
                        const uniqueParents = Array.from(new Map(fetchedParents.map((p: any) => [p.id, p])).values()) as any[];

                        // 부모님 가입 시 사용했던 초대 코드 매칭 (parent_invitations)
                        const { data: parentInvites } = await supabase
                            .from('parent_invitations')
                            .select('invite_code, accepted_by')
                            .in('accepted_by', uniqueParents.map(p => p.id))
                            .eq('status', 'accepted');

                        const parentsWithCodes = uniqueParents.map(p => ({
                            ...p,
                            invite_codes: parentInvites?.filter((i: any) => i.accepted_by === p.id).map((i: any) => i.invite_code) || []
                        }));

                        setParents(parentsWithCodes);
                        const store = useAuthStore.getState();
                        store.setParents(parentsWithCodes);

                        const currentSelected = store.selectedParent;
                        const stillExists = currentSelected && uniqueParents.some((p: any) => p.id === currentSelected.id);
                        if (!stillExists && uniqueParents.length > 0) {
                            store.setSelectedParent(uniqueParents[0]);
                        }
                    } else {
                        setParents([]);
                    }
                } else {
                    setParents([]);
                }
            } else {
                setParents([]);
            }

            // 보호자 초대 코드 매칭 (guardian_invitations)
            const { data: guardianInvites } = await supabase
                .from('guardian_invitations')
                .select('invite_code, accepted_by')
                .in('accepted_by', uniqueGuardians.map(g => g.profile?.id).filter(id => id))
                .eq('status', 'accepted');

            const guardiansWithCodes = uniqueGuardians.map(g => ({
                ...g,
                invite_codes: guardianInvites?.filter((i: any) => i.accepted_by === g.profile?.id).map((i: any) => i.invite_code) || []
            }));
            setMembers(guardiansWithCodes);

            // 4. Get pending invitations
            const { data: invites, error: inviteError } = await supabase
                .from('parent_invitations')
                .select('*')
                .eq('inviter_id', user.id)
                .eq('status', 'pending');

            if (inviteError) console.error('Error fetching invites:', inviteError);
            if (invites) setPendingInvites(invites);

            setDebugInfo(JSON.stringify({
                uniqueGroupIds,
                groupDataLength: localGroupData?.length || 0,
                groupData: localGroupData,
                fetchedParentsLength: localFetchedParents?.length || 0,
                fetchedParents: localFetchedParents,
            }, null, 2));

        } catch (error: any) {
            console.error('Error fetching family:', error);
            Alert.alert('오류', '가족 정보를 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleInviteParent = () => {
        router.push('/family/invite-parent' as any);
    };

    const handleInviteGuardian = () => {
        console.log('Invite Guardian Clicked');
        try {
            router.push('/family/invite-guardian' as any);
        } catch (e) {
            console.error('Navigation Error:', e);
            Alert.alert('오류', '화면 이동 중 문제가 발생했습니다.');
        }
    };

    const handleJoinWithCode = async () => {
        const cleanCode = inviteCode.trim().toUpperCase();
        if (cleanCode.length !== 6) {
            Alert.alert('알림', '6자리 초대코드를 입력해주세요.');
            return;
        }

        setIsProcessingCode(true);
        try {
            const { data, error } = await supabase.rpc('accept_guardian_invitation', {
                p_invite_code: cleanCode
            });

            if (error) throw error;

            if (data && data.success) {
                Alert.alert('성공', '새로운 가족 그룹에 성공적으로 합류했습니다.');
                setIsCodeModalVisible(false);
                setInviteCode('');
                fetchFamilyData(); // 데이터 새로고침
            } else {
                Alert.alert('오류', data?.message || '초대 코드 처리 중 오류가 발생했습니다.');
            }
        } catch (error: any) {
            console.error('Error joining family with code:', error);
            Alert.alert('오류', error.message || '가족 합류 중 문제가 발생했습니다.');
        } finally {
            setIsProcessingCode(false);
        }
    };

    const renderMember = ({ item }: { item: FamilyMember }) => (
        <View style={styles.memberCard}>
            <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>{item.profile.name?.[0] || '?'}</Text>
            </View>
            <View style={styles.memberInfo}>
                <Text style={styles.memberName}>
                    {item.profile.name}
                    {item.profile.id === user?.id && <Text style={styles.meBadge}> (나)</Text>}
                </Text>
                <View style={styles.roleContainer}>
                    <Text style={styles.memberRole}>
                        {item.role === 'primary' ? '주 보호자' : '보조 보호자'}
                    </Text>
                    {(item as any).invite_codes && (item as any).invite_codes.length > 0 && (
                        <Text style={styles.codeBadge}>#{(item as any).invite_codes.join(', #')}</Text>
                    )}
                </View>
            </View>
        </View>
    );

    const renderParent = ({ item }: { item: any }) => (
        <View style={[styles.memberCard, styles.parentCard]}>
            <View style={[styles.avatarContainer, { backgroundColor: colors.action }]}>
                <Text style={styles.avatarText}>{item.name?.[0] || '?'}</Text>
            </View>
            <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{item.name}</Text>
                <View style={styles.roleContainer}>
                    <Text style={styles.memberRole}>부모님</Text>
                    {item.invite_codes && item.invite_codes.length > 0 && (
                        <Text style={styles.codeBadge}>#{item.invite_codes.join(', #')}</Text>
                    )}
                </View>
            </View>
        </View>
    );

    const renderPendingInvite = ({ item }: { item: any }) => (
        <View style={[styles.memberCard, { opacity: 0.7 }]}>
            <View style={[styles.avatarContainer, { backgroundColor: colors.textLight }]}>
                <Ionicons name="mail-outline" size={24} color="white" />
            </View>
            <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{item.parent_name} (초대 중)</Text>
                <Text style={styles.memberRole}>코드: {item.invite_code}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={colors.textPrimary} /></Pressable>
                <Text style={styles.title}>가족 관리</Text>
                <View style={{ width: 24 }} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <View style={styles.content}>
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>부모님</Text>
                            <Pressable
                                style={styles.addByCodeButton}
                                onPress={() => setIsCodeModalVisible(true)}
                            >
                                <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                                <Text style={styles.addByCodeButtonText}>코드로 추가</Text>
                            </Pressable>
                        </View>
                        {parents.length > 0 ? (
                            <View>
                                <FlatList data={parents} renderItem={renderParent} keyExtractor={item => item.id} scrollEnabled={false} />
                                <View style={styles.parentAddShortcut}>
                                    <Text style={styles.parentAddShortcutText}>다른 부모님을 추가하시겠습니까?</Text>
                                    <Pressable onPress={() => setIsCodeModalVisible(true)}>
                                        <Text style={styles.parentAddShortcutLink}>초대코드 입력하기</Text>
                                    </Pressable>
                                </View>
                            </View>
                        ) : (
                            <View>
                                {pendingInvites.length > 0 && (
                                    <View style={{ marginBottom: 16 }}>
                                        <FlatList
                                            data={pendingInvites}
                                            renderItem={renderPendingInvite}
                                            keyExtractor={item => item.id}
                                            scrollEnabled={false}
                                        />
                                    </View>
                                )}
                                <View style={styles.emptyBox}>
                                    <Text style={styles.emptyText}>연결된 부모님이 없습니다.</Text>
                                    <View style={styles.emptyButtonRow}>
                                        <Pressable style={styles.inviteButtonSmall} onPress={handleInviteParent}>
                                            <Text style={styles.inviteButtonTextSmall}>+ 직접 관리</Text>
                                        </Pressable>
                                        <Pressable style={[styles.inviteButtonSmall, { backgroundColor: colors.action }]} onPress={() => setIsCodeModalVisible(true)}>
                                            <Text style={styles.inviteButtonTextSmall}>코드로 합류</Text>
                                        </Pressable>
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>함께 케어하는 가족</Text>
                        <FlatList
                            data={members}
                            renderItem={renderMember}
                            keyExtractor={item => item.id}
                            scrollEnabled={false}
                            ListEmptyComponent={<Text style={styles.emptyText}>아직 다른 가족이 없습니다.</Text>}
                        />
                        <Pressable style={styles.inviteButton} onPress={handleInviteGuardian}>
                            <Ionicons name="person-add-outline" size={20} color={colors.textWhite} />
                            <Text style={styles.inviteButtonText}>보조 보호자 초대하기</Text>
                        </Pressable>
                    </View>
                </View>
            )}

            {/* 초대 코드 입력 모달 */}
            <Modal
                visible={isCodeModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsCodeModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>초대 코드 입력</Text>
                        <Text style={styles.modalSubtitle}>
                            공유받은 6자리 초대 코드를 입력하여 새로운 가족 그룹에 합류하세요.
                        </Text>

                        <TextInput
                            style={styles.codeInput}
                            placeholder="ABC123"
                            placeholderTextColor={colors.textLight}
                            value={inviteCode}
                            onChangeText={(text) => setInviteCode(text.toUpperCase())}
                            maxLength={6}
                            autoCapitalize="characters"
                            autoCorrect={false}
                        />

                        <View style={styles.modalButtonRow}>
                            <Pressable
                                style={[styles.modalButton, styles.modalCancelButton]}
                                onPress={() => {
                                    setIsCodeModalVisible(false);
                                    setInviteCode('');
                                }}
                            >
                                <Text style={styles.modalCancelButtonText}>취소</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.modalButton, styles.modalSubmitButton, isProcessingCode && { opacity: 0.7 }]}
                                onPress={handleJoinWithCode}
                                disabled={isProcessingCode}
                            >
                                {isProcessingCode ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Text style={styles.modalSubmitButtonText}>합류하기</Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, alignItems: 'center' },
    title: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { padding: 16 },
    section: { marginBottom: 32 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.textSecondary },
    addByCodeButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    addByCodeButtonText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
    memberCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBg, padding: 16, borderRadius: 12, marginBottom: 8, ...softShadow },
    parentCard: { borderColor: colors.action, borderWidth: 1 },
    parentAddShortcut: { marginTop: 12, alignItems: 'center', gap: 4 },
    parentAddShortcutText: { fontSize: 13, color: colors.textSecondary },
    parentAddShortcutLink: { fontSize: 13, color: colors.primary, fontWeight: 'bold', textDecorationLine: 'underline' },
    avatarContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    avatarText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    memberInfo: { flex: 1 },
    memberName: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary },
    meBadge: { color: colors.primary, fontSize: 14 },
    roleContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
    memberRole: { fontSize: 13, color: colors.textSecondary },
    codeBadge: { fontSize: 11, color: colors.textLight, backgroundColor: colors.background, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, fontWeight: '600' },
    emptyBox: { alignItems: 'center', padding: 20, backgroundColor: colors.cardBg, borderRadius: 12 },
    emptyText: { color: colors.textSecondary, marginBottom: 12 },
    emptyButtonRow: { flexDirection: 'row', gap: 8 },
    inviteButtonSmall: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: colors.primary, borderRadius: 20 },
    inviteButtonTextSmall: { color: 'white', fontSize: 14, fontWeight: '600' },
    inviteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, padding: 16, borderRadius: 12, marginTop: 12, gap: 8, ...softShadow },
    inviteButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { width: '100%', backgroundColor: 'white', borderRadius: 24, padding: 24, alignItems: 'center', ...softShadow },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 8 },
    modalSubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
    codeInput: { backgroundColor: colors.background, width: '100%', borderRadius: 16, paddingVertical: 16, fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: colors.textPrimary, letterSpacing: 8, marginBottom: 24 },
    modalButtonRow: { flexDirection: 'row', gap: 12, width: '100%' },
    modalButton: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    modalCancelButton: { backgroundColor: colors.background },
    modalCancelButtonText: { fontSize: 16, color: colors.textSecondary, fontWeight: '600' },
    modalSubmitButton: { backgroundColor: colors.primary },
    modalSubmitButtonText: { fontSize: 16, color: 'white', fontWeight: 'bold' },
});

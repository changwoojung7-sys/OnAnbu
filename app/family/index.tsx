import { colors } from '@/constants/Colors';
import { softShadow } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
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

                        setParents(uniqueParents);
                        const store = useAuthStore.getState();
                        store.setParents(uniqueParents);

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
                <Text style={styles.memberRole}>
                    {item.role === 'primary' ? '주 보호자' : '보조 보호자'}
                </Text>
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
                <Text style={styles.memberRole}>부모님</Text>
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
                        <Text style={styles.sectionTitle}>부모님</Text>
                        {parents.length > 0 ? (
                            <FlatList data={parents} renderItem={renderParent} keyExtractor={item => item.id} scrollEnabled={false} />
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
                                    <Pressable style={styles.inviteButtonSmall} onPress={handleInviteParent}>
                                        <Text style={styles.inviteButtonTextSmall}>+ 연결하기</Text>
                                    </Pressable>
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
    sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.textSecondary, marginBottom: 12 },
    memberCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBg, padding: 16, borderRadius: 12, marginBottom: 8, ...softShadow },
    parentCard: { borderColor: colors.action, borderWidth: 1 },
    avatarContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    avatarText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    memberInfo: { flex: 1 },
    memberName: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary },
    meBadge: { color: colors.primary, fontSize: 14 },
    memberRole: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    emptyBox: { alignItems: 'center', padding: 20, backgroundColor: colors.cardBg, borderRadius: 12 },
    emptyText: { color: colors.textSecondary, marginBottom: 12 },
    inviteButtonSmall: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: colors.primary, borderRadius: 20 },
    inviteButtonTextSmall: { color: 'white', fontSize: 14, fontWeight: '600' },
    inviteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, padding: 16, borderRadius: 12, marginTop: 12, gap: 8, ...softShadow },
    inviteButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
});

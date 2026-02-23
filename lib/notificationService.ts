import { RealtimeChannel } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// 알림 구독 채널 관리
let realtimeChannel: RealtimeChannel | null = null;

/**
 * 브라우저 알림 권한 요청
 * @returns 'granted' | 'denied' | 'default' | 'unsupported'
 */
export async function requestNotificationPermission(): Promise<string> {
    if (Platform.OS !== 'web') {
        // 네이티브 환경: 향후 Expo Push Notifications로 구현
        console.log('[Notification] Native push: not yet implemented');
        return 'unsupported';
    }

    if (!('Notification' in window)) {
        console.log('[Notification] This browser does not support notifications');
        return 'unsupported';
    }

    if (Notification.permission === 'granted') {
        return 'granted';
    }

    const permission = await Notification.requestPermission();
    console.log('[Notification] Permission result:', permission);
    return permission;
}

/**
 * 브라우저 알림 권한 상태 확인
 */
export function getNotificationPermission(): string {
    if (Platform.OS !== 'web' || !('Notification' in window)) {
        return 'unsupported';
    }
    return Notification.permission;
}

/**
 * 브라우저 알림 표시
 */
function showWebNotification(title: string, body: string, icon?: string) {
    if (Platform.OS !== 'web' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    try {
        const notification = new Notification(title, {
            body,
            icon: icon || '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'onanbu-notification', // 같은 태그의 알림은 교체됨
            requireInteraction: false,
        });

        // 알림 클릭 시 앱으로 포커스
        notification.onclick = () => {
            window.focus();
            notification.close();
        };

        // 5초 후 자동 닫기
        setTimeout(() => notification.close(), 5000);
    } catch (e) {
        console.error('[Notification] Show error:', e);
    }
}

/**
 * 알림 메시지 생성 헬퍼
 */
function getNotificationContent(actionType: string, senderName: string, message?: string | null) {
    switch (actionType) {
        case 'check_in':
            if (message === '일어났어요! ☀️') {
                return { title: '🌞 기상 알림', body: `${senderName}님이 일어났어요!` };
            }
            return { title: '💌 안부가 도착했어요', body: `${senderName}님이 안부를 보냈어요!` };
        case 'voice_cheer':
            return { title: '🎙️ 음성 메시지', body: `${senderName}님이 음성 메시지를 보냈어요!` };
        case 'photo':
            return { title: '📸 사진 안부', body: `${senderName}님이 사진을 보냈어요!` };
        case 'video':
            return { title: '🎬 동영상 안부', body: `${senderName}님이 동영상을 보냈어요!` };
        case 'message':
            if (message) {
                const preview = message.length > 30 ? message.substring(0, 30) + '...' : message;
                return { title: '💌 새 메시지', body: `${senderName}: ${preview}` };
            }
            return { title: '💌 새 메시지', body: `${senderName}님이 메시지를 보냈어요!` };
        default:
            return { title: '💌 안부가 도착했어요', body: `${senderName}님이 안부를 보냈어요!` };
    }
}

/**
 * Supabase Realtime 구독 시작 (실시간 알림)
 * @param userId 현재 로그인한 사용자 ID
 * @param userRole 사용자 역할 ('parent' | 'guardian' 등)
 */
export function startRealtimeNotifications(userId: string, userRole: string) {
    // 기존 구독 해제
    stopRealtimeNotifications();

    if (Platform.OS !== 'web') {
        console.log('[Notification] Realtime: web only for now');
        return;
    }

    console.log(`[Notification] Starting realtime subscription for ${userRole} (${userId})`);

    realtimeChannel = supabase
        .channel('action-notifications')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'action_logs',
            },
            async (payload) => {
                const newAction = payload.new as any;
                console.log('[Notification] New action_log:', newAction.type, newAction.id);

                // 내가 보낸 메시지는 알림하지 않음
                const isSentByMe = (
                    (userRole === 'parent' && newAction.message === '일어났어요! ☀️') ||
                    (userRole === 'parent' && newAction.type === 'message') ||
                    (userRole !== 'parent' && newAction.guardian_id === userId)
                );
                if (isSentByMe) {
                    console.log('[Notification] Skipping: sent by me');
                    return;
                }

                // 내게 관련된 메시지인지 확인
                const isForMe = (
                    (userRole === 'parent' && newAction.parent_id === userId) ||
                    (userRole !== 'parent' && newAction.guardian_id === userId)
                );

                // parent가 아닌 경우(guardian), parent_id로 그룹 관계 확인
                if (!isForMe && userRole !== 'parent') {
                    // 내 그룹에 속한 부모님인지 확인
                    const { data: myGroups } = await supabase
                        .from('family_members')
                        .select('group_id')
                        .eq('guardian_id', userId);

                    if (myGroups) {
                        const groupIds = myGroups.map((g: any) => g.group_id);
                        const isInMyGroup = groupIds.includes(newAction.group_id);
                        if (!isInMyGroup) {
                            console.log('[Notification] Skipping: not in my group');
                            return;
                        }
                    } else {
                        return;
                    }
                } else if (!isForMe) {
                    console.log('[Notification] Skipping: not for me');
                    return;
                }

                // 발신자 이름 가져오기
                let senderName = '가족';
                try {
                    if (userRole === 'parent') {
                        // 부모님이 받는 알림 → 보호자 이름 조회
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('name')
                            .eq('id', newAction.guardian_id)
                            .maybeSingle();
                        senderName = profile?.name || '가족';
                    } else {
                        // 보호자가 받는 알림 → 부모님 이름 조회
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('name')
                            .eq('id', newAction.parent_id)
                            .maybeSingle();
                        senderName = profile?.name || '부모님';
                    }
                } catch (e) {
                    console.error('[Notification] Profile fetch error:', e);
                }

                // 브라우저 알림 표시
                const { title, body } = getNotificationContent(
                    newAction.type,
                    senderName,
                    newAction.message
                );
                showWebNotification(title, body);
            }
        )
        .subscribe((status) => {
            console.log('[Notification] Realtime subscription status:', status);
        });
}

/**
 * Realtime 구독 해제
 */
export function stopRealtimeNotifications() {
    if (realtimeChannel) {
        console.log('[Notification] Stopping realtime subscription');
        supabase.removeChannel(realtimeChannel);
        realtimeChannel = null;
    }
}

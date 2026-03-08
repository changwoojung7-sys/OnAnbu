import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/Colors';
import { borderRadius, softShadow, spacing, typography } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';

const ANDROID_PACKAGE_NAME = 'com.onanbu.app';
// iOS 앱스토어 아이디가 나오면 아래에 채워넣을 수 있습니다 (예: id123456789)
const IOS_APP_ID = ''; 

export default function InviteRedirectScreen() {
    const params = useLocalSearchParams<{ code?: string; type?: string }>();
    const router = useRouter();
    const [isRedirecting, setIsRedirecting] = useState(true);

    useEffect(() => {
        // 초대 코드가 있으면 스토어에 임시 저장 (앱이 방금 켜진 경우 대비)
        if (params.code) {
            console.log('[Invite] 감지된 초대 코드:', params.code);
            useAuthStore.getState().setPendingInviteCode(params.code);
        }

        if (Platform.OS === 'web') {
            // 운영체제 체크하여 각 스토어로 리다이렉트
            const userAgent = navigator.userAgent.toLowerCase();
            const isAndroid = userAgent.indexOf('android') > -1;
            const isIOS = /ipad|iphone|ipod/.test(userAgent) && !(window as any).MSStream;

            setTimeout(() => {
                setIsRedirecting(false);
                if (isAndroid) {
                    // 구글 플레이스토어로 자동 이동
                    window.location.href = `intent://onanbu.calamus.ai.kr/invite?code=${params.code}&type=${params.type}#Intent;scheme=https;package=${ANDROID_PACKAGE_NAME};end`;
                    
                    // Fallback to web link if intent fails
                    setTimeout(() => {
                        window.location.href = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE_NAME}`;
                    }, 500);
                } else if (isIOS && IOS_APP_ID) {
                    // 앱스토어로 자동 이동
                    window.location.href = `https://apps.apple.com/app/${IOS_APP_ID}`;
                } else {
                    // PC 브라우저 등 알 수 없는 환경: 그냥 다운로드 유도 버튼만 표시
                }
            }, 1000);
        } else {
            // 앱(네이티브)으로 딥링크가 제대로 잡혀 열린 경우
            // 이미 앱이 실행 중이므로 가입 화면으로 리다이렉션
            setIsRedirecting(false);
            if (params.code) {
                 router.replace({
                    pathname: '/auth/role-select', // 역할 선택이나 엔터코드로 변경 가능
                });
            } else {
                router.replace('/auth/login');
            }
        }
    }, [params]);

    const handleManualAppStoreOpen = () => {
        if (Platform.OS === 'web') {
             window.location.href = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE_NAME}`;
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Ionicons name="gift-outline" size={64} color={colors.primary} />
                </View>

                <Text style={styles.title}>
                    <Text style={{ color: colors.primary }}>가족 초대장</Text>이 도착했어요!
                </Text>

                {isRedirecting ? (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={styles.subtitle}>앱으로 이동 중입니다...</Text>
                    </View>
                ) : (
                    <>
                        <Text style={styles.subtitle}>
                            원활한 이용을 위해 온안부 앱이 필요합니다.{'\n'}
                            아직 앱이 없으시다면 설치 후 초대 코드를 입력해 주세요.
                        </Text>
                        
                        {params.code && (
                             <View style={styles.codeBox}>
                                 <Text style={styles.codeLabel}>내 초대 코드</Text>
                                 <Text style={styles.codeValue}>{params.code}</Text>
                             </View>
                        )}

                        <Pressable 
                            style={styles.downloadButton} 
                            onPress={handleManualAppStoreOpen}
                        >
                            <FontAwesome name="android" size={24} color="white" />
                            <Text style={styles.downloadButtonText}>
                                구글 플레이 앱 다운로드
                            </Text>
                        </Pressable>
                        
                        <Pressable style={styles.backButton} onPress={() => router.replace('/auth/login')}>
                            <Text style={styles.backButtonText}>메인 화면으로 가기</Text>
                        </Pressable>
                    </>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
    },
    iconContainer: {
        backgroundColor: colors.cardBg,
        padding: spacing.lg,
        borderRadius: 100,
        marginBottom: spacing.xl,
        ...softShadow,
    },
    title: {
        ...typography.h1,
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    subtitle: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: spacing.xxl,
    },
    loaderContainer: {
        alignItems: 'center',
        marginTop: spacing.xl,
    },
    downloadButton: {
        backgroundColor: '#00C300', // 안드로이드 색상 톤
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        ...softShadow,
        marginBottom: spacing.md,
        gap: spacing.sm,
    },
    downloadButtonText: {
        ...typography.body,
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    backButton: {
        marginTop: spacing.sm,
        paddingVertical: spacing.sm,
    },
    backButtonText: {
        ...typography.body,
        color: colors.textLight,
        textDecorationLine: 'underline',
    },
    codeBox: {
        backgroundColor: colors.cardBg,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        width: '100%',
        alignItems: 'center',
        marginBottom: spacing.xl,
        borderWidth: 1,
        borderColor: colors.border,
        borderStyle: 'dashed',
    },
    codeLabel: {
        ...typography.small,
        color: colors.textSecondary,
        marginBottom: 4,
    },
    codeValue: {
        ...typography.h2,
        color: colors.primary,
        letterSpacing: 4,
    }
});

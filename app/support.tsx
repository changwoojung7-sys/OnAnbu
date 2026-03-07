import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { LayoutAnimation, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, UIManager, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/Colors';
import { borderRadius, commonStyles, softShadow, spacing, typography } from '@/constants/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FAQ_DATA = [
    {
        q: '비밀번호를 잊어버렸어요.',
        a: '로그인 화면 하단의 "비밀번호 찾기"를 통해 등록하신 이메일로 비밀번호 재설정 링크를 받으실 수 있습니다.'
    },
    {
        q: '회원탈퇴는 어떻게 하나요?',
        a: '설정(톱니바퀴) 화면의 맨 아래 [회원탈퇴] 메뉴에서 직접 진행하실 수 있습니다. 가입하신 역할(주케어자, 보조케어자, 케어대상)에 따라 탈퇴 옵션이 다르니, 세부 사항은 바로 위에 있는 \'온안부 앱 이용 가이드 (매뉴얼)\' 하위 상세 목록을 확인해 주시기 바랍니다.'
    },
    {
        q: '아이디(이메일) 변경이 가능한가요?',
        a: '보안상의 이유로 아이디(이메일) 변경은 불가능합니다. 새로운 이메일 사용을 원하시면 신규 가입이 필요합니다.'
    },
    {
        q: '앱이 자꾸 종료됩니다.',
        a: '네트워크 연결이 지연되었거나 일시적 오류일 수 있습니다. 앱을 완전히 종료하신 후 재실행해 보시거나, 기기의 소프트웨어를 최신 버전으로 업데이트해 주세요.'
    },
    {
        q: '데이터 백업 기능이 있나요?',
        a: '현재는 보안 클라우드에 자동 저장되어 기기를 변경하셔도 접속 시 기존 데이터를 가져옵니다. 별도의 수동 백업 기능은 지원하지 않습니다.'
    },
    {
        q: '제안하고 싶은 기능이 있어요.',
        a: '언제든 환영합니다! 상단의 "문의하기" 버튼을 통해 의견을 보내주시면 서비스 개선에 적극 반영하겠습니다.'
    }
];

const MANUAL_DATA = [
    {
        title: '👨‍👩‍👧 주케어자 (자녀 / 가족 대표) 가이드',
        content: `• 가입 및 초대: 앱/웹 첫 화면에서 [주 케어자로 시작할게요]를 선택하여 가입합니다. 가입 후 [가족 관리] 메뉴에서 부모님과 보조케어자를 초대할 수 있는 6자리 코드를 생성할 수 있습니다.\n\n• 앱 사용법: 홈 탭에서 부모님의 기상 여부와 기분을 확인하고, 케어 탭에서 내 사진과 목소리가 담긴 안부를 전송하세요. 전달 시 15초 리워드 광고가 재생됩니다.\n\n• 전체보기: 히스토리 탭의 [모아보기(Play Movie)] 메뉴에서 가족의 추억을 모아서 영상처럼 감상할 수 있습니다.\n\n• 회원탈퇴: 설정 > 회원탈퇴에서 내 계정만 조용히 탈퇴할지, 혹은 내가 만든 가족방의 부모님 계정과 사진까지 모두 초기화할지 선택할 수 있습니다.`
    },
    {
        title: '👤 보조케어자 (가족 / 친척) 가이드',
        content: `• 가입 및 초대: 앱/웹 첫 화면에서 초대코드로 시작하기를 누른 후 [함께 케어할 보조 케어자예요]를 누르고 주케어자가 공유해준 6자리 초대코드를 입력하고 이메일과(로그인 계정) 전화번호, 비밀번호 6자리 이상을 설정하고 시작하기를 누른 후 입력한 이메일과 설정한 비밀번호로 로그인하여 가족방에 입장됩니다.\n\n• 앱 사용법: 주케어자와 화면이 동일합니다. 홈 화면에서 부모님의 상태를 함께 확인하고 내가 직접 부모님께 안부를 보낼 수도 있습니다.\n\n• 회원탈퇴: 설정 > 회원탈퇴 창에서 버튼을 눌러 탈퇴 시 가족방은 그대로 유지되며 본인의 계정에만 연결이 해제됩니다.`
    },
    {
        title: '👴 케어대상 (부모님) 가이드',
        content: `• 시작하기: 첫 화면에서 초대코드로 시작하기를 누른 후 [케어대상으로 초대받았어요] 버튼을 누르고, 자녀분이 알려준 6자리 숫자를 입력하고 전화번호와 비밀번호를 설정 후 시작하기를 누른 후 초대코드와 비밀번호로 로그인 하면 가입이 끝납니다.\n\n• 나의 안부 전하기: 매일 아침 [일어났어요! ☀️] 버튼 한 번만 누르면 자녀에게 알림이 갑니다. 내 오늘의 기분 이모지를 눌러 컨디션을 표현할 수도 있고, 사진/목소리 버튼으로 손쉽게 자녀에게 직접 안부를 띄울 수도 있습니다.\n\n• 자녀의 안부 듣기: 홈 화면 스크롤을 살짝만 내리면 자녀들과 손주들이 보낸 사진, 음성, 텍스트 안부 편지를 바로 눌러서 볼 수 있습니다.\n\n• 회원탈퇴: 앱 하단의 톱니바퀴(환경설정) > 회원탈퇴 버튼을 통해 가족방에 내 사진과 목소리는 남겨두고 앱 사용만 그만둘지, 완벽하게 모든 내 기록과 계정을 삭제할지 선택하시면 됩니다.`
    }
];

export default function SupportScreen() {
    const router = useRouter();
    const [isEmailModalVisible, setIsEmailModalVisible] = useState(false);
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
    const [openManualIndex, setOpenManualIndex] = useState<number | null>(null);

    const toggleFaq = (index: number) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setOpenFaqIndex(openFaqIndex === index ? null : index);
    };

    const toggleManual = (index: number) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setOpenManualIndex(openManualIndex === index ? null : index);
    };

    const supportEmail = 'yujinit2005@gmail.com';

    const handleSendEmail = async (client: 'gmail' | 'naver' | 'default') => {
        let url = '';

        if (client === 'gmail') {
            url = Platform.select({
                ios: `googlegmail:///co?to=${supportEmail}`,
                android: `intent://compose?to=${supportEmail}#Intent;scheme=mailto;package=com.google.android.gm;end`,
                default: `mailto:${supportEmail}`,
            });
        } else if (client === 'naver') {
            url = Platform.select({
                ios: `navermail://compose?to=${supportEmail}`,
                android: `intent://compose?to=${supportEmail}#Intent;scheme=mailto;package=com.nhn.android.mail;end`,
                default: `mailto:${supportEmail}`,
            });
        } else {
            url = `mailto:${supportEmail}`;
        }

        try {
            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) {
                await Linking.openURL(url);
            } else {
                // Fallback to default
                await Linking.openURL(`mailto:${supportEmail}`);
            }
        } catch (error) {
            console.error('Failed to open email client:', error);
            await Linking.openURL(`mailto:${supportEmail}`).catch(console.error);
        }

        setIsEmailModalVisible(false);
    };

    return (
        <SafeAreaView style={commonStyles.container} edges={['top']}>
            {/* 헤더 */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="close" size={28} color={colors.textPrimary} />
                </Pressable>
                <Text style={styles.headerTitle}>Customer Center</Text>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* 메인 타이틀 구역 */}
                <View style={styles.titleSection}>
                    <Text style={styles.mainTitle}>무엇을 도와드릴까요?</Text>
                    <Text style={styles.subTitle}>궁금한 점이나 불편한 점이 있으시다면 언제든 문의해주세요.</Text>
                </View>

                {/* 운영시간 카드 */}
                <View style={styles.infoCard}>
                    <View style={styles.infoTitleRow}>
                        <Ionicons name="time-outline" size={20} color={colors.primary} />
                        <Text style={styles.infoTitle}>운영시간</Text>
                    </View>
                    <Text style={styles.infoText}>평일: 09:30 ~ 17:30</Text>
                    <Text style={styles.infoText}>(점심시간: 12:30 ~ 13:30)</Text>
                    <Text style={styles.infoText}>휴무일: 토요일, 일요일, 공휴일</Text>
                </View>

                {/* 문의하기 주요 액션 */}
                <View style={styles.actionSection}>
                    <Pressable style={styles.primaryButton} onPress={() => setIsEmailModalVisible(true)}>
                        <Text style={styles.primaryButtonText}>문의하기</Text>
                        <Ionicons name="paper-plane-outline" size={20} color="#fff" style={{ marginLeft: 8 }} />
                    </Pressable>
                    <Text style={styles.helperText}>
                        <Ionicons name="time-outline" size={14} /> 평일 오전 09:30부터 순차적으로 답변드려요.
                    </Text>
                </View>

                {/* 매뉴얼(앱 사용 방법) 아코디언 컴포넌트 */}
                <View style={styles.faqSection}>
                    <Text style={styles.faqHeaderTitle}>온안부 앱 이용 가이드 (매뉴얼)</Text>
                    {MANUAL_DATA.map((manual, index) => {
                        const isOpen = openManualIndex === index;
                        return (
                            <View key={`manual-${index}`} style={styles.faqItemContainer}>
                                <Pressable
                                    style={styles.faqQuestionRow}
                                    onPress={() => toggleManual(index)}
                                >
                                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={[styles.faqQuestionText, { fontWeight: '600' }]}>
                                            {manual.title}
                                        </Text>
                                    </View>
                                    <Ionicons
                                        name={isOpen ? 'chevron-up' : 'chevron-down'}
                                        size={20}
                                        color={colors.primary}
                                    />
                                </Pressable>
                                {isOpen && (
                                    <View style={[styles.faqAnswerBox, { backgroundColor: '#F0F9FF', borderTopColor: '#BAE6FD' }]}>
                                        <Text style={[styles.faqAnswerText, { color: '#0F172A' }]}>
                                            {manual.content}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </View>

                {/* FAQ 아코디언 컴포넌트 */}
                <View style={styles.faqSection}>
                    <Text style={styles.faqHeaderTitle}>자주 묻는 질문</Text>
                    {FAQ_DATA.map((faq, index) => {
                        const isOpen = openFaqIndex === index;
                        return (
                            <View key={index} style={styles.faqItemContainer}>
                                <Pressable
                                    style={styles.faqQuestionRow}
                                    onPress={() => toggleFaq(index)}
                                >
                                    <Text style={styles.faqQuestionText}>
                                        <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Q. </Text>
                                        {faq.q}
                                    </Text>
                                    <Ionicons
                                        name={isOpen ? 'chevron-up' : 'chevron-down'}
                                        size={20}
                                        color={colors.textSecondary}
                                    />
                                </Pressable>
                                {isOpen && (
                                    <View style={styles.faqAnswerBox}>
                                        <Text style={styles.faqAnswerText}>
                                            <Text style={{ fontWeight: 'bold' }}>A. </Text>
                                            {faq.a}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </View>

                {/* 사업자 정보 부분 (제공된 내용 반영) */}
                <View style={styles.footerSection}>
                    <Text style={styles.footerTitle}>사업자 정보</Text>
                    <Text style={styles.footerText}>상호 : 유진에이아이(YujinAI) | 대표자명 : 정창우</Text>
                    <Text style={styles.footerText}>사업자등록번호 : 519-77-00622 | 통신판매업 신고번호 : 제 2026-용인기흥-00211 호</Text>
                    <Text style={styles.footerText}>사업장 주소 : 경기도 용인시 기흥구 동백8로 87</Text>
                    <Text style={styles.footerText}>고객센터 : yujinit2005@gmail.com</Text>
                    <Text style={styles.footerText}>개인정보관리책임자 : 정창우</Text>
                    <Text style={styles.footerText}>연락처 : 010-6614-4561</Text>

                    <View style={styles.footerLinks}>
                        <Pressable onPress={() => router.push('/terms' as any)}>
                            <Text style={styles.footerLinkText}>이용약관</Text>
                        </Pressable>
                        <Pressable onPress={() => router.push('/privacy' as any)}>
                            <Text style={styles.footerLinkText}>개인정보처리방침</Text>
                        </Pressable>
                    </View>
                </View>
            </ScrollView>

            {/* 메일 선택 모달 */}
            <Modal
                visible={isEmailModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsEmailModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>메일 발송 방법 선택</Text>

                        <Pressable
                            style={[styles.modalButton, { backgroundColor: '#ea4335' }]}
                            onPress={() => handleSendEmail('gmail')}
                        >
                            <Text style={styles.modalButtonText}>구글 (Gmail)</Text>
                        </Pressable>

                        <Pressable
                            style={[styles.modalButton, { backgroundColor: '#03c75a' }]}
                            onPress={() => handleSendEmail('naver')}
                        >
                            <Text style={styles.modalButtonText}>네이버 메일</Text>
                        </Pressable>

                        <Pressable
                            style={[styles.modalButton, { backgroundColor: colors.textSecondary }]}
                            onPress={() => handleSendEmail('default')}
                        >
                            <Text style={styles.modalButtonText}>기본 메일 앱</Text>
                        </Pressable>

                        <Pressable
                            style={styles.cancelButton}
                            onPress={() => setIsEmailModalVisible(false)}
                        >
                            <Text style={styles.cancelButtonText}>취소</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.background,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        ...typography.h2,
        fontSize: 18,
    },
    content: {
        padding: spacing.lg,
        paddingBottom: 40,
    },
    titleSection: {
        marginBottom: spacing.xl,
        marginTop: spacing.md,
    },
    mainTitle: {
        ...typography.h1,
        fontSize: 24,
        color: colors.textPrimary,
        marginBottom: 8,
    },
    subTitle: {
        ...typography.body,
        color: colors.textSecondary,
    },
    infoCard: {
        backgroundColor: colors.cardBg,
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.xxl,
        ...softShadow,
    },
    infoTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    infoTitle: {
        ...typography.h3,
        marginLeft: 8,
        color: colors.textPrimary,
    },
    infoText: {
        ...typography.body,
        color: colors.textSecondary,
        marginLeft: 28,
        marginBottom: 4,
        fontSize: 14,
    },
    actionSection: {
        alignItems: 'center',
        marginBottom: spacing.xxl,
    },
    primaryButton: {
        backgroundColor: '#3b82f6', // 파란색 명시 (레퍼런스와 비슷한 컬러)
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        paddingVertical: 16,
        borderRadius: borderRadius.md,
        ...softShadow,
        marginBottom: spacing.md,
    },
    primaryButtonText: {
        ...typography.h3,
        color: '#fff',
    },
    helperText: {
        ...typography.caption,
        color: colors.textLight,
        fontSize: 13,
    },
    footerSection: {
        alignItems: 'center',
        marginTop: spacing.xl,
    },
    footerTitle: {
        ...typography.h3,
        color: colors.textPrimary,
        marginBottom: spacing.md,
    },
    footerText: {
        ...typography.caption,
        color: colors.textLight,
        marginBottom: 6,
        textAlign: 'center',
    },
    footerLinks: {
        flexDirection: 'row',
        gap: spacing.lg,
        marginTop: spacing.xl,
    },
    footerLinkText: {
        ...typography.body,
        color: colors.textSecondary,
        textDecorationLine: 'underline',
    },
    // FAQ Styles
    faqSection: {
        marginBottom: spacing.xxl,
    },
    faqHeaderTitle: {
        ...typography.h3,
        color: colors.textPrimary,
        marginBottom: spacing.md,
        paddingHorizontal: spacing.sm,
    },
    faqItemContainer: {
        backgroundColor: colors.cardBg,
        marginBottom: spacing.sm,
        borderRadius: borderRadius.md,
        ...softShadow,
        overflow: 'hidden',
    },
    faqQuestionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: spacing.md,
    },
    faqQuestionText: {
        ...typography.body,
        color: colors.textPrimary,
        fontWeight: '500',
        flex: 1,
        paddingRight: spacing.sm,
    },
    faqAnswerBox: {
        backgroundColor: '#F8FAFC', // 아주아주 연한 회색 배경으로 답변 공간 구분
        padding: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    faqAnswerText: {
        ...typography.body,
        color: colors.textSecondary,
        fontSize: 14,
        lineHeight: 22,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    modalContent: {
        backgroundColor: '#1E293B', // 어두운 네이비 배경
        width: '100%',
        borderRadius: borderRadius.lg,
        padding: spacing.xl,
        alignItems: 'center',
    },
    modalTitle: {
        ...typography.h2,
        color: '#fff',
        marginBottom: spacing.xl,
    },
    modalButton: {
        width: '100%',
        paddingVertical: 14,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    modalButtonText: {
        ...typography.body,
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    cancelButton: {
        width: '100%',
        paddingVertical: 14,
        marginTop: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: '#475569',
        alignItems: 'center',
    },
    cancelButtonText: {
        ...typography.body,
        color: '#94A3B8',
        fontWeight: '600',
    },
});

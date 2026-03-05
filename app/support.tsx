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
        a: '설정 화면 내 "내 정보 수정" 메뉴의 하단 혹은 문의하기를 통해 탈퇴 요청을 접수할 수 있습니다.'
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

export default function SupportScreen() {
    const router = useRouter();
    const [isEmailModalVisible, setIsEmailModalVisible] = useState(false);
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

    const toggleFaq = (index: number) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setOpenFaqIndex(openFaqIndex === index ? null : index);
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

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/Colors';
import { commonStyles, spacing, typography } from '@/constants/theme';

const TERMS_TEXT = `On-Anbu 서비스 이용약관
시행일: 2026-01-13

상호: 유진에이아이(YujinAI) | 대표자: 정창우
사업자등록번호: 519-77-00622
주소: 경기도 용인시 기흥구 동백8로 87
고객센터: yujinit2005@gmail.com

제1조 (목적)
본 약관은 유진에이아이(YujinAI)(이하 “회사”)가 제공하는 ON-ANBU 서비스(이하 “서비스”)의 이용과 관련하여 회사와 회원 간의 권리, 의무 및 책임사항과 기타 필요한 사항을 규정함을 목적으로 합니다.

제2조 (용어의 정의)
회원: 본 약관에 동의하고 서비스를 이용하는 자
기록 콘텐츠: 회원이 안부 전송 결과로 등록하는 텍스트/이미지/영상/음성 및 이에 준하는 자료

제3조 (약관의 게시 및 개정)
회사는 본 약관의 내용을 회원이 쉽게 알 수 있도록 서비스 내 설정 화면 또는 별도의 연결 화면에 게시합니다.
회사는 「전자상거래 등에서의 소비자보호에 관한 법률」, 「약관의 규제에 관한 법률」 등 관련 법령을 위배하지 않는 범위에서 본 약관을 개정할 수 있습니다.
약관 개정 시 적용일자 및 개정사유를 명시하여 적용일 7일 전부터 공지합니다. 다만, 회원에게 불리한 변경의 경우 30일 전부터 공지하며, 회원이 명시적으로 거부 의사를 표시하지 않는 경우 동의한 것으로 간주합니다.

제4조 (서비스의 제공 및 변경)
회사는 다음과 같은 기능을 제공합니다.
- 부모-자녀 간 안부 전송 및 확인
- 사진, 음성, 영상 등 미디어 콘텐츠 기록 및 공유
- 가족 그룹 관리
회사는 운영상, 기술상의 필요에 따라 제공하는 서비스의 전부 또는 일부를 변경하거나 종료할 수 있으며, 이 경우 사전에 공지합니다.

제5조 (청약철회 및 환불)
본 서비스 내 유료 재화 또는 아이템(있을 경우) 결제 후 7일 이내에 사용하지 않은 경우 청약철회(전액 환불)를 할 수 있습니다. 디지털 콘텐츠의 특성상 제공이 개시된 경우 청약철회가 제한될 수 있습니다.
환불 요청은 앱 스토어(Google Play, App Store)의 환불 정책에 따르거나, 회사의 고객센터로 문의하여 처리합니다.

제6조 (회원 탈퇴 및 자격 상실)
회원은 언제든지 서비스 내 ‘탈퇴하기’ 기능을 통해 이용 계약 해지를 요청할 수 있으며, 회사는 즉시 이를 처리합니다.
회원 탈퇴 시, 회원이 등록한 개인정보 및 기록 콘텐츠는 개인정보처리방침에 따른 보존 항목을 제외하고 즉시 파기됩니다.

제7조 (회원의 의무)
회원은 다음 행위를 하여서는 안 됩니다.
- 타인의 정보 도용 및 계정 공유
- 회사의 저작권, 제3자의 저작권 등 지식재산권 침해
- 공공질서 및 미풍양속에 위반되는 저속, 음란한 내용의 정보 전송
- 서비스의 안정적 운영을 방해할 목적의 행위

제8조 (지식재산권 및 기록 콘텐츠)
회사가 작성한 저작물에 대한 저작권 및 기타 지식재산권은 회사에 귀속됩니다.
회원이 서비스 내에 게시한 ‘기록 콘텐츠’의 저작권은 회원에게 있습니다. 단, 회사는 서비스의 운영, 홍보, 개선을 위하여 필요한 범위 내에서 해당 콘텐츠를 무상으로 이용(복제, 배포, 수정 등)할 수 있습니다.

제9조 (책임의 제한)
회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.

제10조 (준거법 및 관할)
본 약관은 대한민국 법령에 따라 해석되며, 회사와 회원 간 발생한 분쟁은 민사소송법상 관할 법원에 제기합니다.

----------------------------------
[사업자 정보]
상호 : 유진에이아이(YujinAI) | 대표자명 : 정창우
사업자등록번호 : 519-77-00622 | 통신판매업 신고번호 : 제 2026-용인기흥-00211 호
사업장 주소 : 경기도 용인시 기흥구 동백8로 87
고객센터 : yujinit2005@gmail.com
개인정보관리책임자 : 정창우
연락처 : 010-6614-4561
`;

export default function TermsScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={commonStyles.container} edges={['top']}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </Pressable>
                <Text style={styles.headerTitle}>이용약관 및 사업자정보</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
                <Text style={styles.paragraph}>{TERMS_TEXT}</Text>
            </ScrollView>
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
        flex: 1,
        padding: spacing.lg,
    },
    paragraph: {
        ...typography.body,
        fontSize: 14,
        lineHeight: 22,
        color: colors.textSecondary,
    },
});

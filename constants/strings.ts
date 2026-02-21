// ONANBU 문구 상수
export const strings = {
    // 앱 정보
    appName: 'ONANBU',
    appTagline: '부모님께 마음을 전하세요',

    // HOME 화면
    home: {
        pending: '오늘 안부가 아직 없어요',
        pendingSub: '짧게 전해도 충분해요',
        pendingEmoji: '🌤️',
        done: '오늘 안부가 전해졌어요',
        doneSub: '지금은 이만해도 충분해요',
        doneEmoji: '🌸',
        confirmedAt: (time: string) => `${time} 확인됨`,
        noPendingMessage: '아직 어머니의 아침 소식이 없어요.',
        completedMessage: '오늘 어머니는 기분 좋게 하루를 시작하셨어요!',
    },

    // CARE ACTION 화면
    care: {
        title: '마음 전하기',
        voiceTitle: '미디어 응원 전하기',
        voiceDesc: '사진, 동영상, 또는 목소리로 훈훈한 마음을 전해드려요.',
        checkInTitle: '오늘 안부 대신 기록하기',
        checkInDesc: '부모님께 안부를 대신 전해드려요.',
        adButton: '광고 보고 전하기',
        adButtonFull: '▶️ 광고 보고 선물 보내기',
        adButton15s: '▶️ 15초 광고로 완료하기',
        adCaption: '부모님께는 광고가 보이지 않아요.',
        maxActionsToday: '오늘 할 수 있는 케어가 모두 완료되었어요!',
    },

    // 로딩 & 성공 메시지
    loading: {
        preparing: '안부를 준비 중이에요...',
        wrapping: '🎁 어머니께 보낼 선물을 포장하고 있어요...',
        sending: '마음을 전달하고 있어요...',
    },
    success: {
        sent: '전해졌어요. 따뜻한 마음이 닿았어요.',
        complete: '전해졌어요. 오늘은 이만해도 충분해요',
        thanks: '감사합니다. 효도의 마음이 전해졌어요.',
    },

    // HISTORY 화면
    history: {
        title: '마음의 기록',
        header: (name: string, count: number) => `이번 달, ${name}와 ${count}번 마음을 나눴어요.`,
        headerDefault: (count: number) => `이번 달, ${count}번 마음을 나눴어요.`,
        voiceCheer: '음성 응원 전달함',
        checkIn: '안부 체크 완료',
        emptyState: '아직 기록이 없어요',
        emptyStateSub: 'CARE 탭에서 첫 마음을 전해보세요',
    },

    // 인증
    auth: {
        login: '로그인',
        register: '회원가입',
        email: '이메일',
        password: '비밀번호',
        passwordConfirm: '비밀번호 확인',
        loginButton: '로그인하기',
        registerButton: '가입하기',
        noAccount: '계정이 없으신가요?',
        hasAccount: '이미 계정이 있으신가요?',
        logout: '로그아웃',
    },

    // 설정
    settings: {
        title: '설정',
        profile: '프로필',
        notifications: '알림',
        parent: '부모님 정보',
        addParent: '부모님 추가',
        editParent: '부모님 정보 수정',
        about: '앱 정보',
        version: '버전',
    },

    // 공통
    common: {
        confirm: '확인',
        cancel: '취소',
        save: '저장',
        delete: '삭제',
        edit: '수정',
        back: '뒤로',
        next: '다음',
        done: '완료',
        loading: '로딩 중...',
        error: '오류가 발생했습니다',
        retry: '다시 시도',
    },

    // 관계 레이블
    relationships: [
        '어머니',
        '아버지',
        '할머니',
        '할아버지',
        '외할머니',
        '외할아버지',
    ],
};

export default strings;

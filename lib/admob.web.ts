// Web 환경에서는 Google Mobile Ads SDK가 동작하지 않으므로 Mock 객체를 제공하여 빌드 에러를 방지합니다.

export const RewardedAdEventType = {
    LOADED: 'loaded',
    EARNED_REWARD: 'rewarded',
};

export const AdEventType = {
    ERROR: 'error',
    CLOSED: 'closed',
};

class MockRewardedAd {
    listeners: Record<string, Function[]> = {};

    addAdEventListener(type: string, cb: Function) {
        if (!this.listeners[type]) {
            this.listeners[type] = [];
        }
        this.listeners[type].push(cb);
        return () => {
            this.listeners[type] = this.listeners[type].filter(l => l !== cb);
        };
    }

    load() {
        // 웹 환경에서는 로드 완료 이벤트를 즉시 모방 (0.5초 대기)
        setTimeout(() => {
            this.listeners[RewardedAdEventType.LOADED]?.forEach(cb => cb());
        }, 500);
    }

    show() {
        console.log('[Web Mock] 광고 재생칭 시뮬레이션 중...');
        // 웹 환경에서는 광고 재생을 시뮬레이션하고 1초 뒤에 리워드 이벤트를 발생
        setTimeout(() => {
            const reward = { type: 'reward', amount: 1 };
            this.listeners[RewardedAdEventType.EARNED_REWARD]?.forEach(cb => cb(reward));
        }, 1000);
    }
}

export const RewardedAd = {
    createForAdRequest: (adUnitId: string, options?: any) => new MockRewardedAd(),
};

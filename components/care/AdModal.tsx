import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, Animated, Easing } from 'react-native';
import { colors } from '@/constants/Colors';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { strings } from '@/constants/strings';

interface AdModalProps {
    visible: boolean;
    parentName?: string;
    onComplete: () => void;
}

export function AdModal({ visible, parentName = '어머니', onComplete }: AdModalProps) {
    const [phase, setPhase] = useState<'loading' | 'success'>('loading');
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            setPhase('loading');

            // 페이드 인
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start();

            // 회전 애니메이션
            Animated.loop(
                Animated.timing(rotateAnim, {
                    toValue: 1,
                    duration: 2000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            ).start();

            // 펄스 애니메이션
            Animated.loop(
                Animated.sequence([
                    Animated.timing(scaleAnim, {
                        toValue: 1.1,
                        duration: 500,
                        easing: Easing.ease,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scaleAnim, {
                        toValue: 1,
                        duration: 500,
                        easing: Easing.ease,
                        useNativeDriver: true,
                    }),
                ])
            ).start();

            // 1.5~3초 후 성공 상태로 전환
            const timer = setTimeout(() => {
                setPhase('success');

                // 성공 후 1초 뒤에 모달 닫기
                setTimeout(() => {
                    onComplete();
                }, 1500);
            }, 2000 + Math.random() * 1000);

            return () => clearTimeout(timer);
        } else {
            fadeAnim.setValue(0);
            setPhase('loading');
        }
    }, [visible]);

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent
        >
            <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
                <View style={styles.container}>
                    {phase === 'loading' ? (
                        <>
                            <Animated.Text
                                style={[
                                    styles.giftEmoji,
                                    {
                                        transform: [
                                            { rotate: spin },
                                            { scale: scaleAnim }
                                        ]
                                    }
                                ]}
                            >
                                🎁
                            </Animated.Text>
                            <Text style={styles.loadingText}>
                                {parentName}께 보낼 선물을{'\n'}포장하고 있어요...
                            </Text>
                        </>
                    ) : (
                        <>
                            <Animated.Text
                                style={[styles.successEmoji, { transform: [{ scale: scaleAnim }] }]}
                            >
                                💝
                            </Animated.Text>
                            <Text style={styles.successText}>
                                {strings.success.complete}
                            </Text>
                        </>
                    )}
                </View>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    container: {
        backgroundColor: colors.cardBg,
        borderRadius: borderRadius.xl,
        padding: spacing.xxl,
        alignItems: 'center',
        maxWidth: 300,
        marginHorizontal: spacing.lg,
    },
    giftEmoji: {
        fontSize: 80,
        marginBottom: spacing.lg,
    },
    loadingText: {
        ...typography.bodyLarge,
        color: colors.textPrimary,
        textAlign: 'center',
        lineHeight: 28,
    },
    successEmoji: {
        fontSize: 80,
        marginBottom: spacing.lg,
    },
    successText: {
        ...typography.bodyLarge,
        color: colors.success,
        textAlign: 'center',
        fontWeight: '600',
    },
});

export default AdModal;

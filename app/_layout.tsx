import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
// TODO: Supabase Realtime 유료 구독 후 활성화
// import { requestNotificationPermission, startRealtimeNotifications, stopRealtimeNotifications } from '@/lib/notificationService';
import { useAuthStore } from '@/stores/authStore';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: 'index',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { setUser, setIsAuthenticated, setIsLoading, user, isAuthenticated, isLoading } = useAuthStore();
  const [isReady, setIsReady] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  // 1. 초기 세션 확인 및 리스너 설정
  useEffect(() => {
    let isMounted = true;

    // 타임아웃: 5초 안에 세션 확인 실패 시 로그인 화면으로
    const timeout = setTimeout(() => {
      if (isMounted && !isReady) {
        console.warn('Session check timeout - proceeding to login');
        setUser(null);
        setIsAuthenticated(false);
        setIsLoading(false);
        setIsReady(true);
      }
    }, 5000);

    // 초기 세션 가져오기
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      clearTimeout(timeout);
      if (session) {
        console.log('Session found, fetching profile...');
        fetchProfile(session.user.id);
      } else {
        console.log('No session found, clearing store...');
        setUser(null);
        setIsAuthenticated(false);
        setIsLoading(false);
        setIsReady(true);
      }
    }).catch((err) => {
      if (!isMounted) return;
      clearTimeout(timeout);
      console.error('Session check failed:', err);
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
      setIsReady(true);
    });

    // Auth 상태 변경 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth Event:', event);

      if (event === 'SIGNED_IN' && session) {
        // 이미 초기 세션 체크 중이거나 초기화가 끝난 경우 중복 호출 방지
        // 하지만 로그인을 직접 한 경우(isReady=true)에는 프로필을 가져와야 함
        if (isReady) {
          console.log('User signed in, fetching profile...');
          await fetchProfile(session.user.id);
        } else {
          console.log('Initial sign-in event, handled by checkSession');
        }
      } else if (event === 'SIGNED_OUT') {
        // stopRealtimeNotifications(); // TODO: Realtime 활성화 후 주석 해제
        setUser(null);
        setIsAuthenticated(false);
        setIsLoading(false);
        setIsReady(true);
      } else if (event === 'INITIAL_SESSION') {
        // 초기 세션 로드 완료
        console.log('INITIAL_SESSION event received');
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  // 보호자일 경우 연결된 부모님 목록 가져오기
  const fetchGuardianParents = async (guardianId: string) => {
    try {
      const { data: memberData } = await supabase
        .from('family_members')
        .select('group_id')
        .eq('guardian_id', guardianId);

      let groupIds = memberData?.map((m: any) => m.group_id) || [];

      // 만약 속한 그룹이 없거나 누락되었다면, 초대한 부모님의 그룹을 모두 병합한다 (Fallback)
      const { data: invitations } = await supabase
        .from('parent_invitations')
        .select('accepted_by')
        .eq('inviter_id', guardianId)
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

      // 중복 그룹 ID 제거
      const uniqueGroupIds = Array.from(new Set(groupIds));

      if (uniqueGroupIds.length > 0) {
        const { data: groupData } = await supabase
          .from('family_groups')
          .select('parent_id')
          .in('id', uniqueGroupIds);

        if (groupData && groupData.length > 0) {
          const parentIds = groupData.map((g: any) => g.parent_id).filter((id: any) => id);

          if (parentIds.length > 0) {
            const { data: fetchedParents } = await supabase
              .from('profiles')
              .select('id, name, email, avatar_url, role')
              .in('id', parentIds);

            if (fetchedParents && fetchedParents.length > 0) {
              const uniqueParents = Array.from(new Map(fetchedParents.map((p: any) => [p.id, p])).values()) as any[];

              const store = useAuthStore.getState();
              store.setParents(uniqueParents);

              const currentSelected = store.selectedParent;
              const stillExists = currentSelected && uniqueParents.some((p: any) => p.id === currentSelected.id);
              if (!stillExists) {
                store.setSelectedParent(uniqueParents[0]);
              }
            }
          }
        }
      }
    } catch (e) {
      console.error('Error fetching parents:', e);
    }
  };

  // 프로필 가져오기 함수 (재시도 로직 포함)
  const fetchProfile = async (userId: string) => {
    // 1. 이미 스토어에 유저 정보가 있고 ID 일치 시 빠른 초기화
    if (user && user.id === userId) {
      console.log('Profile already loaded in store, checking parents...');

      const { parents } = useAuthStore.getState();
      if (user.role !== 'parent' && user.role !== 'admin' && (!parents || parents.length === 0)) {
        await fetchGuardianParents(user.id);
      }

      setIsAuthenticated(true);
      setIsLoading(false);
      setIsReady(true);
      return;
    }

    setIsLoading(true);
    let retryCount = 0;
    const maxRetries = 1; // 재시도를 1회로 대폭 줄여서 사용자 경험 개선

    while (retryCount <= maxRetries) {
      try {
        // 타임아웃 처리 (1.5초로 단축하여 무한 대기 방지)
        const timeoutPromise = (ms: number) => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms));

        // 프로필 가져오기
        const { data, error } = await Promise.race([
          supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle(),
          timeoutPromise(1500)
        ]) as { data: any, error: any };

        if (error) throw error;

        if (data) {
          setUser(data);

          // 만약 유저가 보호자(guardian)라면 부모님 목록도 불러옴
          if (data.role !== 'parent' && data.role !== 'admin') {
            await fetchGuardianParents(data.id);
          }

          // TODO: Supabase Realtime 유료 구독 후 활성화
          // if (data.notification_enabled) {
          //   requestNotificationPermission().then((perm) => {
          //     if (perm === 'granted') {
          //       startRealtimeNotifications(data.id, data.role || 'guardian');
          //     }
          //   });
          // }

          setIsAuthenticated(true);
          setIsLoading(false);
          setIsReady(true);
          return; // 성공 시 즉시 종료
        }
      } catch (e: any) {
        console.warn(`Fetch profile failed (attempt ${retryCount + 1}):`, e.message);

        if (retryCount === maxRetries) {
          // 재시도 실패 시에도 세션이 있으면(supabase.auth.getSession 기준)
          // 일단 로그인 스크린이 아닌 앱으로 넘어가게 할 수도 있지만, 
          // 여기선 안전하게 로그아웃. timeout인 경우 무시하고 기존 user 상태를 믿도록 함.
          if (e.message === 'Timeout' && user) {
            console.log('Timeout but fallback to existing cached user');
            setIsAuthenticated(true);
          } else {
            console.log('Max retries reached, logging out');
            setUser(null);
            setIsAuthenticated(false);
          }
        } else {
          await new Promise(resolve => setTimeout(resolve, 500)); // 대기 시간도 0.5초로 단축
        }
      }
      retryCount++;
    }

    // 로딩 종료
    setIsLoading(false);
    setIsReady(true);
  };

  // 2. 라우팅 보호 (Protected Routes)
  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === 'auth';
    const isExemptedFromAuthRedirect = segments[1] === 'enter-code'; // 초대코드 입력은 로그인 후에도 접근 가능할 수 있음

    if (isAuthenticated && inAuthGroup && !isExemptedFromAuthRedirect) {
      if (user?.role === 'admin') router.replace('/admin/users');
      else if (user?.role === 'parent') router.replace('/parent');
      else router.replace('/(tabs)');
    } else if (!isAuthenticated && !inAuthGroup) {
      router.replace('/auth/login');
    }
  }, [isReady, isAuthenticated, segments]);

  // 로딩 중
  if (!isReady || isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 20, color: '#666' }}>앱 초기화 중...</Text>
      </View>
    );
  }

  return (
    <ThemeProvider value={DefaultTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="parent" />
        <Stack.Screen name="family" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="admin" />
      </Stack>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});

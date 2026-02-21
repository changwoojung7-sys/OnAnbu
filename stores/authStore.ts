import { ParentInfo, Profile } from '@/lib/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface AuthState {
    // 사용자 정보
    user: Profile | null;
    isAuthenticated: boolean;
    isLoading: boolean;

    // 부모님 정보
    parents: ParentInfo[];
    selectedParent: ParentInfo | null;

    // 초대 코드 (로그인 전 상태 유지용)
    pendingInviteCode: string | null;

    // Actions
    setUser: (user: Profile | null) => void;
    setIsAuthenticated: (isAuthenticated: boolean) => void;
    setIsLoading: (isLoading: boolean) => void;
    setParents: (parents: ParentInfo[]) => void;
    setSelectedParent: (parent: ParentInfo | null) => void;
    setPendingInviteCode: (code: string | null) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            // 초기 상태
            user: null,
            isAuthenticated: false,
            isLoading: true,
            parents: [],
            selectedParent: null,
            pendingInviteCode: null,

            // Actions
            setUser: (user) => set({ user, isAuthenticated: !!user }),
            setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
            setIsLoading: (isLoading) => set({ isLoading }),
            setParents: (parents) => set({
                parents,
                selectedParent: parents.length > 0 ? parents[0] : null
            }),
            setSelectedParent: (selectedParent) => set({ selectedParent }),
            setPendingInviteCode: (pendingInviteCode) => set({ pendingInviteCode }),
            logout: () => set({
                user: null,
                isAuthenticated: false,
                parents: [],
                selectedParent: null,
                pendingInviteCode: null
            }),
        }),
        {
            name: 'onanbu-auth-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                user: state.user,
                isAuthenticated: state.isAuthenticated,
                parents: state.parents,
                selectedParent: state.selectedParent,
                pendingInviteCode: state.pendingInviteCode, // 저장됨
            }),
        }
    )
);

export default useAuthStore;

import { create } from 'zustand';
import { ActionLog, TodayStatus, ActionType } from '@/lib/types';

interface ActionState {
    // 오늘의 상태
    todayStatus: TodayStatus;
    todayActions: ActionLog[];
    isLoadingActions: boolean;

    // 히스토리
    historyActions: ActionLog[];
    monthlyCount: number;

    // 모달 상태
    isAdModalVisible: boolean;
    currentActionType: ActionType | null;

    // Actions
    setTodayStatus: (status: TodayStatus) => void;
    setTodayActions: (actions: ActionLog[]) => void;
    setIsLoadingActions: (isLoading: boolean) => void;
    setHistoryActions: (actions: ActionLog[]) => void;
    setMonthlyCount: (count: number) => void;
    showAdModal: (actionType: ActionType) => void;
    hideAdModal: () => void;
    addAction: (action: ActionLog) => void;
    reset: () => void;
}

const initialTodayStatus: TodayStatus = {
    hasSentMessage: false,
    lastActionTime: null,
    actionsToday: 0,
    maxActionsPerDay: 2,
};

export const useActionStore = create<ActionState>()((set, get) => ({
    // 초기 상태
    todayStatus: initialTodayStatus,
    todayActions: [],
    isLoadingActions: false,
    historyActions: [],
    monthlyCount: 0,
    isAdModalVisible: false,
    currentActionType: null,

    // Actions
    setTodayStatus: (todayStatus) => set({ todayStatus }),
    setTodayActions: (todayActions) => set({
        todayActions,
        todayStatus: {
            ...get().todayStatus,
            hasSentMessage: todayActions.length > 0,
            actionsToday: todayActions.length,
            lastActionTime: todayActions.length > 0
                ? todayActions[todayActions.length - 1].created_at
                : null,
        }
    }),
    setIsLoadingActions: (isLoadingActions) => set({ isLoadingActions }),
    setHistoryActions: (historyActions) => set({ historyActions }),
    setMonthlyCount: (monthlyCount) => set({ monthlyCount }),
    showAdModal: (actionType) => set({
        isAdModalVisible: true,
        currentActionType: actionType
    }),
    hideAdModal: () => set({
        isAdModalVisible: false,
        currentActionType: null
    }),
    addAction: (action) => {
        const { todayActions, todayStatus } = get();
        const newActions = [...todayActions, action];
        set({
            todayActions: newActions,
            todayStatus: {
                ...todayStatus,
                hasSentMessage: true,
                actionsToday: newActions.length,
                lastActionTime: action.created_at,
            }
        });
    },
    reset: () => set({
        todayStatus: initialTodayStatus,
        todayActions: [],
        historyActions: [],
        monthlyCount: 0,
    }),
}));

export default useActionStore;

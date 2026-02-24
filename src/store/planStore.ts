import { create } from 'zustand'
import type { PlanData, PlanStatus } from '../types'

interface ActivePlan {
  id: string
  data: PlanData
  status: PlanStatus
  checkedItems: Set<number>
}

interface PlanStore {
  activePlan: ActivePlan | null
  setPlan: (id: string, data: PlanData) => void
  approvePlan: () => void
  rejectPlan: () => void
  startExecuting: () => void
  completePlan: () => void
  toggleTodo: (index: number) => void
  clearPlan: () => void
}

export const usePlanStore = create<PlanStore>((set, get) => ({
  activePlan: null,

  setPlan: (id, data) =>
    set({
      activePlan: { id, data, status: 'pending', checkedItems: new Set() },
    }),

  approvePlan: () => {
    const plan = get().activePlan
    if (plan?.status !== 'pending') return
    set({ activePlan: { ...plan, status: 'approved' } })
  },

  rejectPlan: () => {
    const plan = get().activePlan
    if (plan?.status !== 'pending') return
    set({ activePlan: { ...plan, status: 'rejected' } })
  },

  startExecuting: () => {
    const plan = get().activePlan
    if (plan?.status !== 'approved') return
    set({ activePlan: { ...plan, status: 'executing' } })
  },

  completePlan: () => {
    const plan = get().activePlan
    if (plan?.status !== 'executing') return
    set({ activePlan: { ...plan, status: 'done' } })
  },

  toggleTodo: (index) => {
    const plan = get().activePlan
    if (!plan) return
    const next = new Set(plan.checkedItems)
    if (next.has(index)) {
      next.delete(index)
    } else {
      next.add(index)
    }
    set({ activePlan: { ...plan, checkedItems: next } })
  },

  clearPlan: () => set({ activePlan: null }),
}))

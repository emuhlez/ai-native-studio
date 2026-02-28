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
  pendingFollowUp: 'todos' | 'execute' | null
  setPlan: (id: string, data: PlanData) => void
  approvePlan: () => void
  rejectPlan: () => void
  answerQuestions: (answers: string[]) => void
  startExecuting: () => void
  resumeExecution: () => void
  completePlan: () => void
  toggleTodo: (index: number) => void
  clearPlan: () => void
  setPendingFollowUp: (type: 'todos' | 'execute' | null) => void
  // Inline plan editing (Gap 5)
  updateTodo: (index: number, label: string) => void
  addTodo: (label: string, category?: string) => void
  removeTodo: (index: number) => void
  reorderTodos: (from: number, to: number) => void
}

export const usePlanStore = create<PlanStore>((set, get) => ({
  activePlan: null,
  pendingFollowUp: null,

  setPlan: (id, data) => {
    const hasQuestions = (data.questions?.length ?? 0) > 0
    const status: PlanStatus = hasQuestions ? 'clarifying' : 'pending'
    set({
      activePlan: { id, data, status, checkedItems: new Set() },
    })
  },

  approvePlan: () => {
    const plan = get().activePlan
    if (plan?.status !== 'pending') return
    set({ activePlan: { ...plan, status: 'approved' } })
  },

  rejectPlan: () => {
    const plan = get().activePlan
    if (plan?.status !== 'pending' && plan?.status !== 'clarifying') return
    set({ activePlan: { ...plan, status: 'rejected' } })
  },

  answerQuestions: (answers: string[]) => {
    const plan = get().activePlan
    if (plan?.status !== 'clarifying') return
    set({
      activePlan: {
        ...plan,
        data: { ...plan.data, answers },
        status: 'answered',
      },
    })
  },

  startExecuting: () => {
    const plan = get().activePlan
    if (plan?.status !== 'approved') return
    set({ activePlan: { ...plan, status: 'executing' } })
  },

  resumeExecution: () => {
    const plan = get().activePlan
    if (!plan || plan.status !== 'done') return
    set({ activePlan: { ...plan, status: 'executing' } })
  },

  completePlan: () => {
    const plan = get().activePlan
    if (plan?.status !== 'executing') return

    const todos = plan.data.todos ?? []
    const allChecked = new Set<number>()
    todos.forEach((_, index) => {
      allChecked.add(index)
    })

    set({
      activePlan: {
        ...plan,
        status: 'done',
        checkedItems: allChecked,
      },
    })
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

  setPendingFollowUp: (type) => set({ pendingFollowUp: type }),

  // Inline plan editing (Gap 5)
  updateTodo: (index, label) => {
    const plan = get().activePlan
    if (!plan) return
    const todos = [...(plan.data.todos ?? [])]
    if (index < 0 || index >= todos.length) return
    todos[index] = { ...todos[index], label }
    set({ activePlan: { ...plan, data: { ...plan.data, todos } } })
  },

  addTodo: (label, category) => {
    const plan = get().activePlan
    if (!plan) return
    const todos = [...(plan.data.todos ?? []), { label, category }]
    set({ activePlan: { ...plan, data: { ...plan.data, todos } } })
  },

  removeTodo: (index) => {
    const plan = get().activePlan
    if (!plan) return
    const todos = [...(plan.data.todos ?? [])]
    if (index < 0 || index >= todos.length) return
    todos.splice(index, 1)
    // Adjust checkedItems indices
    const oldChecked = plan.checkedItems
    const newChecked = new Set<number>()
    for (const i of oldChecked) {
      if (i < index) newChecked.add(i)
      else if (i > index) newChecked.add(i - 1)
      // skip i === index (removed)
    }
    set({ activePlan: { ...plan, data: { ...plan.data, todos }, checkedItems: newChecked } })
  },

  reorderTodos: (from, to) => {
    const plan = get().activePlan
    if (!plan) return
    const todos = [...(plan.data.todos ?? [])]
    if (from < 0 || from >= todos.length || to < 0 || to >= todos.length) return
    const [item] = todos.splice(from, 1)
    todos.splice(to, 0, item)
    set({ activePlan: { ...plan, data: { ...plan.data, todos } } })
  },
}))

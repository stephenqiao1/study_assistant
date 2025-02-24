// Adapted from https://ui.shadcn.com/
import { useEffect, useState } from "react"

const TOAST_LIMIT = 5
const TOAST_REMOVE_DELAY = 1000000

type ToastActionElement = HTMLButtonElement

export type Toast = {
  id: string
  title?: string
  description?: string
  action?: React.ReactNode
  variant?: "default" | "destructive"
}

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_VALUE
  return count.toString()
}

type ToasterToast = Toast & {
  id: string
  title?: string
  description?: string
  action?: React.ReactNode
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

type ActionType = typeof actionTypes

let memoryState: {
  toasts: ToasterToast[]
} = {
  toasts: [],
}

function dispatch(action: any) {
  memoryState = reducer(memoryState, action)
}

function reducer(state: typeof memoryState, action: any): typeof memoryState {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case actionTypes.UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case actionTypes.DISMISS_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toastId ? { ...t, dismissed: true } : t
        ),
      }

    case actionTypes.REMOVE_TOAST:
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
      
    default:
      return state
  }
}

export function useToast() {
  const [state, setState] = useState<typeof memoryState>(memoryState)

  useEffect(() => {
    const listener = () => setState(memoryState)
    
    window.addEventListener("toast", listener)
    
    return () => {
      window.removeEventListener("toast", listener)
    }
  }, [])

  return {
    ...state,
    toast: (props: Omit<Toast, "id">) => {
      const id = genId()
      const update = (props: Toast) =>
        dispatch({
          type: actionTypes.UPDATE_TOAST,
          toast: { ...props, id },
        })
      const dismiss = () => dispatch({ type: actionTypes.DISMISS_TOAST, toastId: id })

      dispatch({
        type: actionTypes.ADD_TOAST,
        toast: {
          ...props,
          id,
          onDismiss: dismiss,
          update,
        },
      })

      return {
        id,
        dismiss,
        update,
      }
    },
    dismiss: (toastId?: string) => dispatch({ type: actionTypes.DISMISS_TOAST, toastId }),
    remove: (toastId?: string) => dispatch({ type: actionTypes.REMOVE_TOAST, toastId }),
  }
} 
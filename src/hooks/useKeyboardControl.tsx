import { useEffect } from "react"

type KeyboardActions = {
  setA: () => void
  setB: () => void
  toggleLoop: () => void
  stop: () => void
}

export function useKeyboardControl(actions: KeyboardActions) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // 입력 포커스 중이면 키보드 제어 비활성화
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      switch (e.code) {
        case "KeyQ": // A 지점 설정
          actions.setA()
          break

        case "KeyW": // B 지점 설정
          actions.setB()
          break

        case "KeyE": // A–B 반복 토글
          actions.toggleLoop()
          break

        case "KeyR":  // 루프 stop
          actions.stop()
          break
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [actions])
}

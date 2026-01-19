// hooks/useKeyboardControl.ts
import { useEffect } from "react";

type KeyboardActions = {
  setA: () => void;
  setB: () => void;
  toggleLoop: () => void;
  stop: () => void;
};

export function useKeyboardControl(actions: KeyboardActions) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.code) {
        case "KeyQ":
          actions.setA();
          break;
        case "KeyW":
          actions.setB();
          break;
        case "KeyE":
          actions.toggleLoop();
          break;
        case "KeyR":
          actions.stop();
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [actions]);
}

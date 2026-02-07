export interface AutoSaveController {
  trigger: () => void;
  cancel: () => void;
}

export function createAutoSave(onSave: () => void, delayMs = 1500): AutoSaveController {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const trigger = () => {
    cancel();
    timer = setTimeout(() => {
      onSave();
      timer = null;
    }, delayMs);
  };

  return { trigger, cancel };
}

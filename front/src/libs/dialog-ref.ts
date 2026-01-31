let closeFn: (() => void) | null = null;

export const setCloseDialogFn = (fn: () => void) => {
  closeFn = fn;
};

export const closeCurrentDialog = () => {
  if (closeFn) {
    closeFn();
  }
};

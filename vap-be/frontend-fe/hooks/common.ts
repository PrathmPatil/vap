export function debounce<F extends (...args: any[]) => any>(
  func: F,
  timeout: number
) {
  let timer: ReturnType<typeof setTimeout>;

  return (...args: Parameters<F>): void => {
    if (timer) clearTimeout(timer);

    timer = setTimeout(() => {
      func(...args);
    }, timeout);
  };
}

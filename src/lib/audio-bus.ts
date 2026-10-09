let level = 0;

export const audioBus = {
  set(next: number) {
    level = Math.max(0, Math.min(1, next));
  },
  get() {
    return level;
  },
};

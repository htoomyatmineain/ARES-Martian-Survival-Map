export type ExplorationInput = { moveX: number; moveY: number; lookX: number; lookY: number; sprint: boolean };
export type PlayerPosition = { x: number; z: number; elevation: number; heading: number };
export const inputChanged = () => window.dispatchEvent(new Event('mars-exploration-input'));

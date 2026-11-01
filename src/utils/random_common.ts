// One random entry of a list. `random` is a parameter so a test can give a fixed number.
export function pickRandom<T>(items: readonly T[], random: () => number = Math.random): T {
  if (items.length === 0) {
    throw new Error('pickRandom needs at least one item');
  }
  // random() is below 1, so the index is always inside the list.
  return items[Math.floor(random() * items.length)];
}

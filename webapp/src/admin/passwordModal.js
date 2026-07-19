export function checkPassword(input, expected) {
  return typeof input === 'string' && input === expected;
}

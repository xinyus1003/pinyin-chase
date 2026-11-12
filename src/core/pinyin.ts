export function normalizePinyin(text: string): string {
  return text
    .toLowerCase()
    .replace(/u:/g, 'v')
    .normalize('NFD')
    .replace(/u\u0308/g, 'v')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '');
}

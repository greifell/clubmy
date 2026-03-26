import type { Category } from '@prisma/client';

const categoryByKeyword: Record<string, Category> = {
  arroz: 'ALIMENTOS',
  feijao: 'ALIMENTOS',
  leite: 'ALIMENTOS',
  cafe: 'BEBIDAS',
  suco: 'BEBIDAS',
  refrigerante: 'BEBIDAS',
  agua: 'BEBIDAS',
  sabao: 'LIMPEZA',
  detergente: 'LIMPEZA',
  desinfetante: 'LIMPEZA',
  shampoo: 'HIGIENE',
  creme: 'HIGIENE',
  papel: 'HIGIENE'
};

export function normalizeName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function inferCategory(name: string): Category {
  const normalized = normalizeName(name);
  const found = Object.entries(categoryByKeyword).find(([keyword]) => normalized.includes(keyword));
  return found?.[1] ?? 'OUTROS';
}

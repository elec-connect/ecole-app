export function moyennePonderee(notes: { valeur: number; coefficient: number }[]): number {
  if (notes.length === 0) return 0;
  const somme = notes.reduce((a, n) => a + n.valeur * n.coefficient, 0);
  const coefs = notes.reduce((a, n) => a + n.coefficient, 0);
  return coefs > 0 ? Math.round((somme / coefs) * 100) / 100 : 0;
}

export function mention(moyenne: number): { label: string; color: string } {
  if (moyenne >= 16) return { label: 'Très bien', color: 'text-green-700' };
  if (moyenne >= 14) return { label: 'Bien', color: 'text-green-600' };
  if (moyenne >= 12) return { label: 'Assez bien', color: 'text-blue-600' };
  if (moyenne >= 10) return { label: 'Passable', color: 'text-orange-600' };
  return { label: 'Insuffisant', color: 'text-red-600' };
}

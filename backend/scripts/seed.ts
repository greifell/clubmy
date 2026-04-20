import { prisma } from '../src/lib/prisma.js';
import { upsertOffers } from '../src/services/offerService.js';

async function main() {
  await upsertOffers([
    {
      productName: 'Feijão Carioca 1kg',
      category: 'ALIMENTOS',
      price: 7.99,
      supermarket: { name: 'Mercado Central', city: 'São Paulo', state: 'SP' },
      source: 'seed',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
    },
    {
      productName: 'Detergente Neutro 500ml',
      category: 'LIMPEZA',
      price: 2.99,
      supermarket: { name: 'Mercado Central', city: 'São Paulo', state: 'SP' },
      source: 'seed',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
    }
  ]);

  console.log('Seed concluído');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

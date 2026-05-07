import { prisma } from '../src/lib/prisma.js';

async function main() {
  await prisma.flyer.upsert({
    where: {
      supermarketName_url: {
        supermarketName: 'Moniari',
        url: 'https://www.flipsnack.com/EAC95866AED/encarte-quinzenal-digital-29-04-12-05-2026'
      }
    },
    update: {
      title: 'Encarte Quinzenal Digital Moniari',
      city: 'Criciúma',
      state: 'SC',
      source: 'moniari-flipsnack',
      validFrom: new Date('2026-04-29T00:00:00'),
      validUntil: new Date('2026-05-12T23:59:59'),
      isActive: true
    },
    create: {
      supermarketName: 'Moniari',
      city: 'Criciúma',
      state: 'SC',
      title: 'Encarte Quinzenal Digital Moniari',
      url: 'https://www.flipsnack.com/EAC95866AED/encarte-quinzenal-digital-29-04-12-05-2026',
      source: 'moniari-flipsnack',
      validFrom: new Date('2026-04-29T00:00:00'),
      validUntil: new Date('2026-05-12T23:59:59'),
      isActive: true
    }
  });

  console.log('Encarte Moniari salvo/atualizado com sucesso');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
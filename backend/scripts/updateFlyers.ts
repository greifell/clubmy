import { prisma } from '../src/lib/prisma.js';

async function upsertFlyer(data: {
  supermarketName: string;
  city: string;
  state: string;
  title: string;
  url: string;
  source: string;
  validFrom?: Date | null;
  validUntil?: Date | null;
}) {
  await prisma.flyer.upsert({
    where: {
      supermarketName_url: {
        supermarketName: data.supermarketName,
        url: data.url
      }
    },
    update: {
      title: data.title,
      city: data.city,
      state: data.state,
      source: data.source,
      validFrom: data.validFrom ?? null,
      validUntil: data.validUntil ?? null,
      isActive: true
    },
    create: {
      supermarketName: data.supermarketName,
      city: data.city,
      state: data.state,
      title: data.title,
      url: data.url,
      source: data.source,
      validFrom: data.validFrom ?? null,
      validUntil: data.validUntil ?? null,
      isActive: true
    }
  });

  console.log(`Encarte ${data.supermarketName} salvo/atualizado com sucesso`);
}

async function main() {
  await upsertFlyer({
    supermarketName: 'Moniari',
    city: 'Criciúma',
    state: 'SC',
    title: 'Encarte Quinzenal Digital Moniari',
    url: 'https://www.flipsnack.com/EAC95866AED/encarte-quinzenal-digital-29-04-12-05-2026',
    source: 'moniari-flipsnack',
    validFrom: new Date('2026-04-29T00:00:00'),
    validUntil: new Date('2026-05-12T23:59:59')
  });

  await upsertFlyer({
    supermarketName: 'MM Rosso',
    city: 'Criciúma',
    state: 'SC',
    title: 'Ofertas todos os dias MM Rosso',
    url: 'https://www.mmrosso.com/',
    source: 'mmrosso-site',
    validFrom: null,
    validUntil: null
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
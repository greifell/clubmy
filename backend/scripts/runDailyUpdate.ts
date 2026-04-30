import { removeExpiredOffers, upsertOffers } from '../src/services/offerService.js';
import { scrapeSupermarketOffers } from '../src/services/scraperService.js';

async function run() {
  console.log('🚀 Iniciando atualização diária de ofertas...');

  const startedAt = new Date();

  let offers = [];

  try {
    offers = await scrapeSupermarketOffers();
  } catch (error) {
    console.error('❌ Erro geral ao buscar ofertas:', error);
    process.exit(1);
  }

  if (!offers || offers.length === 0) {
    console.warn('⚠️ Nenhuma oferta encontrada. Banco não será alterado.');
    process.exit(0);
  }

  console.log(`✅ ${offers.length} ofertas encontradas.`);

  try {
    await upsertOffers(offers);
    console.log('✅ Ofertas salvas/atualizadas com sucesso.');
  } catch (error) {
    console.error('❌ Erro ao salvar ofertas no banco:', error);
    process.exit(1);
  }

  try {
    await removeExpiredOffers();
    console.log('🧹 Ofertas expiradas removidas/inativadas.');
  } catch (error) {
    console.error('⚠️ Erro ao remover ofertas expiradas:', error);
  }

  const finishedAt = new Date();
  const seconds = Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000);

  console.log(`🏁 Atualização diária finalizada em ${seconds}s.`);
}

run().catch((error) => {
  console.error('❌ Erro inesperado:', error);
  process.exit(1);
});

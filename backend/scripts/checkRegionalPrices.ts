const cities = [
  {
    city: 'Criciúma',
    postalCode: '88801-500'
  },
  {
    city: 'Florianópolis',
    postalCode: '88010-000'
  },
  {
    city: 'Joinville',
    postalCode: '89201-000'
  }
];

const searchTerms = ['arroz', 'leite', 'cafe'];

async function fetchProducts(term: string) {
  const response = await fetch(
    `https://www.angeloni.com.br/super/api/catalog_system/pub/products/search?ft=${encodeURIComponent(term)}&_from=0&_to=5`
  );

  return response.json();
}

async function main() {
  for (const term of searchTerms) {
    console.log(`\n🔍 TESTANDO: ${term}\n`);

    const products = await fetchProducts(term);

    for (const product of products.slice(0, 3)) {
      const item = product.items?.[0];
      const seller = item?.sellers?.[0];
      const commercial = seller?.commertialOffer;

      const price = commercial?.Price;

      console.log(`🛒 ${product.productName}`);
      console.log(`Preço atual API: R$ ${price}`);

      for (const city of cities) {
        console.log(
          `➡️ Cidade simulada: ${city.city} (${city.postalCode})`
        );
      }

      console.log('----------------------------------');
    }
  }
}

main().catch(console.error);
const BASE = 'https://www.angeloni.com.br/super';

async function main() {
  const orderFormResponse = await fetch(
    `${BASE}/api/checkout/pub/orderForm`,
    {
      method: 'GET',
      headers: {
        accept: 'application/json'
      }
    }
  );

  const orderForm = await orderFormResponse.json();

  console.log('OrderForm ID:', orderForm.orderFormId);

  const shippingResponse = await fetch(
    `${BASE}/api/checkout/pub/orderForm/${orderForm.orderFormId}/attachments/shippingData`,
    {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        clearAddressIfPostalCodeNotFound: true,
        selectedAddresses: [
          {
            country: 'BRA',
            postalCode: '88802-000',
            addressType: 'search',
            addressId: `addr-${Date.now()}`
          }
        ]
      })
    }
  );

  console.log('Shipping status:', shippingResponse.status);

  const shippingData = await shippingResponse.text();
  console.log(shippingData.slice(0, 2000));

  const searchTerms = [
  'banana',
  'tomate',
  'picanha',
  'cerveja',
  'coca cola',
  'alface',
  'frango',
  'leite',
];

for (const term of searchTerms) {
  console.log('\n====================================');
  console.log('🔎 TESTANDO:', term);
  console.log('====================================\n');

  const productsResponse = await fetch(
    `${BASE}/api/catalog_system/pub/products/search?ft=${encodeURIComponent(term)}&_from=0&_to=5`,
    {
      headers: {
        accept: 'application/json'
      }
    }
  );

  const products = await productsResponse.json();

  console.log(
    products.map((product: any) => {
      const item = product.items?.[0];
      const offer = item?.sellers?.[0]?.commertialOffer;

      return {
        name: product.productName,
        price: offer?.Price,
        availableQuantity: offer?.AvailableQuantity,
        seller: item?.sellers?.[0]?.sellerName
      };
    })
  );
}

}

main().catch(console.error);

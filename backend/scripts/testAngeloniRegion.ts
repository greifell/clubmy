import { chromium } from 'playwright';

const regions = [
  {
    city: 'Criciúma',
    store: 'Criciúma'
  },
  {
    city: 'Florianópolis',
    store: 'Florianópolis'
  },
  {
    city: 'Joinville',
    store: 'Joinville'
  }
];

async function setRegion(page: any, storeName: string) {
  console.log(`\n🌎 Configurando loja/cidade: ${storeName}`);

  await page.goto('https://www.angeloni.com.br/super/', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  await page.waitForTimeout(5000);

  const openModal = page
    .locator('section')
    .filter({ hasText: 'Entregar em:' })
    .getByLabel('Abrir modal');

  if (await openModal.count()) {
    await openModal.first().click();
  } else {
    await page.getByText(/Entregar em:/i).click();
  }

  await page.waitForTimeout(2500);

  const retirarBtn = page.getByRole('button', {
    name: /Retirar na loja/i
  });

  if (await retirarBtn.count()) {
    await retirarBtn.first().click();
    await page.waitForTimeout(2500);
  }

  const inputContainer = page.locator(
  '.superangeloni-region-0-x-modalPickupContentSelect__input-container'
);

if (await inputContainer.count()) {
  await inputContainer.first().evaluate((el: any) => el.click());
} else {
  const placeholder = page.getByText(/Escolha sua cidade/i);

  await placeholder.evaluate((el: any) => el.click());
}

  await page.waitForTimeout(2000);

  const options = await page.locator('[role="option"]').allInnerTexts();

console.log('🏬 Opções encontradas:');
console.log(options);

const option = page
  .locator('[role="option"]')
  .filter({ hasText: new RegExp(storeName, 'i') })
  .first();

await option.click();

  await page.waitForTimeout(7000);

  const cookies = await page.context().cookies();

  const regionCookies = cookies.filter((cookie: { name: string }) =>
    ['vtex_segment', 'vtex_session', 'vtex_binding_address'].includes(
      cookie.name
    )
  );

  console.log(`🍪 Cookies regionais:`);
  console.log(regionCookies);

  await page.goto(
    'https://www.angeloni.com.br/super/api/catalog_system/pub/products/search?ft=arroz&_from=0&_to=5',
    {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    }
  );

  const bodyText = await page.locator('body').innerText();

  console.log(`📦 Resultado ${storeName}:`);
  console.log(bodyText.slice(0, 1200));
}

async function main() {
  const browser = await chromium.launch({
    headless: false
  });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 }
  });

  for (const region of regions) {
    await setRegion(page, region.store);
  }

  await browser.close();
}

main().catch(console.error);

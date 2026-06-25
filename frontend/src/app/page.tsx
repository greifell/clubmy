'use client';

import { useEffect, useMemo, useState } from 'react';

import { OfferCard } from '@/components/OfferCard';
import {
  api,
  fetchCategories,
  fetchOffers,
  fetchRegions,
  fetchSupermarkets,
  type Offer
} from '@/lib/api';

type Region = {
  city: string;
  state: string;
};

type Flyer = {
  id: string;
  supermarketName: string;
  city: string;
  state: string;
  title: string;
  url: string;
  validUntil: string | null;
};

type SupermarketOption = {
  id: number;
  name: string;
  city: string;
  state: string;
};

const GENERIC_COMPARE_WORDS = new Set([
  'cerveja',
  'lager',
  'puro',
  'malte',
  'produto',
  'bebida',
  'bebidas'
]);

const PACKAGE_WORDS = ['lata', 'garrafa', 'long neck', 'descartavel'];
const ALCOHOL_FREE_WORDS = ['zero', 'alcool'];

function normalizeProductText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w\s,.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractQuantities(value: string) {
  const normalized = normalizeProductText(value);
  const matches = normalized.matchAll(/(\d+(?:[,.]\d+)?)\s*(ml|l|kg|g)\b/g);

  return Array.from(matches, (match) => {
    const amount = Number(match[1].replace(',', '.'));
    const unit = match[2];

    if (unit === 'l') return `${amount * 1000}ml`;
    if (unit === 'kg') return `${amount * 1000}g`;

    return `${amount}${unit}`;
  });
}

function extractWords(value: string) {
  return normalizeProductText(value)
    .split(' ')
    .filter((word) => word.length > 2);
}

function getCompareSearchTerm(productName: string) {
  return (
    extractWords(productName).find((word) => !GENERIC_COMPARE_WORDS.has(word)) ??
    productName
  );
}

function isComparableProduct(targetName: string, candidateName: string) {
  const target = normalizeProductText(targetName);
  const candidate = normalizeProductText(candidateName);
  const targetQuantities = extractQuantities(target);

  if (targetQuantities.length > 0) {
    const candidateQuantities = extractQuantities(candidate);
    const hasSameQuantity = targetQuantities.every((quantity) =>
      candidateQuantities.includes(quantity)
    );

    if (!hasSameQuantity) return false;
  }

  for (const word of PACKAGE_WORDS) {
    if (target.includes(word) && !candidate.includes(word)) return false;
  }

  const targetIsAlcoholFree = ALCOHOL_FREE_WORDS.every((word) =>
    target.includes(word)
  );
  const candidateIsAlcoholFree = ALCOHOL_FREE_WORDS.every((word) =>
    candidate.includes(word)
  );

  if (targetIsAlcoholFree !== candidateIsAlcoholFree) return false;

  const importantWords = extractWords(targetName).filter(
    (word) =>
      !GENERIC_COMPARE_WORDS.has(word) &&
      !PACKAGE_WORDS.includes(word) &&
      !ALCOHOL_FREE_WORDS.includes(word) &&
      !/^\d/.test(word)
  );

  return importantWords.every((word) => candidate.includes(word));
}

function uniqueComparableOffers(offers: Offer[]) {
  const unique = new Map<string, Offer>();

  for (const offer of offers) {
    const key = [
      offer.supermarket.name,
      offer.supermarket.city,
      offer.product.name,
      offer.price
    ].join('|');

    if (!unique.has(key)) unique.set(key, offer);
  }

  return Array.from(unique.values());
}

function supermarketMenuKey(name: string) {
  return normalizeProductText(name);
}

function uniqueSupermarketOptions(markets: SupermarketOption[]) {
  const unique = new Map<string, SupermarketOption>();

  for (const market of markets) {
    const key = supermarketMenuKey(market.name);
    if (!unique.has(key)) unique.set(key, market);
  }

  return Array.from(unique.values()).sort((a, b) =>
    a.name.localeCompare(b.name, 'pt-BR')
  );
}

export default function HomePage() {
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');
  const [supermarket, setSupermarket] = useState('');
  const [search, setSearch] = useState('');

  const [offers, setOffers] = useState<Offer[]>([]);
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [supermarkets, setSupermarkets] = useState<SupermarketOption[]>([]);

  const [loading, setLoading] = useState(false);
  const [offerSource, setOfferSource] = useState<'api' | 'static' | 'mixed'>('api');
  const [staticGeneratedAt, setStaticGeneratedAt] = useState<string | null>(
    null
  );
  const [compareOffer, setCompareOffer] = useState<Offer | null>(null);
  const [compareResults, setCompareResults] = useState<Offer[]>([]);
  const [compareLoading, setCompareLoading] = useState(false);

  useEffect(() => {
    fetchRegions().then(setRegions);
    fetchCategories().then(setCategories);
  }, []);

  useEffect(() => {
    fetchSupermarkets(city || undefined).then(setSupermarkets);
  }, [city]);

  useEffect(() => {
    api
      .get('/flyers', {
        params: {
          city: city || undefined
        }
      })
      .then((response) => {
        setFlyers(response.data ?? []);
      });
  }, [city]);

  useEffect(() => {
    setLoading(true);

    fetchOffers({
      city: city || undefined,
      supermarket: supermarket || undefined,
      category: category || undefined,
      search: search || undefined
    })
      .then((response) => {
        setOffers(response.offers);
        setOfferSource(response.source);
        setStaticGeneratedAt(response.generatedAt);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [city, supermarket, category, search]);

  const bestOfferId = useMemo(() => {
    if (!offers.length) return null;

    return offers.reduce((best, current) =>
      Number(current.price) < Number(best.price) ? current : best
    ).id;
  }, [offers]);

  const supermarketOptions = useMemo(
    () => uniqueSupermarketOptions(supermarkets),
    [supermarkets]
  );

  function clearFilters() {
    setCity('');
    setCategory('');
    setSupermarket('');
    setSearch('');
  }

  async function handleCompare(offer: Offer) {
    setCompareOffer(offer);
    setCompareLoading(true);

    try {
      const visibleComparable = uniqueComparableOffers(
        offers.filter((item: Offer) =>
          isComparableProduct(offer.product.name, item.product.name)
        )
      );

      if (visibleComparable.length > 0) {
        setCompareResults(
          visibleComparable.sort(
            (a: Offer, b: Offer) => Number(a.price) - Number(b.price)
          )
        );
        return;
      }

      const response = await fetchOffers({
        search: getCompareSearchTerm(offer.product.name)
      });

      const results = response.offers ?? [];
      const comparable = uniqueComparableOffers(
        results.filter((item: Offer) =>
          isComparableProduct(offer.product.name, item.product.name)
        )
      );

      const filtered = (comparable.length > 0 ? comparable : [offer]).sort(
        (a: Offer, b: Offer) => Number(a.price) - Number(b.price)
      );

      setCompareResults(filtered);
    } catch (error) {
      console.error(error);
    } finally {
      setCompareLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7fbf8_0%,#ffffff_42%,#f5f7f6_100%)] text-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-5 md:px-6 md:py-7">
        <header className="relative overflow-hidden rounded-[24px] border border-emerald-100 bg-[radial-gradient(circle_at_82%_18%,rgba(16,185,129,0.14),transparent_28%),linear-gradient(135deg,#ffffff_0%,#f7fbf8_62%,#edf8f2_100%)] px-5 py-6 shadow-lg shadow-emerald-950/5 md:px-8 md:py-7">
          <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/60 to-transparent" />
          <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-950 shadow-sm">
                Economia inteligente em supermercados
              </div>

              <h1 className="mt-5 max-w-4xl text-4xl font-black leading-[1.02] text-emerald-950 md:text-6xl">
                ClubMy <span className="text-emerald-600">Ofertas</span>
              </h1>

              <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-slate-700 md:text-xl">
                Compare preços reais em Santa Catarina e encontre as melhores
                ofertas perto de você.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <div className="flex min-w-44 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-base text-emerald-700">
                    $
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase text-slate-500">
                      Ofertas encontradas
                    </p>
                    <p className="mt-0.5 text-2xl font-black text-emerald-950">
                      {offers.length}
                    </p>
                  </div>
                </div>

                <div className="flex min-w-36 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-sm text-emerald-700">
                    SC
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase text-slate-500">
                      Região inicial
                    </p>
                    <p className="mt-0.5 text-2xl font-black text-emerald-950">
                      SC
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-start md:min-w-44 md:justify-end">
              <div className="rounded-[26px] border border-emerald-100 bg-white p-3 shadow-xl shadow-emerald-950/8">
                <img
                  src="/clubmy-logo.png"
                  alt="ClubMy"
                  className="h-20 w-20 rounded-[20px] object-contain md:h-28 md:w-28"
                />
              </div>
            </div>
          </div>
        </header>

        <section className="relative z-20 -mt-3 mb-8 rounded-[22px] border border-slate-200 bg-white p-3 shadow-xl shadow-slate-950/7 md:p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
            <select
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-emerald-950 shadow-sm transition hover:border-emerald-300 focus:border-emerald-500"
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setSupermarket('');
              }}
            >
              <option value="">Todas as cidades</option>

              {regions.map((region) => (
                <option
                  key={`${region.city}-${region.state}`}
                  value={region.city}
                >
                  {region.city}/{region.state}
                </option>
              ))}
            </select>

            <select
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-emerald-950 shadow-sm transition hover:border-emerald-300 focus:border-emerald-500"
              value={supermarket}
              onChange={(e) => setSupermarket(e.target.value)}
            >
              <option value="">Todos supermercados</option>

              {supermarketOptions.map((market) => (
                <option key={supermarketMenuKey(market.name)} value={market.name}>
                  {market.name}
                </option>
              ))}
            </select>

            <select
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-emerald-950 shadow-sm transition hover:border-emerald-300 focus:border-emerald-500"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Todas categorias</option>

              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <input
              className="h-12 rounded-2xl border border-slate-200 px-4 text-sm font-bold text-emerald-950 shadow-sm transition placeholder:text-slate-400 hover:border-emerald-300 focus:border-emerald-500"
              placeholder="Buscar produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <button
              onClick={clearFilters}
              className="h-12 rounded-2xl bg-emerald-950 px-7 text-sm font-black text-white shadow-md shadow-emerald-950/15 transition hover:-translate-y-0.5 hover:bg-emerald-800"
            >
              Limpar filtros
            </button>
          </div>
        </section>

        {flyers.length > 0 ? (
          <section className="mb-10">
            <div className="mb-4">
              <h2 className="text-2xl font-black text-slate-950">
                Encartes da semana
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {city
                  ? `Encartes disponíveis para ${city}.`
                  : 'Selecione uma cidade para ver encartes locais.'}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {flyers.map((flyer) => (
                <a
                  key={flyer.id}
                  href={flyer.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex min-w-[280px] items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
                >
                  <div>
                    <p className="text-sm font-black text-slate-950">
                      {flyer.supermarketName}
                    </p>

                    <p className="text-xs text-slate-500">
                      {flyer.city}/{flyer.state}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {flyer.validUntil ? (
                      <p className="text-xs text-slate-400">
                        até{' '}
                        {new Date(flyer.validUntil).toLocaleDateString(
                          'pt-BR'
                        )}
                      </p>
                    ) : null}

                    <div className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800 transition group-hover:bg-emerald-100">
                      Ver encarte
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </section>
        ) : null}

        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-950">
              Melhores ofertas
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Atualizações automáticas dos supermercados monitorados.
            </p>
          </div>

          {!loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-emerald-950 shadow-sm">
              {offers.length} ofertas encontradas
            </div>
          ) : null}
        </div>

        {offerSource !== 'api' && staticGeneratedAt ? (
          <p className="-mt-4 mb-6 text-sm font-medium text-slate-500">
            Encartes locais incluídos na lista. Atualizado em{' '}
            {new Date(staticGeneratedAt).toLocaleString('pt-BR')}.
          </p>
        ) : null}

        {loading ? (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-64 animate-pulse rounded-3xl bg-white shadow-sm"
              />
            ))}
          </section>
        ) : null}

        {!loading && offers.length > 0 ? (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {offers.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                highlight={offer.id === bestOfferId}
                onCompare={handleCompare}
              />
            ))}
          </section>
        ) : null}

        {!loading && !offers.length ? (
          <div className="rounded-[28px] border border-dashed border-emerald-200 bg-white p-14 text-center shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-4xl">
              ?
            </div>

            <h3 className="mt-6 text-2xl font-bold text-slate-950">
              Nenhuma oferta encontrada
            </h3>

            <p className="mx-auto mt-3 max-w-md text-slate-500">
              Tente alterar os filtros ou buscar outro produto para encontrar
              novas promoções.
            </p>

            <button
              onClick={clearFilters}
              className="mt-8 rounded-2xl bg-emerald-950 px-6 py-4 font-bold text-white transition hover:bg-emerald-800"
            >
              Limpar filtros
            </button>
          </div>
        ) : null}
      </div>

      {compareOffer ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-emerald-700">
                  Comparando produto
                </p>

                <h3 className="mt-1 text-2xl font-black text-slate-950">
                  {compareOffer.product.name}
                </h3>
              </div>

              <button
                onClick={() => {
                  setCompareOffer(null);
                  setCompareResults([]);
                }}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold hover:bg-emerald-50"
              >
                Fechar
              </button>
            </div>

            {compareLoading ? (
              <div className="py-10 text-center text-slate-500">
                Buscando preços...
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {compareResults.map((item, index) => (
                  <div
                    key={item.id}
                    className={`
                      flex items-center justify-between gap-4 rounded-2xl border p-4
                      ${
                        index === 0
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-slate-200'
                      }
                    `}
                  >
                    <div>
                      <p className="font-bold text-slate-950">
                        {item.supermarket.name}
                      </p>

                      <p className="mt-1 max-w-sm text-sm font-semibold text-slate-700">
                        {item.product.name}
                      </p>

                      <p className="text-sm text-slate-500">
                        {item.supermarket.city}/{item.supermarket.state}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-2xl font-black text-emerald-800">
                        {Number(item.price).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        })}
                      </p>

                      {index === 0 ? (
                        <p className="text-xs font-bold text-emerald-700">
                          Melhor preço
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}

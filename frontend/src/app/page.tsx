'use client';

import { useEffect, useMemo, useState } from 'react';

import { OfferCard } from '@/components/OfferCard';
import {
  api,
  fetchOffers,
  fetchStaticCategories,
  fetchStaticRegions,
  fetchStaticSupermarkets,
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

export default function HomePage() {
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');
  const [supermarket, setSupermarket] = useState('');
  const [search, setSearch] = useState('');

  const [offers, setOffers] = useState<Offer[]>([]);
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [supermarkets, setSupermarkets] = useState<
    {
      id: number;
      name: string;
      city: string;
      state: string;
    }[]
  >([]);

  const [loading, setLoading] = useState(false);
  const [offerSource, setOfferSource] = useState<'api' | 'static'>('api');
  const [staticGeneratedAt, setStaticGeneratedAt] = useState<string | null>(
    null
  );
  const [compareOffer, setCompareOffer] = useState<Offer | null>(null);
  const [compareResults, setCompareResults] = useState<Offer[]>([]);
  const [compareLoading, setCompareLoading] = useState(false);

  useEffect(() => {
    api
      .get('/regions')
      .then((response) => {
        const data = response.data;

        if (Array.isArray(data)) {
          setRegions(data);
          return;
        }

        const parsedRegions = Object.entries(data ?? {}).flatMap(
          ([state, cities]) =>
            Array.isArray(cities)
              ? cities.map((city) => ({
                  city: String(city),
                  state: String(state)
                }))
              : []
        );

        setRegions(parsedRegions);
      })
      .catch(async () => {
        setRegions(await fetchStaticRegions());
      });

    api
      .get('/categories')
      .then((response) => {
        setCategories(response.data ?? []);
      })
      .catch(async () => {
        setCategories(await fetchStaticCategories());
      });
  }, []);

  useEffect(() => {
    api
      .get('/supermarkets', {
        params: {
          city: city || undefined
        }
      })
      .then((response) => {
        setSupermarkets(response.data ?? []);
      })
      .catch(async () => {
        setSupermarkets(await fetchStaticSupermarkets(city || undefined));
      });
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
    <main className="min-h-screen bg-gradient-to-b from-amber-50 via-stone-50 to-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <header className="relative overflow-hidden rounded-[32px] bg-[radial-gradient(circle_at_85%_15%,rgba(244,183,64,0.32),transparent_28%),linear-gradient(135deg,#101820_0%,#18222d_56%,#2f2414_100%)] p-8 text-white shadow-2xl shadow-amber-900/20">
          <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-amber-300/10 blur-3xl" />

          <img
            src="/clubmy-logo.svg"
            alt="ClubMy"
            className="relative z-10 mb-8 ml-auto h-24 w-24 rounded-[26px] border border-amber-200/30 bg-clubmy-dark shadow-2xl shadow-black/25 md:absolute md:right-8 md:top-8 md:mb-0 md:h-32 md:w-32"
          />

          <div className="relative z-10 max-w-3xl pr-0 md:pr-36">
            <div className="inline-flex items-center rounded-full border border-amber-200/25 bg-amber-200/10 px-4 py-2 text-sm font-medium text-amber-50 backdrop-blur">
              🛒 Economia inteligente em supermercados
            </div>

            <h1 className="mt-6 text-4xl font-black tracking-tight md:text-6xl">
              ClubMy Ofertas
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-amber-50/90 md:text-xl">
              Compare preços reais de supermercados em Santa Catarina e encontre
              as melhores ofertas perto de você.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <div className="rounded-2xl border border-amber-200/20 bg-white/10 px-4 py-3 backdrop-blur">
                <p className="text-xs uppercase tracking-wide text-amber-100">
                  Ofertas encontradas
                </p>

                <p className="text-2xl font-black">{offers.length}</p>
              </div>

              <div className="rounded-2xl border border-amber-200/20 bg-white/10 px-4 py-3 backdrop-blur">
                <p className="text-xs uppercase tracking-wide text-amber-100">
                  Região inicial
                </p>

                <p className="text-2xl font-black">SC</p>
              </div>
            </div>
          </div>
        </header>

        <section className="relative z-20 -mt-8 mb-10 rounded-3xl border border-amber-200/70 bg-white/95 p-5 shadow-2xl shadow-amber-900/10 backdrop-blur">
          <div className="grid gap-4 lg:grid-cols-5">
            <select
              className="rounded-2xl border border-stone-200 bg-white px-4 py-4 text-sm font-medium transition focus:border-amber-500"
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
              className="rounded-2xl border border-stone-200 bg-white px-4 py-4 text-sm font-medium transition focus:border-amber-500"
              value={supermarket}
              onChange={(e) => setSupermarket(e.target.value)}
            >
              <option value="">Todos supermercados</option>

              {supermarkets.map((market) => (
                <option key={market.id} value={market.name}>
                  {market.name}
                </option>
              ))}
            </select>

            <select
              className="rounded-2xl border border-stone-200 bg-white px-4 py-4 text-sm font-medium transition focus:border-amber-500"
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
              className="rounded-2xl border border-stone-200 px-4 py-4 text-sm transition focus:border-amber-500"
              placeholder="Buscar produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <button
              onClick={clearFilters}
              className="rounded-2xl bg-clubmy-blue px-5 py-4 text-sm font-bold text-amber-50 transition hover:scale-[1.02] hover:bg-clubmy-ink"
            >
              Limpar filtros
            </button>
          </div>
        </section>

        {flyers.length > 0 ? (
          <section className="mb-10">
            <div className="mb-4">
              <h2 className="text-xl font-black text-gray-900">
                📢 Encartes da semana
              </h2>

              <p className="mt-1 text-sm text-gray-500">
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
                  className="group flex min-w-[280px] items-center justify-between rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm transition hover:border-amber-300 hover:shadow-md"
                >
                  <div>
                    <p className="text-sm font-black text-gray-900">
                      {flyer.supermarketName}
                    </p>

                    <p className="text-xs text-gray-500">
                      {flyer.city}/{flyer.state}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {flyer.validUntil ? (
                      <p className="text-xs text-gray-400">
                        até{' '}
                        {new Date(flyer.validUntil).toLocaleDateString(
                          'pt-BR'
                        )}
                      </p>
                    ) : null}

                    <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-clubmy-blue transition group-hover:bg-amber-100">
                      Ver encarte
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </section>
        ) : null}

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-gray-900">
              Melhores ofertas
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Atualizações automáticas dos supermercados monitorados.
            </p>
          </div>

          {!loading ? (
            <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm">
              {offers.length} ofertas encontradas
            </div>
          ) : null}
        </div>

        {offerSource === 'static' && staticGeneratedAt ? (
          <p className="-mt-4 mb-6 text-sm font-medium text-gray-500">
            Dados carregados do arquivo público de ofertas. Atualizado em{' '}
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
          <div className="rounded-[32px] border border-dashed border-amber-300 bg-white p-14 text-center shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 text-4xl">
              🔎
            </div>

            <h3 className="mt-6 text-2xl font-bold text-gray-900">
              Nenhuma oferta encontrada
            </h3>

            <p className="mx-auto mt-3 max-w-md text-gray-500">
              Tente alterar os filtros ou buscar outro produto para encontrar
              novas promoções.
            </p>

            <button
              onClick={clearFilters}
              className="mt-8 rounded-2xl bg-clubmy-blue px-6 py-4 font-bold text-amber-50 transition hover:bg-clubmy-ink"
            >
              Limpar filtros
            </button>
          </div>
        ) : null}
      </div>

      {compareOffer ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-clubmy-gold">
                  Comparando produto
                </p>

                <h3 className="mt-1 text-2xl font-black text-gray-900">
                  {compareOffer.product.name}
                </h3>
              </div>

              <button
                onClick={() => {
                  setCompareOffer(null);
                  setCompareResults([]);
                }}
                className="rounded-xl border border-stone-200 px-3 py-2 text-sm font-bold hover:bg-amber-50"
              >
                Fechar
              </button>
            </div>

            {compareLoading ? (
              <div className="py-10 text-center text-gray-500">
                Buscando preços...
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {compareResults.map((item, index) => (
                  <div
                    key={item.id}
                    className={`
                      flex items-center justify-between rounded-2xl border p-4
                      ${
                        index === 0
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-stone-200'
                      }
                    `}
                  >
                    <div>
                      <p className="font-bold text-gray-900">
                        {item.supermarket.name}
                      </p>

                      <p className="mt-1 max-w-sm text-sm font-semibold text-gray-700">
                        {item.product.name}
                      </p>

                      <p className="text-sm text-gray-500">
                        {item.supermarket.city}/{item.supermarket.state}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-2xl font-black text-clubmy-blue">
                        {Number(item.price).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        })}
                      </p>

                      {index === 0 ? (
                        <p className="text-xs font-bold text-clubmy-gold">
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

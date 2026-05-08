'use client';

import { useEffect, useMemo, useState } from 'react';

import { OfferCard } from '@/components/OfferCard';
import { api, type Offer } from '@/lib/api';

type Region = {
  city: string;
 state: string;
};

export default function HomePage() {
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');
  const [supermarket, setSupermarket] = useState('');
  const [search, setSearch] = useState('');

  const [offers, setOffers] = useState<Offer[]>([]);

  const [flyers, setFlyers] = useState<
  {
    id: string;
    supermarketName: string;
    city: string;
    state: string;
    title: string;
    url: string;
    validUntil: string;
  }[]
  >([]);
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
  const [compareOffer, setCompareOffer] = useState<Offer | null>(null);
  const [compareResults, setCompareResults] = useState<Offer[]>([]);
  const [compareLoading, setCompareLoading] = useState(false);

  useEffect(() => {
    api.get('/regions').then((response) => {
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
    });

    api.get('/categories').then((response) => {
      setCategories(response.data ?? []);
    });

    api.get('/flyers').then((response) => {
  setFlyers(response.data ?? []);
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
    });
}, [city]);

  useEffect(() => {
    setLoading(true);

    api.get('/offers', {
        params: {
        city: city || undefined,
        supermarket: supermarket || undefined,
        category: category || undefined,
        search: search || undefined
        }
      })
      .then((response) => {
        setOffers(response.data.offers ?? []);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [city, category, search]);

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
    const response = await api.get('/offers', {
      params: {
        search: offer.product.name.split(' ').slice(0, 3).join(' ')
      }
    });

    const results = response.data.offers ?? [];

    const filtered = results
      .filter(
        (item: Offer) =>
          item.product.name.toLowerCase().includes(
            offer.product.name.split(' ')[0].toLowerCase()
          )
      )
      .sort((a: Offer, b: Offer) => Number(a.price) - Number(b.price));

    setCompareResults(filtered);
  } catch (error) {
    console.error(error);
  } finally {
    setCompareLoading(false);
  }
}    

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-100">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        {/* HERO */}
        <header className="relative overflow-hidden rounded-[32px] bg-gradient-to-r from-clubmy-blue via-cyan-700 to-cyan-600 p-8 text-white shadow-2xl">
          <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

          <div className="relative z-10">
            <div className="inline-flex items-center rounded-full bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur">
              🛒 Economia inteligente em supermercados
            </div>

            <h1 className="mt-6 text-4xl font-black tracking-tight md:text-6xl">
              ClubMy Ofertas
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-cyan-50 md:text-xl">
              Compare preços reais de supermercados em Santa Catarina e encontre
              as melhores ofertas perto de você.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
                <p className="text-xs uppercase tracking-wide text-cyan-100">
                  Ofertas encontradas
                </p>

                <p className="text-2xl font-black">
                  {offers.length}
                </p>
              </div>

              <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
                <p className="text-xs uppercase tracking-wide text-cyan-100">
                  Região inicial
                </p>

                <p className="text-2xl font-black">
                  SC
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* FILTROS */}
        <section className="relative z-20 -mt-8 mb-10 rounded-3xl border border-gray-200 bg-white/95 p-5 shadow-2xl backdrop-blur">
          <div className="grid gap-4 lg:grid-cols-5">
            <select
              className="rounded-2xl border border-gray-200 bg-white px-4 py-4 text-sm font-medium transition focus:border-cyan-500"
              value={city}
              onChange={(e) => setCity(e.target.value)}
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
              className="rounded-2xl border border-gray-200 bg-white px-4 py-4 text-sm font-medium transition focus:border-cyan-500"
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
              className="rounded-2xl border border-gray-200 bg-white px-4 py-4 text-sm font-medium transition focus:border-cyan-500"
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
              className="rounded-2xl border border-gray-200 px-4 py-4 text-sm transition focus:border-cyan-500"
              placeholder="Buscar produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <button
              onClick={clearFilters}
              className="rounded-2xl bg-clubmy-blue px-5 py-4 text-sm font-bold text-white transition hover:scale-[1.02] hover:bg-blue-900"
            >
              Limpar filtros
            </button>
          </div>
        </section>

        {/* ENCARTES */}
        {flyers.length > 0 ? (
        <section className="mb-10">
          <div className="mb-5 flex items-center justify-between">
            <div>
        <h2 className="text-2xl font-black text-gray-900">
          📢 Encartes da semana
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Promoções e tabloides atualizados automaticamente.
        </p>
      </div>
    </div>

    <div className="flex flex-wrap gap-3">
      {flyers.map((flyer) => (
  <a
    key={flyer.id}
    href={flyer.url}
    target="_blank"
    rel="noreferrer"
    className="group flex min-w-[280px] items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition hover:border-cyan-300 hover:shadow-md"
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
      {flyer.validUntil && flyer.validUntil !== null ? (
        <p className="text-xs text-gray-400">
          até{' '}
          {new Date(flyer.validUntil).toLocaleDateString('pt-BR')}
        </p>
      ) : null}

      <div className="rounded-xl bg-cyan-50 px-3 py-2 text-xs font-bold text-cyan-700 transition group-hover:bg-cyan-100">
        Ver encarte
      </div>
    </div>
  </a>
))}
    </div>
  </section>
) : null}

        {/* STATUS */}
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
            <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm">
              {offers.length} ofertas encontradas
            </div>
          ) : null}
        </div>

        {/* LOADING */}
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

        {/* OFERTAS */}
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

        {/* EMPTY STATE */}
        {!loading && !offers.length ? (
          <div className="rounded-[32px] border border-dashed border-gray-300 bg-white p-14 text-center shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 text-4xl">
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
              className="mt-8 rounded-2xl bg-clubmy-blue px-6 py-4 font-bold text-white transition hover:bg-blue-900"
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
          <p className="text-sm font-semibold text-cyan-700">
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
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold hover:bg-gray-50"
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
                ${index === 0 ? 'border-green-500 bg-green-50' : 'border-gray-200'}
              `}
            >
              <div>
                <p className="font-bold text-gray-900">
                  {item.supermarket.name}
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
                  <p className="text-xs font-bold text-green-600">
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
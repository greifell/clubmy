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
  const [search, setSearch] = useState('');

  const [offers, setOffers] = useState<Offer[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);

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
  }, []);

  useEffect(() => {
    setLoading(true);

    api
      .get('/offers', {
        params: {
          city: city || undefined,
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
    setSearch('');
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
          <div className="grid gap-4 lg:grid-cols-4">
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
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
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
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {offers.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                highlight={offer.id === bestOfferId}
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
    </main>
  );
}
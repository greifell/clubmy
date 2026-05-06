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

  // carregar filtros dinâmicos
  useEffect(() => {
    
    api.get('/regions').then((response) => {
  const data = response.data;

  if (Array.isArray(data)) {
    setRegions(data);
    return;
  }

  const parsedRegions = Object.entries(data ?? {}).flatMap(([state, cities]) =>
    Array.isArray(cities)
      ? cities.map((city) => ({ city: String(city), state: String(state) }))
      : []
  );

  setRegions(parsedRegions);
});

    api.get('/categories').then((response) => {
      setCategories(response.data ?? []);
    });
  }, []);

  // carregar ofertas
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

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl p-6">
        <header className="mb-8 rounded-3xl bg-gradient-to-r from-clubmy-blue to-cyan-700 p-8 text-white shadow-lg">
          <h1 className="text-4xl font-bold tracking-tight">
            ClubMy Ofertas
          </h1>

          <p className="mt-3 text-sm md:text-lg text-blue-50">
            Compare ofertas reais de supermercados em Santa Catarina.
          </p>
        </header>

        <section className="mb-8 grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-3">
          {/* cidades */}
          <select
            className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-600"
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

          {/* categorias */}
          <select
            className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-600"
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

          {/* busca */}
          <input
            className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-600"
            placeholder="Buscar produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </section>

        {/* loading */}
        {loading ? (
          <div className="mb-6 text-sm text-gray-500">
            Carregando ofertas...
          </div>
        ) : null}

        {/* cards */}
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {offers.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              highlight={offer.id === bestOfferId}
            />
          ))}
        </section>

        {!loading && !offers.length ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
            Nenhuma oferta encontrada.
          </div>
        ) : null}
      </div>
    </main>
  );
}
'use client';

import { useEffect, useMemo, useState } from 'react';

import { OfferCard } from '@/components/OfferCard';
import { api, type Offer } from '@/lib/api';

export default function HomePage() {
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);

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
      .then((response) => setOffers(response.data.offers ?? []))
      .finally(() => setLoading(false));
  }, [city, category, search]);

  const bestOfferId = useMemo(() => {
    if (!offers.length) return null;

    return offers.reduce((best, current) => (Number(current.price) < Number(best.price) ? current : best)).id;
  }, [offers]);

  return (
    <main className="mx-auto max-w-6xl p-6">
      <header className="mb-8 rounded-2xl bg-gradient-to-r from-clubmy-blue to-cyan-700 p-8 text-white">
        <h1 className="text-3xl font-bold">ClubMy Ofertas</h1>
        <p className="mt-2 text-sm md:text-base">Encontre os melhores preços de supermercados por cidade em segundos.</p>
      </header>

      <section className="mb-8 grid gap-3 rounded-xl border border-gray-200 bg-white p-4 md:grid-cols-4">
        <select className="rounded-lg border border-gray-200 px-3 py-2" value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="">Cidade</option>
          <option value="São Paulo">São Paulo</option>
          <option value="Porto Alegre">Porto Alegre</option>
          <option value="Curitiba">Curitiba</option>
        </select>

        <select className="rounded-lg border border-gray-200 px-3 py-2" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Categoria</option>
          <option value="ALIMENTOS">Alimentos</option>
          <option value="BEBIDAS">Bebidas</option>
          <option value="LIMPEZA">Limpeza</option>
          <option value="HIGIENE">Higiene</option>
        </select>

        <input
          className="rounded-lg border border-gray-200 px-3 py-2 md:col-span-2"
          placeholder="Buscar produto"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </section>

      {loading ? <p>Carregando ofertas...</p> : null}

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {offers.map((offer) => (
          <OfferCard key={offer.id} offer={offer} highlight={offer.id === bestOfferId} />
        ))}
      </section>
    </main>
  );
}

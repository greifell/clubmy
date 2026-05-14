'use client';

import { useState } from 'react';

import { OfferCard } from '@/components/OfferCard';
import { api, fetchOffers, type Offer } from '@/lib/api';

type CompareResponse = {
  product: string;
  bestOffer: Offer | null;
  offers: Offer[];
};

export default function ComparePage() {
  const [product, setProduct] = useState('');
  const [data, setData] = useState<CompareResponse | null>(null);

  async function handleCompare() {
    if (!product.trim()) return;

    try {
      const response = await api.get('/compare', { params: { product } });
      setData(response.data);
      return;
    } catch {
      const response = await fetchOffers({ search: product });
      const offers = response.offers.sort(
        (a, b) => Number(a.price) - Number(b.price)
      );

      setData({
        product,
        bestOffer: offers[0] ?? null,
        offers
      });
    }
  }

  return (
    <main className="relative mx-auto min-h-screen max-w-5xl bg-gradient-to-b from-amber-50 via-stone-50 to-slate-100 p-6">
      <h1 className="text-2xl font-bold">Comparador de preços</h1>
      <img
         src="/clubmy-logo.png"
        alt="ClubMy"
        className="absolute right-6 top-6 h-16 w-16 rounded-2xl bg-clubmy-dark shadow-lg shadow-amber-900/20"
      />
      <div className="mt-4 flex gap-2 pr-20">
        <input
          value={product}
          onChange={(e) => setProduct(e.target.value)}
          className="w-full rounded-lg border border-stone-200 px-3 py-2 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
          placeholder="Ex.: arroz"
        />
        <button onClick={handleCompare} className="rounded-lg bg-clubmy-blue px-4 py-2 font-semibold text-amber-50 hover:bg-clubmy-ink">
          Comparar
        </button>
      </div>

      {data?.bestOffer ? (
        <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-clubmy-blue">
          Melhor oferta: {data.bestOffer.supermarket.name} por{' '}
          {Number(data.bestOffer.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </p>
      ) : null}

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        {data?.offers.map((offer) => (
          <OfferCard key={offer.id} offer={offer} highlight={offer.id === data.bestOffer?.id} />
        ))}
      </section>
    </main>
  );
}

'use client';

import { useState } from 'react';

import { OfferCard } from '@/components/OfferCard';
import { api, type Offer } from '@/lib/api';

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
    const response = await api.get('/compare', { params: { product } });
    setData(response.data);
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-bold">Comparador de preços</h1>
      <div className="mt-4 flex gap-2">
        <input
          value={product}
          onChange={(e) => setProduct(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2"
          placeholder="Ex.: arroz"
        />
        <button onClick={handleCompare} className="rounded-lg bg-clubmy-orange px-4 py-2 font-semibold text-white">
          Comparar
        </button>
      </div>

      {data?.bestOffer ? (
        <p className="mt-6 rounded-lg bg-green-100 p-3 text-green-800">
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

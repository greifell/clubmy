import type { Offer } from '@/lib/api';

export function OfferCard({ offer, highlight }: { offer: Offer; highlight?: boolean }) {
  const price = Number(offer.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <article className={`rounded-xl border bg-white p-4 shadow-sm ${highlight ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-200'}`}>
      <p className="text-xs uppercase text-gray-500">{offer.product.category}</p>
      <h3 className="mt-1 font-semibold text-gray-900">{offer.product.name}</h3>
      <p className="mt-3 text-2xl font-bold text-clubmy-blue">{price}</p>
      <p className="mt-2 text-sm text-gray-600">{offer.supermarket.name} • {offer.supermarket.city}/{offer.supermarket.state}</p>
    </article>
  );
}

import type { Offer } from '@/lib/api';

export function OfferCard({
  offer,
  highlight
}: {
  offer: Offer;
  highlight?: boolean;
}) {
  const price = Number(offer.price).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

  return (
    <article
      className={`
        group relative overflow-hidden rounded-2xl border bg-white p-5
        transition-all duration-300 hover:-translate-y-1 hover:shadow-xl
        ${highlight
          ? 'border-green-500 ring-2 ring-green-200 shadow-lg'
          : 'border-gray-200 hover:border-gray-300'}
      `}
    >
      <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-clubmy-blue/5 blur-2xl" />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
            {offer.product.category}
          </span>

          <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-bold text-green-700">
            Oferta
          </span>
        </div>

        <h3 className="mt-4 min-h-[56px] text-lg font-semibold leading-6 text-gray-900">
          {offer.product.name}
        </h3>

        <div className="mt-5">
          <p className="text-sm text-gray-500">Menor preço encontrado</p>

          <p className="mt-1 text-4xl font-black tracking-tight text-clubmy-blue">
            {price}
          </p>
        </div>

        <div className="mt-6 flex items-center justify-between border-t pt-4">
          <div>
            <p className="text-sm font-semibold text-gray-800">
              {offer.supermarket.name}
            </p>

            <p className="text-sm text-gray-500">
              {offer.supermarket.city}/{offer.supermarket.state}
            </p>
          </div>

          <div className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-medium text-gray-600">
            Atualizado
          </div>
        </div>
      </div>
    </article>
  );
}
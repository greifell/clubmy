import type { Offer } from '@/lib/api';

export function OfferCard({
  offer,
  highlight,
  onCompare
}: {
  offer: Offer;
  highlight?: boolean;
  onCompare?: (offer: Offer) => void;
}) {

  const price = Number(offer.price).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

  const imageUrl = offer.imageUrl;

  return (
    <article
      className={`
        overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg
        ${highlight ? 'border-green-500 ring-1 ring-green-200' : 'border-gray-200'}
      `}
    >
      <div className="flex gap-3 p-3">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={offer.product.name}
              className="h-full w-full object-contain p-2"
            />
          ) : (
            <span className="text-3xl">🛒</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-bold uppercase text-gray-600">
              {offer.product.category}
            </span>

            {highlight ? (
              <span className="rounded-full bg-green-500 px-2 py-1 text-[10px] font-black text-white">
                Melhor
              </span>
            ) : null}
          </div>

          <h3 className="mt-2 line-clamp-2 text-sm font-bold leading-5 text-gray-900">
            {offer.product.name}
          </h3>

          <p className="mt-2 text-2xl font-black text-clubmy-blue">
            {price}
          </p>

          <p className="mt-1 truncate text-xs font-semibold text-gray-700">
            {offer.supermarket.name}
          </p>

          <p className="text-xs text-gray-500">
            {offer.supermarket.city}/{offer.supermarket.state}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 border-t border-gray-100">
        <a
          href={offer.productUrl || '#'}
          target="_blank"
          rel="noreferrer"
          className="py-2 text-center text-xs font-bold text-clubmy-blue hover:bg-gray-50"
        >
          Ver oferta
        </a>

        <button
        onClick={() => onCompare?.(offer)}
        className="border-l border-gray-100 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">
          Comparar
        </button>
      </div>
    </article>
  );
}
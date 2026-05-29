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
        group overflow-hidden rounded-3xl border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-950/8
        ${highlight ? 'border-emerald-500 ring-1 ring-emerald-200' : 'border-slate-200'}
      `}
    >
      <div className="flex gap-4 p-4">
        <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-slate-100">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={offer.product.name}
              className="h-full w-full object-contain p-3 transition group-hover:scale-105"
            />
          ) : (
            <span className="text-3xl text-emerald-700">$</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase text-emerald-800">
              {offer.product.category}
            </span>

            {highlight ? (
              <span className="rounded-full bg-emerald-600 px-3 py-1 text-[10px] font-black text-white">
                Melhor
              </span>
            ) : null}
          </div>

          <h3 className="mt-3 line-clamp-2 text-sm font-black leading-5 text-slate-950">
            {offer.product.name}
          </h3>

          <p className="mt-3 text-3xl font-black text-emerald-800">{price}</p>

          <p className="mt-2 truncate text-sm font-black text-slate-800">
            {offer.supermarket.name}
          </p>

          <p className="text-xs font-medium text-slate-500">
            {offer.supermarket.city}/{offer.supermarket.state}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 border-t border-slate-100 bg-slate-50/70">
        <a
          href={offer.productUrl || '#'}
          target="_blank"
          rel="noreferrer"
          className="py-3 text-center text-xs font-black text-emerald-800 transition hover:bg-emerald-50"
        >
          Ver oferta
        </a>

        <button
          onClick={() => onCompare?.(offer)}
          className="border-l border-slate-100 py-3 text-xs font-black text-slate-700 transition hover:bg-emerald-50"
        >
          Comparar
        </button>
      </div>
    </article>
  );
}

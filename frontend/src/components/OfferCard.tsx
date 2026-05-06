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

  const categoryColors: Record<string, string> = {
    ALIMENTOS: 'bg-orange-100 text-orange-700',
    BEBIDAS: 'bg-blue-100 text-blue-700',
    LIMPEZA: 'bg-green-100 text-green-700',
    HIGIENE: 'bg-pink-100 text-pink-700',
    OUTROS: 'bg-gray-100 text-gray-700'
  };

  return (
    <article
      className={`
        group relative overflow-hidden rounded-[28px] border bg-white
        transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl
        ${highlight
          ? 'border-green-500 ring-2 ring-green-200 shadow-xl'
          : 'border-gray-200 hover:border-gray-300'}
      `}
    >
      {/* brilho */}
      <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-clubmy-blue/5 blur-3xl" />

      {/* selo melhor preço */}
      {highlight ? (
        <div className="absolute right-4 top-4 z-20 rounded-full bg-green-500 px-3 py-1 text-xs font-black uppercase tracking-wide text-white shadow-lg">
          Melhor preço
        </div>
      ) : null}

      {/* imagem fake placeholder */}
      <div className="relative flex h-48 items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(15,76,129,0.08),transparent_40%)]" />

        <div className="relative z-10 flex h-28 w-28 items-center justify-center rounded-3xl bg-white shadow-lg">
          <span className="text-5xl">
            🛒
          </span>
        </div>
      </div>

      <div className="relative z-10 p-5">
        {/* categoria */}
        <div className="flex items-center justify-between gap-3">
          <span
            className={`
              rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide
              ${categoryColors[offer.product.category] || 'bg-gray-100 text-gray-700'}
            `}
          >
            {offer.product.category}
          </span>

          <span className="text-xs font-medium text-gray-400">
            Atualizado agora
          </span>
        </div>

        {/* produto */}
        <h3 className="mt-4 min-h-[64px] text-xl font-black leading-7 text-gray-900">
          {offer.product.name}
        </h3>

        {/* preço */}
        <div className="mt-5">
          <p className="text-sm font-medium text-gray-500">
            Melhor preço encontrado
          </p>

          <div className="mt-2 flex items-end gap-2">
            <p className="text-5xl font-black tracking-tight text-clubmy-blue">
              {price}
            </p>
          </div>
        </div>

        {/* supermercado */}
        <div className="mt-6 rounded-2xl border border-gray-100 bg-gray-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-bold text-gray-900">
                {offer.supermarket.name}
              </p>

              <p className="mt-1 text-sm text-gray-500">
                {offer.supermarket.city}/{offer.supermarket.state}
              </p>
            </div>

            <div className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-gray-600 shadow-sm">
              Mercado
            </div>
          </div>
        </div>

        {/* ações */}
        <div className="mt-5 flex gap-3">
          <button
            className="
              flex-1 rounded-2xl bg-clubmy-blue px-4 py-3
              text-sm font-bold text-white transition
              hover:bg-blue-900
            "
          >
            Ver oferta
          </button>

          <button
            className="
              rounded-2xl border border-gray-200 bg-white px-4 py-3
              text-sm font-bold text-gray-700 transition
              hover:bg-gray-50
            "
          >
            Comparar
          </button>
        </div>
      </div>
    </article>
  );
}
export type OfferFilters = {
  city?: string;
  category?: string;
  search?: string;
  supermarket?: string;
};

export type NormalizedOfferInput = {
  productName: string;
  category: 'ALIMENTOS' | 'BEBIDAS' | 'LIMPEZA' | 'HIGIENE' | 'OUTROS';
  price: number;
  imageUrl?: string;
  supermarket: {
    name: string;
    city: string;
    state: string;
  };
  expiresAt?: Date;
  source?: string;
};

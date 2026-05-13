export type CatalogSourceType = 'pdf' | 'image' | 'webpage' | 'flipsnack' | 'local';

export type SupermarketCatalogConfig = {
  supermarketName: string;
  siteUrl: string;
  city?: string;
  cities: string[];
  sourceNames: string[];
  extraUrls?: string[];
};

export type CatalogSource = {
  supermarketName: string;
  sourceName: string;
  sourceUrl: string;
  type: CatalogSourceType;
  city?: string;
  localPath?: string;
  discoveredAt: string;
};

export type ExtractedCatalogText = {
  source: CatalogSource;
  text: string;
  pageImages?: string[];
  confidenceScore: number;
};

export type ParsedOffer = {
  supermarketName: string;
  sourceName: string;
  sourceUrl: string;
  city: string | null;
  productDescription: string;
  brand: string | null;
  packageSize: string | null;
  price: number;
  originalPrice: number | null;
  unitPrice: string | null;
  offerStartDate: string | null;
  offerEndDate: string | null;
  capturedAt: string;
  imageUrl: string | null;
  cropImagePath: string | null;
  rawText: string;
  confidenceScore: number;
  status: 'active' | 'expired' | 'active_uncertain';
};

export type VtexOffer = {
  productId: string;
  productName: string;
  brand: string | null;
  description: string;
  supermarketName: string;
  seller: string;
  city: string | null;
  price: number;
  listPrice: number | null;
  available: boolean;
  validFrom: string | null;
  validUntil: string | null;
  sourceUrl: string;
  imageUrl: string | null;
  categories: string[];
  rawText: string;
  confidenceScore: number;
  status: 'active' | 'expired' | 'active_uncertain';
};

export type VtexOffersFile = {
  generatedAt: string;
  total: number;
  items: VtexOffer[];
};

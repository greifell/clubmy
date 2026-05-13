import type { SupermarketCatalogConfig } from '../types/catalogOffers.js';

export const supermarketCatalogs: SupermarketCatalogConfig[] = [
  {
    supermarketName: 'MM Rosso',
    siteUrl: 'https://www.mmrosso.com/',
    city: 'Criciúma',
    cities: ['Criciúma'],
    sourceNames: ['Ofertas da Semana', 'Especial de Bebidas', 'Encarte', 'Ofertas']
  },
  {
    supermarketName: 'Super Moniari',
    siteUrl: 'https://moniari.com.br/',
    cities: ['Criciúma', 'Içara', 'Tubarão', 'Jaguaruna', 'Sangão', 'Gaivota', 'Araranguá'],
    sourceNames: ['Encarte Digital', 'Ofertas', 'Flipsnack', 'Super Moniari'],
    extraUrls: ['https://linktr.ee/supermoniari']
  }
];


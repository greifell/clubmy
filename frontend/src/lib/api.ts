import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
});

export type Offer = {
  id: number;
  price: string;
  imageUrl?: string;
  createdAt: string;
  expiresAt?: string;
  product: {
    name: string;
    category: string;
  };
  supermarket: {
    name: string;
    city: string;
    state: string;
  };
};

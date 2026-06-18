import type { Context } from 'hono';

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  SITE_NAME: string;
  BASE_URL: string;
  MAIL_FROM: string;
  MAIL_ADMIN: string;
  MAIL_REPLY_TO?: string; // adresa de răspuns (ex. un Gmail), opțională
  SESSION_SECRET: string;
  RESEND_API_KEY: string;
}

export interface SessionUser {
  uid: number;
  rol: 'client' | 'angajat';
  nume: string;
  perms: string[];
}

export type Variables = {
  user: SessionUser | null;
  pagini: Record<string, boolean>; // vizibilitatea paginilor pentru meniu
};

export type AppContext = Context<{ Bindings: Env; Variables: Variables }>;

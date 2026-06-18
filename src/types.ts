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
  // Gmail API (OAuth2) — dacă sunt setate, emailurile pleacă prin Gmail.
  GMAIL_CLIENT_ID?: string;
  GMAIL_CLIENT_SECRET?: string;
  GMAIL_REFRESH_TOKEN?: string;
  GMAIL_SENDER?: string; // ex. "APG Garage <notificari.apggarage@gmail.com>"
}

export interface SendResult {
  ok: boolean;
  error?: string;
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

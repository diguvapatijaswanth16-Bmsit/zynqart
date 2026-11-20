export interface Env {
  DB?: D1Database;
  ASSETS?: Fetcher;
  /** Server-side only. Set as a project secret, never in the frontend. */
  OPENAI_API_KEY?: string;
  OPENAI_BASE_URL?: string;
  OPENAI_MODEL?: string;
  OPENAI_VISION_MODEL?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  APP_ORIGIN?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  provider: "password" | "google";
  avatarUrl?: string | null;
}

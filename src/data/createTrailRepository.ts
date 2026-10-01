import { createClient } from "@supabase/supabase-js";
import type { TrailRepository } from "../domain/TrailRepository";
import { createSupabaseTrailRepository } from "./supabaseTrailRepository";

type TrailRepositoryConfiguration = {
  repository: TrailRepository | null;
  error: string | null;
};

export function createTrailRepositoryFromEnvironment(): TrailRepositoryConfiguration {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
  const publishableKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";

  if (!url && !publishableKey) {
    return { repository: null, error: null };
  }
  if (!url || !publishableKey) {
    return {
      repository: null,
      error: "Set both Supabase values in your local .env file.",
    };
  }

  try {
    const parsedUrl = new URL(url);
    if (
      parsedUrl.protocol !== "https:" &&
      parsedUrl.hostname !== "localhost" &&
      parsedUrl.hostname !== "127.0.0.1"
    ) {
      return {
        repository: null,
        error: "The Supabase URL must use HTTPS.",
      };
    }
  } catch {
    return {
      repository: null,
      error: "The Supabase URL in your .env file is invalid.",
    };
  }

  const client = createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return {
    repository: createSupabaseTrailRepository(client),
    error: null,
  };
}

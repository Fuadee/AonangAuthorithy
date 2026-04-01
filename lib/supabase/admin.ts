import { createClient } from "@supabase/supabase-js";

/**
 * Use an untyped admin client for scaffold stage.
 *
 * NOTE: The current handcrafted Database type is incomplete and can cause
 * `never` inference on `.from(...).insert(...)` in strict build checks.
 * Once schema is stabilized, replace with generated Supabase types.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

import { createClient } from '@supabase/supabase-js';

export async function getAuthUserId(authHeader: string | string[] | undefined): Promise<string> {
  const header = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (!header?.startsWith('Bearer ')) throw new Error('Unauthorized');
  const token = header.slice(7);

  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  if (!url || !key) throw new Error('Unauthorized');

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) throw new Error('Unauthorized');
  return user.id;
}

export function jsonOk(res: any, body: unknown, status = 200) {
  res.status(status).json(body);
}

export function handleError(res: any, err: unknown) {
  const msg = err instanceof Error ? err.message : 'Internal server error';
  if (msg === 'Unauthorized') return res.status(401).json({ error: 'Unauthorized' });
  console.error(err);
  res.status(500).json({ error: msg });
}

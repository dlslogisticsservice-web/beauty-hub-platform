import { createClient } from '@supabase/supabase-js';

// ── helpers (inlined to keep this a single Lambda) ────────────────────────

function makeAdmin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
let _admin: ReturnType<typeof makeAdmin> | undefined;
const supabaseAdmin = new Proxy({} as ReturnType<typeof makeAdmin>, {
  get(_, prop, receiver) {
    if (!_admin) _admin = makeAdmin();
    return Reflect.get(_admin, prop, receiver);
  },
});

async function getAuthUserId(authHeader: string | string[] | undefined): Promise<string> {
  const header = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (!header?.startsWith('Bearer ')) throw new Error('Unauthorized');
  const token = header.slice(7);
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  if (!url || !key) throw new Error('Unauthorized');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) throw new Error('Unauthorized');
  return user.id;
}

function jsonOk(res: any, body: unknown, status = 200) { res.status(status).json(body); }

function handleError(res: any, err: unknown) {
  const msg = err instanceof Error ? err.message : 'Internal server error';
  if (msg === 'Unauthorized') return res.status(401).json({ error: 'Unauthorized' });
  if (msg === 'Forbidden') return res.status(403).json({ error: 'Forbidden' });
  console.error(err);
  res.status(500).json({ error: msg });
}

// ── auth helpers ──────────────────────────────────────────────────────────

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', userId).in('role', ['admin', 'super_admin']).maybeSingle();
  if (!data) throw new Error('Forbidden');
}

async function ensureAnyAdmin(userId: string) {
  const { data } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', userId);
  const roles = (data ?? []).map((r: any) => r.role);
  if (!roles.includes('admin') && !roles.includes('super_admin')) throw new Error('Forbidden');
}

async function ensureSuperAdmin(userId: string) {
  const { data } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', userId);
  if (!(data ?? []).map((r: any) => r.role).includes('super_admin')) throw new Error('Forbidden');
}

// ── skin analysis (local fallback — no external API required) ────────────

function fitzpatrickDangers(type: string): string {
  const map: Record<string, string> = {
    'Type I': 'بشرة فائقة الحساسية وخالية تماماً من الميلانين الطبيعي. خطر فوري للإصابة بحروق من الدرجة الأولى. يمنع التعرض للشمس قبل أو بعد الجلسة بدون حماية قصوى.',
    'Type II': 'بشرة فاتحة جداً سريعة التهييج. خطر تطور وذمة حمامية مفرطة. يحظر تطبيق علاجات تقشير حمضية قوية بالتزامن مع الليزر.',
    'Type III': 'بشرة متوسطة ومتقبلة لليزر بحذر. خطر معتدل لتطور تصبغات ما بعد الالتهاب (PIH). تجنب التعرض للحرارة الشديدة.',
    'Type IV': 'تحذير: البشرة غنية بالميلانين (النوع الشرق أوسطي). خطر بالغ لفرط التصبغ الجلدي. يمنع استخدام ليزر الألكسندرايت بطاقات غير مضبوطة.',
    'Type V': 'تحذير حرج: تركيزات مفرطة للميلانين. خطر مؤكد للتصبغات الطويلة الأمد إذا استخدمت أطوال موجات قصيرة. التبريد التلامسي المستمر إلزامي.',
    'Type VI': 'خطر مطلق للاحتراق إذا لم تطبق بروتوكولات حماية فائقة. يمنع تماماً الليزر الكربوني الحراري المباشر أو IPL. أطوال موجية ممتصة عميقاً حصراً.',
  };
  return map[type] ?? 'تتطلب البشرة تقييماً دقيقاً لنشاط الخلايا الصبغية قبل أي نبضات ضوئية.';
}

function laserSettings(type: string) {
  if (type === 'Type I' || type === 'Type II') return { device: 'Alexandrite (755nm) / GentleMax Pro®', suitability: 'مناسب جداً ومثالي لاستهداف لوني فائق الدقة.', fluence: '14 – 18 J/cm²', pulseDuration: '3 – 5 ms', cooling: 'تبريد ديناميكي غازي (DCD) 30ms بخاخ / 20ms تأخير.', reasoning: 'الطول الموجي القصير يمتصه الميلانين القليل بكفاءة عالية دون خطر.' };
  if (type === 'Type III') return { device: 'Diode Laser (810nm) / Soprano Titanium', suitability: 'مناسب مع تعديل عرض النبضة لمنع تضرر الخلايا الميلانينية.', fluence: '12 – 15 J/cm²', pulseDuration: '10 – 15 ms', cooling: 'حماية جليدية تلامسية بنظام الياقوت الأزرق المزدوج.', reasoning: 'الطول الموجي المتوسط يحقق التوازن بين الفعالية والأمان لهذا النوع.' };
  if (type === 'Type IV') return { device: 'Long-Pulse Nd:YAG (1064nm) / Cynosure Elite®', suitability: 'الخيار الطبي والآمن المطلق للبشرة الحنطية الشرق أوسطية.', fluence: '16 – 20 J/cm²', pulseDuration: '15 – 20 ms', cooling: 'تبريد هواء Zimmer مستمر بالمستوى 4 أو 5.', reasoning: 'الطول الموجي الطويل يتجاوز الميلانين السطحي ويستهدف جذر البصيلة مباشرة.' };
  return { device: 'Long-Pulse Nd:YAG (1064nm) حصراً', suitability: 'الخيار الوحيد الآمن المعتمد عالمياً لهذا النوع.', fluence: '14 – 16 J/cm²', pulseDuration: '25 – 40 ms', cooling: 'نظام هواء مبرد ذكي مع تبريد تلامسي لمنع الصدمات الكربونية.', reasoning: 'النبضات الطويلة تمتص ببطء للتبريد الآمن مع الحفاظ على سطح الجلد.' };
}

function getSkinAnalysis(skinType: string, concerns: string | undefined, fitzpatrick: string) {
  const laser = laserSettings(fitzpatrick);
  return {
    analysis: `بناءً على التقييم الدقيق، بشرتك من النوع (${skinType}) وتعاني من (${concerns || 'الحاجة للترميم والنضارة'}). يحتاج الحاجز الحامي للجلد تغذية مكثفة بجزيئات الهيدروكسيل لتقوية دعامة السيراميدات الطبيعية. الخلايا القرنية السطحية مستعدة لمستحضرات النضارة اللطيفة.`,
    fitzpatrickDangers: fitzpatrickDangers(fitzpatrick),
    laserSettings: { ...laser, reasoning: `تم تفعيل نظام الطاقة المبرمج خصيصاً للنوع الفيتزبارتيكي (${fitzpatrick}) للتوجيه الدقيق لأشعة ليزر بدون تراكم حراري.` },
    treatmentSuggestions: [
      'جلسة استعادة النضارة الفائقة هايدرافيشال لتوحيد ملمس الجلد.',
      'التقشير البارد لإزالة البقع التعبيرية وفرط التصبغات برفق.',
      'العلاج الضوئي اللطيف LED لتهدئة البشرة وتحفيز الإيلاستين الموضعي.',
    ],
    productRecommendations: [
      'سيروم حمض الهيالورونيك الفاخر لاستعادة نضارة البشرة ومقاومة التجاعيد الدقيقة.',
      'كريم الخلايا الجذعية المتطور لمحيط العين لتقليل الهالات والانتفاخ.',
      'تونر النضارة بزلاقة البابونج مع واقي شمس خالٍ من المواد العطرية التخليقية.',
    ],
    skincareRoutine: {
      morning: 'تطهير لطيف، تونر البابونج، سيروم الهيالورونيك، واقي الشمس.',
      night: 'تنظيف مزدوج، مرطب غني بالسيراميدات، كريم الخلايا الجذعية لمحيط العين.',
    },
  };
}

// ── route handlers ────────────────────────────────────────────────────────

const CENTER_COLS = 'id, name, name_ar, slug, description, description_ar, city, address, phone, logo_url, cover_url, subscription_plan, country, rating_avg, rating_count, is_verified';

const handlers: Record<string, (req: any, res: any) => Promise<void>> = {

  'admin-bookings': async (req, res) => {
    const userId = await getAuthUserId(req.headers.authorization);
    await assertAdmin(userId);
    const { status, centerId } = req.query ?? {};
    let q = supabaseAdmin.from('bookings').select('id, scheduled_at, status, price_paid, commission_amount, currency, customer_id, service_id, center_id, created_at').order('scheduled_at', { ascending: false }).limit(200);
    if (status && status !== 'all') q = q.eq('status', status);
    if (centerId && centerId !== 'all') q = q.eq('center_id', centerId);
    const { data: rows } = await q;
    const cIds = Array.from(new Set((rows ?? []).map((r: any) => r.center_id)));
    const uIds = Array.from(new Set((rows ?? []).map((r: any) => r.customer_id)));
    const sIds = Array.from(new Set((rows ?? []).map((r: any) => r.service_id)));
    const [{ data: centers }, { data: profiles }, { data: services }, { data: allCenters }] = await Promise.all([
      cIds.length ? supabaseAdmin.from('centers').select('id, name, slug, country').in('id', cIds) : Promise.resolve({ data: [] }),
      uIds.length ? supabaseAdmin.from('profiles').select('id, full_name, email').in('id', uIds) : Promise.resolve({ data: [] }),
      sIds.length ? supabaseAdmin.from('services').select('id, name').in('id', sIds) : Promise.resolve({ data: [] }),
      supabaseAdmin.from('centers').select('id, name').order('name'),
    ]);
    const cMap = new Map((centers ?? []).map((c: any) => [c.id, c]));
    const pMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    const sMap = new Map((services ?? []).map((s: any) => [s.id, s]));
    const bookings = (rows ?? []).map((b: any) => ({ ...b, center_name: (cMap.get(b.center_id) as any)?.name || '—', center_slug: (cMap.get(b.center_id) as any)?.slug, country: (cMap.get(b.center_id) as any)?.country ?? 'EG', customer_name: (pMap.get(b.customer_id) as any)?.full_name || (pMap.get(b.customer_id) as any)?.email || 'Customer', service_name: (sMap.get(b.service_id) as any)?.name || '—' }));
    jsonOk(res, { bookings, allCenters: allCenters ?? [] });
  },

  'admin-centers': async (req, res) => {
    const userId = await getAuthUserId(req.headers.authorization);
    await assertAdmin(userId);
    const { data: centers } = await supabaseAdmin.from('centers').select('*').order('created_at', { ascending: false });
    const ownerIds = Array.from(new Set((centers ?? []).map((c: any) => c.owner_id)));
    const { data: profiles } = ownerIds.length ? await supabaseAdmin.from('profiles').select('id, email, full_name').in('id', ownerIds) : { data: [] };
    const pMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    jsonOk(res, { centers: (centers ?? []).map((c: any) => ({ ...c, owner_email: (pMap.get(c.owner_id) as any)?.email || '—' })) });
  },

  'admin-dashboard': async (req, res) => {
    const userId = await getAuthUserId(req.headers.authorization);
    await assertAdmin(userId);
    const [{ count: totalBookings }, { data: completed }, { count: activeCenters }] = await Promise.all([
      supabaseAdmin.from('bookings').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('bookings').select('price_paid, commission_amount, created_at').eq('status', 'completed'),
      supabaseAdmin.from('centers').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('is_verified', true),
    ]);
    const revenue = (completed ?? []).reduce((s: number, b: any) => s + Number(b.commission_amount), 0);
    const gross = (completed ?? []).reduce((s: number, b: any) => s + Number(b.price_paid), 0);
    const now = new Date();
    const months: { month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('en', { month: 'short', year: '2-digit' });
      const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const sum = (completed ?? []).filter((b: any) => { const t = new Date(b.created_at); return t >= d && t < next; }).reduce((s: number, b: any) => s + Number(b.commission_amount), 0);
      months.push({ month: label, revenue: Math.round(sum * 100) / 100 });
    }
    const { data: recent } = await supabaseAdmin.from('bookings').select('id, scheduled_at, status, price_paid, commission_amount, currency, customer_id, service_id, center_id, created_at').order('created_at', { ascending: false }).limit(10);
    const cIds = Array.from(new Set((recent ?? []).map((r: any) => r.center_id)));
    const uIds = Array.from(new Set((recent ?? []).map((r: any) => r.customer_id)));
    const sIds = Array.from(new Set((recent ?? []).map((r: any) => r.service_id)));
    const [{ data: centers }, { data: profiles }, { data: services }] = await Promise.all([
      cIds.length ? supabaseAdmin.from('centers').select('id, name, slug, country').in('id', cIds) : Promise.resolve({ data: [] }),
      uIds.length ? supabaseAdmin.from('profiles').select('id, full_name, email').in('id', uIds) : Promise.resolve({ data: [] }),
      sIds.length ? supabaseAdmin.from('services').select('id, name').in('id', sIds) : Promise.resolve({ data: [] }),
    ]);
    const cMap = new Map((centers ?? []).map((c: any) => [c.id, c]));
    const pMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    const sMap = new Map((services ?? []).map((s: any) => [s.id, s]));
    const recentBookings = (recent ?? []).map((b: any) => ({ ...b, center_name: (cMap.get(b.center_id) as any)?.name || '—', center_slug: (cMap.get(b.center_id) as any)?.slug, country: (cMap.get(b.center_id) as any)?.country ?? 'EG', customer_name: (pMap.get(b.customer_id) as any)?.full_name || (pMap.get(b.customer_id) as any)?.email || 'Customer', service_name: (sMap.get(b.service_id) as any)?.name || '—' }));
    jsonOk(res, { stats: { totalBookings: totalBookings ?? 0, revenue, gross, activeCenters: activeCenters ?? 0 }, months, recentBookings });
  },

  'admin-subscriptions': async (req, res) => {
    const userId = await getAuthUserId(req.headers.authorization);
    await assertAdmin(userId);
    const { data: centers } = await supabaseAdmin.from('centers').select('id, name, owner_id, subscription_plan, subscription_expires_at, created_at').order('created_at', { ascending: false });
    const ownerIds = Array.from(new Set((centers ?? []).map((c: any) => c.owner_id)));
    const { data: profiles } = ownerIds.length ? await supabaseAdmin.from('profiles').select('id, email').in('id', ownerIds) : { data: [] };
    const pMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    const enriched = (centers ?? []).map((c: any) => ({ ...c, owner_email: (pMap.get(c.owner_id) as any)?.email || '—' }));
    const counts: Record<string, number> = { free: 0, basic: 0, pro: 0, premium: 0 };
    enriched.forEach((c: any) => { counts[c.subscription_plan] = (counts[c.subscription_plan] ?? 0) + 1; });
    jsonOk(res, { centers: enriched, counts });
  },

  'admin-update-center': async (req, res) => {
    const userId = await getAuthUserId(req.headers.authorization);
    await assertAdmin(userId);
    const { id, ...patch } = req.body ?? {};
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const { error } = await supabaseAdmin.from('centers').update(patch).eq('id', id);
    if (error) throw new Error(error.message);
    jsonOk(res, { ok: true });
  },

  'booking-service': async (req, res) => {
    const { serviceId } = req.query ?? {};
    if (!serviceId) return res.status(400).json({ error: 'Missing serviceId' });
    const { data: service, error } = await supabaseAdmin.from('services').select('id, name, name_ar, category, price, duration_minutes, center_id').eq('id', serviceId).eq('is_active', true).maybeSingle();
    if (error) throw new Error(error.message);
    if (!service) return jsonOk(res, { service: null, center: null });
    const { data: center } = await supabaseAdmin.from('centers').select('id, name, name_ar, slug, logo_url, city, country, commission_rate').eq('id', service.center_id).maybeSingle();
    jsonOk(res, { service, center });
  },

  'booking-slots': async (req, res) => {
    const { serviceId, date } = req.query ?? {};
    if (!serviceId || !date) return res.status(400).json({ error: 'Missing serviceId or date' });
    const start = new Date(`${date}T00:00:00Z`).toISOString();
    const end = new Date(`${date}T23:59:59Z`).toISOString();
    const { data: rows, error } = await supabaseAdmin.from('bookings').select('scheduled_at').eq('service_id', serviceId).neq('status', 'cancelled').gte('scheduled_at', start).lte('scheduled_at', end);
    if (error) throw new Error(error.message);
    jsonOk(res, { slots: (rows ?? []).map((r: any) => r.scheduled_at) });
  },

  'center-bookings': async (req, res) => {
    const userId = await getAuthUserId(req.headers.authorization);
    const { data: center } = await supabaseAdmin.from('centers').select('id, owner_id, country').eq('owner_id', userId).maybeSingle();
    if (!center) return jsonOk(res, { bookings: [], country: 'EG' });
    const { status, from, to, search } = req.query ?? {};
    let q = supabaseAdmin.from('bookings').select('id, scheduled_at, status, price_paid, commission_amount, customer_id, service_id, created_at').eq('center_id', center.id).order('scheduled_at', { ascending: false });
    if (status && status !== 'all') q = q.eq('status', status);
    if (from) q = q.gte('scheduled_at', new Date(from).toISOString());
    if (to) q = q.lte('scheduled_at', new Date(to).toISOString());
    const { data: rows } = await q;
    const customerIds = Array.from(new Set((rows ?? []).map((b: any) => b.customer_id)));
    const serviceIds = Array.from(new Set((rows ?? []).map((b: any) => b.service_id)));
    const [{ data: profiles }, { data: services }] = await Promise.all([
      customerIds.length ? supabaseAdmin.from('profiles').select('id, full_name, email').in('id', customerIds) : Promise.resolve({ data: [] }),
      serviceIds.length ? supabaseAdmin.from('services').select('id, name').in('id', serviceIds) : Promise.resolve({ data: [] }),
    ]);
    const pMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    const sMap = new Map((services ?? []).map((s: any) => [s.id, s]));
    let bookings = (rows ?? []).map((b: any) => ({ id: b.id, scheduled_at: b.scheduled_at, status: b.status, price_paid: b.price_paid, payout: Number(b.price_paid) - Number(b.commission_amount), customer_id: b.customer_id, service_id: b.service_id, created_at: b.created_at, customer_name: (pMap.get(b.customer_id) as any)?.full_name || (pMap.get(b.customer_id) as any)?.email || 'Customer', service_name: (sMap.get(b.service_id) as any)?.name || 'Service' }));
    if (search) { const s = (search as string).toLowerCase(); bookings = bookings.filter((b: any) => b.customer_name.toLowerCase().includes(s)); }
    jsonOk(res, { bookings, country: center.country ?? 'EG' });
  },

  'center-dashboard': async (req, res) => {
    const userId = await getAuthUserId(req.headers.authorization);
    const { data: center } = await supabaseAdmin.from('centers').select('id, owner_id, country').eq('owner_id', userId).maybeSingle();
    if (!center) return jsonOk(res, { center: null, stats: null, todaysBookings: [] });
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
    const { data: monthBookings } = await supabaseAdmin.from('bookings').select('price_paid, commission_amount, status').eq('center_id', center.id).gte('created_at', monthStart);
    const totalBookings = monthBookings?.length ?? 0;
    const completed = (monthBookings ?? []).filter((b: any) => b.status === 'completed');
    const revenue = completed.reduce((s: number, b: any) => s + Number(b.price_paid), 0);
    const payout = completed.reduce((s: number, b: any) => s + (Number(b.price_paid) - Number(b.commission_amount)), 0);
    const pending = (monthBookings ?? []).filter((b: any) => b.status === 'pending').length;
    const { data: todays } = await supabaseAdmin.from('bookings').select('id, scheduled_at, status, price_paid, customer_id, service_id').eq('center_id', center.id).gte('scheduled_at', todayStart).lt('scheduled_at', tomorrowStart).order('scheduled_at', { ascending: true });
    const customerIds = Array.from(new Set((todays ?? []).map((b: any) => b.customer_id)));
    const serviceIds = Array.from(new Set((todays ?? []).map((b: any) => b.service_id)));
    const [{ data: profiles }, { data: services }] = await Promise.all([
      customerIds.length ? supabaseAdmin.from('profiles').select('id, full_name, email').in('id', customerIds) : Promise.resolve({ data: [] }),
      serviceIds.length ? supabaseAdmin.from('services').select('id, name').in('id', serviceIds) : Promise.resolve({ data: [] }),
    ]);
    const pMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    const sMap = new Map((services ?? []).map((s: any) => [s.id, s]));
    const todaysBookings = (todays ?? []).map((b: any) => ({ ...b, customer_name: (pMap.get(b.customer_id) as any)?.full_name || (pMap.get(b.customer_id) as any)?.email || 'Customer', service_name: (sMap.get(b.service_id) as any)?.name || 'Service' }));
    jsonOk(res, { center: { id: center.id, country: center.country }, stats: { totalBookings, revenue, payout, pending }, todaysBookings });
  },

  'center-my': async (req, res) => {
    const userId = await getAuthUserId(req.headers.authorization);
    const { data, error } = await supabaseAdmin.from('centers').select('*').eq('owner_id', userId).maybeSingle();
    if (error) throw new Error(error.message);
    jsonOk(res, { center: data });
  },

  'centers-list': async (req, res) => {
    const { city, country, category, search, sort, limit } = req.query ?? {};
    let q = supabaseAdmin.from('centers').select(CENTER_COLS).eq('is_active', true);
    if (city) q = q.eq('city', city);
    if (country) q = q.eq('country', country);
    if (search) q = q.or(`name.ilike.%${search}%,name_ar.ilike.%${search}%`);
    q = q.order('subscription_plan', { ascending: false });
    const sortBy = sort ?? 'rating';
    if (sortBy === 'rating') q = q.order('rating_avg', { ascending: false }).order('rating_count', { ascending: false });
    else if (sortBy === 'newest') q = q.order('created_at', { ascending: false });
    q = q.limit(Number(limit) || 24);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    let centers = rows ?? [];
    if (category) {
      const { data: svcRows } = await supabaseAdmin.from('services').select('center_id').eq('category', category).eq('is_active', true);
      const ids = new Set((svcRows ?? []).map((r: any) => r.center_id));
      centers = centers.filter((c: any) => ids.has(c.id));
    }
    jsonOk(res, { centers });
  },

  'centers-slug': async (req, res) => {
    const { slug } = req.query ?? {};
    if (!slug) return res.status(400).json({ error: 'Missing slug' });
    const { data: center, error } = await supabaseAdmin.from('centers').select(CENTER_COLS).eq('slug', slug).eq('is_active', true).maybeSingle();
    if (error) throw new Error(error.message);
    if (!center) return jsonOk(res, { center: null, services: [], reviews: [] });
    const [{ data: services }, { data: reviews }] = await Promise.all([
      supabaseAdmin.from('services').select('id, name, name_ar, category, description, price, duration_minutes').eq('center_id', center.id).eq('is_active', true).order('price', { ascending: true }),
      supabaseAdmin.from('reviews').select('id, rating, comment, created_at, customer_id').eq('center_id', center.id).order('created_at', { ascending: false }).limit(20),
    ]);
    jsonOk(res, { center, services: services ?? [], reviews: reviews ?? [] });
  },

  'notifications-send': async (req, res) => {
    const WA_API = 'https://graph.facebook.com/v20.0';
    const isConfigured = () => Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN);
    const isEnabled = async () => {
      const { data } = await supabaseAdmin.from('feature_flags').select('enabled').eq('key', 'whatsapp_notifications').maybeSingle();
      return Boolean(data?.enabled);
    };
    const sendTemplate = async (to: string, template: string, params: string[], lang = 'ar') => {
      if (!isConfigured()) return { ok: false, error: 'not_configured' };
      const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
      const token = process.env.WHATSAPP_ACCESS_TOKEN!;
      const body = { messaging_product: 'whatsapp', to, type: 'template', template: { name: template, language: { code: lang }, components: params.length ? [{ type: 'body', parameters: params.map(p => ({ type: 'text', text: p })) }] : [] } };
      const r = await fetch(`${WA_API}/${phoneId}/messages`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) return { ok: false, error: JSON.stringify(data) };
      return { ok: true, messageId: (data as any)?.messages?.[0]?.id };
    };
    const userId = await getAuthUserId(req.headers.authorization);
    const { bookingId, template } = req.body ?? {};
    if (!bookingId || !template) return res.status(400).json({ error: 'Missing bookingId or template' });
    const { data: booking } = await supabaseAdmin.from('bookings').select('id, customer_id, center_id, scheduled_at, service_id').eq('id', bookingId).maybeSingle();
    if (!booking) return jsonOk(res, { ok: false, error: 'booking_not_found' });
    const [{ data: roleRows }, { data: center }] = await Promise.all([
      supabaseAdmin.from('user_roles').select('role').eq('user_id', userId),
      supabaseAdmin.from('centers').select('owner_id').eq('id', booking.center_id).maybeSingle(),
    ]);
    const roles = (roleRows ?? []).map((r: any) => r.role);
    const isAdmin = roles.includes('admin') || roles.includes('super_admin');
    const isOwner = (center as any)?.owner_id === userId;
    const isCustomer = booking.customer_id === userId;
    if (!isAdmin && !isOwner && !isCustomer) return jsonOk(res, { ok: false, error: 'forbidden' });
    const { data: profile } = await supabaseAdmin.from('profiles').select('full_name, phone, whatsapp_opt_in').eq('id', booking.customer_id).maybeSingle();
    if (!(profile as any)?.phone || (profile as any)?.whatsapp_opt_in === false) {
      await supabaseAdmin.from('notifications_log').insert({ user_id: booking.customer_id, booking_id: booking.id, channel: 'whatsapp', template, recipient: (profile as any)?.phone ?? null, status: 'skipped', error: !(profile as any)?.phone ? 'no_phone' : 'opted_out' });
      return jsonOk(res, { ok: false, error: 'skipped' });
    }
    const enabled = await isEnabled();
    if (!enabled || !isConfigured()) {
      await supabaseAdmin.from('notifications_log').insert({ user_id: booking.customer_id, booking_id: booking.id, channel: 'whatsapp', template, recipient: (profile as any).phone, status: 'disabled' });
      return jsonOk(res, { ok: true, queued: false });
    }
    const { data: centerInfo } = await supabaseAdmin.from('centers').select('name, name_ar').eq('id', booking.center_id).maybeSingle();
    const when = new Date(booking.scheduled_at).toLocaleString('ar-EG');
    const centerName = (centerInfo as any)?.name_ar || (centerInfo as any)?.name || '';
    const result = await sendTemplate((profile as any).phone, template, [(profile as any).full_name || '', centerName, when]);
    await supabaseAdmin.from('notifications_log').insert({ user_id: booking.customer_id, booking_id: booking.id, channel: 'whatsapp', template, recipient: (profile as any).phone, status: result.ok ? 'sent' : 'failed', error: (result as any).error, payload: { messageId: (result as any).messageId } });
    jsonOk(res, { ok: result.ok });
  },

  'paymob-configured': async (_req, res) => {
    const configured = Boolean(process.env.PAYMOB_API_KEY && process.env.PAYMOB_IFRAME_ID);
    jsonOk(res, { configured });
  },

  'paymob-initiate': async (req, res) => {
    const BASE = 'https://accept.paymob.com/api';
    const userId = await getAuthUserId(req.headers.authorization);
    const { bookingId, paymentMethod } = req.body ?? {};
    if (!bookingId || !paymentMethod) return res.status(400).json({ error: 'Missing bookingId or paymentMethod' });
    const apiKey = process.env.PAYMOB_API_KEY;
    const iframeId = process.env.PAYMOB_IFRAME_ID;
    const cardEg = process.env.PAYMOB_INTEGRATION_ID_CARD_EG;
    const walletEg = process.env.PAYMOB_INTEGRATION_ID_WALLET_EG;
    const cardSa = process.env.PAYMOB_INTEGRATION_ID_CARD_SA;
    if (!apiKey || !iframeId) return jsonOk(res, { ok: false, error: 'payment_not_configured' });
    const { data: booking, error: bErr } = await supabaseAdmin.from('bookings').select('id, customer_id, center_id, price_paid, currency').eq('id', bookingId).maybeSingle();
    if (bErr || !booking) return jsonOk(res, { ok: false, error: 'booking_not_found' });
    if (booking.customer_id !== userId) return jsonOk(res, { ok: false, error: 'forbidden' });
    const { data: center } = await supabaseAdmin.from('centers').select('country').eq('id', booking.center_id).maybeSingle();
    const country = ((center as any)?.country ?? 'EG') as 'EG' | 'SA';
    const currency = ((booking as any).currency ?? (country === 'SA' ? 'SAR' : 'EGP')) as string;
    const { data: prof } = await supabaseAdmin.from('profiles').select('full_name, email, phone').eq('id', userId).maybeSingle();
    const integrationId = paymentMethod === 'wallet' ? Number(walletEg) : country === 'SA' ? Number(cardSa) : Number(cardEg);
    if (!integrationId) return jsonOk(res, { ok: false, error: 'integration_not_configured' });
    const amountCents = Math.round(Number(booking.price_paid) * 100);
    const authRes = await fetch(`${BASE}/auth/tokens`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ api_key: apiKey }) });
    if (!authRes.ok) return jsonOk(res, { ok: false, error: 'paymob_auth_failed' });
    const token = (await authRes.json()).token as string;
    const orderRes = await fetch(`${BASE}/ecommerce/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ auth_token: token, delivery_needed: false, amount_cents: amountCents, currency, items: [] }) });
    if (!orderRes.ok) return jsonOk(res, { ok: false, error: 'paymob_order_failed' });
    const orderId = (await orderRes.json()).id as number;
    const parts = ((prof as any)?.full_name || 'Customer User').trim().split(/\s+/);
    const billing = { apartment: 'NA', email: (prof as any)?.email || 'noreply@beautyhub.app', floor: 'NA', first_name: parts[0] || 'Customer', last_name: parts.slice(1).join(' ') || 'User', street: 'NA', building: 'NA', phone_number: (prof as any)?.phone || '+200000000000', shipping_method: 'NA', postal_code: 'NA', city: 'NA', country, state: 'NA' };
    const keyRes = await fetch(`${BASE}/acceptance/payment_keys`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ auth_token: token, amount_cents: amountCents, expiration: 3600, order_id: orderId, billing_data: billing, currency, integration_id: integrationId }) });
    if (!keyRes.ok) return jsonOk(res, { ok: false, error: 'paymob_key_failed' });
    const paymentKey = (await keyRes.json()).token as string;
    await supabaseAdmin.from('bookings').update({ paymob_order_id: orderId }).eq('id', booking.id);
    const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${paymentKey}`;
    jsonOk(res, { ok: true, iframeUrl });
  },

  'system-center-bookings': async (req, res) => {
    const userId = await getAuthUserId(req.headers.authorization);
    await ensureAnyAdmin(userId);
    const { centerId } = req.query ?? {};
    if (!centerId) return res.status(400).json({ error: 'Missing centerId' });
    const { data: rows } = await supabaseAdmin.from('bookings').select('id, scheduled_at, price_paid, commission_amount, status, currency, services(name), profiles:customer_id(full_name, email)').eq('center_id', centerId).order('scheduled_at', { ascending: false }).limit(100);
    jsonOk(res, { bookings: rows ?? [] });
  },

  'system-commission-rate': async (req, res) => {
    const userId = await getAuthUserId(req.headers.authorization);
    await ensureAnyAdmin(userId);
    const { centerId, rate } = req.body ?? {};
    if (!centerId || rate === undefined) return res.status(400).json({ error: 'Missing centerId or rate' });
    const { error } = await supabaseAdmin.from('centers').update({ commission_rate: rate }).eq('id', centerId);
    if (error) throw new Error(error.message);
    jsonOk(res, { ok: true });
  },

  'system-commissions': async (req, res) => {
    const userId = await getAuthUserId(req.headers.authorization);
    await ensureAnyAdmin(userId);
    const [{ data: allBookings }, { data: centers }] = await Promise.all([
      supabaseAdmin.from('bookings').select('id, center_id, price_paid, commission_amount, commission_rate, status, created_at, scheduled_at, customer_id, service_id, currency'),
      supabaseAdmin.from('centers').select('id, name, country, subscription_plan, commission_rate'),
    ]);
    const bookings = allBookings ?? [];
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const totalCommission = bookings.filter((b: any) => b.status === 'completed').reduce((s: number, b: any) => s + (b.commission_amount || 0), 0);
    const thisMonth = bookings.filter((b: any) => b.status === 'completed' && new Date(b.created_at) >= monthStart).reduce((s: number, b: any) => s + (b.commission_amount || 0), 0);
    const pending = bookings.filter((b: any) => b.status === 'pending' || b.status === 'confirmed').reduce((s: number, b: any) => s + (b.commission_amount || 0), 0);
    const avgRate = (centers ?? []).length ? (centers ?? []).reduce((s: number, c: any) => s + (c.commission_rate || 0), 0) / (centers ?? []).length : 0;
    const byCenter = new Map<string, any>();
    for (const c of centers ?? []) byCenter.set(c.id, { id: c.id, name: c.name, country: c.country, plan: c.subscription_plan, rate: c.commission_rate, totalBookings: 0, totalEarned: 0, pendingAmount: 0 });
    for (const b of bookings) { const row = byCenter.get(b.center_id); if (!row) continue; row.totalBookings += 1; if (b.status === 'completed') row.totalEarned += b.commission_amount || 0; if (b.status === 'pending' || b.status === 'confirmed') row.pendingAmount += b.commission_amount || 0; }
    jsonOk(res, { stats: { totalCommission, thisMonth, pending, avgRate }, centers: Array.from(byCenter.values()).sort((a, b) => b.totalEarned - a.totalEarned) });
  },

  'system-create-admin': async (req, res) => {
    const userId = await getAuthUserId(req.headers.authorization);
    await ensureSuperAdmin(userId);
    const { email, password, role = 'admin' } = req.body ?? {};
    if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw new Error(error.message);
    if (created.user) {
      await supabaseAdmin.from('user_roles').delete().eq('user_id', created.user.id);
      await supabaseAdmin.from('user_roles').insert({ user_id: created.user.id, role });
    }
    jsonOk(res, { ok: true });
  },

  'system-info': async (req, res) => {
    const userId = await getAuthUserId(req.headers.authorization);
    await ensureSuperAdmin(userId);
    const [{ count: usersCount }, { count: centersCount }, { count: bookingsCount }, commRes, flagsRes, adminsRes, auditRes] = await Promise.all([
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('centers').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('bookings').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('bookings').select('commission_amount').eq('status', 'completed'),
      supabaseAdmin.from('feature_flags').select('*').order('key'),
      supabaseAdmin.from('user_roles').select('user_id, role, created_at, profiles:user_id(email, full_name)').in('role', ['admin', 'super_admin']),
      supabaseAdmin.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    const totalCommission = (commRes.data ?? []).reduce((s: number, r: any) => s + (Number(r.commission_amount) || 0), 0);
    jsonOk(res, { stats: { users: usersCount ?? 0, centers: centersCount ?? 0, bookings: bookingsCount ?? 0, commission: totalCommission }, flags: flagsRes.data ?? [], admins: adminsRes.data ?? [], auditLogs: auditRes.data ?? [] });
  },

  'system-toggle-flag': async (req, res) => {
    const userId = await getAuthUserId(req.headers.authorization);
    await ensureSuperAdmin(userId);
    const { key, enabled } = req.body ?? {};
    if (!key || enabled === undefined) return res.status(400).json({ error: 'Missing key or enabled' });
    const { error } = await supabaseAdmin.from('feature_flags').update({ enabled }).eq('key', key);
    if (error) throw new Error(error.message);
    jsonOk(res, { ok: true });
  },

  'analyze-skin': async (req, res) => {
    const { skinType, concerns, fitzpatrick } = req.body ?? {};
    if (!skinType || !fitzpatrick) return res.status(400).json({ error: 'Missing skinType or fitzpatrick' });
    jsonOk(res, getSkinAnalysis(skinType, concerns, fitzpatrick));
  },
};

// ── dispatcher ────────────────────────────────────────────────────────────

export default async function handler(req: any, res: any) {
  const raw = req.query['...route'] ?? req.query.route;
  const segments: string[] = Array.isArray(raw) ? raw : (raw ? [raw] : []);
  const route = segments.join('/');
  const h = handlers[route];
  if (!h) return res.status(404).json({ error: `Unknown route: ${route}` });
  try {
    await h(req, res);
  } catch (e) {
    handleError(res, e);
  }
}

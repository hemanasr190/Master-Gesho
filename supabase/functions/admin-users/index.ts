import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Verify requesting user is admin
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: selfProfile } = await supabaseAdmin.from('user_profiles').select('is_admin').eq('id', user.id).single();
    if (!selfProfile?.is_admin) return new Response(JSON.stringify({ error: 'Forbidden: Admin only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const url = new URL(req.url);

    // ── GET: list all users ────────────────────────────────────────────────────
    if (req.method === 'GET') {
      const search = req.headers.get('x-search') || url.searchParams.get('search') || '';
      const page = parseInt(req.headers.get('x-page') || url.searchParams.get('page') || '1', 10);
      const limit = 30;
      const offset = (page - 1) * limit;

      let query = supabaseAdmin
        .from('user_profiles')
        .select('id, email, username, is_admin, avatar_url')
        .order('email', { ascending: true })
        .range(offset, offset + limit - 1);

      if (search) query = query.ilike('email', `%${search}%`);

      const { data: profiles, error: profilesError } = await query;
      if (profilesError) throw profilesError;

      const ids = profiles?.map(p => p.id) || [];

      // Auth users (for created_at)
      let authCreatedAt: Record<string, string> = {};
      try {
        const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        authUsers?.users?.forEach(u => { authCreatedAt[u.id] = u.created_at; });
      } catch (e) { console.log('Auth admin list error:', e); }

      // Saved tools counts
      const { data: savedRows } = await supabaseAdmin
        .from('user_saved_tools')
        .select('user_id')
        .in('user_id', ids);

      const savedCountMap: Record<string, number> = {};
      savedRows?.forEach(r => { savedCountMap[r.user_id] = (savedCountMap[r.user_id] || 0) + 1; });

      // Activity counts
      const { data: activityRows } = await supabaseAdmin
        .from('activity_logs')
        .select('user_id')
        .in('user_id', ids);

      const activityCountMap: Record<string, number> = {};
      activityRows?.forEach(r => { activityCountMap[r.user_id] = (activityCountMap[r.user_id] || 0) + 1; });

      // Votes counts
      const { data: voteRows } = await supabaseAdmin
        .from('user_votes')
        .select('user_id')
        .in('user_id', ids);

      const voteCountMap: Record<string, number> = {};
      voteRows?.forEach(r => { voteCountMap[r.user_id] = (voteCountMap[r.user_id] || 0) + 1; });

      const enriched = (profiles || []).map(p => ({
        ...p,
        created_at: authCreatedAt[p.id] || null,
        saved_tools_count: savedCountMap[p.id] || 0,
        activity_count: activityCountMap[p.id] || 0,
        votes_count: voteCountMap[p.id] || 0,
      }));

      // Total count for pagination
      let countQuery = supabaseAdmin.from('user_profiles').select('*', { count: 'exact', head: true });
      if (search) countQuery = countQuery.ilike('email', `%${search}%`);
      const { count } = await countQuery;

      return new Response(
        JSON.stringify({ users: enriched, total: count || 0, page, limit }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── POST: toggle is_admin ──────────────────────────────────────────────────
    if (req.method === 'POST') {
      const { userId, isAdmin } = await req.json();
      if (!userId) return new Response(JSON.stringify({ error: 'userId required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (userId === user.id) return new Response(JSON.stringify({ error: 'Cannot change your own admin status' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const { error } = await supabaseAdmin
        .from('user_profiles')
        .update({ is_admin: isAdmin })
        .eq('id', userId);

      if (error) throw error;

      console.log(`Admin toggle: user=${userId} is_admin=${isAdmin} by=${user.id}`);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  } catch (err: any) {
    console.error('admin-users error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

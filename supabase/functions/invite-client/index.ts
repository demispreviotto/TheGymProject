import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_INVITES_PER_TENANT = 100;

type InviteableRole = 'trainer' | 'user' | 'free';

function errorResponse(message: string, status: number, extra?: Record<string, unknown>): Response {
  return new Response(JSON.stringify({ error: message, ...extra }), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('Missing authorization header', 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const siteUrl = (Deno.env.get('SITE_URL') ?? supabaseUrl).replace(/\/$/, '');

    console.log('env check — SUPABASE_URL present:', !!supabaseUrl, '| SITE_URL:', siteUrl);

    if (!supabaseUrl || !serviceRoleKey) {
      return errorResponse('Missing environment variables', 500);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify caller is authenticated
    const callerToken = authHeader.replace('Bearer ', '');
    const { data: { user: callerUser }, error: userErr } = await adminClient.auth.getUser(callerToken);
    if (userErr || !callerUser) {
      return errorResponse('Invalid session', 401);
    }

    const { data: callerProfile, error: profileErr } = await adminClient
      .from('profiles')
      .select('id, role, tenant_ref_id')
      .eq('id', callerUser.id)
      .single();

    if (profileErr || !callerProfile) {
      return errorResponse('Profile not found', 403);
    }

    const callerRole: string = callerProfile.role;
    if (callerRole !== 'trainer' && callerRole !== 'admin') {
      return errorResponse('Only trainers and admins can invite users', 403);
    }

    const body = await req.json() as { email: string; role?: InviteableRole; tenantId?: string };
    const { email } = body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return errorResponse('Invalid email address', 400);
    }

    // Reject duplicate invites/registrations. Querying `profiles.email` (populated by
    // handle_new_user at invite time, not just at registration) instead of
    // auth.admin.listUsers() -- listUsers() paginates (50/page by default) and would
    // silently miss matches once the tenant has more users than one page.
    // % and _ are escaped since ilike treats them as wildcards and both are valid
    // (if unusual) characters in an email local-part.
    const escapedEmail = email.replace(/[%_]/g, (c) => `\\${c}`);
    const { data: existingProfile, error: existingErr } = await adminClient
      .from('profiles')
      .select('id')
      .ilike('email', escapedEmail)
      .maybeSingle();

    if (existingErr) {
      return errorResponse('Failed to verify existing users', 500);
    }
    if (existingProfile) {
      return errorResponse('A user with this email already exists', 409);
    }

    // Determine invite target role and tenant linkage
    let targetRole: InviteableRole;
    let tenantId: string | null = null;
    let tenantRefId: string | null = null;

    if (callerRole === 'admin') {
      targetRole = body.role ?? 'free';
      tenantId = body.tenantId ?? null;
      // For user invites with explicit tenantId, also try to resolve tenant_ref_id
      // (admin passes tenantId = trainer's profile.id which IS the legacy tenant_id)
      tenantRefId = null; // admin-invited trainers get their own tenant via the trigger
    } else {
      // trainer path: always invites clients (role=user) linked to this trainer
      targetRole = 'user';
      tenantId = callerProfile.id;
      tenantRefId = callerProfile.tenant_ref_id ?? null;
    }

    // Per-tenant invite cap. Only meaningful when there's a tenant bucket being filled
    // (trainer inviting a client, or admin inviting into an explicit tenantId) --
    // admin invites with no tenantId (e.g. inviting a new trainer) have no bucket to cap.
    if (tenantId) {
      const { count, error: countErr } = await adminClient
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);

      if (countErr) {
        return errorResponse('Failed to check tenant invite limit', 500);
      }
      if ((count ?? 0) >= MAX_INVITES_PER_TENANT) {
        return errorResponse('Tenant invite limit reached', 429);
      }
    }

    // Step 1: Generate invite link (no email sent — admin shares the link manually)
    console.log('calling generateLink for', email, '— redirectTo:', `${siteUrl}/register`);
    const { data: linkData, error: inviteErr } = await adminClient.auth.admin.generateLink({
      type: 'invite',
      email,
      options: { redirectTo: `${siteUrl}/register` },
    });

    if (inviteErr) {
      console.error('generateLink error:', inviteErr.message);
      return errorResponse(inviteErr.message, 400);
    }

    const inviteData = { user: linkData.user };
    // Wrap the raw Supabase link behind /accept-invite so messaging app link-preview
    // fetches don't consume the one-time token before the user clicks.
    const rawLink = linkData.properties.action_link;
    const inviteLink = `${siteUrl}/accept-invite?link=${encodeURIComponent(rawLink)}`;

    // Step 2: Set app_metadata (server-controlled, not user-editable)
    await adminClient.auth.admin.updateUserById(inviteData.user.id, {
      app_metadata: {
        role: targetRole,
        ...(tenantId ? { tenant_id: tenantId } : {}),
        ...(tenantRefId ? { tenant_ref_id: tenantRefId } : {}),
      },
    });

    // Step 3: Patch the already-created profile row (trigger ran before app_metadata was set)
    const profilePatch: Record<string, unknown> = { role: targetRole };
    if (tenantId) profilePatch['tenant_id'] = tenantId;
    if (tenantRefId) profilePatch['tenant_ref_id'] = tenantRefId;

    // For trainer invites, also create a tenants row if not done by trigger
    if (targetRole === 'trainer') {
      const { data: existingTenant } = await adminClient
        .from('tenants')
        .select('id')
        .eq('owner_id', inviteData.user.id)
        .maybeSingle();

      if (!existingTenant) {
        const invitedName = inviteData.user.email?.split('@')[0] ?? 'New Trainer';
        const { data: newTenant } = await adminClient
          .from('tenants')
          .insert({ owner_id: inviteData.user.id, name: invitedName })
          .select('id')
          .single();
        if (newTenant) profilePatch['tenant_ref_id'] = newTenant.id;
      }
    }

    await adminClient
      .from('profiles')
      .update(profilePatch)
      .eq('id', inviteData.user.id);

    return new Response(JSON.stringify({ success: true, inviteLink }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('unhandled exception:', err);
    return errorResponse('Unexpected error', 500, { detail: String(err) });
  }
});

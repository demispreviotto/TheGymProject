import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type InviteableRole = 'trainer' | 'user' | 'free';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const siteUrl = (Deno.env.get('SITE_URL') ?? supabaseUrl).replace(/\/$/, '');

    console.log('env check — SUPABASE_URL present:', !!supabaseUrl, '| SITE_URL:', siteUrl);

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Missing environment variables' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify caller is authenticated
    const callerToken = authHeader.replace('Bearer ', '');
    const { data: { user: callerUser }, error: userErr } = await adminClient.auth.getUser(callerToken);
    if (userErr || !callerUser) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: callerProfile, error: profileErr } = await adminClient
      .from('profiles')
      .select('id, role, tenant_ref_id')
      .eq('id', callerUser.id)
      .single();

    if (profileErr || !callerProfile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const callerRole: string = callerProfile.role;
    if (callerRole !== 'trainer' && callerRole !== 'admin') {
      return new Response(JSON.stringify({ error: 'Only trainers and admins can invite users' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json() as { email: string; role?: InviteableRole; tenantId?: string };
    const { email } = body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email address' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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

    // Step 1: Generate invite link (no email sent — admin shares the link manually)
    console.log('calling generateLink for', email, '— redirectTo:', `${siteUrl}/register`);
    const { data: linkData, error: inviteErr } = await adminClient.auth.admin.generateLink({
      type: 'invite',
      email,
      options: { redirectTo: `${siteUrl}/register` },
    });

    if (inviteErr) {
      console.error('generateLink error:', inviteErr.message);
      return new Response(JSON.stringify({ error: inviteErr.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
    return new Response(JSON.stringify({ error: 'Unexpected error', detail: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

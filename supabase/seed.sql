-- =============================================================================
-- seed.sql  —  Local development seed data.
-- Runs after all migrations via `supabase db reset`.
--
-- Test credentials (all accounts):
--   trainer@test.local / Test1234!   → role: trainer
--   user@test.local    / Test1234!   → role: user    (tenant: trainer)
--   free@test.local    / Test1234!   → role: free
--
-- Passwords are bcrypt-hashed at seed time via pgcrypto's crypt().
-- =============================================================================

DO $$
DECLARE
  trainer_id UUID := '00000000-0000-0000-0000-000000000001';
  client_id  UUID := '00000000-0000-0000-0000-000000000002';
  free_id    UUID := '00000000-0000-0000-0000-000000000003';
  gym_tenant_id  UUID := 'cccccccc-0000-0000-0000-000000000001';
BEGIN

  -- -------------------------------------------------------------------------
  -- AUTH USERS
  -- Inserting directly into auth.users with a properly hashed password so
  -- Supabase Auth (GoTrue) can validate signInWithPassword() calls.
  -- -------------------------------------------------------------------------
  INSERT INTO auth.users (
    instance_id,
    id, aud, role, email, encrypted_password,
    email_confirmed_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) VALUES
    (
      '00000000-0000-0000-0000-000000000000',
      trainer_id, 'authenticated', 'authenticated',
      'trainer@test.local',
      crypt('Test1234!', gen_salt('bf', 10)),
      now(),
      '', '', '', '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Test Trainer"}'::jsonb,
      now(), now()
    ),
    (
      '00000000-0000-0000-0000-000000000000',
      client_id, 'authenticated', 'authenticated',
      'user@test.local',
      crypt('Test1234!', gen_salt('bf', 10)),
      now(),
      '', '', '', '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Test Client"}'::jsonb,
      now(), now()
    ),
    (
      '00000000-0000-0000-0000-000000000000',
      free_id, 'authenticated', 'authenticated',
      'free@test.local',
      crypt('Test1234!', gen_salt('bf', 10)),
      now(),
      '', '', '', '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Free User"}'::jsonb,
      now(), now()
    )
  ON CONFLICT (id) DO NOTHING;

  -- -------------------------------------------------------------------------
  -- AUTH IDENTITIES  (required for email/password login to resolve correctly)
  -- -------------------------------------------------------------------------
  INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
  VALUES
    (
      trainer_id, 'trainer@test.local', trainer_id,
      jsonb_build_object('sub', trainer_id::text, 'email', 'trainer@test.local', 'email_verified', true),
      'email', now(), now()
    ),
    (
      client_id, 'user@test.local', client_id,
      jsonb_build_object('sub', client_id::text, 'email', 'user@test.local', 'email_verified', true),
      'email', now(), now()
    ),
    (
      free_id, 'free@test.local', free_id,
      jsonb_build_object('sub', free_id::text, 'email', 'free@test.local', 'email_verified', true),
      'email', now(), now()
    )
  ON CONFLICT (id) DO NOTHING;

  -- -------------------------------------------------------------------------
  -- PROFILES
  -- The on_auth_user_created trigger creates a 'free' profile on INSERT above.
  -- We patch roles and tenant relationships here.
  -- -------------------------------------------------------------------------

  -- Create the gym tenant for the trainer
  INSERT INTO public.tenants (id, owner_id, name, primary_hex)
  VALUES (gym_tenant_id, trainer_id, 'Test Gym', '#EF4444')
  ON CONFLICT (id) DO NOTHING;

  -- tenant_id keeps pointing to the trainer's user ID (preserves existing RLS policies)
  -- tenant_ref_id points to the new tenants table row
  UPDATE public.profiles
  SET role = 'trainer',
      tenant_id = trainer_id,
      tenant_ref_id = gym_tenant_id,
      tenant_name = 'Test Gym',
      tenant_primary_hex = '#EF4444'
  WHERE id = trainer_id;

  UPDATE public.profiles
  SET role = 'user',
      tenant_id = trainer_id,
      tenant_ref_id = gym_tenant_id,
      tenant_name = 'Test Gym',
      tenant_primary_hex = '#EF4444'
  WHERE id = client_id;

  -- free user stays with default role = 'free', no tenant.

END $$;

-- ---------------------------------------------------------------------------
-- GLOBAL EXERCISES  (tenant_id = NULL → visible to all tenants)
-- muscle_groups: Array<{ name: string; intensity: 'primary'|'secondary'|'tertiary' }>
-- ---------------------------------------------------------------------------
INSERT INTO public.exercises (name, definition, recommendations, muscle_groups) VALUES

  ('Bench Press',
   'Horizontal push movement pressing a barbell or dumbbells from chest to full arm extension.',
   'Keep shoulder blades retracted and feet flat on the floor. Lower bar to mid-chest with control.',
   '[{"name":"Pectoralis Major","intensity":"primary"},{"name":"Triceps Brachii","intensity":"secondary"},{"name":"Anterior Deltoid","intensity":"tertiary"}]'::jsonb),

  ('Incline Dumbbell Press',
   'Pressing dumbbells upward at a 30-45° incline bench angle.',
   'Set bench to 30-45°. Drive dumbbells up and slightly inward at the top for peak contraction.',
   '[{"name":"Upper Pectoralis Major","intensity":"primary"},{"name":"Triceps Brachii","intensity":"secondary"},{"name":"Anterior Deltoid","intensity":"secondary"}]'::jsonb),

  ('Back Squat',
   'Bilateral lower-body compound movement with barbell positioned across the upper back.',
   'Keep knees tracking over toes, chest tall, and descend until hip crease is below knee level.',
   '[{"name":"Quadriceps","intensity":"primary"},{"name":"Gluteus Maximus","intensity":"secondary"},{"name":"Hamstrings","intensity":"tertiary"}]'::jsonb),

  ('Romanian Deadlift',
   'Hip-hinge movement loading the posterior chain with slight knee bend throughout.',
   'Maintain a neutral spine, push hips back, and lower the bar along the legs until a strong hamstring stretch is felt.',
   '[{"name":"Hamstrings","intensity":"primary"},{"name":"Gluteus Maximus","intensity":"primary"},{"name":"Erector Spinae","intensity":"secondary"}]'::jsonb),

  ('Conventional Deadlift',
   'Full posterior chain pull from the floor with a hip-width stance.',
   'Brace core hard before each rep. Drive the floor away, keeping bar close to the body throughout.',
   '[{"name":"Erector Spinae","intensity":"primary"},{"name":"Gluteus Maximus","intensity":"primary"},{"name":"Hamstrings","intensity":"secondary"},{"name":"Quadriceps","intensity":"tertiary"}]'::jsonb),

  ('Pull-Up',
   'Vertical pulling movement using bodyweight from dead hang to chin over bar.',
   'Full dead hang at the bottom. Drive elbows toward hips rather than pulling with hands.',
   '[{"name":"Latissimus Dorsi","intensity":"primary"},{"name":"Biceps Brachii","intensity":"secondary"},{"name":"Rear Deltoid","intensity":"tertiary"}]'::jsonb),

  ('Barbell Row',
   'Horizontal pull with torso near parallel, rowing barbell to lower abdomen.',
   'Keep hips slightly higher than knees. Row to the navel, not to the chest.',
   '[{"name":"Latissimus Dorsi","intensity":"primary"},{"name":"Rhomboids","intensity":"primary"},{"name":"Biceps Brachii","intensity":"secondary"},{"name":"Rear Deltoid","intensity":"tertiary"}]'::jsonb),

  ('Overhead Press',
   'Vertical pressing of a barbell or dumbbells from shoulder rack to full lockout overhead.',
   'Brace core and glutes. Avoid excessive lumbar extension — keep ribs down.',
   '[{"name":"Anterior Deltoid","intensity":"primary"},{"name":"Medial Deltoid","intensity":"secondary"},{"name":"Triceps Brachii","intensity":"secondary"},{"name":"Upper Trapezius","intensity":"tertiary"}]'::jsonb),

  ('Dumbbell Lateral Raise',
   'Isolation raise for medial deltoid with dumbbells lifted to shoulder height.',
   'Maintain a slight elbow bend. Lead with the elbow, not the wrist. Control the eccentric.',
   '[{"name":"Medial Deltoid","intensity":"primary"},{"name":"Anterior Deltoid","intensity":"tertiary"},{"name":"Supraspinatus","intensity":"tertiary"}]'::jsonb),

  ('Cable Fly',
   'Horizontal adduction exercise using cables for continuous tension throughout the range of motion.',
   'Set cables at shoulder height. Maintain a slight elbow bend and squeeze pectorals at the midline.',
   '[{"name":"Pectoralis Major","intensity":"primary"},{"name":"Anterior Deltoid","intensity":"tertiary"}]'::jsonb),

  ('Barbell Curl',
   'Elbow flexion against resistance using a barbell held with a supinated grip.',
   'Avoid swinging the torso. Full supination at the top; controlled extension at the bottom.',
   '[{"name":"Biceps Brachii","intensity":"primary"},{"name":"Brachialis","intensity":"secondary"},{"name":"Brachioradialis","intensity":"tertiary"}]'::jsonb),

  ('Tricep Rope Pushdown',
   'Elbow extension against a cable with a rope attachment, isolating the triceps.',
   'Keep elbows pinned to the sides. Flare the rope handles outward at full extension.',
   '[{"name":"Triceps Brachii","intensity":"primary"},{"name":"Anconeus","intensity":"tertiary"}]'::jsonb),

  ('Leg Press',
   'Bilateral quad-dominant machine push with feet on the sled platform.',
   'Do not lock out knees under load. Adjust foot placement height to shift emphasis quad vs glute.',
   '[{"name":"Quadriceps","intensity":"primary"},{"name":"Gluteus Maximus","intensity":"secondary"},{"name":"Hamstrings","intensity":"tertiary"}]'::jsonb),

  ('Leg Curl',
   'Isolated knee flexion exercise targeting the hamstrings on a machine.',
   'Perform full range of motion. Control the concentric and focus on the eccentric phase.',
   '[{"name":"Hamstrings","intensity":"primary"},{"name":"Gastrocnemius","intensity":"tertiary"}]'::jsonb),

  ('Calf Raise',
   'Plantarflexion movement targeting the gastrocnemius and soleus under load.',
   'Use full range of motion — deep stretch at the bottom, strong contraction at the top.',
   '[{"name":"Gastrocnemius","intensity":"primary"},{"name":"Soleus","intensity":"secondary"}]'::jsonb),

  ('Dumbbell Lunge',
   'Unilateral step-forward lunge holding dumbbells at the sides.',
   'Keep torso upright. Front knee tracks over second toe. Back knee grazes the floor gently.',
   '[{"name":"Quadriceps","intensity":"primary"},{"name":"Gluteus Maximus","intensity":"primary"},{"name":"Hamstrings","intensity":"secondary"},{"name":"Hip Abductors","intensity":"tertiary"}]'::jsonb),

  ('Hip Thrust',
   'Glute-dominant horizontal hip extension with shoulders braced on a bench and barbell across the hips.',
   'Drive through the heels. Tuck chin. Achieve full hip extension at the top with a posterior pelvic tilt.',
   '[{"name":"Gluteus Maximus","intensity":"primary"},{"name":"Hamstrings","intensity":"secondary"},{"name":"Hip Adductors","intensity":"tertiary"}]'::jsonb),

  ('Face Pull',
   'External rotation and rear-deltoid pull using a cable rope at face height.',
   'Keep elbows high throughout. Pull rope apart and toward the ears, not the chin.',
   '[{"name":"Rear Deltoid","intensity":"primary"},{"name":"Infraspinatus","intensity":"primary"},{"name":"Teres Minor","intensity":"secondary"},{"name":"Middle Trapezius","intensity":"tertiary"}]'::jsonb),

  ('Plank',
   'Isometric anti-extension core stability exercise held in push-up position.',
   'Maintain a rigid body line — no hips sagging or rising. Breathe steadily throughout hold.',
   '[{"name":"Rectus Abdominis","intensity":"primary"},{"name":"Transverse Abdominis","intensity":"primary"},{"name":"Erector Spinae","intensity":"secondary"},{"name":"Glutes","intensity":"tertiary"}]'::jsonb),

  ('Cable Crunch',
   'Spinal flexion exercise pulling a rope cable downward while kneeling.',
   'Keep hips stationary — the movement is at the spine only. Round the lumbar toward the floor.',
   '[{"name":"Rectus Abdominis","intensity":"primary"},{"name":"Obliques","intensity":"secondary"}]'::jsonb);

-- ---------------------------------------------------------------------------
-- TEST PLANNING
-- Runs after exercises so we can look up exercise IDs by name.
-- trainer_id / client_id are fixed UUIDs from the first block above.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  trainer_id UUID := '00000000-0000-0000-0000-000000000001';
  client_id  UUID := '00000000-0000-0000-0000-000000000002';
  plan_id    UUID := 'aaaaaaaa-0000-0000-0000-000000000001';
  day1_id    UUID := 'bbbbbbbb-0000-0000-0000-000000000001';
  day2_id    UUID := 'bbbbbbbb-0000-0000-0000-000000000002';
  day3_id    UUID := 'bbbbbbbb-0000-0000-0000-000000000003';
  ex_bench   UUID;
  ex_ohp     UUID;
  ex_squat   UUID;
  ex_rdl     UUID;
  ex_pullup  UUID;
  ex_row     UUID;
BEGIN
  SELECT id INTO ex_bench  FROM public.exercises WHERE name = 'Bench Press'       LIMIT 1;
  SELECT id INTO ex_ohp    FROM public.exercises WHERE name = 'Overhead Press'    LIMIT 1;
  SELECT id INTO ex_squat  FROM public.exercises WHERE name = 'Back Squat'        LIMIT 1;
  SELECT id INTO ex_rdl    FROM public.exercises WHERE name = 'Romanian Deadlift' LIMIT 1;
  SELECT id INTO ex_pullup FROM public.exercises WHERE name = 'Pull-Up'           LIMIT 1;
  SELECT id INTO ex_row    FROM public.exercises WHERE name = 'Barbell Row'       LIMIT 1;

  INSERT INTO public.plannings (id, tenant_id, title, use_auto_1rm)
  VALUES (plan_id, trainer_id, 'Push / Pull / Legs — Beginner Block', true)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.planning_days (id, planning_id, day_number)
  VALUES
    (day1_id, plan_id, 1),
    (day2_id, plan_id, 2),
    (day3_id, plan_id, 3)
  ON CONFLICT (id) DO NOTHING;

  -- Day 1 — Push
  INSERT INTO public.prescribed_exercises
    (planning_day_id, exercise_id, exigence, rest_time_minutes, tracking_mode, rounds, target_reps, suggested_first_weight, sorting_order)
  VALUES
    (day1_id, ex_bench, 'A', 2.5, 'standard', 4, 8,  60.0, 1),
    (day1_id, ex_ohp,   'B', 2.0, 'standard', 3, 10, 40.0, 2)
  ON CONFLICT DO NOTHING;

  -- Day 2 — Pull
  INSERT INTO public.prescribed_exercises
    (planning_day_id, exercise_id, exigence, rest_time_minutes, tracking_mode, rounds, target_reps, suggested_first_weight, sorting_order)
  VALUES
    (day2_id, ex_pullup, 'A', 2.5, 'standard', 4, 6,  null, 1),
    (day2_id, ex_row,    'B', 2.0, 'standard', 3, 10, 50.0, 2)
  ON CONFLICT DO NOTHING;

  -- Day 3 — Legs
  INSERT INTO public.prescribed_exercises
    (planning_day_id, exercise_id, exigence, rest_time_minutes, tracking_mode, rounds, target_reps, suggested_first_weight, sorting_order)
  VALUES
    (day3_id, ex_squat, 'A', 3.0, 'standard', 4, 8,  80.0, 1),
    (day3_id, ex_rdl,   'B', 2.5, 'standard', 3, 10, 60.0, 2)
  ON CONFLICT DO NOTHING;

  -- Assign the planning to the test client
  UPDATE public.profiles
  SET assigned_planning_id = plan_id
  WHERE id = client_id;
END $$;

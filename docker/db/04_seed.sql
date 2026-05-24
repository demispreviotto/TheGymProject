-- =============================================================================
-- 04_seed.sql
-- Local development seed data.
--   • 3 test auth users  (trainer / user / free)
--   • Matching profiles
--   • 20 global system exercises with full muscle group metadata
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Fixed UUIDs — deterministic across resets for stable FK references.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  trainer_id UUID := '00000000-0000-0000-0000-000000000001';
  client_id  UUID := '00000000-0000-0000-0000-000000000002';
  free_id    UUID := '00000000-0000-0000-0000-000000000003';
BEGIN

  -- -------------------------------------------------------------------------
  -- AUTH USERS (mock — no real password hashing required for local dev)
  -- -------------------------------------------------------------------------
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at)
  VALUES
    (trainer_id, 'trainer@test.local', 'local-dev-only', NOW()),
    (client_id,  'user@test.local',    'local-dev-only', NOW()),
    (free_id,    'free@test.local',    'local-dev-only', NOW())
  ON CONFLICT (id) DO NOTHING;

  -- -------------------------------------------------------------------------
  -- PROFILES
  -- trainer → owns the tenant; user & free belong to that tenant.
  -- -------------------------------------------------------------------------
  INSERT INTO profiles (id, name, email, role, tenant_id, tenant_name, tenant_primary_hex)
  VALUES
    (trainer_id, 'Test Trainer', 'trainer@test.local', 'trainer', trainer_id, 'Test Gym',    '#EF4444'),
    (client_id,  'Test Client',  'user@test.local',    'user',    trainer_id, 'Test Gym',    '#EF4444'),
    (free_id,    'Free User',    'free@test.local',    'free',    NULL,        NULL,          '#EF4444')
  ON CONFLICT (id) DO NOTHING;

END $$;

-- ---------------------------------------------------------------------------
-- GLOBAL EXERCISES  (tenant_id = NULL → visible to all tenants)
-- muscle_groups schema: [{ "name": string, "intensity": "primary"|"secondary"|"tertiary" }]
-- ---------------------------------------------------------------------------
INSERT INTO exercises (name, definition, recommendations, muscle_groups) VALUES

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

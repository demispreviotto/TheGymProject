-- -----------------------------------------------------------------------
-- invite_requests: enforce the per-user request limit in the database.
--
-- A user may hold at most invite_request_limit() requests that are 'pending'
-- or 'approved' at the same time; a 'rejected' one frees its slot. Until now
-- only the client (MAX_INVITE_REQUESTS in invite-request.service.ts) checked
-- this, so a direct API insert could exceed it.
--
-- Expand-only: adds a function and a trigger; no existing column, policy or
-- row is changed, and the client-side check stays as the friendly first line.
-- The limit lives in invite_request_limit() so the number is stated once here
-- (keep MAX_INVITE_REQUESTS in the client in sync when changing it).
-- -----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.invite_request_limit()
RETURNS integer
LANGUAGE sql IMMUTABLE
SET search_path = ''
AS $$ SELECT 2 $$;

CREATE OR REPLACE FUNCTION public.enforce_invite_request_limit()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_used integer;
BEGIN
  -- A rejected request holds no slot.
  IF NEW.status = 'rejected' THEN
    RETURN NEW;
  END IF;

  -- An update that keeps an already-counted request counted (pending -> approved,
  -- note edits, ...) cannot raise the total. Only a rejected request being
  -- re-opened, or a request moved to another requester, takes a new slot.
  IF TG_OP = 'UPDATE'
     AND OLD.status <> 'rejected'
     AND OLD.requester_id = NEW.requester_id THEN
    RETURN NEW;
  END IF;

  -- Serialize concurrent writers per requester so two simultaneous inserts
  -- cannot both see "one slot left". The lock is released at commit/rollback;
  -- under READ COMMITTED the count below then sees the other transaction's row.
  PERFORM pg_advisory_xact_lock(
    hashtext('invite_requests'),
    hashtext(NEW.requester_id::text)
  );

  SELECT count(*) INTO v_used
  FROM public.invite_requests
  WHERE requester_id = NEW.requester_id
    AND status IN ('pending', 'approved')
    AND id <> NEW.id;

  IF v_used >= public.invite_request_limit() THEN
    RAISE EXCEPTION 'invite_request_limit_reached'
      USING ERRCODE = 'IR001',
            DETAIL  = format('At most %s invite requests can be pending or approved at once.',
                             public.invite_request_limit());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS invite_requests_limit ON public.invite_requests;
CREATE TRIGGER invite_requests_limit
BEFORE INSERT OR UPDATE OF status, requester_id ON public.invite_requests
FOR EACH ROW EXECUTE FUNCTION public.enforce_invite_request_limit();

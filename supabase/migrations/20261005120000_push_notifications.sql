CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE TABLE public.push_subscriptions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  endpoint    TEXT NOT NULL UNIQUE,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own push subscriptions"
ON public.push_subscriptions FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.send_push(
  p_user_id UUID,
  p_title   TEXT,
  p_body    TEXT,
  p_url     TEXT
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  PERFORM net.http_post(
    url     := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'push_function_url'),
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-push-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'push_shared_secret')
    ),
    body    := jsonb_build_object('user_id', p_user_id, 'title', p_title, 'body', p_body, 'url', p_url)
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'send_push failed: %', SQLERRM;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_friendship_change()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_requester_name TEXT;
  v_addressee_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    SELECT name INTO v_requester_name FROM public.profiles WHERE id = NEW.requester_id;
    PERFORM public.send_push(NEW.addressee_id, 'New friend request', v_requester_name || ' wants to connect', '/my-plan/friends');
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    SELECT name INTO v_addressee_name FROM public.profiles WHERE id = NEW.addressee_id;
    PERFORM public.send_push(NEW.requester_id, 'Friend request accepted', v_addressee_name || ' accepted your request', '/my-plan/friends');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER friendships_push
AFTER INSERT OR UPDATE ON public.friendships
FOR EACH ROW EXECUTE FUNCTION public.notify_friendship_change();

CREATE OR REPLACE FUNCTION public.notify_invite_request_reviewed()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'approved' THEN
    PERFORM public.send_push(NEW.requester_id, 'Invite approved', 'Your invite request for ' || NEW.invitee_name || ' was approved', '/my-plan/friends');
  ELSIF OLD.status = 'pending' AND NEW.status = 'rejected' THEN
    PERFORM public.send_push(NEW.requester_id, 'Invite declined', 'Your invite request for ' || NEW.invitee_name || ' was declined', '/my-plan/friends');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER invite_requests_push
AFTER UPDATE ON public.invite_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_invite_request_reviewed();

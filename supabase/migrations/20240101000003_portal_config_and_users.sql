-- portal_config: one row per portal, all CMS config stored as jsonb
CREATE TABLE public.portal_config (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  portal_id  uuid NOT NULL REFERENCES public.portals(id) ON DELETE CASCADE,
  canais     jsonb DEFAULT '[]'::jsonb,
  cores      jsonb DEFAULT '{}'::jsonb,
  fontes     jsonb DEFAULT '{}'::jsonb,
  layout     text  DEFAULT 'banner',
  footer     jsonb DEFAULT '{}'::jsonb,
  ticker     jsonb DEFAULT NULL,
  splash     jsonb DEFAULT NULL,
  cookies    jsonb DEFAULT NULL,
  banner_slides jsonb DEFAULT NULL,
  informacoes   jsonb DEFAULT NULL,
  empresas   jsonb DEFAULT '[]'::jsonb,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(portal_id)
);

-- portal_users: associates auth users to portals with a role
CREATE TABLE public.portal_users (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  portal_id  uuid NOT NULL REFERENCES public.portals(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL,
  email      text NOT NULL,
  nome       text DEFAULT '',
  role       text NOT NULL DEFAULT 'editor'
               CHECK (role IN ('admin', 'editor', 'viewer')),
  empresas   text[] DEFAULT NULL,
  status     text NOT NULL DEFAULT 'Ativo'
               CHECK (status IN ('Ativo', 'Suspenso')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(portal_id, user_id)
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER portal_config_updated_at
  BEFORE UPDATE ON public.portal_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: portal_config
ALTER TABLE public.portal_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all_portal_config" ON public.portal_config
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

CREATE POLICY "client_user_own_portal_config" ON public.portal_config
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'client_user'
    AND portal_id::text = ANY(
      ARRAY(SELECT jsonb_array_elements_text(
        COALESCE(auth.jwt() -> 'app_metadata' -> 'portalIds', '[]'::jsonb)
      ))
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'client_user'
    AND portal_id::text = ANY(
      ARRAY(SELECT jsonb_array_elements_text(
        COALESCE(auth.jwt() -> 'app_metadata' -> 'portalIds', '[]'::jsonb)
      ))
    )
  );

-- RLS: portal_users
ALTER TABLE public.portal_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all_portal_users" ON public.portal_users
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

CREATE POLICY "client_user_own_portal_users" ON public.portal_users
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'client_user'
    AND portal_id::text = ANY(
      ARRAY(SELECT jsonb_array_elements_text(
        COALESCE(auth.jwt() -> 'app_metadata' -> 'portalIds', '[]'::jsonb)
      ))
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'client_user'
    AND portal_id::text = ANY(
      ARRAY(SELECT jsonb_array_elements_text(
        COALESCE(auth.jwt() -> 'app_metadata' -> 'portalIds', '[]'::jsonb)
      ))
    )
  );

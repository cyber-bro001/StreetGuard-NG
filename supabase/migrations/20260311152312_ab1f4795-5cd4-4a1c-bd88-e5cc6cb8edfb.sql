
-- Fix all RLS policies to be PERMISSIVE

-- Issues
DROP POLICY IF EXISTS "Issues viewable by everyone" ON public.issues;
CREATE POLICY "Issues viewable by everyone" ON public.issues FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create issues" ON public.issues;
CREATE POLICY "Authenticated users can create issues" ON public.issues FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

-- Profiles
DROP POLICY IF EXISTS "Profiles viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Verifications
DROP POLICY IF EXISTS "Verifications viewable by everyone" ON public.verifications;
CREATE POLICY "Verifications viewable by everyone" ON public.verifications FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth users can verify" ON public.verifications;
CREATE POLICY "Auth users can verify" ON public.verifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Add trigger for auto-creating profiles (if not exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add FK if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'issues_created_by_profiles_fkey') THEN
    ALTER TABLE public.issues ADD CONSTRAINT issues_created_by_profiles_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(user_id);
  END IF;
END $$;

-- Seed demo data: create a demo profile and issues
INSERT INTO public.profiles (user_id, name, points, reports_count)
VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Reporter', 50, 5)
ON CONFLICT DO NOTHING;

INSERT INTO public.issues (type, description, latitude, longitude, severity, created_by, verified_count) VALUES
  ('Pothole', 'Large pothole on Nnebisi Road causing traffic delays', 6.1956, 6.7314, 'severe', '00000000-0000-0000-0000-000000000001', 3),
  ('Flooded Road', 'Persistent flooding near Summit Junction after rainfall', 6.2100, 6.7250, 'severe', '00000000-0000-0000-0000-000000000001', 5),
  ('Broken Streetlight', 'Streetlight out on DLA Road for over two weeks', 6.1880, 6.7400, 'moderate', '00000000-0000-0000-0000-000000000001', 2),
  ('Damaged Traffic Signal', 'Traffic light not functioning at Interbau junction', 6.2000, 6.7350, 'moderate', '00000000-0000-0000-0000-000000000001', 1),
  ('Road Hazard', 'Exposed drainage cover on Cable Point Road', 6.1830, 6.7280, 'minor', '00000000-0000-0000-0000-000000000001', 0)
ON CONFLICT DO NOTHING;

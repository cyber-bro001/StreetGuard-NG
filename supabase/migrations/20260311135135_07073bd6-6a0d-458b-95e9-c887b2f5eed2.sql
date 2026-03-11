
-- Add foreign key from issues.created_by to profiles.user_id so we can join
ALTER TABLE public.issues
  ADD CONSTRAINT issues_created_by_profiles_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(user_id);

-- Create the trigger for auto-creating profiles on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Fix RLS policies to be PERMISSIVE instead of RESTRICTIVE
-- Drop and recreate issues policies
DROP POLICY IF EXISTS "Issues viewable by everyone" ON public.issues;
CREATE POLICY "Issues viewable by everyone" ON public.issues FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create issues" ON public.issues;
CREATE POLICY "Authenticated users can create issues" ON public.issues FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

-- Drop and recreate profiles policies
DROP POLICY IF EXISTS "Profiles viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Drop and recreate verifications policies
DROP POLICY IF EXISTS "Verifications viewable by everyone" ON public.verifications;
CREATE POLICY "Verifications viewable by everyone" ON public.verifications FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth users can verify" ON public.verifications;
CREATE POLICY "Auth users can verify" ON public.verifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

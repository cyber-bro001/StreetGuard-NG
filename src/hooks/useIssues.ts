import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const DEMO_REPORTER_ID = '00000000-0000-0000-0000-000000000001';

export interface Issue {
  id: string;
  type: string;
  description: string | null;
  image_url: string | null;
  latitude: number;
  longitude: number;
  severity: 'severe' | 'moderate' | 'minor';
  verified_count: number;
  created_by: string;
  created_at: string;
  status: string;
  profiles?: { name: string } | null;
}

export function useIssues() {
  return useQuery({
    queryKey: ['issues'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('issues')
        .select('id, type, description, image_url, latitude, longitude, severity, verified_count, created_by, created_at, status, profiles!issues_created_by_profiles_fkey(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const issues = (data ?? []) as unknown as Issue[];

      console.debug('[useIssues] fetched reports', {
        total: issues.length,
        demo: issues.filter((issue) => issue.created_by === DEMO_REPORTER_ID).length,
        userGenerated: issues.filter((issue) => issue.created_by !== DEMO_REPORTER_ID).length,
        ids: issues.map((issue) => issue.id),
      });

      return issues;
    },
    staleTime: 30_000,
  });
}

export function useCreateIssue() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (issue: {
      type: string;
      description?: string;
      image_url?: string;
      latitude: number;
      longitude: number;
      severity: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('issues')
        .insert({ ...issue, created_by: user.id })
        .select('id, type, description, image_url, latitude, longitude, severity, verified_count, created_by, created_at, status, profiles!issues_created_by_profiles_fkey(name)')
        .single();

      if (error) throw error;

      const points = issue.image_url ? 15 : 10;
      await supabase.rpc('add_points', { user_id: user.id, amount: points });
      await supabase.rpc('increment_reports_count', { p_user_id: user.id });

      return data as unknown as Issue;
    },
    onSuccess: (newIssue) => {
      qc.setQueryData(['issues'], (existingIssues: Issue[] | undefined) => {
        if (!existingIssues) return [newIssue];
        if (existingIssues.some((issue) => issue.id === newIssue.id)) return existingIssues;
        return [newIssue, ...existingIssues];
      });

      qc.invalidateQueries({ queryKey: ['issues'] });
      qc.invalidateQueries({ queryKey: ['leaderboard'] });
    },
  });
}

export function useVerifyIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (issueId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if already verified
      const { data: existing } = await supabase
        .from('verifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('issue_id', issueId)
        .maybeSingle();

      if (existing) throw new Error('Already verified');

      const { error: vErr } = await supabase
        .from('verifications')
        .insert({ user_id: user.id, issue_id: issueId });
      if (vErr) throw vErr;

      const { error: uErr } = await supabase.rpc('increment_verified', { issue_id: issueId });
      if (uErr) throw uErr;

      await supabase.rpc('add_points', { user_id: user.id, amount: 3 });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['issues'] });
      qc.invalidateQueries({ queryKey: ['leaderboard'] });
    },
  });
}

export function useLeaderboard() {
  return useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, points, reports_count')
        .order('points', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });
}

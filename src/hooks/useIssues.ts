import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  profiles?: { name: string } | null;
}

export function useIssues() {
  return useQuery({
    queryKey: ['issues'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('issues')
        .select('*, profiles!issues_created_by_profiles_fkey(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as unknown) as Issue[];
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('issues')
        .insert({ ...issue, created_by: user.id })
        .select()
        .single();
      if (error) throw error;

      // Award points and increment reports count
      const points = issue.image_url ? 15 : 10;
      await supabase.rpc('add_points', { user_id: user.id, amount: points });
      await supabase.rpc('increment_reports_count', { p_user_id: user.id });
      return data;
    },
    onSuccess: () => {
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

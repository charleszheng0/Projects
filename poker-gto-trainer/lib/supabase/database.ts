import { createServerClient } from './server';
import { createAdminClient } from './server';

/**
 * Database utility functions for interacting with Supabase tables
 */

// Types matching the database schema
export interface Profile {
  id: number;
  user_id: string;
  created_at: string;
}

export interface Dataset {
  id: string;
  name: string;
  solver_type: string;
  created_at: string;
}

export interface TrainingSession {
  id: number;
  user_id: string;
  dataset_id: string;
  created_at: string;
}

export interface Hand {
  id: string;
  created_at: string;
  session_id: string;
  hand_data: Record<string, any>;
}

export interface UserDecision {
  id: string;
  created_at: string;
  hand_id: string;
  action: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in';
  is_correct: boolean;
  feedback: string;
  bet_size_bb: number;
}

export interface GTOSolution {
  id: string;
  dataset_id: string;
  situation: Record<string, any>;
  optimal_action: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in';
  frequencies?: Record<string, number>;
  created_at: string;
}

/**
 * Profiles
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    throw error;
  }
  
  return data;
}

export async function createProfile(userId: string): Promise<Profile> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('profiles')
    .insert({ user_id: userId })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Training Sessions
 */
export async function createTrainingSession(
  userId: string,
  datasetId: string
): Promise<TrainingSession> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('training_sessions')
    .insert({
      user_id: userId,
      dataset_id: datasetId,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getTrainingSessions(userId: string): Promise<TrainingSession[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('training_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export async function getTrainingSession(sessionId: number): Promise<TrainingSession | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('training_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    throw error;
  }
  
  return data;
}

/**
 * Hands
 */
export async function createHand(
  sessionId: string | number,
  handData: Record<string, any>
): Promise<Hand> {
  const supabase = createServerClient();
  // Convert sessionId to string since hands.session_id is uuid but training_sessions.id is bigint
  const sessionIdStr = String(sessionId);
  const { data, error } = await supabase
    .from('hands')
    .insert({
      session_id: sessionIdStr,
      hand_data: handData,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getHandsBySession(sessionId: string | number): Promise<Hand[]> {
  const supabase = createServerClient();
  // Convert sessionId to string for comparison
  const sessionIdStr = String(sessionId);
  const { data, error } = await supabase
    .from('hands')
    .select('*')
    .eq('session_id', sessionIdStr)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

/**
 * User Decisions
 */
export async function createUserDecision(
  handId: string,
  decision: {
    action: UserDecision['action'];
    is_correct: boolean;
    feedback: string;
    bet_size_bb: number;
  }
): Promise<UserDecision> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('user_decisions')
    .insert({
      hand_id: handId,
      ...decision,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getDecisionsByHand(handId: string): Promise<UserDecision[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('user_decisions')
    .select('*')
    .eq('hand_id', handId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

/**
 * Datasets
 */
export async function getDatasets(): Promise<Dataset[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('datasets')
    .select('*')
    .order('created_at', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

/**
 * GTO Solutions
 */
export async function getGTOSolution(
  datasetId: string,
  situation: Record<string, any>
): Promise<GTOSolution | null> {
  const supabase = createServerClient();
  
  // Query using JSONB operators
  let query = supabase
    .from('gto_solutions')
    .select('*')
    .eq('dataset_id', datasetId);
  
  // Add situation filters if provided
  if (situation.position) {
    query = query.eq('situation->>position', situation.position);
  }
  if (situation.num_players) {
    query = query.eq('situation->>num_players', String(situation.num_players));
  }
  if (situation.street) {
    query = query.eq('situation->>street', situation.street);
  }
  
  const { data, error } = await query.limit(1).maybeSingle();
  
  if (error && error.code !== 'PGRST116') {
    throw error;
  }
  
  return data;
}

export async function searchGTOSolutions(
  datasetId: string,
  filters: Record<string, any>
): Promise<GTOSolution[]> {
  const supabase = createServerClient();
  
  let query = supabase
    .from('gto_solutions')
    .select('*')
    .eq('dataset_id', datasetId);
  
  // Apply filters
  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(`situation->>${key}`, String(value));
  });
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data || [];
}


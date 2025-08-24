import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const signInWithPassword = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
  });
  if (error) throw error;
  return data;
};

export const updateUserName = async (name) => {
  const { error } = await supabase.auth.updateUser({
    data: { full_name: name }
  });
  if (error) {
    console.error('Error updating user metadata:', error);
    return false;
  }
  return true;
};

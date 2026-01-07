
import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 'https://ycojbqsoazranmcainsg.supabase.co';
export const supabaseAnonKey = 'sb_publishable_xECHYDmmoQkE1J8iC7hHtg_1vtCSNnb';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const ROOT_ADMIN_UUID = '8bc193d8-f8f0-4026-b7c2-8cf71e88f412';

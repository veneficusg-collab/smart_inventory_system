import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zlyeznvrwerpcvfuetsi.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpseWV6bnZyd2VycGN2ZnVldHNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NTI4MzksImV4cCI6MjA3MjEyODgzOX0.8S0SlXSJ9vnzU42cvahxhC9WvQU-RWg1JDazr61bMfw'


export const supabase = createClient(supabaseUrl, supabaseAnonKey)
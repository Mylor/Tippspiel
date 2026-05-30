import { createClient } from '@supabase/supabase-js'

// Hier ziehen wir uns die Werte dynamisch aus den Umgebungsvariablen
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)
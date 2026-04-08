import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kdswfjqmsaooewznzcgs.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtkc3dmanFtc2Fvb2V3em56Y2dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MDMzNDIsImV4cCI6MjA5MDE3OTM0Mn0.pjorE2OA5aIv8td8JoahOV5rQFR5-vXZrl0Yeiy-rv8'

export const supabase = createClient(supabaseUrl, supabaseKey)
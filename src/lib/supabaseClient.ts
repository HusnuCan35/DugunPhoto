import { createClient } from '@supabase/supabase-js';

// Hardcoded değerler - daha güvenli bir yapı için .env kullanın
const supabaseUrl = 'https://sfqonnyzxfunhuzlrwml.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmcW9ubnl6eGZ1bmh1emxyd21sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2NDQ3NzksImV4cCI6MjA2MzIyMDc3OX0.BPe4Oqhn6nCP58FoOCnovXmnaSmZNJbH_J1aSHbGuX0';
 
// Basit client oluşturma
export const supabase = createClient(supabaseUrl, supabaseAnonKey); 
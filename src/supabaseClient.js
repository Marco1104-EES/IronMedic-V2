import { createClient } from '@supabase/supabase-js'

// 請將這裡換成您剛剛在 Supabase 網站複製的資料
const supabaseUrl = 'https://gzwethykycnhledcqeqz.supabase.co'
const supabaseKey = 'sb_publishable_Zwrioa6u5egVklx9GXwtag_HxF42gUq'

export const supabase = createClient(supabaseUrl, supabaseKey)
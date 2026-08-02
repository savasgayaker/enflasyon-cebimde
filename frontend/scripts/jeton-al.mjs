// Test için kısa ömürlü bir erişim jetonu basar (stdout'a, satır sonu yok).
// Koşum:  node frontend/scripts/jeton-al.mjs
// Dosya frontend/ ALTINDA: Node paket adlarını dosyanın bulunduğu klasörden
// yukarı doğru arar, @supabase/supabase-js frontend/node_modules içinde.
// DİKKAT: her koşum veritabanında YENİ bir anonim hesap açar. Test bitince
// Supabase panelinde Authentication -> Users altından silebilirsin.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.trimStart().startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
)
const URL_ = env.EXPO_PUBLIC_SUPABASE_URL
const KEY = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
if (!URL_ || !KEY) { console.error('frontend/.env eksik'); process.exit(1) }

const sb = createClient(URL_, KEY, { auth: { persistSession: false } })
const { data, error } = await sb.auth.signInAnonymously()
if (error) { console.error('Anonim oturum acilamadi:', error.message); process.exit(1) }
process.stdout.write(data.session.access_token)

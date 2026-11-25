-- ============================================================
-- VetYa · Migración: datos de contacto del veterinario en `pets`
-- Ejecutar en Supabase > SQL Editor > New query > Run.
-- Es seguro ejecutarlo varias veces (IF NOT EXISTS).
-- Después de ejecutarlo se puede activar el mapeo en public/js/supabase.js.
-- ============================================================

alter table public.pets
  add column if not exists veterinario text,
  add column if not exists telefono_vet text,
  add column if not exists contacto_dueno text;

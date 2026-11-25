-- ============================================================
-- VetYa · Esquema de base de datos para Supabase
-- Pega TODO este archivo en: Supabase > SQL Editor > New query > Run
-- ============================================================

-- 1) Fichas de mascotas: una cuenta = una o varias mascotas con su historial
create table if not exists public.pets (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) on delete cascade,
  nombre      text not null,
  especie     text not null default 'perro',
  raza        text,
  nacimiento  date,
  peso_kg     numeric,
  sexo        text,
  esterilizado boolean default false,
  condiciones text,        -- enfermedades crónicas
  medicamentos text,
  alergias    text,
  notas       text,
  veterinario text,
  telefono_vet text,
  contacto_dueno text,
  creado_en   timestamptz default now(),
  actualizado_en timestamptz default now()
);

-- 2) Historial de triajes (para que la mascota tenga su expediente de eventos)
create table if not exists public.triage_logs (
  id        uuid primary key default gen_random_uuid(),
  pet_id    uuid not null references public.pets (id) on delete cascade,
  owner_id  uuid not null references auth.users (id) on delete cascade,
  nivel     text not null check (nivel in ('verde','amarillo','rojo')),
  motivos   text[],
  pasos     text[],
  detalle   text,
  creado_en timestamptz default now()
);

-- 3) Veterinarias (directorio propio, verificable a mano)
create table if not exists public.vets (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  telefono    text,
  direccion   text,
  lat         double precision not null,
  lng         double precision not null,
  abierto_24h boolean default false,
  verificado  boolean default false,   -- lo marcamos true cuando lo confirmamos
  servicios   text,
  creado_por  uuid references auth.users (id) on delete set null,
  creado_en   timestamptz default now()
);

-- 4) Reseñas de veterinarias (esto reemplaza al foro: información verificada, no consejo médico)
create table if not exists public.vet_reviews (
  id        uuid primary key default gen_random_uuid(),
  vet_id    uuid not null references public.vets (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  estrellas int  not null check (estrellas between 1 and 5),
  urgencia_atendida boolean,
  comentario text,
  creado_en timestamptz default now(),
  unique (vet_id, user_id)
);

-- ============================================================
-- Seguridad a nivel de fila (RLS): cada quien solo ve lo suyo
-- Este archivo se puede ejecutar varias veces sin errores.
-- ============================================================
alter table public.pets        enable row level security;
alter table public.triage_logs enable row level security;
alter table public.vets        enable row level security;
alter table public.vet_reviews enable row level security;

-- Índices para que siga siendo rápido aunque haya muchos usuarios.
create index if not exists pets_owner_idx   on public.pets (owner_id);
create index if not exists triage_pet_idx   on public.triage_logs (pet_id);
create index if not exists triage_owner_idx on public.triage_logs (owner_id);
create index if not exists resenas_vet_idx  on public.vet_reviews (vet_id);

-- Mascotas: solo el dueño
drop policy if exists "pets_propias" on public.pets;
create policy "pets_propias" on public.pets
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Triajes: solo el dueño
drop policy if exists "triajes_propios" on public.triage_logs;
create policy "triajes_propios" on public.triage_logs
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Veterinarias: todos las pueden leer; cualquier usuario logueado puede agregar
drop policy if exists "vets_lectura" on public.vets;
create policy "vets_lectura" on public.vets
  for select using (true);
drop policy if exists "vets_alta" on public.vets;
create policy "vets_alta" on public.vets
  for insert with check (auth.uid() is not null);
drop policy if exists "vets_edicion_propia" on public.vets;
create policy "vets_edicion_propia" on public.vets
  for update using (auth.uid() = creado_por);

-- Reseñas: lectura pública, escritura propia
drop policy if exists "resenas_lectura" on public.vet_reviews;
create policy "resenas_lectura" on public.vet_reviews
  for select using (true);
drop policy if exists "resenas_escritura" on public.vet_reviews;
create policy "resenas_escritura" on public.vet_reviews
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

# Cómo probar el login y la autorización de staff

Rama: `feature/auth-multitenant`.

## 1. Levantar Supabase local

```bash
git checkout feature/auth-multitenant
npx supabase start
npx supabase db reset   # aplica migraciones + supabase/seed.sql
```

## 2. Crear cuentas de staff de prueba

Los usuarios de Auth necesitan la API admin (no se pueden crear solo con SQL), por eso van en un script aparte:

```bash
node --env-file=.env.local scripts/seed-staff.mjs
```

Contraseña `Password123!` para las cuatro:

| Cuenta | Rol | Destino |
|---|---|---|
| `root@plataforma.local` | `platform_admin` | `/plataforma` |
| `admin@sabor-brasa.local` | `admin` | `/admin/sabor-brasa` |
| `cocina@sabor-brasa.local` | `kitchen` | `/kitchen/sabor-brasa` |
| `admin@mar-marea.local` | `admin` (otro restaurante) | `/admin/mar-marea` |

## 3. Levantar la app

```bash
pnpm dev
```

Abrir `http://localhost:3000/login`.

## 4. Qué probar

- Login con cada cuenta → cae en su destino correcto.
- `admin/sabor-brasa` logueado como `cocina@sabor-brasa.local` → redirige a `/kitchen/sabor-brasa`.
- Cualquier ruta de staff sin sesión → redirige a `/login?next=...`.
- Desde `/plataforma` (con `root@`): crear un restaurante nuevo → muestra la contraseña temporal una sola vez.
- Desde `/admin/sabor-brasa/equipo`: agregar una cuenta de cocina y restablecerle la contraseña.
- Suspender un restaurante desde `/plataforma` → el staff y el QR de mesa de ese restaurante quedan bloqueados; reactivarlo lo devuelve a la normalidad.
- Correo o contraseña incorrectos → mensaje de error, sin redirigir.

Automatizado (cubre lo mismo, más los intentos de ataque):

```bash
pnpm test              # unit
pnpm test:integration  # aislamiento entre tenants, suspensión, RLS
```

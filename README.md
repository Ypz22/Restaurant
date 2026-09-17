# Sabor & Brasa

Aplicación de pedidos para mesa construida con Next.js y Supabase. La entrada `/brasa` abre la mesa de demostración `Mesa 04`; un QR real puede apuntar a `/r/sabor-brasa/mesa/<qr_token>`.

## Inicio local

1. Inicia Supabase local con `npx supabase start`.
2. Copia `.env.local.example` a `.env.local` y asigna `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` con los valores de `npx supabase status`. Asigna `SUPABASE_SERVICE_ROLE_KEY` solo si ejecutarás las pruebas de integración; nunca la uses como variable pública.
3. Aplica las migraciones con `npx supabase migration up --local`. Si acabas de crear una base local desechable y quieres los datos de demostración, ejecuta `npx supabase db reset --local` para cargar `supabase/seed.sql`.
4. Ejecuta `pnpm install` y `pnpm dev`; abre `http://localhost:3000/brasa`.

El menú, la disponibilidad, el carrito compartido, las solicitudes al camarero y los pedidos confirmados se leen o escriben en Supabase. Las fotografías locales están en `public/brasa`. Las migraciones agregan notas para cocina y motivos detallados para las solicitudes. Para conectar una instancia alojada, configura sus URL y clave pública en las variables de entorno y aplica allí las migraciones y los datos del menú.

## Verificación

`pnpm test`, `pnpm test:integration` y `pnpm test:e2e` cubren la lógica, los RPC y el flujo en navegador. Las pruebas de integración y navegador necesitan Supabase local activo.

Las referencias originales de Stitch están catalogadas en [PANTALLAS_BRASA.md](PANTALLAS_BRASA.md).

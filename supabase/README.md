# Supabase local

Una copia de Supabase (Postgres, login, Storage y el panel Studio) corriendo en tu Mac con Docker.
Sirve para probar los SQL de una rama sin ensuciar develop. Es gratis y se puede borrar y volver a
levantar las veces que haga falta.

## El flujo

1. **En la rama:** levantás la base local y probás ahí los SQL nuevos todas las veces que quieras.
2. **Cuando funciona como queremos:** se define el SQL final, se corre en **develop** y se prueba ahí.
3. **Recién ahí** se mergea a main.

## Una sola vez

1. **Instalá la CLI de Supabase**

   ```bash
   brew install supabase/tap/supabase
   ```

2. **Abrí Docker Desktop** y esperá a que diga que está corriendo. La primera vez que levantes la
   base se descargan las imágenes de Supabase (unos minutos).

3. **Copiá la estructura de develop y armá todo de una vez**

   ```bash
   npm run db:pull
   ```

   Te pide la dirección de conexión de develop (panel de Supabase → **Connect → Direct → Session pooler**, con
   la contraseña de la base). No se muestra en pantalla ni se guarda. Copia solo la estructura
   (tablas, funciones y políticas, sin datos), arma la base local, crea los usuarios de prueba y
   deja la app apuntando a la base local.

   El archivo que genera en `supabase/migrations/` conviene commitearlo, así el resto del equipo
   arranca con `npm run db:start` y `npm run db:reset` sin pedir la contraseña. Si develop cambia
   mucho, se vuelve a correr `npm run db:pull`.

## El día a día

| Comando                                     | Qué hace                                                                 |
| ------------------------------------------- | ------------------------------------------------------------------------ |
| `npm run db:pull`                           | Copia de nuevo la estructura de develop y rearma la base local.          |
| `npm run db:start`                          | Levanta la base local y hace que la app la use.                          |
| `npm run db:apply -- schema-supabase/x.sql` | Corre un SQL en la base local (se pueden pasar varios).                  |
| `npm run db:reset`                          | Vuelve a cero: estructura de develop + buckets + usuarios de prueba.     |
| `npm run db:users`                          | Vuelve a crear los usuarios de prueba.                                   |
| `npm run db:status`                         | Muestra direcciones y estado.                                            |
| `npm run db:off`                            | La app vuelve a usar develop.                                            |
| `npm run db:local`                          | La app vuelve a usar la base local, sin reiniciarla.                     |
| `npm run db:stop`                           | Apaga la base local (los datos quedan para la próxima).                  |

Después de `db:start`, `db:local` o `db:off`, **reiniciá `npm run dev`** para que tome el cambio.

- **Panel (Studio):** http://127.0.0.1:56323, para ver tablas y datos como en el Supabase de siempre.
- **Usuarios de prueba:** superadmin, admin, taller y qr. Las contraseñas están en
  `scripts/local-db.mjs` y solo existen en la base local.

## Ejemplo: probar los permisos de vistas

```bash
git checkout user-view-permissions
npm run db:start
npm run db:apply -- schema-supabase/users/user-views.sql
npm run dev
```

Si algo sale mal, `npm run db:reset` y se arranca de nuevo, sin tocar develop.

## Cuidados

- **Los scripts solo trabajan contra la base local.** Si la dirección no es de tu máquina, se niegan
  a correr, así que no pueden escribir en develop por error.
- **Mails y notificaciones siguen siendo reales.** Solo cambia la base: el SMTP y las notificaciones
  push siguen saliendo de `.env.development`. Probá con mails de prueba.
- **`.env.development.local` no se commitea** (ya está en el `.gitignore`). Lo generan y borran los
  scripts.
- **Los archivos subidos quedan en la base local.** Los buckets se crean vacíos y con permisos
  amplios, solo para poder probar.

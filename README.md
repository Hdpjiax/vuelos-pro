# VuelosPro - Softaware para enviar, cotizar vuelos

Etapa enfocada en seguimiento operativo, automatizaciones, notas internas y control de archivos.

## Incluye

- Notificaciones automaticas mas completas:
  - Usuario sube vuelo.
  - Admin envia cuenta bancaria.
  - Usuario sube comprobante.
  - Admin confirma pago.
  - Admin sube QR.
  - Vuelo esta proximo.
- Linea de progreso por etapas en detalle de vuelo.
- Notas privadas del admin por vuelo.
- Archivos separados por categoria:
  - Capturas del vuelo.
  - Comprobantes.
  - QR.
  - Internos.
  - Otros.
- Descarga ZIP de todos los archivos de un vuelo desde admin.
- Registro de acciones importantes en historial/auditoria.
- Bloqueo visual y operativo para que usuario no edite vuelos avanzados.
- Mejoras responsive en detalle, archivos y operacion.

## SQL nuevo

Ejecutar en Supabase SQL Editor:

```txt
database/12_etapa_12.sql
```

No repetir SQL anteriores si ya vienes de Etapa 11.

## Desarrollo local desde carpeta nueva

1. Copia tu `.env.local` a esta carpeta.
2. Ejecuta:

```powershell
npm install
npm run typecheck
npm run dev
```

> Nota: `npm run dev` usa Webpack para evitar problemas locales con chunks de Turbopack.

## Produccion desde carpeta nueva

```powershell
cd "C:\Users\Antonio García\Downloads\vuelos-pro-etapa-12"

copy "C:\RUTA-DE-TU-ENV\.env.local" ".env.local"

npm install
npm run typecheck

Remove-Item -Recurse -Force .git -ErrorAction SilentlyContinue

git init
git remote add origin https://github.com/Hdpjiax/vuelos-pro.git
git add .
git commit -m "Etapa 12 seguimiento operativo notas y archivos"
git branch -M main
git push -u origin main --force
```

Vercel desplegara automaticamente en:

```txt
https://vuelos-gn.com
```

## Rutas principales para probar

```txt
/admin/dashboard
/admin/vuelos/[id]
/admin/archivos
/user/vuelos/[id]
```

## Correccion Etapa 12.1

- Se corrigio `/admin/usuarios` para cargar perfiles y vuelos en consultas separadas.
- Se corrigio `/admin/usuarios/[id]` para que los mensajes recientes no dependan de relaciones anidadas.
- No requiere SQL nuevo.

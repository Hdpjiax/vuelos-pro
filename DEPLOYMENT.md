# Deploy Etapa 12

## 1. Ejecutar SQL nuevo

En Supabase SQL Editor ejecutar:

```txt
database/12_etapa_12.sql
```

Este SQL agrega:

- Categoria `interno` para archivos privados de administracion.
- Tabla `flight_internal_notes`.
- Politicas RLS para notas internas solo admin.
- Indices para auditoria, notificaciones y filtros operativos.

## 2. Variables de entorno

Mantener en Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SITE_URL=https://vuelos-pro.vercel.app
```

## 3. Subir desde carpeta nueva

```powershell
cd "C:\Users\Antonio García\Downloads\vuelos-pro-etapa-12"

Remove-Item -Recurse -Force .git -ErrorAction SilentlyContinue

git init
git remote add origin https://github.com/Hdpjiax/vuelos-pro.git
git add .
git commit -m "Etapa 12 seguimiento operativo notas y archivos"
git branch -M main
git push -u origin main --force
```

## 4. Verificar produccion

Probar:

```txt
https://vuelos-pro.vercel.app/admin/vuelos
https://vuelos-pro.vercel.app/admin/archivos
https://vuelos-pro.vercel.app/admin/dashboard
```

En un vuelo, revisar:

- Linea de progreso.
- Notas internas.
- Archivos por categoria.
- Descarga ZIP.
- Notificaciones agrupadas.

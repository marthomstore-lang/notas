# Notas LTP - Sistema de Gestión Académica

Este repositorio contiene el sistema centralizado de calificaciones y administración para el Liceo Pro.

## Requisitos de Implementación

### 1. Base de Datos (Supabase)
1. Crear un proyecto en [Supabase](https://supabase.com/) llamado `notas-ltp`.
2. Ir al **SQL Editor** y ejecutar el contenido del archivo `supabase_schema.sql` que se encuentra en la raíz de este proyecto.
3. Copiar la **Connection String** (Node.js/Pooler) y guardarla como `DATABASE_URL`.

### 2. Despliegue (Vercel)
1. Importar este repositorio en [Vercel](https://vercel.com/).
2. Configurar las siguientes variables de entorno (Environment Variables):
   - `DATABASE_URL`: La URL de conexión de Supabase.
   - `JWT_SECRET`: Una clave secreta para los tokens (ej: `super-secret-key-liceo-pro`).
   - `PORT`: 3000 (Opcional, Vercel lo maneja).
3. Desplegar.

## Características
- Gestión de estudiantes y matrículas.
- Planilla de notas con autoguardado y reordenamiento A-Z.
- Generación de informes de notas en formato oficial.
- Bitácora de auditoría de acciones.
- Perfil de usuario para cambio de claves.

## Desarrollo Local
```bash
# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

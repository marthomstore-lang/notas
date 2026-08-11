# Documentación Técnica Exhaustiva - Liceo Pro / Notas LTP

Este documento contiene la especificación técnica completa y detallada del sistema **Liceo Pro / Notas LTP** (Sistema de Gestión Académica, Matrícula y Libro de Calificaciones), permitiendo replicar la aplicación en su totalidad en cualquier entorno.

---

## 1. Arquitectura del Sistema y Stack Tecnológico

La aplicación está diseñada bajo una arquitectura desacoplada Monorepo **Frontend (SPA)** + **Backend (REST API)** con soporte para despliegue serverless en **Vercel** y almacenamiento relacional en **PostgreSQL (Supabase)**.

### 1.1 Backend
- **Entorno de Ejecución:** Node.js (v18+) con TypeScript (`ts-node-dev` en desarrollo, `tsc` para compilación a JS).
- **Framework Web:** Express.js (v5.2.1).
- **Base de Datos Principal:** PostgreSQL vía `pg` (v8.20.0) conectada a **Supabase**. Adaptador compatible con consultas parametrizadas en SQLite (`dbWrapper` que convierte sintaxis `?` a `$1, $2...`).
- **Autenticación y Seguridad:** 
  - JWT (`jsonwebtoken` v9.0.3) con `JWT_SECRET`.
  - Hashing de contraseñas con `bcryptjs` (v3.0.3).
  - Protección de cabeceras HTTP con `helmet` (v8.1.0).
  - Habilitación de peticiones cruzadas con `cors` (v2.8.6).
- **Manejo de Archivos:** `multer` (v2.1.1) para procesamiento en memoria de cargas masivas (Excel `.xlsx` vía biblioteca `xlsx`).

### 1.2 Frontend
- **Librería UI:** React 19 (v19.2.5) con TypeScript (`~6.0.2`).
- **Herramienta de Construcción:** Vite (v8.0.10).
- **Enrutamiento:** `react-router-dom` (v7.14.2) configurado con `HashRouter` para evitar problemas de ruteo en Vercel/servidores estáticos.
- **Iconografía:** `lucide-react` (v1.14.0).
- **Alertas y Notificaciones:** `sweetalert2` (v11.26.24) y `@sweetalert2/react-content`.
- **Estilos:** CSS Vanilla modularizado (`App.css`, `index.css`, `Dashboard.css`, `Login.css`, `StudentWindow.css`, `GradesSheet.css`, `GradesOverview.css`, `OfficialForm.css`).
- **Contextos de React:**
  - `AuthContext`: Gestión de sesión del usuario token JWT, decodificación de rol, login/logout.
  - `A11yContext`: Accesibilidad global (Modo Alto Contraste, Tamaño de Fuente ajustable, Resaltado de Enlaces, Reducción de Animaciones).

### 1.3 Infraestructura y Despliegue
- **Archivo de Configuración Vercel (`vercel.json`):**
  ```json
  {
    "experimentalServices": {
      "frontend": { "entrypoint": "frontend", "routePrefix": "/", "framework": "vite" },
      "backend": { "entrypoint": "backend", "routePrefix": "/_/backend" }
    }
  }
  ```

---

## 2. Esquema Completo de Base de Datos

La base de datos relacional contiene 17 tablas interconectadas con claves foráneas, restricciones de unicidad e índices de rendimiento.

### Diagrama Entidad-Relación Resumido
```
users (Docentes/Admin) <--- teacher_assignments ---> levels & subjects
students <--- enrollments ---> levels
students <--- guardians
students <--- health_records
students <--- observations
students <--- grades ---> grade_columns ---> levels & subjects
levels & subjects <--- grades_locks
```

---

### Detalle de Tablas y Columnas

#### 1. `users` (Usuarios del Sistema y RBAC)
Almacena las cuentas de acceso al sistema con Roles (`Admin`, `Docente`, `Administrativo`, `Apoderado`, `Visita`).
- `id` (TEXT, PK): Identificador único (UUID v4 o string).
- `run` (TEXT, UNIQUE, NOT NULL): RUT chileno del usuario.
- `name` (TEXT, NOT NULL): Nombre completo del usuario.
- `email` (TEXT, UNIQUE): Correo electrónico institucional o personal.
- `password_hash` (TEXT, NOT NULL): Hash Bcrypt de la contraseña.
- `password_plain` (TEXT): Contraseña en texto plano para consulta por el perfil Administrativo.
- `role` (TEXT, CHECK IN ('Admin', 'Docente', 'Administrativo', 'Apoderado', 'Visita')): Rol del sistema.
- `temp_password` (BOOLEAN DEFAULT TRUE): Flag para forzar cambio de clave en el primer ingreso.
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP).
- **Índice:** `idx_users_run` sobre `run`.

#### 2. `levels` (Niveles / Cursos)
Representa los cursos o grados del establecimiento (ej: Pre-Kinder, Kinder, 1° Básico A, 4° Medio B).
- `id` (SERIAL / INTEGER PK): Identificador numérico correlativo.
- `name` (TEXT, NOT NULL): Nombre oficial del curso.
- `total_capacity` (INTEGER, NOT NULL): Capacidad máxima de cupos/matrículas.
- `current_enrolled` (INTEGER DEFAULT 0): Contador actual de estudiantes matriculados activos.
- `homeroom_teacher_id` (TEXT, FK references users.id): ID del Profesor Jefe asignado.

#### 3. `subjects` (Asignaturas / Materias)
- `id` (SERIAL / INTEGER PK): Identificador de la asignatura.
- `name` (TEXT, NOT NULL): Nombre de la materia (ej: Lenguaje y Comunicación, Matemática, Historia).

#### 4. `teacher_assignments` (Asignación Docente)
Relaciona a un Profesor con un Nivel y una Asignatura para un Año Académico específico.
- `id` (TEXT, PK): ID único.
- `teacher_id` (TEXT, FK -> `users.id`): ID del docente.
- `level_id` (INTEGER, FK -> `levels.id`): ID del curso.
- `subject_id` (INTEGER, FK -> `subjects.id`): ID de la asignatura.
- `academic_year` (INTEGER, NOT NULL): Año lectivo (ej: 2026).
- **Restricción Unica:** `UNIQUE(teacher_id, level_id, subject_id, academic_year)`.

#### 5. `students` (Ficha Completa del Estudiante)
Contiene la información detallada requerida por la ficha oficial de matrícula (FIDE / MINEDUC).
- `id` (TEXT, PK): UUID único del alumno.
- `run` (TEXT, UNIQUE, NOT NULL): RUT del alumno.
- `full_name` (TEXT, NOT NULL): Nombre completo estructurado.
- `first_name` (TEXT), `paternal_surname` (TEXT), `maternal_surname` (TEXT).
- `document_type` (TEXT): Tipo de documento (RUT, IPE, Pasaporte).
- `birth_date` (TEXT): Fecha de nacimiento (YYYY-MM-DD).
- `gender` (TEXT): Género (Masculino, Femenino, Otro).
- `nationality` (TEXT): Nacionalidad (Chilena, Extranjera).
- `marital_status` (TEXT), `religion` (TEXT), `has_religion` (BOOLEAN DEFAULT 0).
- `ethnicity` (TEXT), `indigenous_origin` (TEXT).
- `address` (TEXT), `region` (TEXT), `commune` (TEXT), `postal_code` (TEXT).
- `previous_school` (TEXT): Colegio de procedencia.
- `phone` (TEXT), `mobile_phone` (TEXT), `phone_type` (TEXT).
- `email` (TEXT), `email_type` (TEXT).
- `health_system` (TEXT): Fonasa (A,B,C,D), Isapre, FFAA, Ninguno.
- `emergency_contact_name` (TEXT), `emergency_contact_phone` (TEXT).
- `enrollment_number` (TEXT): Número de folio de matrícula.
- `enrollment_date` (TEXT), `incorporation_date` (TEXT), `entry_year` (INTEGER).
- `withdrawal_date` (TEXT): Fecha de retiro (si aplica).
- `list_number` (INTEGER DEFAULT 0): Número de lista ordenado dentro del curso.
- **Programas de Apoyo / Prioridades:**
  - `pie_program` (BOOLEAN DEFAULT 0), `pie_diagnosis` (TEXT): Diagnóstico Programa Integración Escolar.
  - `differential_group` (BOOLEAN DEFAULT 0), `is_repeater` (BOOLEAN DEFAULT 0), `uses_mineduc_texts` (BOOLEAN DEFAULT 1).
  - `is_priority` (BOOLEAN DEFAULT 0), `is_preferential` (BOOLEAN DEFAULT 0), `is_vulnerable` (BOOLEAN DEFAULT 0), `is_high_vulnerability` (BOOLEAN DEFAULT 0).
- **Becas:**
  - `scholarship_indigenous` (BOOLEAN DEFAULT 0), `scholarship_president` (BOOLEAN DEFAULT 0), `scholarship_retention` (BOOLEAN DEFAULT 0), `scholarship_junaeb` (BOOLEAN DEFAULT 0), `scholarship_other` (TEXT).
- **Estructura Familiar:**
  - `lives_with` (TEXT), `lives_with_other` (TEXT), `family_members` (INTEGER), `total_siblings` (INTEGER), `school_siblings` (INTEGER), `school_age_siblings` (INTEGER), `liceo_siblings` (INTEGER), `sibling_position` (INTEGER).
- `status` (TEXT DEFAULT 'Active'): Estado (`Active`, `Withdrawn`, `Graduated`).
- `entry_date` (TEXT), `observaciones` (TEXT).
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP).
- **Índice:** `idx_students_run` sobre `run`.

#### 6. `guardians` (Apoderados)
- `id` (TEXT, PK).
- `student_id` (TEXT, FK -> `students.id` ON DELETE CASCADE).
- `guardian_type` (TEXT, NOT NULL): `'Titular'` o `'Suplente'`.
- `run` (TEXT, NOT NULL), `full_name` (TEXT, NOT NULL), `first_name` (TEXT), `paternal_surname` (TEXT), `maternal_surname` (TEXT).
- `birth_date` (TEXT), `gender` (TEXT), `marital_status` (TEXT), `relationship` (TEXT) (Padre, Madre, Abuelo/a, Tío/a, Tutor Legal).
- `phone` (TEXT), `email` (TEXT), `address` (TEXT), `region` (TEXT), `commune` (TEXT), `postal_code` (TEXT).
- `education_level` (TEXT), `occupation` (TEXT), `health_system` (TEXT).
- `is_health_load` (BOOLEAN DEFAULT 0): Si el alumno es carga de salud de este apoderado.
- `is_financial_guardian` (BOOLEAN DEFAULT 0), `is_main_guardian` (BOOLEAN DEFAULT 0).

#### 7. `health_records` (Ficha Médica)
- `id` (TEXT, PK).
- `student_id` (TEXT, FK -> `students.id` ON DELETE CASCADE).
- `blood_type` (TEXT), `allergies` (TEXT), `chronic_diseases` (TEXT), `general_observations` (TEXT).

#### 8. `enrollments` (Historial de Matrícula por Año)
- `id` (TEXT, PK).
- `student_id` (TEXT, FK -> `students.id` ON DELETE CASCADE).
- `level_id` (INTEGER, FK -> `levels.id`).
- `academic_year` (INTEGER, NOT NULL).
- `status` (TEXT DEFAULT 'Active').
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP).
- **Restricción Única:** `UNIQUE(student_id, academic_year)`.

#### 9. `homeroom_teachers` (Profesores Jefes Histórico)
- `id` (SERIAL / INTEGER PK).
- `level_id` (INTEGER, FK -> `levels.id`).
- `teacher_id` (TEXT, FK -> `users.id`).
- `academic_year` (INTEGER, NOT NULL).
- **Restricción Única:** `UNIQUE(level_id, academic_year)`.

#### 10. `personality_reports` (Informes de Desarrollo Personal y Social)
- `id` (TEXT, PK).
- `student_id` (TEXT, FK -> `students.id` ON DELETE CASCADE).
- `teacher_id` (TEXT, FK -> `users.id`).
- `level_id` (INTEGER, FK -> `levels.id`).
- `academic_year` (INTEGER), `semester` (INTEGER).
- `report_type` (TEXT): Tipo de informe (ej: `'Parvularia'`, `'General'`).
- `evaluation_data` (JSON / JSONB): Criterios evaluados (Escala: Adquirido, En Proceso, Por Adquirir, No Evaluado).
- `observations` (TEXT).
- **Restricción Única:** `UNIQUE(student_id, academic_year, semester, report_type)`.

#### 11. `grade_columns` (Columnas de Evaluación de Notas)
- `id` (TEXT, PK).
- `level_id` (INTEGER, FK -> `levels.id`).
- `subject_id` (INTEGER, FK -> `subjects.id`).
- `academic_year` (INTEGER, NOT NULL).
- `title` (TEXT, NOT NULL): Nombre de la evaluación (ej: "N1 - Control 1").
- `position` (INTEGER): Orden correlativo visual de la columna.
- `weighting` (NUMERIC(5,2) DEFAULT 0): Ponderación porcentual de la nota (0 a 100%).
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP).

#### 12. `grades` (Calificaciones Alumnos)
- `id` (TEXT, PK).
- `student_id` (TEXT, FK -> `students.id` ON DELETE CASCADE).
- `grade_column_id` (TEXT, FK -> `grade_columns.id` ON DELETE CASCADE).
- `grade_value` (NUMERIC(3,1)): Nota chilena entre 1.0 y 7.0.
- `updated_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP).
- **Restricción Única:** `UNIQUE(student_id, grade_column_id)`.

#### 13. `grades_locks` (Control de Cierre Semestral de Calificaciones)
- `level_id` (INTEGER), `subject_id` (INTEGER), `academic_year` (INTEGER), `period` (TEXT, ej: `'1er Semestre'`, `'2do Semestre'`).
- `is_locked` (INTEGER DEFAULT 0): Flag `1` = Asignatura/Curso Bloqueado para edición de docentes, `0` = Habilitado.
- **Clave Primaria Compuesta:** `PRIMARY KEY (level_id, subject_id, academic_year, period)`.

#### 14. `observations` (Libro de Vida del Alumno)
- `id` (TEXT, PK).
- `student_id` (TEXT, FK -> `students.id` ON DELETE CASCADE).
- `teacher_id` (TEXT, FK -> `users.id`).
- `content` (TEXT, NOT NULL): Texto de la anotación.
- `type` (TEXT CHECK IN ('Positive', 'Negative') DEFAULT 'Positive').
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP).

#### 15. `audit_logs` (Sistema de Auditoría "Silent-Watch")
- `id` (TEXT, PK).
- `user_id` (TEXT), `user_name` (TEXT).
- `action` (TEXT): Acción realizada (ej: `'UPDATE_GRADE'`, `'DELETE_STUDENT'`).
- `details` (TEXT): JSON o string con detalles del cambio (valor anterior vs nuevo).
- `level_id` (TEXT), `subject_id` (TEXT).
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP).
- **Índice:** `idx_audit_logs_timestamp` sobre `created_at`.

#### 16. `institutional_settings` (Parámetros Institucionales)
- `id` (SERIAL / INTEGER PK).
- `key` (TEXT, UNIQUE, NOT NULL): Clave de configuración (ej: `'school_name'`, `'director_name'`, `'rbd'`).
- `value` (TEXT, NOT NULL).

#### 17. `external_links` (Enlaces de Interés Docente)
- `id` (TEXT, PK).
- `name` (TEXT, NOT NULL): Título del enlace (ej: "Lira Mineduc", "Google Classroom").
- `url` (TEXT, NOT NULL): Enlace HTTP/HTTPS.
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP).

---

## 3. Pestañas, Sub-pestañas y Módulos de la Aplicación

La aplicación provee dos paneles diferenciados según el Rol del usuario autenticado: **Panel de Administración** (`AdminDashboard.tsx`) y **Panel Docente** (`TeacherDashboard.tsx`).

---

### A. Panel de Administración (`AdminDashboard.tsx`)

Destinado a administradores, directivos y perfiles administrativos (con modo lectura para rol `Visita`).

```
Panel de Administración
├── 1. Inicio (home)
├── 2. Matrícula (students)
├── 3. Libro de Clases: Calificaciones (grades)
├── 4. Panorama de Notas (overview)
├── 5. Control y Auditoría (audit)
├── 6. Configuración (config)
│   ├── 6.1 Cursos (courses)
│   ├── 6.2 Asignaturas (subjects)
│   ├── 6.3 Profesores y Usuarios (teachers)
│   ├── 6.4 Asignación Docente (assignments)
│   ├── 6.5 Profesor Jefe (homeroom)
│   ├── 6.6 Orden de Asignaturas (subject_order)
│   ├── 6.7 Plantillas de Informes (templates)
│   ├── 6.8 Cierre de Semestre / Bloqueos (grades_lock)
│   └── 6.9 Enlaces Externos (external_links)
├── 7. Reportes Institucionales (reports)
│   ├── 7.1 Fichas Oficiales de Matrícula (FIDE)
│   ├── 7.2 Certificados de Notas Oficiales
│   └── 7.3 Informes Parvularia / Kinder
└── 8. Mi Cuenta (profile)
```

#### 1. Pestaña `Inicio` (`home`)
- **Descripción:** Tablero principal con métricas globales del establecimiento en tiempo real.
- **Tarjetas KPI:**
  - Total Estudiantes Matriculados Activos.
  - Vacantes Disponibles totales.
  - Total de Asignaciones Docentes activas.
  - Accesos Directos a Operaciones Frecuentes.
- **Acciones:** Accesos rápidos para ingresar matrícula nueva o revisar auditoría.

#### 2. Pestaña `Matrícula` (`students`)
- **Descripción:** Gestión integral de la nómina de estudiantes y sus fichas institucionales.
- **Controles y Filtros:**
  - Buscador general por Nombre o RUT.
  - Filtro por Curso/Nivel.
  - Filtro por Estado (`Activos`, `Retirados`, `Todos`).
  - Botón **"Nueva Matrícula"** (Abre modal con formulario de 4 secciones).
  - Botón **"Reordenar Lista A-Z"** (Abre modal `ReorderStudentsModal.tsx` para modificar el `list_number` automáticamente o arrastrando).
  - Botón **"Exportar Excel / Importar Masivo"** (Carga y descarga de nóminas completas).
- **Acciones por Estudiante en la Tabla:**
  - 👁️ **Ver/Editar Ficha Completa (`StudentWindow.tsx`):** Ventana modal multinivel con 4 secciones:
    - *Sección 1:* Datos personales del alumno, RUT/documento, fecha nacimiento, dirección, salud, prioridades SEP, becas, PIE, retiro.
    - *Sección 2:* Datos del Apoderado Titular (RUT, nombre, parentesco, ocupación, nivel educacional, teléfono, dirección).
    - *Sección 3:* Datos del Apoderado Suplente.
    - *Sección 4:* Registro de observaciones/anotaciones del estudiante.
  - 🔄 **Cambiar de Curso:** Permite trasladar de nivel a un alumno.
  - 🚫 **Retirar Estudiante:** Marca al alumno como `Withdrawn` registrando fecha de retiro.
  - ✅ **Reincorporar Estudiante:** Restablece a un alumno retirado a estado `Active`.
  - 🗑️ **Eliminar Estudiante:** Borra permanentemente el registro previa confirmación.

#### 3. Pestaña `Libro de Clases: Calificaciones` (`grades`)
- **Descripción:** Planilla de notas masiva e interactiva estilo hoja de cálculo (`GradesSheet.tsx`).
- **Componentes y Funciones:**
  - **Filtros Encabezado:** Selección de Año Lectivo, Nivel y Asignatura.
  - **Tabla de Calificaciones Dinámica (`GradesGrid.tsx`):**
    - Filas: Alumnos ordenados por `list_number` y nombre.
    - Columnas: Evaluaciones agregadas dinámicamente ("N1", "N2", "N3"...).
    - **Ponderaciones:** Cada columna permite asignar un porcentaje de peso (0-100%).
    - **Cálculo de Promedio:** Promedio ponderado o aritmético calculated en tiempo real en la celda final `PROM`.
    - **Gradiente Visual de Notas:** Colores diferenciados para notas insuficientes (< 4.0 en rojo) y aprobadas (>= 4.0 en azul/verde).
    - **Autoguardado:** Las notas modificadas se envían al backend con validación inmediata.
    - **Bloqueo:** Indicador de candado si la asignatura/período está cerrado por administración.

#### 4. Pestaña `Panorama de Notas` (`overview`)
- **Descripción:** Dashboard de rendimiento académico global (`GradesOverview.tsx`).
- **Características:**
  - Matriz comparativa de promedios generales por Curso y Asignatura.
  - Indicador visual de asignaturas sin calificaciones ingresadas.
  - Promedio de curso global y porcentaje de aprobación.
  - Exportación de resumen de rendimiento.

#### 5. Pestaña `Control y Auditoría` (`audit`)
- **Descripción:** Registro inalterable de auditoría del sistema ("Silent-Watch").
- **Columnas de Tabla:**
  - Fecha/Hora exactas.
  - Usuario / RUT que realizó la acción.
  - Tipo de Acción (`LOGIN`, `UPDATE_GRADE`, `DELETE_STUDENT`, `CREATE_USER`, etc.).
  - Detalles exactos del cambio.
  - Nivel / Asignatura impactada.
- **Filtros:** Buscador por palabra clave, usuario o rango de fechas.

#### 6. Pestaña `Configuración` (`config`)
Contiene 9 sub-módulos administrativos fundamentales:

- **6.1 Cursos (`courses`):**
  - Lista de Niveles/Cursos.
  - Modificación de capacidad total de vacantes (`total_capacity`).
  - Visualización de matrícula actual asignada.

- **6.2 Asignaturas (`subjects`):**
  - Crear nuevas asignaturas.
  - Editar nombre de asignaturas existentes.
  - Eliminar asignaturas (con validación de seguridad `checkSubjectGrades` para no borrar asignaturas con notas registradas).

- **6.3 Profesores y Usuarios (`teachers`):**
  - Alta de usuarios (Docentes, Administrativos, Visita).
  - Formulario con RUT, Nombre, Email, Rol y Contraseña inicial.
  - **Visualización de Contraseñas:** Permite a administradores consultar `password_plain` para asistencia a usuarios con olvido de clave.
  - Restablecimiento de contraseña y eliminación de usuarios.

- **6.4 Asignación Docente (`assignments`):**
  - Mapeo triple: Asignar un Profesor + Nivel + Asignatura para un Año Lectivo.
  - Lista de asignaciones vigentes y opción de eliminación.

- **6.5 Profesor Jefe (`homeroom`):**
  - Asignar o cambiar el Profesor Jefe responsable de cada Nivel.

- **6.6 Orden de Asignaturas (`subject_order`):**
  - Configurar el orden estricto de aparición de las materias en los certificados e informes oficiales.

- **6.7 Plantillas de Informes (`templates`):**
  - Crear y personalizar criterios de evaluación cualitativa para informes de personalidad.

- **6.8 Cierre de Semestre / Bloqueos (`grades_lock`):**
  - Control de bloqueos de edición de notas para docentes.
  - Cierre Global del sistema para 1er o 2do Semestre.
  - Cierre individual por Nivel o Asignatura.

- **6.9 Enlaces Externos (`external_links`):**
  - Administrar links institucionales de acceso rápido visibles en el panel de los docentes.

#### 7. Pestaña `Reportes Institucionales` (`reports`)
- **Ficha Oficial de Matrícula (`OfficialEnrollmentForm.tsx`):** Renderiza el documento oficial FIDE/MINEDUC listo para impresión o PDF con firma de apoderado.
- **Informe de Notas Oficial:** Genera la concentración de notas por estudiante o nivel completo.
- **Informe Parvularia / Kinder (`KinderReportForm.tsx` / `PrintableKinderReport.tsx`):** Emite el reporte cualitativo del desarrollo integral en Educación Parvularia.

#### 8. Pestaña `Mi Cuenta` (`profile`)
- Cambio seguro de clave del administrador autenticado.

---

### B. Panel Docente (`TeacherDashboard.tsx`)

Diseñado para profesores con permisos acotados a sus cursos y asignaturas asignadas.

```
Panel Docente
├── 1. Mis Cursos (courses) / Inicio (home)
├── 2. Informe de Personalidad (homeroom) [Solo Profesores Jefes]
├── 3. Registro de Observaciones (observations)
├── 4. Horario / Enlaces Institucionales (schedule)
├── 5. Panorama de Notas (overview)
└── 6. Mi Cuenta (profile)
```

#### 1. `Mis Cursos` (`courses`)
- Muestra en vista Grid o Lista las asignaciones del profesor.
- Acceso directo al ingreso de notas de sus asignaturas.

#### 2. `Informe de Personalidad` (`homeroom`)
- Accesible únicamente si el docente es Profesor Jefe del curso seleccionado.
- Permite llenar las pautas de evaluación cualitativa semestrales.

#### 3. `Registro de Observaciones` (`observations`)
- Ingreso de observaciones conductuales (Positivas/Negativas) en la bitácora del alumno.

#### 4. `Horario / Enlaces` (`schedule`)
- Muestra los accesos institucionales creados por el administrador.

#### 5. `Panorama de Notas` (`overview`)
- Muestra el rendimiento general restringido al curso donde es Profesor Jefe.

#### 6. `Mi Cuenta` (`profile`)
- Cambio de contraseña del docente.

---

## 4. Reglas de Negocio y Algoritmos Relevantes

1. **Cálculo de Promedio de Notas:**
   - Si existen columnas con ponderación (`weighting > 0`), el promedio se calcula mediante suma ponderada:
     $$\text{Promedio} = \sum (\text{Nota}_i \times \frac{\text{Peso}_i}{100})$$
   - Si no hay pesos definidos, se utiliza el promedio aritmético simple redondeado a 1 decimal.
2. **Sistema de Bloqueos de Calificaciones:**
   - La tabla `grades_locks` valida en cada intento de guardado (`saveGrade` o `saveGradesSheet`) si la combinación Nivel + Asignatura + Semestre está bloqueada. Si lo está, el backend rechaza la petición con HTTP 403.
3. **Modo Visita (Read-Only):**
   - En el middleware de autenticación `authMiddleware`, si `user.role === 'Visita'`, cualquier método que no sea `GET` (`POST`, `PUT`, `DELETE`, `PATCH`) es bloqueado automáticamente.
4. **Auditoría "Silent-Watch":**
   - Cualquier modificación sensible (edición de notas, eliminación de estudiantes, cambios de clave) inserta automáticamente un registro estructurado en `audit_logs`.

---

## 5. Guía de Configuración y Variables de Entorno para Réplica

### 5.1 Backend `.env`
```env
PORT=3000
DATABASE_URL=postgresql://postgres.xxx:password@aws-0-region.pooler.supabase.com:6543/postgres
JWT_SECRET=super-secret-key-liceo-pro
NODE_ENV=production
```

### 5.2 Pasos para Replicar la Aplicación desde Cero
1. **Crear Base de Datos PostgreSQL (Supabase):**
   - Ejecutar el script SQL completo contenido en `supabase_schema.sql`.
2. **Configurar Backend:**
   - Clonar el directorio `backend/`.
   - Ejecutar `npm install`.
   - Configurar el archivo `.env` con la URL de Supabase y el `JWT_SECRET`.
   - Ejecutar `npm run build` y `npm start`.
3. **Configurar Frontend:**
   - Clonar el directorio `frontend/`.
   - Ejecutar `npm install`.
   - Configurar `vite.config.ts` o la URL base del backend en las peticiones API.
   - Ejecutar `npm run build` para producción.

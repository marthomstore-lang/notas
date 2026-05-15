-- SQLite Schema

-- Tabla de Usuarios (RBAC)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    run TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT CHECK (role IN ('Admin', 'Docente', 'Administrativo', 'Apoderado')) NOT NULL,
    temp_password BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_run ON users(run);

-- Tabla de Niveles/Cursos
CREATE TABLE IF NOT EXISTS levels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    total_capacity INTEGER NOT NULL,
    current_enrolled INTEGER DEFAULT 0
);

-- Tabla de Asignaturas
CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
);

-- Tabla de Asignación Docente
CREATE TABLE IF NOT EXISTS teacher_assignments (
    id TEXT PRIMARY KEY,
    teacher_id TEXT REFERENCES users(id),
    level_id INTEGER REFERENCES levels(id),
    subject_id INTEGER REFERENCES subjects(id),
    academic_year INTEGER NOT NULL,
    UNIQUE(teacher_id, level_id, subject_id, academic_year)
);

-- 1. Tabla de Estudiantes (Sección 1 y 2)
CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    run TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    birth_date TEXT,
    gender TEXT,
    nationality TEXT,
    marital_status TEXT,
    religion TEXT,
    has_religion BOOLEAN DEFAULT 0,
    ethnicity TEXT,
    address TEXT,
    region TEXT,
    commune TEXT,
    postal_code TEXT,
    previous_school TEXT,
    phone TEXT,
    mobile_phone TEXT,
    phone_type TEXT,
    email TEXT,
    email_type TEXT,
    health_system TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    enrollment_number TEXT,
    enrollment_date TEXT,
    incorporation_date TEXT,
    entry_year INTEGER,
    pie_program BOOLEAN DEFAULT 0,
    pie_diagnosis TEXT,
    differential_group BOOLEAN DEFAULT 0,
    is_repeater BOOLEAN DEFAULT 0,
    uses_mineduc_texts BOOLEAN DEFAULT 1,
    indigenous_origin TEXT,
    is_priority BOOLEAN DEFAULT 0,
    is_preferential BOOLEAN DEFAULT 0,
    is_vulnerable BOOLEAN DEFAULT 0,
    is_high_vulnerability BOOLEAN DEFAULT 0,
    scholarship_indigenous BOOLEAN DEFAULT 0,
    scholarship_president BOOLEAN DEFAULT 0,
    scholarship_retention BOOLEAN DEFAULT 0,
    scholarship_junaeb BOOLEAN DEFAULT 0,
    scholarship_other TEXT,
    lives_with TEXT,
    lives_with_other TEXT,
    family_members INTEGER,
    total_siblings INTEGER,
    school_siblings INTEGER,
    school_age_siblings INTEGER,
    liceo_siblings INTEGER,
    sibling_position INTEGER,
    status TEXT DEFAULT 'Active',
    entry_date TEXT,
    observaciones TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_students_run ON students(run);

-- 2. Tabla de Apoderados (Sección 3)
CREATE TABLE IF NOT EXISTS guardians (
    id TEXT PRIMARY KEY,
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    guardian_type TEXT NOT NULL, -- 'Titular' or 'Suplente'
    run TEXT NOT NULL,
    full_name TEXT NOT NULL,
    first_name TEXT,
    paternal_surname TEXT,
    maternal_surname TEXT,
    birth_date TEXT,
    gender TEXT,
    marital_status TEXT,
    relationship TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    region TEXT,
    commune TEXT,
    postal_code TEXT,
    education_level TEXT,
    occupation TEXT,
    health_system TEXT,
    is_health_load BOOLEAN DEFAULT 0,
    is_financial_guardian BOOLEAN DEFAULT 0,
    is_main_guardian BOOLEAN DEFAULT 0
);

-- 3. Tabla de Salud y Observaciones (Sección 4)
CREATE TABLE IF NOT EXISTS health_records (
    id TEXT PRIMARY KEY,
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    blood_type TEXT,
    allergies TEXT,
    chronic_diseases TEXT,
    general_observations TEXT
);

-- Tabla de Matrículas (Histórico/Asignación de curso)
CREATE TABLE IF NOT EXISTS enrollments (
    id TEXT PRIMARY KEY,
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    level_id INTEGER REFERENCES levels(id),
    academic_year INTEGER NOT NULL,
    status TEXT DEFAULT 'Active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, academic_year)
);

-- Columnas de Evaluación
CREATE TABLE IF NOT EXISTS grade_columns (
    id TEXT PRIMARY KEY,
    level_id INTEGER REFERENCES levels(id),
    subject_id INTEGER REFERENCES subjects(id),
    academic_year INTEGER NOT NULL,
    title TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Calificaciones
CREATE TABLE IF NOT EXISTS grades (
    id TEXT PRIMARY KEY,
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    grade_column_id TEXT REFERENCES grade_columns(id) ON DELETE CASCADE,
    grade_value REAL CHECK (grade_value >= 1.0 AND grade_value <= 7.0),
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, grade_column_id)
);

-- Tabla de Aceptación de Reglamento
CREATE TABLE IF NOT EXISTS regulatory_acceptances (
    id TEXT PRIMARY KEY,
    user_id TEXT, -- Puede ser apoderado o alumno
    accepted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT NOT NULL,
    regulation_version TEXT NOT NULL
);

-- Tabla de Observaciones (Libro de Vida)
CREATE TABLE IF NOT EXISTS observations (
    id TEXT PRIMARY KEY,
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    teacher_id TEXT REFERENCES users(id),
    content TEXT NOT NULL,
    type TEXT CHECK (type IN ('Positive', 'Negative')) DEFAULT 'Positive',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Asistencia
CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    level_id INTEGER REFERENCES levels(id),
    status TEXT CHECK (status IN ('Present', 'Absent', 'Justified')) DEFAULT 'Present',
    date TEXT NOT NULL, -- Format YYYY-MM-DD
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, date)
);

-- Tabla de Auditoría "Silent-Watch"
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    table_name TEXT NOT NULL,
    action_type TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    action_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(action_timestamp);

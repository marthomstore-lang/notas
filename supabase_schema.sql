-- PostgreSQL Schema for Supabase

-- Table for Users (RBAC)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    run TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    password_plain TEXT,
    role TEXT CHECK (role IN ('Admin', 'Docente', 'Administrativo', 'Apoderado', 'Visita')) NOT NULL,
    temp_password BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_run ON users(run);

-- Table for Levels
CREATE TABLE IF NOT EXISTS levels (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    total_capacity INTEGER NOT NULL,
    current_enrolled INTEGER DEFAULT 0
);

-- Table for Subjects
CREATE TABLE IF NOT EXISTS subjects (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL
);

-- Table for Teacher Assignments
CREATE TABLE IF NOT EXISTS teacher_assignments (
    id TEXT PRIMARY KEY,
    teacher_id TEXT REFERENCES users(id),
    level_id INTEGER REFERENCES levels(id),
    subject_id INTEGER REFERENCES subjects(id),
    academic_year INTEGER NOT NULL,
    UNIQUE(teacher_id, level_id, subject_id, academic_year)
);

-- Table for Students
CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    run TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    birth_date TEXT,
    gender TEXT,
    nationality TEXT,
    marital_status TEXT,
    religion TEXT,
    has_religion BOOLEAN DEFAULT FALSE,
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
    pie_program BOOLEAN DEFAULT FALSE,
    pie_diagnosis TEXT,
    differential_group BOOLEAN DEFAULT FALSE,
    is_repeater BOOLEAN DEFAULT FALSE,
    uses_mineduc_texts BOOLEAN DEFAULT TRUE,
    indigenous_origin TEXT,
    is_priority BOOLEAN DEFAULT FALSE,
    is_preferential BOOLEAN DEFAULT FALSE,
    is_vulnerable BOOLEAN DEFAULT FALSE,
    is_high_vulnerability BOOLEAN DEFAULT FALSE,
    scholarship_indigenous BOOLEAN DEFAULT FALSE,
    scholarship_president BOOLEAN DEFAULT FALSE,
    scholarship_retention BOOLEAN DEFAULT FALSE,
    scholarship_junaeb BOOLEAN DEFAULT FALSE,
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
    list_number INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_students_run ON students(run);

-- Table for Guardians
CREATE TABLE IF NOT EXISTS guardians (
    id TEXT PRIMARY KEY,
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    guardian_type TEXT NOT NULL, 
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
    is_health_load BOOLEAN DEFAULT FALSE,
    is_financial_guardian BOOLEAN DEFAULT FALSE,
    is_main_guardian BOOLEAN DEFAULT FALSE
);

-- Table for Enrollments
CREATE TABLE IF NOT EXISTS enrollments (
    id TEXT PRIMARY KEY,
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    level_id INTEGER REFERENCES levels(id),
    academic_year INTEGER NOT NULL,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, academic_year)
);

-- Table for Grade Columns
CREATE TABLE IF NOT EXISTS grade_columns (
    id TEXT PRIMARY KEY,
    level_id INTEGER REFERENCES levels(id),
    subject_id INTEGER REFERENCES subjects(id),
    academic_year INTEGER NOT NULL,
    title TEXT NOT NULL,
    position INTEGER,
    weighting NUMERIC(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for Grades
CREATE TABLE IF NOT EXISTS grades (
    id TEXT PRIMARY KEY,
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    grade_column_id TEXT REFERENCES grade_columns(id) ON DELETE CASCADE,
    grade_value NUMERIC(3,1) CHECK (grade_value >= 1.0 AND grade_value <= 7.0),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, grade_column_id)
);

-- Table for Observations
CREATE TABLE IF NOT EXISTS observations (
    id TEXT PRIMARY KEY,
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    teacher_id TEXT REFERENCES users(id),
    content TEXT NOT NULL,
    type TEXT CHECK (type IN ('Positive', 'Negative')) DEFAULT 'Positive',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    user_name TEXT,
    action TEXT,
    details TEXT,
    level_id TEXT,
    subject_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(created_at);

-- Institutional Settings
CREATE TABLE IF NOT EXISTS institutional_settings (
    id SERIAL PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL
);

-- Homeroom Teachers
CREATE TABLE IF NOT EXISTS homeroom_teachers (
    id SERIAL PRIMARY KEY,
    level_id INTEGER REFERENCES levels(id),
    teacher_id TEXT REFERENCES users(id),
    academic_year INTEGER NOT NULL,
    UNIQUE(level_id, academic_year)
);

-- Personality Reports
CREATE TABLE IF NOT EXISTS personality_reports (
    id TEXT PRIMARY KEY,
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    teacher_id TEXT REFERENCES users(id),
    level_id INTEGER REFERENCES levels(id),
    academic_year INTEGER,
    semester INTEGER,
    report_type TEXT,
    evaluation_data JSONB,
    observations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, academic_year, semester, report_type)
);

-- Seed default Admin user (RUT: 18803735-6, Contraseña: 182011)
INSERT INTO users (id, run, name, email, password_hash, password_plain, role, temp_password)
VALUES (
    'admin-new',
    '18803735-6',
    'Administrador Sistema',
    'admin@liceo.cl',
    '$2b$10$BRtLlL10t08VpANbSFRWZenx9V8oM1nn/NF.jYsoRaCHG1U3iddra',
    '182011',
    'Admin',
    FALSE
) ON CONFLICT (run) DO NOTHING;


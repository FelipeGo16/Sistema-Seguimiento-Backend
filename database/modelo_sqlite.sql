PRAGMA foreign_keys = ON;

CREATE TABLE CAT_LOCALIDAD (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    estado TEXT CHECK(estado IN ('Activo', 'Inactivo')) DEFAULT 'Activo'
);

CREATE TABLE CAT_CDC (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    localidad_id INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    estado TEXT CHECK(estado IN ('Activo', 'Inactivo')) DEFAULT 'Activo',
    FOREIGN KEY (localidad_id) REFERENCES CAT_LOCALIDAD(id) ON DELETE RESTRICT
);

CREATE TABLE CAT_EQUIPAMIENTO (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cdc_id INTEGER NOT NULL,
    tipo TEXT NOT NULL,
    codigo_enumerado TEXT NOT NULL,
    ocupacion_servicio TEXT,
    ocupacion_subdireccion TEXT,
    uso_equipamiento TEXT,
    estado TEXT CHECK(estado IN ('Activo', 'Inactivo', 'Cerrado Temporalmente')) DEFAULT 'Activo',
    motivo_cierre TEXT,
    capacidad INTEGER NOT NULL CHECK(capacidad > 0),
    observaciones TEXT,
    fecha_vigencia DATE,
    equipamiento_padre_id INTEGER,
    FOREIGN KEY (cdc_id) REFERENCES CAT_CDC(id) ON DELETE RESTRICT,
    FOREIGN KEY (equipamiento_padre_id) REFERENCES CAT_EQUIPAMIENTO(id) ON DELETE SET NULL
);

CREATE TABLE CAT_HORARIO (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipamiento_id INTEGER NOT NULL,
    dia_semana TEXT CHECK(dia_semana IN ('Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo')),
    disponibilidad TEXT CHECK(disponibilidad IN ('Disponible', 'No Disponible')) DEFAULT 'Disponible',
    hora_apertura TEXT NOT NULL,
    hora_cierre TEXT NOT NULL,
    vigencia DATE,
    FOREIGN KEY (equipamiento_id) REFERENCES CAT_EQUIPAMIENTO(id) ON DELETE CASCADE
);

CREATE TABLE TBL_CURSO (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    componente_servicio TEXT NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    asistentes_estimados INTEGER CHECK(asistentes_estimados >= 0)
);

CREATE TABLE TBL_SESION (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    curso_id INTEGER NOT NULL,
    equipamiento_id INTEGER NOT NULL,
    fecha_sesion DATE NOT NULL,
    dia_semana TEXT,
    hora_inicio TEXT NOT NULL,
    hora_fin TEXT NOT NULL,
    asistentes_reales INTEGER CHECK(asistentes_reales >= 0),
    estado_sesion TEXT CHECK(estado_sesion IN ('Programada', 'Realizada', 'Cancelada')) DEFAULT 'Programada',
    motivo TEXT,
    observaciones TEXT,
    FOREIGN KEY (curso_id) REFERENCES TBL_CURSO(id) ON DELETE CASCADE,
    FOREIGN KEY (equipamiento_id) REFERENCES CAT_EQUIPAMIENTO(id) ON DELETE RESTRICT
);

CREATE TABLE TBL_AUDITORIA (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT NOT NULL,
    tabla_afectada TEXT NOT NULL,
    registro_id INTEGER NOT NULL,
    campo TEXT NOT NULL,
    valor_anterior TEXT,
    valor_nuevo TEXT,
    fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP
);

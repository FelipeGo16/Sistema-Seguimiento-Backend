const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});

app.use(cors({
  origin: ['https://sistemasequipamientos.netlify.app', 'http://localhost:4200'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'x-user-rol']
}));
app.use(express.json());

// Conexión e Inicialización Automática de SQLite
const dbPath = path.join(__dirname, "database", "equipamientos.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("❌ Error al conectar a SQLite:", err.message);
  } else {
    console.log("💾 Conectado exitosamente a la base de datos SQLite.");
    db.run("PRAGMA foreign_keys = ON;"); // Activa integridad referencial
    // CÓDIGO TEMPORAL (Insértalo dentro del callback de la conexión, justo antes de inicializarBaseDeDatos())
db.run("ALTER TABLE CAT_EQUIPAMIENTO ADD COLUMN Localidad VARCHAR;", (err) => {
    if (!err) console.log("✔ Columna 'Localidad' añadida con éxito a la tabla existente.");
});
db.run("ALTER TABLE CAT_EQUIPAMIENTO ADD COLUMN CDC VARCHAR;", (err) => {
    if (!err) console.log("✔ Columna 'CDC' añadida con éxito a la tabla existente.");
});

    inicializarBaseDeDatos(); // <- Crea las tablas automáticamente si no existen
  }
});

// Función para auto-crear el esquema relacional estructurado
function inicializarBaseDeDatos() {
    db.serialize(() => {
        // 1. Tabla Localidades
        db.run(`CREATE TABLE IF NOT EXISTS CAT_LOCALIDAD (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            estado TEXT CHECK(estado IN ('Activo', 'Inactivo')) DEFAULT 'Activo'
        )`);

        // 2. Tabla CDC
        db.run(`CREATE TABLE IF NOT EXISTS CAT_CDC (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            localidad_id INTEGER NOT NULL,
            nombre TEXT NOT NULL,
            estado TEXT CHECK(estado IN ('Activo', 'Inactivo')) DEFAULT 'Activo',
            FOREIGN KEY (localidad_id) REFERENCES CAT_LOCALIDAD(id) ON DELETE RESTRICT
        )`);

        // 3. Tabla Equipamientos
        db.run(`CREATE TABLE IF NOT EXISTS CAT_EQUIPAMIENTO (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cdc_id INTEGER NOT NULL,
            Localidad VARCHAR NOT NULL,
            CDC VARCHAR NOT NULL,
            tipo TEXT NOT NULL,
            codigo_enumerado TEXT NOT NULL,
            ocupacion_servicio TEXT,
            ocupacion_subdireccion TEXT,
            uso_equipamiento TEXT,
            estado TEXT CHECK(estado IN ('ABIERTO', 'CERRADO', 'Activo', 'Inactivo', 'Cerrado Temporalmente')) DEFAULT 'ABIERTO',
            motivo_cierre TEXT,
            capacidad INTEGER NOT NULL CHECK(capacidad > 0),
            observaciones TEXT,
            fecha_vigencia DATE,
            equipamiento_padre_id INTEGER,
            FOREIGN KEY (cdc_id) REFERENCES CAT_CDC(id) ON DELETE RESTRICT,
            FOREIGN KEY (equipamiento_padre_id) REFERENCES CAT_EQUIPAMIENTO(id) ON DELETE SET NULL
        )`);

        // 4. Resto de Tablas Operativas
        db.run(`CREATE TABLE IF NOT EXISTS TBL_CURSO (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            componente_servicio TEXT NOT NULL,
            fecha_inicio DATE NOT NULL,
            fecha_fin DATE NOT NULL,
            asistentes_estimados INTEGER CHECK(asistentes_estimados >= 0)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS TBL_SESION (
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
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS TBL_AUDITORIA (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario TEXT NOT NULL,
            tabla_afectada TEXT NOT NULL,
            registro_id INTEGER NOT NULL,
            campo TEXT NOT NULL,
            valor_anterior TEXT,
            valor_nuevo TEXT,
            fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS TBL_USUARIO (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT NOT NULL UNIQUE,
    rol TEXT NOT NULL CHECK(rol IN ('Nivel Central', 'Equipo Local', 'Administrador')),
    contrasena TEXT NOT NULL,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
)`);


        console.log('✔ Estructura de tablas verificada.');

        // =========================================================
        // INYECCIÓN AUTOMÁTICA DE REGISTROS BASE PARA LLAVES FORÁNEAS
        // =========================================================
        
        // Verificar si existen localidades, si no, crear la primera con ID 1
        db.get("SELECT COUNT(*) AS total FROM CAT_LOCALIDAD", [], (err, row) => {
            if (!err && row.total === 0) {
                db.run("INSERT INTO CAT_LOCALIDAD (id, nombre, estado) VALUES (1, 'BOSA', 'Activo')", () => {
                    console.log('📌 Registro base inyectado: CAT_LOCALIDAD (ID: 1 - BOSA)');
                    
                    // Inmediatamente después, verificar e insertar el CDC base amarrado a esa localidad (ID 1)
                    db.get("SELECT COUNT(*) AS total FROM CAT_CDC", [], (cdcErr, cdcRow) => {
                        if (!cdcErr && cdcRow.total === 0) {
                            db.run("INSERT INTO CAT_CDC (id, localidad_id, nombre, estado) VALUES (1, 1, 'CDC PORVENIR', 'Activo')", () => {
                                console.log('📌 Registro base inyectado: CAT_CDC (ID: 1 - CDC PORVENIR)');
                            });
                        }
                    });
                });
            } else {
                // Si la localidad ya existía, asegurar que al menos haya un CDC registrado
                db.get("SELECT COUNT(*) AS total FROM CAT_CDC", [], (cdcErr, cdcRow) => {
                    if (!cdcErr && cdcRow.total === 0) {
                        db.run("INSERT INTO CAT_CDC (id, localidad_id, nombre, estado) VALUES (1, 1, 'CDC PORVENIR', 'Activo')", () => {
                            console.log('📌 Registro base inyectado: CAT_CDC (ID: 1 - CDC PORVENIR)');
                        });
                    }
                });
            }
        });
    });
}


// ==========================================
// 1. ENDPOINT HOMOLOGADO: CORREGIDO (Node.js)
// ==========================================
app.post("/api/equipamientos", (req, res) => {
  const {
    cdc_id,
    localidad, 
    cdc,
    tipo,
    codigo_enumerated,
    ocupacion_servicio,
    ocupacion_subdireccion,
    uso_equipamiento,
    estado,
    motivo_cierre,
    capacidad,
    observaciones,
    fecha_vigencia,
    usuario,
  } = req.body;

  let estadoHomologado = 'Activo';
  if (estado === 'CERRADO') {
    estadoHomologado = 'Cerrado Temporalmente';
  } else if (estado === 'INACTIVO') {
    estadoHomologado = 'Inactivo';
  }

  // CORRECCIÓN AQUÍ: Se cambiaron las columnas a minúsculas 'localidad, cdc'
  const sql = `INSERT INTO CAT_EQUIPAMIENTO 
        (cdc_id, tipo, codigo_enumerado, ocupacion_servicio, ocupacion_subdireccion, uso_equipamiento, estado, motivo_cierre, capacidad, observaciones, fecha_vigencia, localidad, cdc) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const params = [
    cdc_id || 1,
    tipo,
    codigo_enumerated,
    ocupacion_servicio,
    ocupacion_subdireccion,
    uso_equipamiento,
    estadoHomologado, 
    motivo_cierre || null,
    capacidad,
    observaciones || null,
    fecha_vigencia,
    localidad, 
    cdc                 
  ];

  db.run(sql, params, function (err) {
    if (err) {
      console.error("❌ Error directo en SQLite:", err.message);
      return res.status(500).json({ error: err.message });
    }

    const nuevoId = this.lastID;
    console.log(`💾 Registro insertado en CAT_EQUIPAMIENTO con ID: ${nuevoId}`);

    const sqlAuditoria = `INSERT INTO TBL_AUDITORIA (usuario, tabla_afectada, registro_id, campo, valor_anterior, valor_nuevo) 
                          VALUES (?, 'CAT_EQUIPAMIENTO', ?, 'ESTRUCTURA_COMPLETA', NULL, 'Registro Inicial Creado')`;

    db.run(sqlAuditoria, [usuario || "Sistema Central", nuevoId], (auditErr) => {
      if (auditErr) console.error("⚠️ Error al generar auditoría:", auditErr.message);
    });

    res.status(201).json({ message: "Equipamiento guardado y auditado", id: nuevoId });
  });
});


// ==========================================
// 2. ENDPOINT: REGISTRO DE CURSOS (MÓDULO 2 - NIVEL 1)
// ==========================================
// ==========================================
// ENDPOINT DEFINITIVO: CURSOS Y SESIONES (SIN CANTIDAD_SESIONES)
// ==========================================
// ==========================================
// ENDPOINT HOMOLOGADO: GUARDADO RELACIONAL EXACTO
// ==========================================
app.post("/api/cursos", (req, res) => {
  const {
    idCurso,           // El código de Angular (ej: CRS-0154-7527) ➔ Irá a 'codigo_curso'
    nombreCurso,       // Nombre del curso (ej: Curso 2) ➔ Irá a 'nombre'
    componenteServicio,// Componente ➔ Irá a 'componente_servicio'
    cantidadSesiones,  // Número de sesiones (ej: 1) ➔ Irá a 'cantidad_sesiones'
    fechaInicio,       // Fecha inicio ➔ Irá a 'fecha_inicio'
    fechaFin,          // Fecha fin ➔ Irá a 'fecha_fin'
    asistentes,        // Asistentes estimados ➔ Irá a 'asistentes_estimados'
    sesiones           // Arreglo dinámico de sesiones (Nivel 2)
  } = req.body;

  // 1. Consulta SQL limpia con las 7 columnas mapeadas tal como aparecen en tu SELECT
  const sqlCurso = `
    INSERT INTO TBL_CURSO (nombre, componente_servicio, fecha_inicio, fecha_fin, asistentes_estimados, codigo_curso, cantidad_sesiones)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  // Arreglo ordenado con los 7 parámetros exactos correspondientes a los signos de interrogación (?)
  const paramsCurso = [
    nombreCurso,
    componenteServicio,
    fechaInicio,
    fechaFin,
    asistentes,
    idCurso,                 // 👈 Se guarda limpio en 'codigo_curso'
    Number(cantidadSesiones) // 👈 Convertido a número para la columna 'cantidad_sesiones'
  ];

  db.run(sqlCurso, paramsCurso, function(err) {
    if (err) {
      console.error("❌ Error al insertar en TBL_CURSO:", err.message);
      return res.status(500).json({ error: "Error en cabecera de curso: " + err.message });
    }

    // 2. Extraer el ID entero autoincremental nativo (columna 'id') generado automáticamente por SQLite
    const cursoIdNumerico = this.lastID; 

    // Si el usuario no programó sesiones en la parte inferior, terminamos con éxito inmediatamente
    if (!sesiones || sesiones.length === 0) {
      return res.status(201).json({ message: "Curso guardado con éxito." });
    }

    // 3. Inserción de las sub-sesiones vinculadas por la clave primaria numérica real (id)
    const sqlSesion = `
      INSERT INTO TBL_SESION (
        curso_id, localidad, cdc, tipo_equipamiento, equipamiento_enumerado,
        fecha_sesion, dia_semana, hora_inicio_uso, hora_fin_uso, estado_sesion, motivo, observaciones
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    let sesionesProcesadas = 0;
    let huboError = false;

    sesiones.forEach((s) => {
      if (huboError) return;

      const paramsSesion = [
        cursoIdNumerico, // 👈 Relación perfecta con la clave primaria numérica real
        s.localidad,
        s.cdc,
        s.tipoEquipamiento,
        s.equipamientoEnumerado,
        s.fechaSesion,
        s.diaSemana,
        s.horaInicioUso,
        s.horaFinUso,
        s.estadoSesion,
        s.motivo || null,
        s.observaciones || null
      ];

      db.run(sqlSesion, paramsSesion, (sErr) => {
        sesionesProcesadas++;

        if (sErr) {
          huboError = true;
          console.error("❌ Error en TBL_SESION:", sErr.message);
          return res.status(500).json({ error: "Error al registrar sesión interna: " + sErr.message });
        }

        // 4. Éxito total al guardar todo el listado
        if (sesionesProcesadas === sesiones.length && !huboError) {
          console.log(`💾 Transacción Exitosa. Curso #${cursoIdNumerico} [${idCurso}] guardado con sus ${sesiones.length} sesiones.`);
          return res.status(201).json({ message: "Curso completo y sesiones guardados con éxito." });
        }
      });
    });
  });
});


// ==========================================
// 3. ENDPOINT: REGISTRO DE SESIONES (MÓDULO 2 - NIVEL 2)
// ==========================================
app.post("/api/sesiones", (req, res) => {
  const {
    curso_id,
    equipamiento_id,
    fecha_sesion,
    dia_semana,
    hora_inicio,
    hora_fin,
    asistentes_reales,
    estado_sesion,
    motivo,
    observaciones,
  } = req.body;

  const sql = `INSERT INTO TBL_SESION (curso_id, equipamiento_id, fecha_sesion, dia_semana, hora_inicio, hora_fin, asistentes_reales, estado_sesion, motivo, observaciones) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  db.run(
    sql,
    [
      curso_id,
      equipamiento_id,
      fecha_sesion,
      dia_semana,
      hora_inicio,
      hora_fin,
      asistentes_reales,
      estado_sesion,
      motivo,
      observaciones,
    ],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({
        message: "Sesión operativa vinculada correctamente",
        id: this.lastID,
      });
    },
  );
});

// ==========================================
// 4. ENDPOINT CORREGIDO: CONSULTA DE CALENDARIO REAL
// ==========================================
app.get("/api/calendario", (req, res) => {
  const { localidad, cdc, tipo, fecha, nombreCurso } = req.query;

  // Consulta directa a TBL_SESION y JOIN únicamente con el curso para obtener el nombre real
  let sql = `
        SELECT s.*, c.nombre AS nombre_curso
        FROM TBL_SESION s
        LEFT JOIN TBL_CURSO c ON s.curso_id = c.id
        WHERE 1=1
    `;
  const params = [];

  // CORRECCIÓN: Filtros directos sobre las columnas reales de tu tabla
  if (localidad) {
    sql += ` AND s.localidad LIKE ?`;
    params.push(`%${localidad}%`);
  }
  if (cdc) {
    sql += ` AND s.cdc LIKE ?`;
    params.push(`%${cdc}%`);
  }
  if (tipo) {
    sql += ` AND s.tipo_equipamiento LIKE ?`;
    params.push(`%${tipo}%`);
  }
  if (fecha) {
    sql += ` AND s.fecha_sesion = ?`;
    params.push(fecha);
  }
  if (nombreCurso) {
    sql += ` AND c.nombre LIKE ?`;
    params.push(`%${nombreCurso}%`);
  }

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});


// =================================================================
// SELECTOR DINÁMICO 1: OBTENER CURSOS GUARDADOS CON SU ID UNICO
// =================================================================
app.get('/api/selectores/cursos', (req, res) => {
    // Trae el nombre y la vigencia real de los cursos registrados
    db.all("SELECT id, nombre, fecha_inicio, fecha_fin FROM TBL_CURSO ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// =================================================================
// SELECTOR DINÁMICO 2: OBTENER EQUIPAMIENTOS PARAMETRIZADOS EN M1
// =================================================================
app.get('/api/selectores/equipamientos-activos', (req, res) => {
    const sql = `
        SELECT e.id, e.tipo, e.codigo_enumerado, e.estado,
               cdc.nombre AS nombre_cdc, l.nombre AS nombre_localidad
        FROM CAT_EQUIPAMIENTO e
        JOIN CAT_CDC cdc ON e.cdc_id = cdc.id
        JOIN CAT_LOCALIDAD l ON cdc.localidad_id = l.id
        WHERE e.estado = 'Activo' OR e.estado = 'ABIERTO'
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Función auxiliar para registrar logs de auditoría
function registrarLog(correo, accion, detalle = '') {
  db.run(`INSERT INTO TBL_LOGS (usuario_correo, accion, detalle) VALUES (?, ?, ?)`, [correo, accion, detalle]);
}

// 1. OBTENER TODOS LOS USUARIOS
app.get('/api/usuarios', (req, res) => {
  db.all(`SELECT id, nombre, correo, localidad, perfil, rol FROM TBL_USUARIO`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 2. REGISTRAR NUEVO USUARIO (Sin la columna antigua 'usuario')
app.post('/api/usuarios', (req, res) => {
  const { nombre, correo, localidad, perfil, password, rol, adminCorreo } = req.body;
  
  const sql = `INSERT INTO TBL_USUARIO (nombre, correo, localidad, perfil, password, rol) VALUES (?, ?, ?, ?, ?, ?)`;
  
  db.run(sql, [nombre, correo, localidad, perfil, password, rol], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    
    registrarLog(adminCorreo || 'admin@sistema.com', 'CREAR_USUARIO', `Creó a ${correo} con rol ${rol}`);
    res.json({ id: this.lastID });
  });
});


// 3. RESTAURAR CONTRASEÑA (Botón "Clave")
app.put('/api/usuarios/:id/clave', (req, res) => {
  const { nuevaClave, adminCorreo } = req.body;
  db.run(`UPDATE TBL_USUARIO SET password = ? WHERE id = ?`, [nuevaClave, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    registrarLog(adminCorreo || 'admin@sistema.com', 'RESTAURAR_CLAVE', `Restauró clave del usuario ID ${req.params.id}`);
    res.json({ mensaje: 'Contraseña actualizada' });
  });
});

// 4. ELIMINAR USUARIO
app.delete('/api/usuarios/:id', (req, res) => {
  db.run(`DELETE FROM TBL_USUARIO WHERE id = ?`, [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    registrarLog('admin@sistema.com', 'ELIMINAR_USUARIO', `Eliminó usuario ID ${req.params.id}`);
    res.json({ mensaje: 'Usuario eliminado' });
  });
});

// 5. EXPORTAR BASE DE DATOS FÍSICA (.db / .sqlite)
app.get('/api/admin/exportar-bd', (req, res) => {
  const dbPath = path.join(__dirname, 'database', 'equipamientos.db');
  registrarLog('admin@sistema.com', 'EXPORTAR_BD', 'Descarga de copia de seguridad');
  res.download(dbPath, `respaldo_equipamientos_${Date.now()}.db`);
});

// 6. CONSULTAR LOGS DEL SISTEMA
app.get('/api/admin/logs', (req, res) => {
  db.all(`SELECT * FROM TBL_LOGS ORDER BY fecha DESC LIMIT 100`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

db.serialize(() => {
  // 1. Eliminamos la estructura vieja de TBL_USUARIO que tiene la columna conflictiva
  db.run(`DROP TABLE IF EXISTS TBL_USUARIO`);

  // 2. Creamos la tabla nueva limpia con los campos exactos que necesita tu sistema
  db.run(`CREATE TABLE TBL_USUARIO (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    correo TEXT UNIQUE NOT NULL,
    localidad TEXT NOT NULL,
    perfil TEXT NOT NULL,
    password TEXT NOT NULL,
    rol TEXT NOT NULL,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // 3. Creamos la tabla de auditoría de logs si no existe
  db.run(`CREATE TABLE IF NOT EXISTS TBL_LOGS (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_correo TEXT NOT NULL,
    accion TEXT NOT NULL,
    detalle TEXT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // 4. Insertamos el usuario Administrador por defecto
  const sqlAdmin = `INSERT INTO TBL_USUARIO (nombre, correo, localidad, perfil, password, rol) 
                    VALUES ('Administrador General', 'admin@sistema.com', 'Nivel Nacional (Todas)', 'Nivel Central', 'admin123', 'Administrador')`;
  
  db.run(sqlAdmin, (err) => {
    if (err) {
      console.error("❌ Error insertando admin:", err.message);
    } else {
      console.log("✔ Tabla TBL_USUARIO reconstruida y Administrador listo.");
    }
  });
});

// Crear cuenta Administrador por defecto si no existe ninguna
db.get(`SELECT COUNT(*) as total FROM TBL_USUARIO`, [], (err, row) => {
  if (!err && row.total === 0) {
    const sqlAdmin = `INSERT INTO TBL_USUARIO (nombre, correo, localidad, perfil, password, rol) 
                      VALUES ('Administrador General', 'admin@sistema.com', 'Nivel Nacional (Todas)', 'Nivel Central', 'admin123', 'Administrador')`;
    db.run(sqlAdmin);
  }
});

// ENDPOINT DE INICIO DE SESIÓN REAL
app.post('/api/login', (req, res) => {
  const { correo, password } = req.body;

  const sql = `SELECT id, nombre, correo, localidad, perfil, rol FROM TBL_USUARIO WHERE correo = ? AND password = ?`;
  db.get(sql, [correo, password], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    
    if (!user) {
      registrarLog(correo || 'Desconocido', 'LOGIN_FALLIDO', 'Credenciales incorrectas');
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }

    registrarLog(user.correo, 'INICIO_SESION', `Ingreso exitoso (${user.perfil} - ${user.rol})`);
    
    // Devolvemos los datos estructurados para Angular
    res.json({
      id: user.id,
      username: user.nombre,
      correo: user.correo,
      localidad: user.localidad,
      perfil: user.perfil,
      rol: user.rol
    });
  });
});



// Iniciar Servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
});

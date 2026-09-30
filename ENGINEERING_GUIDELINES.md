# 🚀 Universal Engineering Guidelines (Esquema Base)

## 1. Principios Fundamentales de Ingeniería
- **KISS & YAGNI:** Priorizar soluciones simples y directas. No introducir abstracciones, microservicios, capas intermedias o librerías secundarias sin una necesidad real y demostrada.
- **DRY & Single Responsibility:** Mantener la lógica modular, reutilizable y con responsabilidades claramente delimitadas.
- **Evaluación Costo/Beneficio:** Toda decisión técnica relevante debe sopesar: *Seguridad, Rendimiento, Mantenibilidad, Escalabilidad, Complejidad y Costo Operativo*.
- **Inspección Previa:** Consultar siempre la base de código existente para mantener consistencia con los patrones y convenciones establecidos antes de crear nuevo código.
- **Soluciones Deterministas:** Preferir código determinista sobre lógica difusa o dependencias externas innecesarias.

---

## 2. Arquitectura y Stack Tecnológico Sugerido (Recomendación Base)
*(Nota: Este stack y arquitectura representan el punto de partida recomendado por defecto, pero pueden adaptarse o sustituirse según las necesidades específicas de cada proyecto).*

- **Patrón Arquitectónico:** Monolito Modular como punto de partida recomendado.
- **Backend Sugerido:** Laravel (Framework principal).
- **Frontend Sugerido:** React + TypeScript integrado mediante **Inertia.js** (para una experiencia SPA fluida sin la sobrecarga de mantener una API REST/GraphQL separada para el cliente web principal).
- **Base de Datos Principal:** PostgreSQL.
- **Caché y Colas:** Redis (exclusivamente para colas de trabajo y cargas efímeras que lo justifiquen).
- **Abstracción de Almacenamiento:**
  - Todo archivo o medio debe gestionarse mediante una abstracción de **Filesystem / Disks** (ej. Laravel Storage).
  - **Prohibido acoplar lógica o URLs a rutas físicas absolutas del servidor.** Los discos y URLs deben ser configurables para permitir migración transparente a S3, Bunny, u otros proveedores CDN en el futuro.

---

## 3. Internacionalización (i18n) y Localización (l10n)
- **Separación de Idioma y Mercado:** El idioma (`locale`) controla la traducción de la interfaz. Las reglas territoriales, catálogos o restricciones por país deben gestionarse de forma independiente y no inferirse solo del idioma.
- **Estructura de URLs Públicas:** Usar prefijo explícito de idioma (`/{locale}/...`) para ruteo determinista y SEO.
- **Keywords de Rutas Estables:** Mantener las palabras clave estructurales de las rutas estables (en inglés); localizar los slugs de las entidades y el contenido.

---

## 4. Seguridad, Autenticación y Autorización (RBAC)
- **Control de Acceso (RBAC):** Basado en base de datos mediante roles y permisos (`spatie/laravel-permission` o equivalente en el stack elegido). Las **Policies / Guards** del backend representan la barrera final e infranqueable de autorización.
- **Identificadores Estables:** Nombres de roles y permisos estables en inglés en código; traducir únicamente las etiquetas mostradas en la UI.
- **Modelo de Usuario Unificado:** Utilizar un modelo de usuario principal (`User`). Separar estrictamente los componentes, layouts y rutas del Panel de Administración versus la Interfaz Pública.
- **Seguridad en UI:** Todo campo de contraseña debe usar un componente compartido con botón accesible para mostrar/ocultar texto.

---

## 5. Modelado de Datos y Catálogos Generalizables
- **Taxonomías Polimórficas:** Clasificaciones y etiquetas (tags) deben usar asignaciones polimórficas con alias estables (`morphMap`), evitando guardar nombres de clases del lenguaje en la base de datos.
- **Visibilidad:** Mantener independiente la disponibilidad para editores/administradores (`is_active`) de la exposición pública (`is_public`).
- **Catálogos Extensos:** Usar búsquedas servidor mediante componentes **Combobox** para catálogos grandes (ej. Países ISO 3166-1 e Idiomas ISO 639-1), priorizando elementos comunes y ofreciendo filtrado instantáneo.

---

## 6. Sistema de Diseño y Estándares UI/UX
- **Iconografía Monocromática:** **No utilizar emojis del sistema ni iconos multicolores realistas.** Utilizar exclusivamente iconos SVG monocromáticos (de línea o relleno usando `currentColor` o la paleta del tema).
- **Navegación Admin Jerárquica:** Estructurar menús con submenús/vistas anidadas cuando un dominio abarque múltiples ámbitos (ej. Analíticas vs. Listado, o Catálogo vs. Herramientas de Creación).
- **Gestión de Navegación SPA:** Cancelar/liberar conexiones activas o transmisiones al navegar en el cliente mediante los eventos del ciclo de vida de la navegación frontend.

---

## 7. Estrategia Git y Control de Versiones
- **Rama Principal:** `main` representa siempre el estado de Producción.
- **Flujo de Ramas:** Trabajar siempre desde ramas con prefijo `feature/`. Para parches urgentes de producción, usar `hotfix/`.
- **Commits Granulares:** Realizar un `git commit` descriptivo e inmediato tras completar cada tarea o hito.
- **Sincronización:** Antes de iniciar nuevo trabajo local, asegurar alineación con la rama remota (`git pull --ff-only origin main`).

---

## 8. Protocolo de Despliegue en Producción (Runbook)
- **Servidor como Destino:** El servidor de producción es un destino de despliegue, no un entorno para modificar código directamente.
- **Verificación y Backups:** Antes de desplegar cambios con migraciones o cambios estructurales, verificar `git status` y generar respaldo de la base de datos.
- **Verificación Post-Despliegue:** Tras el despliegue, ejecutar optimizaciones de caché, reiniciar workers/supervisores y validar con comprobaciones de estado de salud del sistema y pruebas de humo.

---

## 9. Especificaciones del Proyecto: TeachingSystem

### 9.1 Visión General
**TeachingSystem** es una herramienta de gestión pedagógica orientada a docentes e instituciones educativas para planificar, registrar y supervisar el avance de temas dictados, adaptándose a restricciones físicas reales (ej. aulas/laboratorios de computación con capacidad de equipos limitada frente al total de estudiantes).

---

### 9.2 Pilares Arquitectónicos y Dominio Refinado

#### A. Separación de Cobertura vs. Aprendizaje
El sistema registra dos dimensiones totalmente independientes para evitar ambigüedades pedagógicas:
- **Dimensión Cobertura (El estudiante recibió la clase):** `Pendiente`, `Explicado / Asistido`.
- **Dimensión Aprendizaje / Dominio (Evidencia de comprensión opcional):** `Sin Evaluar`, `Requiere Refuerzo`, `Logrado / Dominado`.

#### B. Modelo de Institución Multi-Docente & Membresías
- **Jerarquía:** `Usuario (Docente/Admin) ↔ Membresía Institucional → Cursos ↔ Docentes Asignados`.
- Múltiples docentes pueden colaborar en una misma institución con permisos asignados.
- Los **Estudiantes** pertenecen a la Institución, y las **Matrículas (`enrollments`)** relacionan al estudiante con un Curso y un Período Académico específico. El historial del estudiante se preserva al archivar el curso.

#### C. Banco Global de Temas con Snapshot en Pensum
- **Banco Global de Temas:** Repositorio central reutilizable con prerrequisitos opcionales entre temas.
- **Snapshot en Pensum (`course_topics`):** Al asignar temas del banco al pensum de un curso, se copia una captura (snapshot) de los datos relevantes. Modificar un tema global no altera silenciosamente el historial de clases ya dictadas.

#### D. Modelo Granular de Sesiones y Participación
- **`class_sessions`:** Fecha, curso, período/horario, notas, estado (`borrador`, `cerrada`).
- **`session_topics`:** Temas del pensum impartidos en dicha sesión.
- **`session_attendances`:** Participantes con asignación opcional de puesto/equipo (soporta puestos compartidos).
- **Acreditación Estudiante-Tema:** Acreditación granular de qué estudiante específico recibió cada tema dentro de la sesión (con selección previa masiva y ajuste por excepción). Operaciones atómicas en BD (transacciones).

#### E. Motor Determinista de Sugerencia para Grupos Desalineados
Resuelve automáticamente el caso complejo donde los N estudiantes presentes en el laboratorio tienen avances diferentes:
1. Comprueba los prerrequisitos opcionales de los temas.
2. Cuenta cuántos alumnos presentes están preparados y tienen el tema pendiente.
3. Prioriza el tema que beneficie al mayor número de presentes.
4. Muestra un diagnóstico explicativo claro (ej. *"Recomendación: Repasar Tema 3. 2 alumnos lo tienen pendiente antes de avanzar al Tema 4"*).
5. **Decisión Final:** El docente siempre conserva la decisión final de qué tema dictar.

---

### 9.3 Dashboard, Métricas e Interfaz Visual (UX)
- **Matriz de Cobertura Visual:** Matriz interactiva (Filas: Estudiantes, Columnas: Temas del Pensum) con encabezados fijos (sticky headers), filtros por subgrupo/estado, e indicadores visuales accesibles (texto/símbolo + color).
- **Métricas Independientes:**
  - *Avance del Curso:* % de temas impartidos al menos una vez.
  - *Cobertura Individual:* % de temas recibidos por cada estudiante.
  - *Aprendizaje Demonstrado:* Evaluaciones/refuerzos registrados.
- **Alertas Claras:** Notificación de situaciones concretas (temas con baja cobertura, prerrequisitos faltantes) en lugar de etiquetas estigmatizantes.

---

### 9.4 Alcance Inicial (MVP) y Stack de Despliegue
- **Flujo Central MVP:** `Crear Curso ➔ Importar Estudiantes ➔ Armar Pensum ➔ Registrar Sesión (Borrador/Cierre) ➔ Consultar Cobertura ➔ Corregir Historial`.
- **Desarrollo & Producción Paridad:** Uso de **PostgreSQL tanto en Desarrollo como en Producción** (vía Docker local) para eliminar discrepancias de base de datos.
- **Stack & Infraestructura:** Monolito Laravel + React / TypeScript (Inertia.js) + PostgreSQL + Docker (`Dockerfile` + `docker-compose.yml`) preparado para despliegue en VPS tras Nginx Proxy Manager.



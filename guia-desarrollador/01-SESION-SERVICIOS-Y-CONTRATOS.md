# Sesión, servicios y contratos

[Índice](README.md) · [AuthService](../src/app/core/services/auth.service.ts) · [Interceptor](../src/app/core/interceptors/auth.interceptor.ts)

CU-01 reúne registro y sesión. register() encadena login porque registro devuelve ProfileDTO sin JWT. Login guarda access_token y consulta /users/me; currentUser y señales computadas exponen el perfil confirmado.

HOST publica y configura sus lugares. VENUE conserva esa capacidad por compatibilidad. ADMIN tiene su propio panel y no recibe HOST/ATTENDEE implícitos. Los roles se asignan desde administración; /users/me/role no concede ni retira roles. Ver [paneles y permisos](07-ROLES-Y-PANELES.md).

La opción de recordar selecciona localStorage/sessionStorage. El interceptor adjunta Bearer únicamente a la URL propia de la API, evitando enviarlo a terceros. Un 401 limpia/redirige mediante expireSession(), sin llamar recursivamente al logout.

logout() captura el JWT, limpia estado/redirige y lo envía explícitamente a /auth/logout. La petición tiene límite de tiempo. Si falla, la sesión local queda cerrada pero la revocación remota no está garantizada. El backend requiere la migración de revocaciones antes de desplegar esta versión.

AuthGuard protege perfil y avisos. AttendeeGuard protege checkout, entradas y matching; HostGuard protege gestión propia, AdminGuard protege plataforma y VenueGuard permite demanda a HOST/VENUE/ADMIN. Los guards refrescan el perfil de la API; GuestGuard controla login/registro. Estos guards no sustituyen autorización de recursos en FastAPI.

Los contratos están en core/models/ y las solicitudes en core/services/. Mantener UUID string, enums, errores visibles y estados de carga/vacío/error. Nunca distribuir claves PostgreSQL o Stripe en el navegador. La presencia local de JWT no demuestra que siga vigente.

# Diagnóstico y correlación de errores

Use `X-Request-ID` to follow one API request across Angular, Flutter, and FastAPI. Both clients keep their existing authentication and user-facing error messages; diagnostic fields are additive and must not expose credentials.

## Contrato compartido

| Elemento           | Convención                                                                                                                                                                                                                         |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Correlación        | Angular y Flutter conservan un `X-Request-ID` UUID v4 válido o generan uno para las solicitudes a FastAPI. Angular no envía esta cabecera a terceros ni a rutas relativas de la aplicación.                                        |
| Respuesta de error | FastAPI conserva `detail` y agrega `code` estable y `request_id`; los clientes mantienen sus mensajes actuales y exponen estos campos por separado.                                                                                |
| Códigos            | Use códigos estables `CATEGORIA.DESCRIPTOR` en mayúsculas, por ejemplo `COMMON.VALIDATION_ERROR`, `AUTH.UNAUTHENTICATED`, `RESOURCE.NOT_FOUND` y `DEPENDENCY.UNAVAILABLE`. Agregue códigos sin reutilizar significados existentes. |

## Reportes seguros

Los reportes de CI/CD usan `diagnostic-report/v1` y los campos `schema`, `service`, `version`, `phase`, `status`, `code`, `cause_status`, `evidence`, `possible_causes` y `recommended_actions`. Los estados comunes son `passed`, `failed`, `not_verified` y `not_applicable`; el estado de causa es `confirmed`, `hypothesis` o `unknown`. Separe los **hechos observados** (fase, estado, código, versión, ID de solicitud y evidencia no sensible) de las **hipótesis** (causas posibles aún no confirmadas). Nunca incluya contraseñas, tokens, cabeceras de autorización, secretos, datos personales innecesarios ni trazas internas. El éxito de publicación no demuestra que el servicio esté listo. El workflow actual no realiza comprobaciones de arranque o readiness del sitio; esos estados se reportan como `not_verified` y requieren un smoke test autorizado.

### Escaneo de seguridad del filesystem

El job `Filesystem Security Scan` de CI ejecuta Trivy `v0.70.0` para vulnerabilidades y secretos en el filesystem del repositorio. La acción está fijada a `aquasecurity/trivy-action@ed142fd0673e97e23eac54620cfb913e5ce36c25` (`v0.36.0`), el job solo tiene permiso `contents: read`, no conserva credenciales de checkout y su duración máxima es de 15 minutos. Un self-test efímero comprueba que el escáner de secretos detecte un identificador AWS sintético; el valor no se imprime y el fixture se elimina tras la comprobación.

El gate falla ante cualquier secreto detectado, una vulnerabilidad `HIGH` o `CRITICAL`, un fallo del escáner o del self-test, o una salida JSON ausente, incompleta o inválida. Los hallazgos `MEDIUM`, `LOW` y `UNKNOWN` se informan como avisos no bloqueantes. El parser valida el sobre JSON de Trivy, acepta `ArtifactType: filesystem` y `ArtifactType: repository`, y admite `Results: null` cuando no hay hallazgos. Trivy cambia automáticamente a `repository` al escanear un directorio con metadatos Git. La salida JSON original permanece solo bajo `RUNNER_TEMP` y se elimina; únicamente el reporte sanitizado se publica como artefacto de Actions durante 14 días. El reporte `security-report/v1` incluye `evidence.output_validation`; el resumen y el reporte exponen conteos y, para vulnerabilidades, severidad, identificador y paquete. Para secretos incluyen identificador de regla y ruta relativa validados, agrupados por par con su conteo y limitados a 20 entradas; las rutas inseguras se redactan y `secret_findings_truncated` indica si hubo más. Nunca incluyen coincidencias ni números de línea.

La verificación local del parser y de los casos negativos se ejecuta con `node --test scripts/ci/security-report.test.mjs`. La sintaxis del workflow se comprueba con `actionlint .github/workflows/ci.yml`. El escaneo real y el self-test de Trivy se ejecutan en CI mediante la acción fijada; no requieren instalar dependencias del proyecto.

### Reporte de despliegue frontend

El workflow `Deploy AWS (Frontend Web)` agrega un resumen `diagnostic-report/v1` aunque fallen pasos anteriores. Cada fase informa `service`, `version`, `phase`, `status`, `code` cuando aplica, `cause_status`, `evidence`, `possible_causes` y `recommended_actions`. La evidencia se limita a resultados de pasos de Actions; una falla observada no confirma por sí sola su causa.

Antes del job con permisos OIDC se ejecuta `scripts/deployment-preflight.mjs`. El workflow solo admite `workflow_dispatch` en `main`; no usa `workflow_run`, por lo que fusionar un PR o completar CI no publica automáticamente. El despacho requiere el input booleano `confirm_deployment=true`, cuyo valor predeterminado es `false`. El preflight no llama a AWS. Ante variables ausentes informa `status: not_configured` y `gate_status: blocked`, adjunta un reporte JSON por 14 días y el job con permisos AWS queda omitido. Si no se confirma explícitamente, informa `DEPLOY.CONFIRMATION_REQUIRED`. Los valores nunca se incluyen en el reporte.

El repositorio de GitHub autorizado para el despliegue requiere estas **GitHub Actions repository variables** (no secretos ni valores versionados): `AWS_DEPLOY_ROLE_ARN` (ARN del rol OIDC), `AWS_REGION`, `AWS_API_HOST` (hostname sin esquema ni espacios periféricos), `AWS_S3_WEBAPP_BUCKET` y `AWS_CLOUDFRONT_DISTRIBUTION_ID`. Ninguna variable admite espacios periféricos. No se usan claves AWS estáticas. La política de confianza OIDC, el entorno `aws-production`, la protección/aprobación del entorno y los permisos en AWS se configuran fuera del repositorio; deben restringirse al repositorio de destino y a `refs/heads/main`, y no se consideran verificados por el preflight. La sincronización a S3/invalidación de CloudFront no prueba que la aplicación esté disponible.

Pruebas locales sin acceso cloud: `pnpm run test:deploy-preflight` o `node --test scripts/deployment-preflight.test.mjs`. Las pruebas usan valores ficticios en memoria y no se conectan a AWS.

Preparación, build y publicación reflejan los resultados observables de sus pasos. El workflow no ejecuta un probe de producción: `startup`, `readiness` y `postdeploy` siempre figuran como `not_verified`, nunca como éxito. Antes de afirmar que el servicio funciona, una persona autorizada debe ejecutar un smoke check post-deploy y registrar evidencia segura. El reporte no agrega solicitudes de producción ni credenciales.

El preflight usa el contrato independiente `deployment-report/v1` (no el contrato de diagnóstico de la aplicación), con `project`, `revision`, `environment`, `phase`, `status`, `duration_ms`, `gate_status`, `code`, `cause_status`, `evidence`, `possible_causes` y `recommended_actions`. Los reportes separan evidencia de hipótesis y omiten valores de configuración.

## Verificación local

Desde `sw1_frontend_exp`, use los scripts existentes:

```bash
pnpm run typecheck
pnpm run check:i18n
pnpm run test:i18n-checker
pnpm run test:ci
```

`pnpm run quality` ejecuta el checker de traducciones y sus pruebas negativas en fixtures temporales antes de TypeScript y los tests Angular. Los mismos scripts npm son invocables con `npm run` o `bun run`; CI conserva pnpm y `pnpm-lock.yaml` como su instalación congelada.

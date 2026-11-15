# Despliegue de EXPERIENCIA Frontend en AWS

Esta guía prepara el despliegue manual de Angular a S3 y CloudFront. El workflow construye `dist/experiencia_front/browser`, archiva una copia de rollback, sincroniza a S3 y solicita una invalidación de `/index.html`; ahora espera a que CloudFront termine esa invalidación. **Ni el éxito de S3 ni el estado `Deployed` de la invalidación verifican por sí solos la respuesta HTTP real o la conectividad con la API.**

## Recorrido rápido

1. Cree/configure OIDC, rol IAM, bucket S3 privado, distribución CloudFront con OAC y DNS/TLS.
2. Proteja el environment GitHub `aws-production` para `main` y configure las cinco repository variables.
3. Valide identidad, bucket, distribución y endpoint sin modificar recursos.
4. Después de integrar el cambio a `main`, ejecute `Deploy AWS (Frontend Web)` manualmente con `confirm_deployment=true`.
5. Revise fases y artefactos del run, espere la propagación y ejecute smoke tests externos.

**Precaución antes de integrar:** mientras el PR siga abierto, `main` conserva la versión anterior del workflow, que escuchaba `workflow_run` y podía desplegar tras un push exitoso a `main` si AWS estuviera configurado. No habilite role ARN/variables de despliegue ni OIDC al workflow viejo. Una vez integrado este guard, el workflow no tiene `push`, `pull_request` ni `workflow_run`; OIDC solo se solicita manualmente desde `main`, detrás del preflight y la aprobación del environment.

## Recursos y estado conocido

| Recurso                        | Requisito                                                                                        | Estado en el repositorio                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| GitHub OIDC provider y rol IAM | Confianza exacta repo/environment; permisos solo para bucket y distribución elegidos             | No hay IaC; estado AWS externo no verificado.                       |
| S3                             | Bucket dedicado para los archivos de esta SPA; el workflow usa `sync --delete` en la raíz        | Workflow consume bucket, no lo crea. No use bucket compartido.      |
| CloudFront                     | S3 REST origin privado + OAC, `index.html`, fallback SPA y certificado TLS si hay dominio propio | Workflow invalida `/index.html`; no crea ni configura distribución. |
| DNS                            | Alias/CNAME del frontend al dominio CloudFront                                                   | Dominio y proveedor DNS externos, no verificados.                   |
| Backend                        | API HTTPS accesible en `AWS_API_HOST`, CORS configurado para el frontend                         | El host se inserta al compilar; conectividad real no verificada.    |

No se encontraron Terraform, CloudFormation, CDK ni otros recursos de infraestructura como código para estos componentes.

## 1. OIDC, environment y rol IAM

### Confianza del rol

Use el proveedor IAM `https://token.actions.githubusercontent.com` con audiencia `sts.amazonaws.com` (reutilice el existente si ya está creado). Cree un rol exclusivo de frontend. Para el subject clásico, la condición debe ser equivalente a:

```json
"Condition": {
  "StringEquals": {
    "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
    "token.actions.githubusercontent.com:sub": "repo:evert-aov/sw1_frontend_exp:environment:aws-production"
  }
}
```

Confirme el formato `sub` emitido por GitHub antes de guardarlo: desde el 15 de julio de 2026 los repos creados después de esa fecha y los renombrados/transferidos después de esa fecha usan por defecto subjects inmutables con IDs de owner y repo. No use comodines para arreglar una discrepancia.

En GitHub **Settings → Environments**, cree `aws-production`, permita despliegues únicamente desde `main` y configure al menos un revisor requerido. Si está disponible, evite que quien inició el despliegue lo autoapruebe. El workflow declara ese environment y solicita `id-token: write` solo en el job de despliegue. No use claves estáticas de AWS ni GitHub secrets para credenciales AWS.

### Permisos mínimos del rol de despliegue

- S3 bucket: `s3:ListBucket` sobre el ARN del bucket; `s3:PutObject` y `s3:DeleteObject` sobre `arn:aws:s3:::<BUCKET>/*`. El delete es necesario porque el sync actual usa `--delete`; por eso el bucket debe ser exclusivo de esta aplicación.
- CloudFront: `cloudfront:CreateInvalidation` sobre el ARN de la distribución específica. El job ahora espera la invalidación con CloudFront waiter; si la policy del waiter exige otra acción de lectura en su cuenta/partición, agregue solo la acción documentada que el error indique y vuelva a validar.
- Región de sesión en OIDC igual a la seleccionada para el bucket; CloudFront es global, pero el workflow configura región AWS.

## 2. Bucket S3, CloudFront y DNS

1. Cree un bucket S3 dedicado para el contenido de esta SPA en la cuenta/región acordada. Active Block Public Access, cifrado por defecto y Object Ownership `Bucket owner enforced`. Active versioning para una opción adicional de recuperación.
2. Cree una distribución CloudFront cuyo origin sea el **endpoint REST del bucket**, no el website endpoint. Configure Origin Access Control (OAC) con firma de requests y política del bucket que permita `s3:GetObject` solo al principal `cloudfront.amazonaws.com`, condicionada al ARN de esa distribución. No haga público el bucket.
3. Configure default root object `index.html`. Para rutas cliente Angular, configure CloudFront Function/rewrites o las respuestas custom error 403/404 hacia `/index.html` con respuesta 200 según la estrategia elegida. Verifique que esa regla no convierta errores de API en la SPA; API y frontend deben ser origins/behaviors separados si comparten distribución.
4. Para un dominio propio, agregue el alias a la distribución y use un certificado ACM de CloudFront en `us-east-1`; cree el registro DNS alias/CNAME apuntando al dominio `d...cloudfront.net` asignado por CloudFront. El certificado, DNS y distribución no se crean desde el workflow.
5. Configure cache behavior: contenido con hash puede cachearse largo; `index.html` debe revalidarse/no cachearse agresivamente, porque el workflow solo invalida `/index.html`. Revise también el comportamiento de rutas profundas.

OAC es preferible a hacer público S3; el endpoint de website de S3 no admite OAC. Consulte las referencias AWS enlazadas al final antes de crear la policy del bucket.

## 3. Variables de GitHub

Configure estas **repository variables** en `evert-aov/sw1_frontend_exp`:

| Variable                         | Ejemplo de formato, no valor real                       | Uso                                                                                                               |
| -------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `AWS_DEPLOY_ROLE_ARN`            | `arn:aws:iam::123456789012:role/github-frontend-deploy` | Rol OIDC anterior.                                                                                                |
| `AWS_REGION`                     | `us-west-2`                                             | Región para sesión AWS y bucket seleccionado.                                                                     |
| `AWS_API_HOST`                   | `api.example.com`                                       | Solo hostname; sin `https://`, path ni espacios. El build crea `https://<host>/api` y `wss://<host>/api/live/ws`. |
| `AWS_S3_WEBAPP_BUCKET`           | `experiencia-web-prod`                                  | Bucket dedicado; no ARN ni URL `s3://`.                                                                           |
| `AWS_CLOUDFRONT_DISTRIBUTION_ID` | `E1ABCDEF234567`                                        | ID de la distribución, no su hostname.                                                                            |

El preflight reporta nombres faltantes/inválidos y termina antes de OIDC; no imprime valores. No se necesitan secretos de GitHub para este workflow.

Fuera de GitHub, la persona operadora debe proporcionar el dominio público de frontend (`https://<frontend-domain>` o `https://<distribution>.cloudfront.net`), bucket, distribución, región y hostname API. Asegure que el backend admita ese origen exacto en CORS y tenga `FRONTEND_URL` coherente.

## 4. Validación previa sin cambios

Estos comandos son consultas y requieren una sesión AWS de operador previamente autorizada; no los ejecutamos en esta tarea:

```bash
aws sts get-caller-identity
aws s3api get-bucket-location --bucket "$AWS_S3_WEBAPP_BUCKET"
aws s3api get-public-access-block --bucket "$AWS_S3_WEBAPP_BUCKET"
aws cloudfront get-distribution --id "$AWS_CLOUDFRONT_DISTRIBUTION_ID" \
  --query 'Distribution.{Status:Status,Domain:DomainName,Enabled:DistributionConfig.Enabled,Aliases:DistributionConfig.Aliases.Items}'
```

Confirme cuenta esperada, bucket dedicado/privado, OAC/policy de bucket, default root, fallback SPA, alias/certificado y estado de distribución. `aws cloudfront get-distribution` no imprime secretos, pero revise la configuración antes de compartirla.

En GitHub, confirme branch `main`, environment `aws-production`, regla de aprobación y cinco variables. La existencia de variables, entorno protegido, role policy, bucket y distribución no se ha verificado desde este entorno.

## 5. Ejecutar el workflow y leer sus reportes

Después de integrar el PR y completar configuración, abra **Actions → Deploy AWS (Frontend Web) → Run workflow**, seleccione `main` y marque `confirm_deployment=true`. El job construye antes de pedir OIDC y archiva el build para rollback por 30 días antes de publicar.

El resumen separa `preparation`, `build`, `rollback_artifact`, `authentication`, `publication` y `deployment`. La fase `deployment` solo pasa cuando CloudFront devuelve ID de invalidación y el waiter confirma que terminó. `startup`, `readiness` y `postdeploy` siguen como `not_verified`: el workflow no hace requests al dominio público.

## 6. Smoke tests externos

Después de que el workflow pase, desde una máquina de prueba con DNS público:

```bash
curl --fail --silent --show-error --max-time 20 \
  --output /dev/null --write-out 'HTTP %{http_code}\n' \
  'https://<frontend-domain>/'
curl --fail --silent --show-error --max-time 20 \
  --output /dev/null --write-out 'HTTP %{http_code}\n' \
  'https://<frontend-domain>/<ruta-angular-publica-verificada>'
curl --fail --silent --show-error --max-time 15 \
  --output /dev/null --write-out 'HTTP %{http_code}\n' \
  'https://<AWS_API_HOST>/health/ready'
```

Esperado: frontend y ruta profunda 200 con fallback SPA; API readiness 2xx. En navegador, abra una sesión de prueba y compruebe que el build llama al host API correcto, no hay mixed content ni CORS rechazado, autenticación funciona y los errores HTTP se presentan correctamente. Pruebe WebSocket autenticado si está en el flujo. No use tokens/cuentas reales en evidencia compartida.

## 7. Rollback del frontend

Use solo un artefacto de un run anterior que haya publicado y que haya pasado smoke tests. Los artefactos `frontend-release-<RUN_ID>` se retienen 30 días; si el artefacto expiró, el workflow no tiene rollback automático. El procedimiento siguiente **modifica S3 y CloudFront** y solo debe ejecutarlo un operador autorizado durante un incidente:

```bash
set -euo pipefail
RUN_ID='<RUN_ID_PREVIAMENTE_VERIFICADO>'
ROLLBACK_DIR="$(mktemp -d)"
trap 'rm -rf "$ROLLBACK_DIR"' EXIT
gh run download "$RUN_ID" --repo evert-aov/sw1_frontend_exp \
  --name "frontend-release-${RUN_ID}" --dir "$ROLLBACK_DIR"
test -s "$ROLLBACK_DIR/index.html"
aws s3 sync "$ROLLBACK_DIR" "s3://${AWS_S3_WEBAPP_BUCKET}" --delete
INVALIDATION_ID="$(aws cloudfront create-invalidation \
  --distribution-id "$AWS_CLOUDFRONT_DISTRIBUTION_ID" \
  --paths '/index.html' --query 'Invalidation.Id' --output text)"
aws cloudfront wait invalidation-completed \
  --distribution-id "$AWS_CLOUDFRONT_DISTRIBUTION_ID" --id "$INVALIDATION_ID"
```

Luego repita los smoke tests. `--delete` borra del bucket cualquier objeto que no pertenezca al artefacto; **no lo use si el bucket no está dedicado a esta SPA**. S3 versioning puede servir como recuperación adicional, pero no sustituye el artefacto verificado.

## Errores comunes y respuesta

| Evidencia                                     | Causa por confirmar                                            | Siguiente comprobación                                                                                                                           |
| --------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Preflight `DEPLOY.CONFIG_NOT_CONFIGURED`      | Variables ausentes                                             | Agregue solo los nombres listados en Settings → Variables; vuelva a ejecutar primero con confirmación false para validar el gate, no despliegue. |
| Preflight `DEPLOY.CONFIG_INVALID`             | ARN, región, host, bucket o ID con formato inesperado          | Corrija formato y espacios; no copie URL completa en `AWS_API_HOST`.                                                                             |
| Authentication `DEPLOY.AUTHENTICATION_FAILED` | Trust `sub`/`aud`, rol inexistente o environment no autorizado | Compare subject exacto, `id-token: write`, branch/environment y cuenta; no agregue credenciales estáticas.                                       |
| Publication `DEPLOY.PUBLICATION_FAILED`       | Permiso S3, bucket/region, objeto o configuración              | Revise primera acción AWS, rol y policy sobre bucket/prefix; asegure bucket dedicado.                                                            |
| Deployment `DEPLOY.DEPLOYMENT_FAILED`         | CloudFront no aceptó/terminó invalidación                      | Consulte ID/estado de invalidación y permisos para la distribución. Esto no indica que el HTML origin responda.                                  |
| Smoke 403                                     | OAC/bucket policy, objeto faltante, alias o ruta               | Verifique que OAC firma, la policy limita al distribution ARN, `index.html` existe y el fallback es correcto.                                    |
| HTML 200 pero API falla                       | API, CORS, DNS/TLS o API host compilado incorrecto             | Revise Network del navegador, `AWS_API_HOST`, `FRONTEND_URL` y `CORS_ORIGINS` del backend.                                                       |

## Referencias oficiales

- [GitHub: configurar OIDC con AWS](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws) y [referencia de claims OIDC](https://docs.github.com/en/actions/reference/security/oidc).
- [GitHub: proteger deployments con environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments).
- [AWS: restringir acceso a un origin S3 con OAC](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html).
- [AWS: permisos IAM para CloudFront](https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazoncloudfront.html) y [versionado/restauración S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/RestoringPreviousVersions.html).

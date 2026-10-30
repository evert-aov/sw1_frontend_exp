# Arquitectura y configuración

[Índice](README.md) · [Manifest](../package.json) · [Angular](../angular.json) · [Arranque](../src/app/app.config.ts)

`src/main.ts` arranca App con proveedores HTTP y Router. `app.config.ts` registra el interceptor de autenticación. `app.routes.ts` carga funcionalidades de forma diferida. `core/` concentra modelos/servicios y `shared/` componentes reutilizables.

Usar Angular **22**. Al revisar: `@angular/core` 22.1.3, CLI/build 22.1.6, TypeScript declarado `~6.0.2`. Los engines instalados admiten Node `^22.22.3 || ^24.15.0 || >=26.0.0`; Node 26.7.0 disponible satisface ese rango. No usar el requisito antiguo “Node 18+” como guía de instalación.

## Configuración de ejecución

`npm start` y `npm run dev` sirven en puerto **3000**, declarado en package.json/angular.json. La API reside en 8000 mediante el comando uvicorn documentado en backend. Si el backend se lanza con `python main.py` sin PORT, puede ocupar 3000 y colisionar.

`API_CONFIG.baseUrl` es una constante compilada `http://localhost:8000/api`; cambiarla para otro despliegue o crear configuración explícita si la entrega lo exige. El navegador no lee el `.env` de FastAPI. `wsUrl` corresponde al contrato futuro de live; los avisos de quórum usan la bandeja HTTP con consulta periódica.

## Reglas de extensión

Crear componentes por funcionalidad, con OnPush y estado Signals donde corresponda. Los servicios traducen contratos HTTP y coordinan datos; los componentes gestionan interacción/presentación. Compartir modelos y utilidades sin duplicar cálculos financieros autoritativos en cada pantalla.

No agregar dependencias del editor UML ni copiar su sistema de plug-ins. Para un cambio de DTO, actualizar modelos, servicios, pantallas y pruebas del contrato. Verificar primero el controlador FastAPI; una ruta dibujada en UI no implica API existente.

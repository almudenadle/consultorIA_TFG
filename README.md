# Guía para Desarrolladores

## Ejecución del Backend

### 1. Modo Desarrollo

Para iniciar el backend en modo desarrollo (recarga automática al guardar cambios):

```bash
npm run dev
```

### 2. Modo Producción

Para compilar y ejecutar el backend en modo producción:

```bash
npm run prod
```

---

## Generación de Archivos con generate.js (Arquitectura MVC)

El script `generate.js` permite crear rápidamente los archivos base en los distintos directorios para un nuevo módulo siguiendo la arquitectura MVC:

- Controller
- Service
- Route
- Entity

### Uso básico:

```bash
npm run gen <nombre-modulo>
```

Ejemplo:

```bash
npm run gen user
```

Esto generará los archivos necesarios en las carpetas correspondientes dentro de `src/`.

### Uso con subdirectorio:

```bash
npm run gen <subdirectorio> <nombre-modulo>
```

Ejemplo:

```bash
npm run gen admin user
```

Esto creará los archivos dentro de `src/controllers/admin/`, `src/services/admin/`, etc.

---

## Modo Debug en Visual Studio Code

El proyecto ya está configurado para depuración en VS Code. Para usar el modo debug:

1. Irse a la izquierda donde aparece botón de play con una mariquita.
2. Elige la configuración de depuración disponible (por ejemplo, "Launch Program").

Esto iniciará el backend en modo debug, permitiendo poner breakpoints y hacer inspección paso a paso.

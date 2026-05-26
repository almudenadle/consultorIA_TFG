# Guía de Contribución - Equipo TDGranada 2.0

¡Hola equipo! Este documento define cómo trabajaremos juntos para asegurar que el código sea de calidad, aprendamos unos de otros y evitemos conflictos innecesarios en Git.

## 1. Estrategia de Ramas

Para mantener la rama `main` siempre estable, seguiremos estas reglas:

* **`main`**: Solo contiene código que funciona perfectamente. Nadie hace push directo aquí.
* **Ramas de tarea**: Cada nueva funcionalidad o corrección nace de una rama propia con este formato:
    * `feature/nombre-de-la-tarea` (para nuevas funcionalidades)
    * `fix/error-encontrado` (para corregir bugs)
    * `docs/cambios-en-documentacion` (para el README o manuales)
    * `refator/rafactorización-de-archivos` (para cuando tengamos que refactorizar alguna funcionalidad u homogeneizar la estructura)
    * `issue/<código etiqueta>` (para cuando se esté trabajando en la implementación de algo de la sección `Issues`)

**Regla de oro:** Antes de empezar una rama, haz un `git pull origin main` para trabajar sobre lo más reciente.

## 2. Commits Claros
Intentemos que los mensajes de commit expliquen **qué** hiciste. 
* *Mal:* `git commit -m "cambios"`
* *Bien:* `git commit -m "feat: añadida validación al formulario de registro"`

## 3. El Proceso de Pull Request (PR)
Cuando termines tu tarea:
1.  Sube tu rama a GitHub: `git push origin feat/mi-tarea`.
2.  Abre un Pull Request hacia la rama `develop`.
3.  **Mínimo 1 revisión:** Al menos un compañero debe revisar el código y dar su "Approve" antes de mergear.
4.  Si hay conflictos, el autor de la PR es el responsable de resolverlos (¡pide ayuda si te bloqueas!).

## 4. Code Reviews (Revisiones)
Al revisar el código de un compañero:
* **Aprende:** Si no entiendes algo que hizo tu compañero, ¡pregunta! La revisión también es para aprender.

## 5. Antes de Mergear
Antes de pulsar el botón verde de Merge:
1.  Asegúrate de que el código compila.
2.  Verifica que no has roto funcionalidades que ya existían.

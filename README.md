# DSL 3D — Analizador de Escenas

Compiladores 2026-I · Escuela Profesional de Ingeniería de Sistemas, UNAP Puno

Analizador de un lenguaje de dominio específico para describir escenas 3D.
Implementa las tres fases clásicas de análisis más una fase de ejecución que
renderiza la escena con Three.js.

## Cómo ejecutarlo

Abrir `COMPILADORES.html` con doble clic. No necesita servidor.

Esto es intencional: los scripts son `<script src="...">` clásicos, no módulos
ES. Los módulos (`import`/`export`) serían más limpios, pero el navegador los
bloquea por CORS sobre `file://` y obligarían a levantar un servidor local cada
vez que se quiera abrir el proyecto.

## Estructura

```
COMPILADORES.html      Markup y orden de carga
css/estilos.css        Estilos
js/
  tokens.js            Constantes de token, TOKEN_NAMES y tabla de keywords
  lexico.js            FASE 1 — texto fuente → tokens
  sintactico.js        FASE 2 — autómata finito modular
  semantico.js         FASE 3 — validación de rangos, aridades y referencias
  escena.js            Tokens → modelo de escena
  render3d.js          Ejecución: Three.js, física y controles
  ui.js                Pestañas y orquestación de las fases
  ejemplos.js          Datos: código DSL de muestra
  main.js              Arranque
```

## Dependencias entre archivos

El orden de carga en el HTML no es arbitrario. Cada archivo usa lo que
definieron los anteriores:

```
tokens.js  ─┬─→ lexico.js
            ├─→ sintactico.js
            ├─→ semantico.js
            └─→ escena.js ──→ render3d.js
                                  │
      todos los anteriores ──→ ui.js ──→ main.js
                                  ↑
                            ejemplos.js
```

`main.js` debe ir siempre al final: es el único que ejecuta código al cargar
(registra listeners y llena el selector de ejemplos). El resto solo declara
constantes, clases y funciones.

## Las fases

**Léxico** (`AnalizadorLexico`) — Reconoce identificadores, números con sufijo
de unidad (`0.3s`, `90grados/s`), vectores anidados, cadenas y comentarios `#`.

**Sintáctico** (`AnalizadorSintactico`) — Autómata finito dividido en módulos
(INICIO, CAMARA, ENTIDAD, ESCENA, VECTOR). Varios estados son *subrutinas*
compartidas: una propiedad `x: valor;` (12), una forma (33), una llamada a
acción (45), un bloque `animacion` (34). Al entrar en una se apila la dirección
de retorno en `pilaRetorno`; al salir se desapila. `ENTRADAS_SUBRUTINA` declara
qué estados son subrutinas y `CONTINUACION_BLOQUE` dónde reanuda cada bloque.

**Semántico** (`AnalizadorSemantico`) — Acumula errores en vez de detenerse en
el primero:

| Código | Significado                                  |
|--------|----------------------------------------------|
| ES01   | Aridad de vector incorrecta                  |
| ES02   | Componente fuera de rango                    |
| ES03   | Escalar fuera de rango                       |
| ES04   | Referencia a entidad o instancia no definida |

**Ejecución** (`extractSceneData` + `renderScene`) — Construye la escena.

## Convenciones del lenguaje

- **Coordenadas**: `posicion:` dentro de una entidad es un offset **local**
  respecto al origen de la entidad. `set_posicion()` en la escena coloca la
  entidad en el **mundo**. Ambas se suman.
- **Orientación**: el eje Z es vertical. Cilindros, conos y pirámides nacen
  alineados a Z; `rotacion: [x, y, z]` (en grados) los reorienta.
- **Animación**: una `velocidad` explícita tiene prioridad sobre `duracion`.
  `loop: false` corre una sola pasada y congela; ausente o `true` repite.


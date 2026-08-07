# Manual de usuario — DSL 3D

**Analizador de Escenas 3D**
Curso de Compiladores 2026-I · Escuela Profesional de Ingeniería de Sistemas · UNAP Puno

---

## Índice

1. [Qué es](#1-qué-es)
2. [Cómo usar la aplicación](#2-cómo-usar-la-aplicación)
3. [Estructura de un programa](#3-estructura-de-un-programa)
4. [Tipos de dato](#4-tipos-de-dato)
5. [Bloque `camara`](#5-bloque-camara)
6. [Bloque `entidad`](#6-bloque-entidad)
7. [Bloque `escena`](#7-bloque-escena)
8. [Sistema de coordenadas](#8-sistema-de-coordenadas)
9. [Animaciones](#9-animaciones)
10. [Controles y física](#10-controles-y-física)
11. [Errores y cómo resolverlos](#11-errores-y-cómo-resolverlos)
12. [Limitaciones conocidas](#12-limitaciones-conocidas)
13. [Referencia rápida](#13-referencia-rápida)

---

## 1. Qué es

Un lenguaje de dominio específico (DSL) para describir escenas tridimensionales
mediante texto, junto con el compilador que lo procesa.

El compilador ejecuta cuatro fases en orden. Si una falla, las siguientes no se
ejecutan:

| Fase | Qué hace | Si falla |
|------|----------|----------|
| 1. Léxico | Agrupa los caracteres en tokens | Se detiene en el primer carácter inválido |
| 2. Sintáctico | Verifica la estructura con un autómata finito modular | Se detiene en el primer token inesperado |
| 3. Semántico | Valida rangos, aridades y referencias | Reporta **todos** los errores encontrados |
| 4. Ejecución | Construye y dibuja la escena en 3D | — |

La fase semántica es la única que acumula errores en lugar de detenerse. Eso es
deliberado: permite corregir varios problemas en una sola pasada.

---

## 2. Cómo usar la aplicación

1. Abrir `COMPILADORES.html` con doble clic. No necesita servidor ni instalación.
2. Elegir un ejemplo del desplegable, o escribir el código en el panel izquierdo.
3. Pulsar **Analizar**.
4. Revisar las pestañas del panel derecho: *Léxico*, *Sintáctico*, *Semántico* y
   *Ejecución 3D*.

El punto de color en cada pestaña indica su estado: verde si pasó, rojo si hubo
error, gris si no llegó a ejecutarse.

**En el editor:** `Tab` inserta indentación y `Shift+Tab` la quita. El indicador
inferior muestra línea y columna del cursor.

**En el visor 3D:** arrastrar rota la cámara y la rueda del ratón acerca o aleja.
Si la escena define controles, aparecen listados bajo el visor.

> Si el cursor está dentro del editor, las teclas escriben texto en lugar de mover
> al personaje. Hay que hacer clic fuera del editor para usar los controles.

---

## 3. Estructura de un programa

Un programa se compone de tres tipos de bloque de nivel superior, más
declaraciones globales sueltas.

```text
# Los comentarios empiezan con almohadilla y llegan al fin de línea

gravedad: [0, 0, -12.8];        # declaración global
iluminacion: [1.0, 1.0, 0.9];   # declaración global

camara { ... }                  # cómo se mira la escena
entidad Nombre { ... }          # plantilla reutilizable
escena Nombre { ... }           # qué se coloca y dónde
```

La distinción clave del lenguaje: **una `entidad` es una plantilla, no un objeto
en el mundo.** Define la forma, pero no aparece en ninguna parte hasta que la
`escena` crea una instancia de ella. Una misma entidad puede instanciarse muchas
veces.

Programa mínimo completo:

```
entidad Caja {
    objeto "cuerpo" {
        forma: cubo(10, 10, 10);
        posicion: [0, 0, 0];
        color: [255, 0, 0];
    }
}

escena Mundo {
    Caja c1;
    c1.set_posicion([0, 0, 5]);
}
```

---

## 4. Tipos de dato

| Tipo | Sintaxis | Ejemplo |
|------|----------|---------|
| Número | Dígitos, con decimal opcional | `10`, `0.85` |
| Número con unidad | Número seguido de la unidad, **sin espacio** | `2s`, `0.3s`, `90grados/s` |
| Vector | Números entre corchetes, separados por comas | `[0, 0, -12.8]` |
| Cadena | Entre comillas dobles | `"cuerpo"`, `"metal"` |
| Booleano | | `true`, `false` |
| Identificador | Letras, dígitos y guion bajo | `Muro`, `player1` |

Toda sentencia termina en punto y coma. Los bloques van entre llaves.

> **Los números negativos solo se admiten dentro de vectores.** `posicion: [-80, 0, 0]`
> es válido, pero `masa: -5;` produce un error léxico, porque el signo menos fuera
> de un vector no es un carácter reconocido. Es una limitación del analizador léxico,
> no una decisión de diseño.

---

## 5. Bloque `camara`

Define el punto de vista. Es opcional; si se omite, el visor encuadra la escena
automáticamente.

```
camara {
    posicion: [0, -80, 60];
    objetivo: Jugador;
    distancia: 100;
    angulo: 45;
    modo: "tercera_persona";
    efectos {
        vibracion_colision: true;
        zoom_dinamico: false;
    }
}
```

| Propiedad | Tipo | Rango válido |
|-----------|------|--------------|
| `posicion` | Vector de 3 | — |
| `objetivo` | Identificador o vector de 3 | — |
| `distancia` | Número | — |
| `angulo` | Número | 0 a 360 |
| `modo` | Cadena | — |

El bloque `efectos` admite únicamente `vibracion_colision` y `zoom_dinamico`, y
ambos exigen un valor booleano. Cualquier otra propiedad ahí dentro produce un
error sintáctico.

---

## 6. Bloque `entidad`

Una plantilla. Contiene uno o más bloques `objeto`, y opcionalmente `colision`,
`fisicas`, `comportamiento`, `controles` y `sonido`.

### Objetos

```
entidad Moneda {
    objeto "disco" {
        forma: cilindro(3, 1);
        posicion: [0, 0, 0];
        rotacion: [90, 0, 0];
        color: [255, 215, 0];
        material: "metal";
    }
}
```

| Propiedad | Tipo | Rango |
|-----------|------|-------|
| `forma` | Figura geométrica | Ver tabla siguiente |
| `posicion` | Vector de 3 | — |
| `rotacion` | Vector de 3, en **grados** | — |
| `color` | Vector de 3 (RGB) | 0 a 255 por componente |
| `material` | Cadena | Descriptivo; no altera el render |

### Formas disponibles

| Forma | Argumentos | Significado |
|-------|-----------|-------------|
| `cubo(a, b, c)` | 3 | ancho, largo, alto |
| `esfera(r)` | 1 | radio |
| `cilindro(r, h)` | 2 | radio, altura |
| `cono(r, h)` | 2 | radio de la base, altura |
| `piramide(r, h)` | 2 | radio de la base, altura |

Pasar un número distinto de argumentos produce un error **ES03**.

### Físicas

```
fisicas {
    masa: 1000;
    estatica: true;
}
```

| Propiedad | Tipo | Rango |
|-----------|------|-------|
| `masa` | Número | 0.000000001 a 1000000000000 |
| `estatica` | Booleano | — |

`estatica: true` convierte a la entidad en un obstáculo sólido: bloquea al
personaje controlable. Es la única propiedad de este bloque que afecta la
ejecución; `masa` se valida pero no se simula.

### Colisión

```
colision {
    forma: cubo(5, 160, 20);
    tipo: "solido";
    rebote: 0.15;
    rugosidad: 0.85;
}
```

`rebote` y `rugosidad` van de 0 a 1. Se validan pero no se simulan todavía.

---

## 7. Bloque `escena`

Declara qué instancias existen y dónde se colocan.

```
escena Mundo {
    Suelo s1;
    Moneda c1, c2, c3;

    s1.set_posicion([0, 0, -1]);
    c1.set_posicion([30, 20, 10]);
    c2.set_posicion([40, 25, 15]);

    camara.iniciar();
    fisicas.activar_gravedad([0, 0, -12.8]);
}
```

Primero se declaran las instancias con `Tipo nombre;` (varias separadas por
comas), y después se las posiciona. Usar una instancia sin declararla produce un
error **ES04**.

---

## 8. Sistema de coordenadas

Esta es la fuente de confusión más habitual del lenguaje, así que conviene
entenderla bien.

**El eje Z es el vertical.** X es el ancho, Y la profundidad, Z la altura.

**Las posiciones se suman.** La `posicion` dentro de un `objeto` es un
desplazamiento **local**, relativo al origen de su entidad. El `set_posicion()`
de la escena coloca la entidad en el **mundo**. La posición final es la suma:

```text
posición final del objeto = posicion (local) + set_posicion (mundial)
```

Ejemplo. Si escribes esto:

```
entidad Muro {
    objeto "pared" { forma: cubo(5, 160, 20); posicion: [80, 0, 10]; }
}
escena Mundo {
    Muro m1;
    m1.set_posicion([80, 0, 0]);
}
```

el muro no queda en x = 80, sino en **x = 160**. La forma correcta de escribirlo
es dejar el objeto centrado en el origen de su entidad y dejar que la escena lo
coloque:

```
entidad Muro {
    objeto "pared" { forma: cubo(5, 160, 20); posicion: [0, 0, 10]; }
}
escena Mundo {
    Muro m1;
    m1.set_posicion([80, 0, 0]);
}
```

La regla práctica: **dentro de una entidad, construye alrededor de `[0, 0, 0]`.**
Usa las posiciones locales solo para relacionar las partes entre sí (la cabeza
sobre el cuerpo, los brazos a los lados), nunca para ubicar la entidad en el mundo.

**Orientación.** Cilindros, conos y pirámides nacen con su eje alineado a Z. Para
reorientarlos existe `rotacion: [x, y, z]` en grados, que se aplica sobre los ejes
del mundo. Una moneda tumbada girando sobre su propio eje es invisible; para que
gire de canto hay que ponerla vertical primero:

```
objeto "disco" {
    forma: cilindro(3, 1);
    rotacion: [90, 0, 0];    # la pone de canto
    animacion "girar" { tipo: "rotacion"; eje: [0, 0, 1]; angulo: 360; duracion: 2s; }
}
```

---

## 9. Animaciones

Se declaran dentro de un `objeto`. Un mismo objeto puede tener varias.

```
animacion "girar" {
    tipo: "rotacion";
    eje: [0, 0, 1];
    angulo: 360;
    duracion: 2s;
    loop: true;
}
```

### Tipos implementados

| `tipo` | Efecto | Propiedades que usa |
|--------|--------|---------------------|
| `"rotacion"` | Giro continuo sobre un eje | `eje`, y `velocidad` o `angulo`+`duracion` |
| `"rotacion_ciclica"` | Oscilación entre dos ángulos | `eje`, `angulo: [min, max]`, `duracion` |
| `"traslacion_ciclica"` / `"flotar"` | Vaivén sobre un desplazamiento | `distancia`, `duracion` |
| `"orbital"` | Órbita circular en el plano XY | `radio`, `velocidad` o `duracion` |

### Cómo se determina la velocidad

Hay dos maneras de expresar lo mismo, y una tiene prioridad sobre la otra:

1. Si declaras `velocidad`, esa manda.
2. Si no, se deduce de `angulo` y `duracion`.
3. Si no hay ninguna, se usa 1 radián por segundo.

`velocidad` se interpreta en **radianes** por segundo salvo que lleve unidad de
grados: `velocidad: 90grados/s` equivale a 90 grados por segundo, mientras que
`velocidad: 90` serían 90 radianes por segundo (unos 5156 grados/s). La propiedad
`angulo` siempre se expresa en grados.

### Repetición

`loop: true`, o su ausencia, repite indefinidamente. `loop: false` ejecuta una sola
pasada —que dura `duracion`, o un ciclo completo si no se declaró— y luego congela
el objeto en el estado alcanzado.

---

## 10. Controles y física

El bloque `controles` dentro de una entidad la convierte en el personaje
controlable de la escena. Solo la primera entidad con controles se activa.

```
entidad Jugador {
    objeto "cuerpo" { forma: cubo(8, 8, 16); posicion: [0, 0, 8]; }
    controles {
        W: aplicar_fuerza [0, 12, 0];
        S: aplicar_fuerza [0, -10, 0];
        A: aplicar_fuerza [-12, 0, 0];
        D: aplicar_fuerza [12, 0, 0];
        ESPACIO: aplicar_impulso [0, 0, 14];
        R: recargar_escena;
    }
}
```

| Acción | Comportamiento |
|--------|----------------|
| `aplicar_fuerza [x,y,z]` | Acelera mientras la tecla se mantiene pulsada |
| `aplicar_impulso [x,y,z]` | Impulso único por pulsación, solo con apoyo en el suelo |
| `recargar_escena` | Devuelve al personaje a su posición inicial |

La gravedad sale de la declaración global `gravedad:` o de
`fisicas.activar_gravedad(...)` en la escena. El personaje se detiene en z = 0 y
choca contra las entidades marcadas como `estatica: true`.

El rozamiento es una constante interna del motor, no del lenguaje: la velocidad
máxima resulta de dividir la fuerza entre ese rozamiento.

---

## 11. Errores y cómo resolverlos

### Errores léxicos

Detienen el análisis en el primer carácter no reconocido. El mensaje indica el
carácter y la línea. Causa habitual: un signo menos fuera de un vector, o un
símbolo que no pertenece al lenguaje.

### Errores sintácticos

Detienen el análisis en el primer token inesperado. El mensaje indica el token, el
módulo del autómata y el estado en que se encontraba:

```text
Token 1: ENTIDAD (id=1) — Módulo: ENTIDAD, Estado: 21
```

Causas habituales: falta un punto y coma, falta una llave de cierre, o se usó una
palabra reservada como nombre.

### Errores semánticos

Se reportan todos juntos. Hay cuatro códigos:

| Código | Significado | Ejemplo de mensaje |
|--------|-------------|--------------------|
| **ES01** | Vector con número de componentes incorrecto | `posicion: vector con 2 componentes (se esperan 3)` |
| **ES02** | Valor fuera de rango | `color: componente 300 fuera de rango [0,255]` |
| **ES03** | Número de argumentos incorrecto en una forma | `cubo: 2 argumentos (se esperan 3)` |
| **ES04** | Instancia usada sin declarar | `instancia 'zzz' usada sin declaración previa` |

ES02 cubre tanto componentes de vector fuera de rango como valores escalares fuera
de rango (`masa`, `rebote`, `rugosidad`, `volumen`, `intensidad`, `angulo`).

### Rangos que se validan

| Propiedad | Rango |
|-----------|-------|
| `color` | 0 a 255 por componente |
| `iluminacion` | 0 a 1 por componente |
| `rebote`, `rugosidad`, `volumen`, `intensidad` | 0 a 1 |
| `angulo` | 0 a 360 |
| `masa` | 0.000000001 a 1000000000000 |

Vectores que deben tener exactamente 3 componentes: `posicion`, `gravedad`,
`iluminacion`, `color`, `objetivo`, `rotacion`.

---

## 12. Limitaciones conocidas

Esto es lo que el lenguaje acepta pero el compilador todavía no ejecuta, o lo que
directamente no se puede expresar. Conviene tenerlo presente para no perder tiempo
buscando un error que no existe.

**Se analizan pero no se ejecutan:**

- Los tipos de animación `onda`, `escalado_ciclico`, `escalado_estirar` y
  `color_pulse`.
- Los bloques `colision`: `al_colisionar_con` no dispara nada en tiempo de
  ejecución.
- Los bloques `comportamiento`, `sonido`, `audio` y `hud`.
- Las propiedades `masa`, `rebote` y `rugosidad`.
- La propiedad `material`, que es puramente descriptiva.

**Restricciones del lenguaje:**

- Los números negativos solo se admiten dentro de vectores.
- `W`, `S`, `A`, `D` y `R` son palabras reservadas por ser teclas de control, así
  que no pueden usarse como nombre de entidad ni de instancia.
- No hay rotación en las cajas de colisión: si se aplica `rotacion:` a una entidad
  `estatica`, su volumen de colisión no coincidirá con lo que se ve.
- Solo una entidad puede tener `controles` activos.
- Una esfera girando sobre cualquier eje es visualmente indistinguible de una
  quieta, por simetría. No es un fallo del compilador.

---

## 13. Referencia rápida

### Palabras clave por categoría

**Bloques:** `camara`, `entidad`, `escena`, `objeto`, `colision`, `sonido`,
`comportamiento`, `animacion`, `fisicas`, `controles`, `efectos`, `audio`, `hud`,
`ataque`

**Propiedades de objeto:** `forma`, `posicion`, `color`, `material`, `rotacion`

**Formas:** `cubo`, `esfera`, `cilindro`, `cono`, `piramide`

**Físicas:** `masa`, `estatica`, `rebote`, `rugosidad`, `gravedad`,
`gravedad_influencia`

**Animación:** `tipo`, `eje`, `velocidad`, `distancia`, `radio`, `duracion`,
`angulo`, `loop`, `factor`, `amplitud`, `easing`

**Globales:** `gravedad`, `iluminacion`

**Teclas reservadas:** `W`, `S`, `A`, `D`, `R`, `ESPACIO`, `SHIFT`

### Plantilla de partida

```
gravedad: [0, 0, -12.8];
iluminacion: [1.0, 1.0, 0.9];

entidad Suelo {
    objeto "piso" {
        forma: cubo(200, 200, 2);
        posicion: [0, 0, 0];
        color: [34, 139, 34];
    }
}

entidad Caja {
    objeto "cuerpo" {
        forma: cubo(10, 10, 10);
        posicion: [0, 0, 5];
        color: [200, 100, 50];
        animacion "girar" {
            tipo: "rotacion";
            eje: [0, 0, 1];
            angulo: 360;
            duracion: 3s;
            loop: true;
        }
    }
}

escena Mundo {
    Suelo s1;
    Caja c1;
    s1.set_posicion([0, 0, -1]);
    c1.set_posicion([0, 0, 0]);
}
```
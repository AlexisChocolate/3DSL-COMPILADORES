// ==================================================================
//  FASE 2 - ANALIZADOR SINTACTICO
//  Automata finito modular con pila de retorno. Depende de: tokens.js
// ==================================================================

// Varios puntos del lenguaje reutilizan los mismos estados: una propiedad
// `x: valor;` (12), una forma (33), una llamada a acción (45), un bloque
// `animacion` (34)... Son subrutinas del autómata, y al entrar en una hay que
// recordar dónde seguir al salir. Eso es una PILA DE RETORNO, igual que la de
// llamadas de una función: por eso un único registro no alcanzaba y hubo que
// inventar `animParentState` aparte cuando las animaciones se anidaron.
//
// Clave = estado subrutina. Valor = null si se entra desde cualquier estado,
// o la lista de estados desde los que esa entrada cuenta como llamada.
const ENTRADAS_SUBRUTINA = {
  12: null,   // prop: valor;
  33: null,   // forma: figura(...)
  17: null,   // camara → efectos → prop
  45: null,   // hub de acciones
  500: null,  // activar_si (se omite hasta el ;)
  34: null,   // bloque animacion
  14: [4,5]   // gravedad:/iluminacion: en INICIO entran a 14 sin pasar por 12
};

// Dónde continúa el bloque que contiene la sentencia. Por defecto es el propio
// estado (las listas de propiedades vuelven sobre sí mismas); los estados
// intermedios —la tecla en `controles`, el `obj.` de una llamada en escena—
// delegan en el estado que reanuda la lista.
const CONTINUACION_BLOQUE = {
  73: 71,                                    // W: accion...  → vuelve a la lista de teclas
  403: 44,                                   // obj.accion(...) dentro de al_colisionar
  4: 0, 5: 0,                                // gravedad:/iluminacion: → nivel superior
  986: 83, 90: 83, 91: 83, 94: 83, 95: 83, 96: 83   // llamadas dentro de escena
};

class AnalizadorSintactico {
  constructor() {
    this.modoActual = 'INICIO';
    this.estadoActual = 0;
    this.pilaRetorno = [];
    this.omitirHastaPComa = false;
    this.errorMsg = '';
    this.errorToken = -1;
    this._buildModulos();
  }

  _buildModulos() {
    this.modulos = {};
    const M = this.modulos;

    // Helper: build transition map
    function mod(name, initial, finals, triples) {
      const t = {};
      for (const [f, tok, to] of triples) {
        if (!t[f]) t[f] = {};
        t[f][tok] = to;
      }
      M[name] = { initial, finals: new Set(finals), trans: t };
    }

    // ===== INICIO =====
    mod('INICIO', 0, [0], [
      [0,CAMARA,1],[0,ENTIDAD,2],[0,ESCENA,3],[0,GRAVEDAD,4],[0,ILUMINACION,5],
      [4,DOS_PUNTOS,14],[5,DOS_PUNTOS,14],
      [14,VECTOR,15],[14,NUM,15],
      [15,PCOMA,0]
    ]);

    // ===== CAMARA =====
    mod('CAMARA', 11, [0], [
      [11,ALLAVE,11],[11,POSICION,12],[11,OBJETIVO,12],[11,DISTANCIA,12],
      [11,ANGULO,12],[11,MODO,12],[11,EFECTOS,13],[11,CLLAVE,0],
      [12,DOS_PUNTOS,14],
      [13,DOS_PUNTOS,136],[13,ALLAVE,16],
      [136,ALLAVE,16],
      [14,VECTOR,15],[14,CADENA,15],[14,VAR,15],[14,NUM,15],[14,NUM_CON_SUFIJO,15],
      [16,VIBRACION_COLISION,17],[16,ZOOM_DINAMICO,17],[16,CLLAVE,11],
      [17,DOS_PUNTOS,18],
      [18,BOOLEANO,15]
    ]);

    // ===== ENTIDAD =====
    const eT = [];
    const push = (f,t,to) => eT.push([f,t,to]);
    const pushM = (f,toks,to) => toks.forEach(t => eT.push([f,t,to]));

    push(21,VAR,22); push(22,ALLAVE,23);
    pushM(23,[OBJETO],30); pushM(23,[COLISION],40); pushM(23,[SONIDO],50);
    pushM(23,[COMPORTAMIENTO],60); pushM(23,[CONTROLES],70); pushM(23,[FISICAS],8);
    push(23,CLLAVE,0);
    // Generic prop:val
    push(12,DOS_PUNTOS,14);
    pushM(14,[VECTOR,CADENA,VAR,NUM,NUM_CON_SUFIJO,BOOLEANO],15);
    // OBJETO
    push(30,CADENA,31); push(31,ALLAVE,32);
    pushM(32,[FORMA],33); pushM(32,[POSICION,COLOR,MATERIAL,ROTACION],12);
    push(32,ANIMACION,34); push(32,CLLAVE,23);
    push(33,DOS_PUNTOS,35);
    pushM(35,[CUBO,ESFERA,CILINDRO,CONO,PIRAMIDE],36);
    push(36,APARENTESIS,37);
    pushM(37,[NUM,NUM_CON_SUFIJO],38);
    push(38,COMA,39); push(38,CPARENTESIS,15);
    pushM(39,[NUM,NUM_CON_SUFIJO],38);
    // ANIMACION
    push(34,CADENA,300); push(300,ALLAVE,301);
    const animP = [TIPO,TIPO_ANIM,AMPLITUD,FRECUENCIA,LOOP,EJE,DURACION,FACTOR,
                   EASING,CADA,RADIO,VELOCIDAD,COLORES,INTENSIDAD,ANGULO,DISTANCIA];
    pushM(301,animP,12);
    push(301,APLICAR_IMPULSO,45); push(301,APLICAR_FUERZA,45);
    push(301,ACTIVAR_SI,500);
    // COLISION
    push(40,ALLAVE,41);
    pushM(41,[FORMA],33); pushM(41,[TIPO,MATERIAL,REBOTE,RUGOSIDAD],12);
    push(41,AL_COLISIONAR_CON,42); push(41,AL_COLISIONAR,411); push(41,CLLAVE,23);
    push(411,DOS_PUNTOS,412); push(411,ALLAVE,44); push(412,ALLAVE,44);
    push(42,VAR,43); push(42,CADENA,43); push(43,ALLAVE,44);
    // Actions from state 44
    const acciones = [APLICAR_IMPULSO,REPRODUCIR_SONIDO,PERDER_VIDA,SUMAR_PUNTAJE,
      SPAWN_EFECTO,ANIMACION_TEMBLOR,RESTAR_VIDA,ACTIVAR_POWERUP,CAMBIAR_COLOR,
      REPRODUCIR_MUSICA,EFECTO_CAMARA,APLICAR_FUERZA,APLICAR_FUERZA_HACIA,SET_POSICION];
    pushM(44,acciones,45);
    push(44,DESTRUIR,200); push(44,RECOLECTAR,200); // zero-arg override
    push(44,DESTRUIR_SI,501); push(44,VAR,402); push(44,CAMARA,402); push(44,CLLAVE,41);
    push(402,PUNTO,403);
    pushM(403,[ACTIVAR_POWERUP,CAMBIAR_COLOR,EFECTO_CAMARA,VAR],45);
    // Action hub (state 45)
    push(45,APARENTESIS,46);
    pushM(45,[CADENA,NUM,NUM_CON_SUFIJO,VECTOR],490);
    push(45,VAR,45); push(45,PUNTO,400);
    pushM(46,[VECTOR,NUM,NUM_CON_SUFIJO,CADENA,VAR],47);
    push(47,CPARENTESIS,15); push(47,COMA,48);
    pushM(48,[VECTOR,NUM,NUM_CON_SUFIJO,CADENA,BOOLEANO,VAR],47);
    push(400,VAR,401); push(401,APARENTESIS,46);
    // SONIDO
    push(50,ALLAVE,51);
    pushM(51,[PISAR,VOLUMEN,PASO,ATAQUE,MUERTE],12); push(51,CLLAVE,23);
    // COMPORTAMIENTO
    push(60,ALLAVE,61);
    pushM(61,[FISICA_SIMULADA,GRAVEDAD_INFLUENCIA,FLOTAR,ROTAR,VAR],12);
    push(61,PATRON,62); push(61,ATAQUE,63); push(61,CLLAVE,23);
    push(62,CADENA,64); push(64,ALLAVE,65);
    push(65,ACTIVAR_SI,500);
    pushM(65,[APLICAR_FUERZA,APLICAR_FUERZA_HACIA],45);
    pushM(65,[VELOCIDAD_MAX,PUNTOS,VELOCIDAD,LOOP],12); push(65,CLLAVE,61);
    push(63,ALLAVE,66);
    pushM(66,[TIPO,DANO,COOLDOWN],12); push(66,ANIMACION,34); push(66,CLLAVE,61);
    // CONTROLES
    push(70,ALLAVE,71);
    pushM(71,[TW,TS,TA,TD,ESPACIO,SHIFT,TR],72); push(71,CLLAVE,23);
    push(72,DOS_PUNTOS,73);
    pushM(73,[APLICAR_FUERZA,APLICAR_IMPULSO,RECARGAR_ESCENA],45);
    // FISICAS
    push(8,ALLAVE,81); pushM(81,[MASA,ESTATICA],12); push(81,CLLAVE,23);
    // State 200 (destruir/recolectar zero-arg → expects PCOMA handled in verificarToken)

    mod('ENTIDAD', 21, [0], eT);

    // ===== ESCENA =====
    const sT = [];
    const sp = (f,t,to) => sT.push([f,t,to]);
    const spm = (f,toks,to) => toks.forEach(t => sT.push([f,t,to]));

    sp(81,VAR,82); sp(82,ALLAVE,83);
    sp(83,CAMARA,90); sp(83,FISICAS,91); sp(83,VAR,985);
    sp(83,ANIMACION,86); sp(83,AUDIO,87); sp(83,HUD,88);
    spm(83,[MOSTRAR_PUNTAJE,MOSTRAR_VIDAS,MOSTRAR_POWERUP,REPRODUCIR_MUSICA,SET_POSICION],45);
    sp(83,CLLAVE,0);
    sp(985,VAR,85); sp(985,PUNTO,986);
    spm(986,[SET_POSICION,INICIAR,ACTIVAR_GRAVEDAD,ACTIVAR_COLISIONES,ACTIVAR_VIENTO,
             ACTIVAR_POWERUP,CAMBIAR_COLOR,EFECTO_CAMARA,REPRODUCIR_MUSICA],45);
    sp(90,PUNTO,90); sp(90,INICIAR,45);
    sp(91,PUNTO,91);
    spm(91,[ACTIVAR_GRAVEDAD,ACTIVAR_COLISIONES,ACTIVAR_VIENTO],45);
    sp(85,VAR,92); sp(85,PCOMA,83); sp(85,COMA,93);
    sp(92,PCOMA,83); sp(92,COMA,93); sp(93,VAR,92);
    sp(86,PUNTO,94); sp(94,REPRODUCIR,45);
    sp(87,PUNTO,95); sp(95,REPRODUCIR_MUSICA,45);
    // Action hub (shared states for escena)
    sp(45,APARENTESIS,46);
    spm(45,[CADENA,NUM,NUM_CON_SUFIJO,VECTOR],490);
    spm(46,[VECTOR,NUM,NUM_CON_SUFIJO,CADENA,VAR,BOOLEANO],47);
    sp(47,CPARENTESIS,15); sp(47,COMA,48); sp(47,PUNTO,470); sp(470,VAR,47);
    spm(48,[VECTOR,NUM,NUM_CON_SUFIJO,CADENA,BOOLEANO,VAR],47);
    sp(48,LOOP,4700); sp(48,VOLUMEN,4700); sp(4700,IGUAL,48);
    sp(88,PUNTO,96);
    spm(96,[MOSTRAR_PUNTAJE,MOSTRAR_VIDAS,MOSTRAR_POWERUP],45);

    mod('ESCENA', 81, [0], sT);

    // ===== VECTOR =====
    mod('VECTOR_MOD', 100, [105], [
      [100,CORCHETE_ABRE,101],
      [101,NUM,102],[101,NUM_CON_SUFIJO,102],[101,VAR,102],[101,CORCHETE_ABRE,103],
      [102,COMA,104],[102,CORCHETE_CIERRA,105],
      [103,NUM,102],[103,NUM_CON_SUFIJO,102],[103,VAR,102],[103,CORCHETE_CIERRA,105],
      [104,NUM,102],[104,NUM_CON_SUFIJO,102],[104,VAR,102],[104,CORCHETE_ABRE,103]
    ]);
  }

  transitar(modo, estado, token) {
    const m = this.modulos[modo];
    if (m && m.trans[estado] && m.trans[estado][token] !== undefined)
      return m.trans[estado][token];
    return ERROR;
  }

  esFinal(modo, estado) {
    return this.modulos[modo] && this.modulos[modo].finals.has(estado);
  }

  cambiarModulo(token) {
    if (token === CAMARA) { this.modoActual='CAMARA'; this.estadoActual=11; return 11; }
    if (token === ENTIDAD) { this.modoActual='ENTIDAD'; this.estadoActual=21; return 21; }
    if (token === ESCENA) { this.modoActual='ESCENA'; this.estadoActual=81; return 81; }
    if (token === CORCHETE_ABRE) { this.modoActual='VECTOR_MOD'; this.estadoActual=100; return 100; }
    return ERROR;
  }

  // Entrar a una subrutina: guarda dónde continuar. Sustituye a la antigua
  // cadena de if/else que mezclaba casos de CAMARA, ENTIDAD y ESCENA.
  apilarRetorno(prev, nuevo) {
    if (prev === nuevo) return;                      // auto-transición, no es llamada
    const desde = ENTRADAS_SUBRUTINA[nuevo];
    if (desde === undefined) return;                 // el destino no es subrutina
    if (desde !== null && desde.indexOf(prev) === -1) return;
    const cont = CONTINUACION_BLOQUE[prev];
    this.pilaRetorno.push(cont !== undefined ? cont : prev);
  }

  // Salir de una subrutina. Con la pila vacía cae al nivel superior (0).
  desapilarRetorno() {
    return this.pilaRetorno.length ? this.pilaRetorno.pop() : 0;
  }

  verificarToken(token) {
    if (token===FIN) return this.esFinal(this.modoActual,this.estadoActual)?0:ERROR;

    if (this.omitirHastaPComa) {
      if (token===PCOMA) { this.omitirHastaPComa=false; this.estadoActual=this.desapilarRetorno(); }
      return this.estadoActual;
    }

    if (this.modoActual!=='INICIO' && this.esFinal(this.modoActual,this.estadoActual)) {
      this.modoActual='INICIO'; this.estadoActual=0;
    }

    // Animation block close
    if (this.estadoActual===301 && token===CLLAVE) {
      this.estadoActual=this.desapilarRetorno(); return this.estadoActual;
    }
    // destruir_si skip
    if (this.estadoActual===501) {
      if (token===PCOMA) this.estadoActual=44;
      return this.estadoActual;
    }
    // activar_si skip
    if (this.estadoActual===500) {
      if (token===PCOMA) this.estadoActual=this.desapilarRetorno();
      return this.estadoActual;
    }
    // Property value end
    if (this.estadoActual===15 && token===PCOMA) {
      this.estadoActual=this.desapilarRetorno(); return this.estadoActual;
    }
    // Zero-arg action end
    if (this.estadoActual===45 && token===PCOMA) {
      this.estadoActual=this.desapilarRetorno(); return this.estadoActual;
    }
    // Bare-arg end
    if (this.estadoActual===490 && token===PCOMA) {
      this.estadoActual=this.desapilarRetorno(); return this.estadoActual;
    }
    // Bare-arg + si/modo/al_otro [FIX]
    if (this.estadoActual===490 && (token===SI||token===MODO||token===AL_OTRO)) {
      if (token===SI||token===MODO) this.omitirHastaPComa=true;
      return this.estadoActual;
    }
    // Paren arg end
    if (this.estadoActual===47 && token===PCOMA) {
      this.estadoActual=this.desapilarRetorno(); return this.estadoActual;
    }
    // destruir/recolectar zero-arg end
    if (this.estadoActual===200 && token===PCOMA) {
      this.estadoActual=44; return 44;
    }
    // si conditional after value
    if (this.estadoActual===15 && token===SI) {
      this.omitirHastaPComa=true; return this.estadoActual;
    }
    // al_otro / modo / si after paren args
    if (this.estadoActual===47 && (token===AL_OTRO||token===MODO||token===SI)) {
      if (token===MODO||token===SI) this.omitirHastaPComa=true;
      return this.estadoActual;
    }

    const prev = this.estadoActual;
    let nuevo = this.transitar(this.modoActual, this.estadoActual, token);

    // Paréntesis vacíos: `accion()`. El retorno correcto ya está en la pila
    // desde que se entró a 45, así que aquí sólo hay que avanzar a 15.
    if (nuevo===ERROR && this.estadoActual===46) {
      if (token===CPARENTESIS) {
        this.estadoActual=15;
        return 15;
      }
      return this.estadoActual;
    }

    if (nuevo===ERROR) {
      // Un token de apertura (entidad/escena/camara/[) puede abrir otro módulo.
      // Guardamos dónde estábamos: si cambiarModulo nos deja en el MISMO sitio,
      // reintentar sería recursión infinita — p. ej. `entidad entidad X {}`
      // desbordaba la pila y tumbaba la página en vez de reportar el error.
      const modoPrevio = this.modoActual, estadoPrevio = this.estadoActual;
      const mr = this.cambiarModulo(token);
      if (mr!==ERROR &&
          !(this.modoActual===modoPrevio && this.estadoActual===estadoPrevio))
        return this.verificarToken(token);
      this.modoActual = modoPrevio; this.estadoActual = estadoPrevio;
      return ERROR;
    }

    // Module switch from INICIO
    if (this.modoActual==='INICIO') {
      if (nuevo===1) { this.modoActual='CAMARA'; nuevo=11; }
      else if (nuevo===2) { this.modoActual='ENTIDAD'; nuevo=21; }
      else if (nuevo===3) { this.modoActual='ESCENA'; nuevo=81; }
    }

    if (prev===47 && token===SI) {
      this.omitirHastaPComa=true; return this.estadoActual;
    }

    this.apilarRetorno(prev, nuevo);
    this.estadoActual = nuevo;
    return nuevo;
  }

  analizar(tokenIds) {
    this.modoActual='INICIO'; this.estadoActual=0;
    this.pilaRetorno=[]; this.omitirHastaPComa=false;
    this.errorMsg=''; this.errorToken=-1;

    for (let i = 0; i < tokenIds.length; i++) {
      const t = tokenIds[i];
      if (t === FIN) break;
      const r = this.verificarToken(t);
      if (r === ERROR) {
        this.errorToken = i;
        this.errorMsg = `Token ${i}: ${TOKEN_NAMES[t]||t} (id=${t}) — Módulo: ${this.modoActual}, Estado: ${this.estadoActual}`;
        return false;
      }
    }
    if (!this.esFinal(this.modoActual, this.estadoActual)) {
      this.errorMsg = `No se alcanzó estado final — Módulo: ${this.modoActual}, Estado: ${this.estadoActual}`;
      return false;
    }
    return true;
  }
}

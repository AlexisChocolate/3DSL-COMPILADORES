
function parseVec(vecStr) {
  const nums = vecStr.replace(/[\[\]]/g,'').split(',').map(s => parseFloat(s.trim()));
  return nums.filter(n => !isNaN(n));
}


function parseValorUnidad(lex) {
  const m = String(lex).match(/^([0-9]*\.?[0-9]+)(.*)$/);
  if (!m) return { valor: 0, unidad: '' };
  return { valor: parseFloat(m[1]), unidad: m[2].toLowerCase() };
}
function esGrados(unidad) {
  return unidad.indexOf('grado') === 0 || unidad.indexOf('deg') === 0 || unidad.indexOf('°') === 0;
}

function extractSceneData(toks) {
  const entities = {};
  const instances = [];
  const posOverrides = {};
  let cameraConfig = null;
  let i = 0;


  const globals = { gravedad: null, iluminacion: null };
  for (let g = 0; g + 2 < toks.length; g++) {
    if (toks[g].id===GRAVEDAD && toks[g+1].id===DOS_PUNTOS && toks[g+2].id===VECTOR)
      globals.gravedad = parseVec(toks[g+2].lexema);
    if (toks[g].id===ILUMINACION && toks[g+1].id===DOS_PUNTOS && toks[g+2].id===VECTOR)
      globals.iluminacion = parseVec(toks[g+2].lexema);
    if (toks[g].id===ACTIVAR_GRAVEDAD && toks[g+1].id===APARENTESIS && toks[g+2].id===VECTOR)
      globals.gravedad = parseVec(toks[g+2].lexema);
  }

  function leerControles(start) {
    const mapa = {};
    const TECLAS = {[TW]:'w',[TS]:'s',[TA]:'a',[TD]:'d',[ESPACIO]:' ',[SHIFT]:'shift',[TR]:'r'};
    let a = start;
    while (a<toks.length && toks[a].id!==ALLAVE) a++;
    let depth = 1; a++;
    while (a<toks.length && depth>0) {
      if (toks[a].id===ALLAVE) depth++;
      if (toks[a].id===CLLAVE) { depth--; if (depth===0) break; }
      if (TECLAS[toks[a].id] !== undefined && a+2<toks.length && toks[a+1].id===DOS_PUNTOS) {
        const tecla = TECLAS[toks[a].id];
        const accionTok = toks[a+2].id;
        let vec = [0,0,0];
        if (a+3<toks.length && toks[a+3].id===VECTOR) vec = parseVec(toks[a+3].lexema);
        if (accionTok===APLICAR_FUERZA || accionTok===APLICAR_IMPULSO)
          mapa[tecla] = { accion: accionTok===APLICAR_FUERZA ? 'fuerza' : 'impulso', vector: vec };
        else if (accionTok===RECARGAR_ESCENA)
          mapa[tecla] = { accion: 'recargar', vector: [0,0,0] };
      }
      a++;
    }
    return mapa;
  }

  while (i < toks.length) {
    // Camera block
    if (toks[i].id===CAMARA) {
      let a = i+1;
      while(a<toks.length && toks[a].id!==ALLAVE) a++;
      let aDepth=1; a++;
      cameraConfig = { posicion: null, objetivo: null, distancia: null };
      while(a<toks.length && aDepth>0) {
        if(toks[a].id===ALLAVE) aDepth++;
        if(toks[a].id===CLLAVE) { aDepth--; if(aDepth===0) { i=a; break; } }
        if(toks[a].id===POSICION && a+2<toks.length && toks[a+1].id===DOS_PUNTOS && toks[a+2].id===VECTOR)
          cameraConfig.posicion = parseVec(toks[a+2].lexema);
        if(toks[a].id===OBJETIVO && a+2<toks.length && toks[a+1].id===DOS_PUNTOS)
          cameraConfig.objetivo = toks[a+2].lexema;
        a++;
      }
      i++;
      continue;
    }
    // Entity definition
    if (toks[i].id===ENTIDAD && i+1<toks.length && toks[i+1].id===VAR) {
      const name = toks[i+1].lexema;
      i += 2;
      while (i<toks.length && toks[i].id!==ALLAVE) i++;
      i++; // skip {
      const ent = { objects: [] };
      let depth = 1, obj = null, objDepth = 0;
      while (i<toks.length && depth>0) {
        if (toks[i].id===ALLAVE) depth++;
        if (toks[i].id===CLLAVE) {
          depth--;
          if (obj && depth<objDepth) { ent.objects.push(obj); obj=null; }
          if (depth===0) break;
        }
        if (toks[i].id===OBJETO && i+1<toks.length && toks[i+1].id===CADENA) {
          if (obj) ent.objects.push(obj);
          obj = { name:toks[i+1].lexema, forma:null, posicion:[0,0,0], color:[128,128,128] };
          objDepth = depth+1;
        }
        // Bloque controles (nivel de entidad, fuera de cualquier objeto)
        if (!obj && toks[i].id===CONTROLES) ent.controles = leerControles(i);
        // fisicas { estatica: true; } → cuerpo inmóvil que sí bloquea al jugador
        if (!obj && toks[i].id===ESTATICA && i+2<toks.length &&
            toks[i+1].id===DOS_PUNTOS && toks[i+2].id===BOOLEANO)
          ent.estatica = (toks[i+2].lexema === 'true');
        if (obj) {
          if (toks[i].id===FORMA && i+2<toks.length && toks[i+1].id===DOS_PUNTOS) {
            const st = toks[i+2];
            if ([CUBO,ESFERA,CILINDRO,CONO,PIRAMIDE].includes(st.id)) {
              const args = []; let j=i+3;
              if (j<toks.length && toks[j].id===APARENTESIS) {
                j++;
                while (j<toks.length && toks[j].id!==CPARENTESIS) {
                  if (toks[j].id===NUM||toks[j].id===NUM_CON_SUFIJO) args.push(parseFloat(toks[j].lexema));
                  j++;
                }
              }
              obj.forma = { tipo:st.id, args };
            }
          }
          if (toks[i].id===POSICION && i+2<toks.length && toks[i+1].id===DOS_PUNTOS && toks[i+2].id===VECTOR)
            obj.posicion = parseVec(toks[i+2].lexema);
          if (toks[i].id===COLOR && i+2<toks.length && toks[i+1].id===DOS_PUNTOS && toks[i+2].id===VECTOR)
            obj.color = parseVec(toks[i+2].lexema);
          if (toks[i].id===ROTACION && i+2<toks.length && toks[i+1].id===DOS_PUNTOS && toks[i+2].id===VECTOR)
            obj.rotacion = parseVec(toks[i+2].lexema);   // grados sobre los ejes del mundo
          if (toks[i].id===ANIMACION && i+1<toks.length && toks[i+1].id===CADENA) {
            let animName = toks[i+1].lexema;
            let anim = { name: animName, tipo: null, eje: [0,0,1], velocidad: 1,
                         velocidadExplicita: false, distancia: [0,0,1], radio: 1,
                         anguloRad: null, anguloRango: null, duracion: null, loop: null };
            let a = i+2;
            while(a<toks.length && toks[a].id!==ALLAVE) a++;
            let aDepth=1; a++;
            while(a<toks.length && aDepth>0) {
              if(toks[a].id===ALLAVE) aDepth++;
              if(toks[a].id===CLLAVE) { aDepth--; if(aDepth===0) { i=a; break; } }
              if(toks[a].id===TIPO && a+2<toks.length && toks[a+1].id===DOS_PUNTOS && toks[a+2].id===CADENA)
                anim.tipo = toks[a+2].lexema;
              if(toks[a].id===EJE && a+2<toks.length && toks[a+1].id===DOS_PUNTOS && toks[a+2].id===VECTOR)
                anim.eje = parseVec(toks[a+2].lexema);
              if(toks[a].id===DISTANCIA && a+2<toks.length && toks[a+1].id===DOS_PUNTOS && toks[a+2].id===VECTOR)
                anim.distancia = parseVec(toks[a+2].lexema);
              if(toks[a].id===VELOCIDAD && a+2<toks.length && toks[a+1].id===DOS_PUNTOS) {
                // `90grados/s` se guarda como NUM_CON_SUFIJO: hay que convertir a rad/s
                const v = parseValorUnidad(toks[a+2].lexema);
                anim.velocidad = esGrados(v.unidad) ? v.valor*Math.PI/180 : v.valor;
                anim.velocidadExplicita = true;
              }
              if(toks[a].id===RADIO && a+2<toks.length && toks[a+1].id===DOS_PUNTOS)
                anim.radio = parseFloat(toks[a+2].lexema)||1;
              if(toks[a].id===DURACION && a+2<toks.length && toks[a+1].id===DOS_PUNTOS)
                anim.duracion = parseValorUnidad(toks[a+2].lexema).valor || null;
              if(toks[a].id===LOOP && a+2<toks.length && toks[a+1].id===DOS_PUNTOS && toks[a+2].id===BOOLEANO)
                anim.loop = (toks[a+2].lexema === 'true');
              if(toks[a].id===ANGULO && a+2<toks.length && toks[a+1].id===DOS_PUNTOS) {
                if (toks[a+2].id===VECTOR) {
                  const r = parseVec(toks[a+2].lexema);
                  if (r.length>=2) anim.anguloRango = [r[0]*Math.PI/180, r[1]*Math.PI/180];
                } else {
                  anim.anguloRad = parseValorUnidad(toks[a+2].lexema).valor*Math.PI/180;
                }
              }
              a++;
            }
            if(!obj.animaciones) obj.animaciones = [];
            obj.animaciones.push(anim);
          }
        }
        i++;
      }
      if (obj) ent.objects.push(obj);
      entities[name] = ent;
      continue;
    }
    // Scene block
    if (toks[i].id===ESCENA) {
      while (i<toks.length && toks[i].id!==ALLAVE) i++;
      i++; let depth=1;
      while (i<toks.length && depth>0) {
        if (toks[i].id===ALLAVE) depth++;
        if (toks[i].id===CLLAVE) { depth--; if(depth===0) break; }
        // Instance: VAR VAR [, VAR]*;
        if (toks[i].id===VAR && i+1<toks.length && toks[i+1].id===VAR) {
          const tipo = toks[i].lexema;
          let j=i+1;
          while (j<toks.length && toks[j].id===VAR) {
            instances.push({tipo, nombre:toks[j].lexema});
            if (j+1<toks.length && toks[j+1].id===COMA) j+=2; else { j++; break; }
          }
        }
        // Position: VAR.set_posicion(VECTOR);
        if (toks[i].id===VAR && i+1<toks.length && toks[i+1].id===PUNTO &&
            i+2<toks.length && toks[i+2].id===SET_POSICION) {
          const nm = toks[i].lexema;
          let j=i+3;
          while (j<toks.length && toks[j].id!==PCOMA) {
            if (toks[j].id===VECTOR) { posOverrides[nm]=parseVec(toks[j].lexema); break; }
            j++;
          }
        }
        i++;
      }
    }
    i++;
  }
  return { entities, instances, posOverrides, cameraConfig, globals };
}

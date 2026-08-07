// ==================================================================
//  FASE 3 - ANALIZADOR SEMANTICO
//  Valida rangos, aridades y referencias. Depende de: tokens.js
// ==================================================================

class AnalizadorSemantico {
  constructor() { this.errores = []; this.instancias = new Set(); }

  componentes(vec) {
    const out = []; let depth = 0, cur = '';
    for (let k = 0; k < vec.length; k++) {
      const c = vec[k];
      if (c==='[') { depth++; if (depth===1) continue; }
      if (c===']') { depth--; if (depth===0) { const t=cur.trim(); if(t) out.push(t); cur=''; continue; } }
      if (c===',' && depth===1) { out.push(cur.trim()); cur=''; continue; }
      if (depth>=1) cur += c;
    }
    return out;
  }

  esNumero(s) { if (!s || !s.trim()) return null; const v=parseFloat(s); return isNaN(v)?null:v; }
  esSubVector(s) { return s && s[0]==='['; }

  aridadVector(p) {
    if ([POSICION,GRAVEDAD,ILUMINACION,COLOR,OBJETIVO,ROTACION].includes(p)) return 3;
    return -1;
  }
  rangoComp(p) {
    if (p===COLOR||p===COLORES) return [0,255];
    if (p===ILUMINACION) return [0,1];
    return null;
  }
  aridadForma(s) {
    if (s===CUBO) return 3;
    if (s===ESFERA) return 1;
    if (s===CILINDRO||s===CONO||s===PIRAMIDE) return 2;
    return -1;
  }
  rangoEscalar(p) {
    if (p===MASA) return [1e-9,1e12];
    if (p===REBOTE||p===RUGOSIDAD||p===VOLUMEN||p===INTENSIDAD) return [0,1];
    if (p===ANGULO) return [0,360];
    return null;
  }
  nombreProp(t) {
    const m={[POSICION]:'posicion',[GRAVEDAD]:'gravedad',[ILUMINACION]:'iluminacion',
      [COLOR]:'color',[OBJETIVO]:'objetivo',[COLORES]:'colores',[MASA]:'masa',
      [REBOTE]:'rebote',[RUGOSIDAD]:'rugosidad',[VOLUMEN]:'volumen',
      [INTENSIDAD]:'intensidad',[ANGULO]:'angulo',[ROTACION]:'rotacion'};
    return m[t]||'propiedad';
  }
  nombreForma(t) {
    const m={[CUBO]:'cubo',[ESFERA]:'esfera',[CILINDRO]:'cilindro',[CONO]:'cono',[PIRAMIDE]:'piramide'};
    return m[t]||'forma';
  }

  analizar(toks) {
    this.errores = []; this.instancias = new Set();
    // Pass 1: collect instances
    for (let j=0; j+1<toks.length; j++) {
      if (toks[j].id===ENTIDAD && toks[j+1].id===VAR) this.instancias.add(toks[j+1].lexema);
      if (toks[j].id===VAR && toks[j+1].id===VAR) {
        let k=j+1;
        while (k<toks.length && toks[k].id===VAR) {
          this.instancias.add(toks[k].lexema);
          if (k+1<toks.length && toks[k+1].id===COMA) k+=2; else break;
        }
      }
    }
    // Pass 2: check rules
    for (let j=0; j<toks.length; j++) {
      const id = toks[j].id;
      // (A) vector arity + range
      if (this.aridadVector(id)>0 || id===COLORES) {
        let k=j+1;
        while (k<toks.length && toks[k].id===DOS_PUNTOS) k++;
        if (k<toks.length && toks[k].id===VECTOR) {
          const comps = this.componentes(toks[k].lexema);
          if (id===COLORES) {
            let colors = [];
            if (comps.length>0 && this.esSubVector(comps[0])) {
              colors = comps.map(sv => this.componentes(sv));
            } else { colors = [comps]; }
            for (const cl of colors) {
              if (cl.length!==3) this.errores.push({codigo:'ES01',linea:toks[k].linea,
                mensaje:`colores: color con ${cl.length} componentes (se esperan 3)`});
              for (const c of cl) { const v=this.esNumero(c); if(v!==null&&(v<0||v>255))
                this.errores.push({codigo:'ES02',linea:toks[k].linea,
                  mensaje:`colores: componente ${c} fuera de rango [0,255]`}); }
            }
          } else {
            const esp = this.aridadVector(id);
            if (comps.length!==esp) this.errores.push({codigo:'ES01',linea:toks[k].linea,
              mensaje:`${this.nombreProp(id)}: vector con ${comps.length} componentes (se esperan ${esp})`});
            const rng = this.rangoComp(id);
            if (rng) for (const c of comps) { const v=this.esNumero(c); if(v!==null&&(v<rng[0]||v>rng[1]))
              this.errores.push({codigo:'ES02',linea:toks[k].linea,
                mensaje:`${this.nombreProp(id)}: componente ${c} fuera de rango [${rng[0]},${rng[1]}]`}); }
          }
        } else if (k<toks.length && (toks[k].id===NUM) && id!==COLORES) {
          this.errores.push({codigo:'ES01',linea:toks[k].linea,
            mensaje:`${this.nombreProp(id)}: se esperaba un vector de ${this.aridadVector(id)} componentes, se recibió un escalar`});
        }
      }
      // (B) shape arity
      const af = this.aridadForma(id);
      if (af>0) {
        let k=j+1;
        if (k<toks.length && toks[k].id===APARENTESIS) {
          k++; let cnt=0;
          if (k<toks.length && toks[k].id===VECTOR) {
            cnt = this.componentes(toks[k].lexema).length;
          } else {
            while (k<toks.length && toks[k].id!==CPARENTESIS) {
              if (toks[k].id===NUM||toks[k].id===NUM_CON_SUFIJO) cnt++;
              k++;
            }
          }
          if (cnt!==af) this.errores.push({codigo:'ES03',linea:toks[j].linea,
            mensaje:`${this.nombreForma(id)}: ${cnt} argumentos (se esperan ${af})`});
        }
      }
      // (C) scalar range
      const sr = this.rangoEscalar(id);
      if (sr) {
        let k=j+1;
        while (k<toks.length && toks[k].id===DOS_PUNTOS) k++;
        if (k<toks.length && (toks[k].id===NUM||toks[k].id===NUM_CON_SUFIJO)) {
          const v=this.esNumero(toks[k].lexema);
          if (v!==null&&(v<sr[0]||v>sr[1])) this.errores.push({codigo:'ES02',linea:toks[k].linea,
            mensaje:`${this.nombreProp(id)}: valor ${toks[k].lexema} fuera de rango [${sr[0]},${sr[1]}]`});
        }
      }
      // (D) undeclared instance
      if (id===VAR && j+1<toks.length && toks[j+1].id===PUNTO) {
        if (!this.instancias.has(toks[j].lexema))
          this.errores.push({codigo:'ES04',linea:toks[j].linea,
            mensaje:`instancia '${toks[j].lexema}' usada sin declaración previa`});
      }
    }
    return this.errores;
  }
}

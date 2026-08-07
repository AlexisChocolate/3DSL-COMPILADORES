
function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab===name));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.id==='pane-'+name));
}

function setDot(tab, status) {
  const dot = document.querySelector(`.tab[data-tab="${tab}"] .dot`);
  if (dot) { dot.className = 'dot dot-'+status; }
}

function runAnalysis() {
  const src = document.getElementById('code').value;
  if (!src.trim()) return;

  // Reset
  ['lexico','sintactico','semantico','ejecucion'].forEach(t => setDot(t,'none'));

  // Fase 1: Léxico
  const lex = new AnalizadorLexico(src);
  const lexOk = lex.analizar();
  const pLex = document.getElementById('pane-lexico');

  if (!lexOk) {
    pLex.innerHTML = `<div class="msg msg-err">✗ Error Léxico: ${lex.error}</div>`;
    setDot('lexico','err');
    document.getElementById('pane-sintactico').innerHTML = '<div class="msg msg-info">El análisis sintáctico requiere que el léxico pase correctamente.</div>';
    document.getElementById('pane-semantico').innerHTML = '<div class="msg msg-info">El análisis semántico requiere que el sintáctico pase correctamente.</div>';
    document.getElementById('pane-ejecucion').innerHTML = '<div class="msg msg-info">La ejecución requiere que las 3 fases anteriores pasen.</div>';
    setDot('sintactico','none'); setDot('semantico','none'); setDot('ejecucion','none');
    switchTab('lexico');
    return;
  }

  // Token table
  const totalTokens = lex.tokensInfo.length;
  let tableHTML = `<div class="stats">
    <div class="stat"><div class="stat-val">${totalTokens}</div><div class="stat-label">Tokens generados</div></div>
    <div class="stat"><div class="stat-val">${lex.tokensInfo[lex.tokensInfo.length-1]?.linea||0}</div><div class="stat-label">Líneas procesadas</div></div>
  </div>
  <div class="msg msg-ok"><strong>Análisis Léxico Finalizado</strong> — ${totalTokens} tokens extraídos y procesados con éxito.</div>
  <div style="max-height:calc(100vh - 260px);overflow:auto">
  <table class="tok-table"><thead><tr><th class="ln">Lín</th><th class="tid">ID</th><th class="tname">Token</th><th class="lex">Lexema</th></tr></thead><tbody>`;
  for (const t of lex.tokensInfo) {
    if (t.id===FIN) continue;
    tableHTML += `<tr><td class="ln">${t.linea}</td><td class="tid">${t.id}</td><td class="tname">${TOKEN_NAMES[t.id]||'?'}</td><td class="lex">${escHtml(t.lexema)}</td></tr>`;
  }
  tableHTML += '</tbody></table></div>';
  pLex.innerHTML = tableHTML;
  setDot('lexico','ok');

  // Fase 2: Sintáctico
  const sint = new AnalizadorSintactico();
  let sintOk;
  try {
    sintOk = sint.analizar(lex.tokens);
  } catch (e) {
    // Red de seguridad: un fallo del autómata no debe dejar la página en blanco
    sintOk = false;
    sint.errorMsg = `Fallo interno del analizador: ${e.message}`;
  }
  const pSint = document.getElementById('pane-sintactico');

  if (!sintOk) {
    pSint.innerHTML = `<div class="msg msg-err">✗ Análisis Sintáctico FALLIDO</div>
      <div class="msg msg-warn">${escHtml(sint.errorMsg)}</div>
      <div class="msg msg-info">Verifica la estructura de tu código DSL. El autómata no pudo procesar el token indicado en el módulo y estado mostrados.</div>`;
    setDot('sintactico','err');
    document.getElementById('pane-semantico').innerHTML = '<div class="msg msg-info">El análisis semántico requiere que el sintáctico pase correctamente.</div>';
    document.getElementById('pane-ejecucion').innerHTML = '<div class="msg msg-info">La ejecución requiere que las 3 fases anteriores pasen.</div>';
    setDot('semantico','none'); setDot('ejecucion','none');
    switchTab('sintactico');
    return;
  }

  pSint.innerHTML = `<div class="msg msg-ok"><strong>Análisis Sintáctico Aprobado</strong> — La estructura modular de tu código es impecable.</div>
    <div class="msg msg-info">El autómata finito modular recorrió todos los tokens y alcanzó un estado final válido. Los módulos INICIO, CÁMARA, ENTIDAD, ESCENA y VECTOR procesaron la estructura correctamente.</div>`;
  setDot('sintactico','ok');

  // Fase 3: Semántico
  const sem = new AnalizadorSemantico();
  const errores = sem.analizar(lex.tokensInfo);
  const pSem = document.getElementById('pane-semantico');

  if (errores.length === 0) {
    pSem.innerHTML = `<div class="msg msg-ok"><strong>Análisis Semántico Aprobado</strong> — No se encontraron conflictos físicos o lógicos.</div>
      <div class="msg msg-info">Se verificaron reglas de aridad de vectores (ES01), rangos de valores (ES02), aridad de formas 3D (ES03) y declaración de instancias (ES04). Todo correcto.</div>`;
    setDot('semantico','ok');
  } else {
    let errHTML = `<div class="stats">
      <div class="stat"><div class="stat-val">${errores.length}</div><div class="stat-label">Errores semánticos</div></div>
    </div>
    <div class="msg msg-warn">⚠ Se encontraron ${errores.length} errores semánticos (recolección acumulativa)</div>
    <ul class="err-list">`;
    for (const e of errores) {
      errHTML += `<li><span class="code">[${e.codigo}]</span> <span class="line">Línea ${e.linea}</span> — <span class="emsg">${escHtml(e.mensaje)}</span></li>`;
    }
    errHTML += '</ul>';
    pSem.innerHTML = errHTML;
    setDot('semantico','err');

    document.getElementById('pane-ejecucion').innerHTML = '<div class="msg msg-info">La ejecución requiere que el análisis semántico pase sin errores.</div>';
    setDot('ejecucion','none');
    switchTab('semantico');
    return;
  }

  // Fase 4: Ejecución 3D
  const pExe = document.getElementById('pane-ejecucion');
  try {
    const sceneData = extractSceneData(lex.tokensInfo);
    const nObjs = Object.values(sceneData.entities).reduce((s,e)=>s+e.objects.length,0);
    if (nObjs === 0) {
      pExe.innerHTML = '<div class="msg msg-info">No se encontraron objetos con formas 3D para renderizar.</div>';
      setDot('ejecucion','warn');
    } else {
      pExe.innerHTML = '';
      renderScene(sceneData, pExe);
      setDot('ejecucion','ok');
    }
  } catch(e) {
    pExe.innerHTML = `<div class="msg msg-err">Error en el renderizado: ${escHtml(e.message)}</div>`;
    setDot('ejecucion','err');
  }

  switchTab('ejecucion');
}

function escHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

(function() {
  const sel = document.getElementById('examples');
  for (const name of Object.keys(EXAMPLES)) {
    const opt = document.createElement('option');
    opt.value = name; opt.textContent = name;
    sel.appendChild(opt);
  }
  sel.onchange = function() {
    if (this.value === "nuevo") {
      document.getElementById('code').value = "";
    } else if (this.value && EXAMPLES[this.value]) {
      document.getElementById('code').value = EXAMPLES[this.value];
    }
  };
  const ta = document.getElementById('code');
  ta.addEventListener('keyup', updateLineInfo);
  ta.addEventListener('click', updateLineInfo);
  ta.addEventListener('keydown', function(e) {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    const start = ta.selectionStart, end = ta.selectionEnd;
    if (e.shiftKey) {
      const lineStart = ta.value.lastIndexOf('\n', start - 1) + 1;
      const lineText = ta.value.slice(lineStart, start);
      const match = lineText.match(/^(\t| {1,4})/);
      if (match) {
        ta.value = ta.value.slice(0, lineStart) + ta.value.slice(lineStart + match[0].length);
        const removed = match[0].length;
        ta.selectionStart = ta.selectionEnd = Math.max(lineStart, start - removed);
      }
    } else {
      ta.value = ta.value.slice(0, start) + '    ' + ta.value.slice(end);
      ta.selectionStart = ta.selectionEnd = start + 4;
    }
    updateLineInfo();
  });
  function updateLineInfo() {
    const v = ta.value.substring(0, ta.selectionStart);
    const lines = v.split('\n');
    document.getElementById('lineInfo').textContent = `Línea ${lines.length}, Col ${lines[lines.length-1].length+1} · ${ta.value.length} caracteres`;
  }
  // Load first example
  sel.value = 'Cama';
  ta.value = EXAMPLES['Cama'];
})();

function toggleGrid() {
  if (!scene3d) return;
  const g = scene3d.getObjectByName('grid3d');
  if (g) {
    g.visible = !g.visible;
    const btn = document.getElementById('btnToggleGrid');
    if (g.visible) {
      btn.innerHTML = 'Ocultar cuadrícula';
      btn.classList.remove('active');
    } else {
      btn.innerHTML = 'Mostrar cuadrícula';
      btn.classList.add('active');
    }
  }
}

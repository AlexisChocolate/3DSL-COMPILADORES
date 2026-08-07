
class AnalizadorLexico {
  constructor(src) {
    this.src = src; this.i = 0; this.linea = 1; this.col = 1;
    this.tokens = []; this.tokensInfo = []; this.error = null;
  }
  peek() { return this.i < this.src.length ? this.src[this.i] : '\0'; }
  advance() {
    const c = this.src[this.i++];
    if (c === '\n') { this.linea++; this.col = 1; } else this.col++;
    return c;
  }
  skipWS() {
    while (this.i < this.src.length) {
      const c = this.peek();
      if (c === ' ' || c === '\t' || c === '\r' || c === '\n') this.advance();
      else if (c === '#') { while (this.i < this.src.length && this.peek() !== '\n') this.i++; }
      else break;
    }
  }
  getToken() {
    this.skipWS();
    if (this.i >= this.src.length) return { id: FIN, lex: '', ln: this.linea };
    const ln = this.linea;
    const s = this.src;
    // Multi-char operators
    if (s[this.i]==='>' && s[this.i+1]==='=') { this.i+=2; this.col+=2; return {id:OP_MAYOR_IGUAL,lex:'>=',ln}; }
    if (s[this.i]==='<' && s[this.i+1]==='=') { this.i+=2; this.col+=2; return {id:OP_MENOR_IGUAL,lex:'<=',ln}; }
    if (s[this.i]==='=' && s[this.i+1]==='=') { this.i+=2; this.col+=2; return {id:OP_IGUAL_IGUAL,lex:'==',ln}; }
    if (s[this.i]==='!' && s[this.i+1]==='=') { this.i+=2; this.col+=2; return {id:OP_DIFERENTE,lex:'!=',ln}; }
    // Vector [...]
    if (s[this.i] === '[') {
      let depth = 0, buf = '';
      do {
        if (s[this.i]==='[') depth++;
        else if (s[this.i]===']') depth--;
        if (s[this.i]==='\n') { this.linea++; this.col=1; } else this.col++;
        buf += s[this.i++];
      } while (depth > 0 && this.i < s.length);
      return {id:VECTOR, lex:buf, ln};
    }
    // Identifier / keyword
    if (/[a-zA-Z_]/.test(s[this.i])) {
      let buf = '';
      while (this.i < s.length && /[a-zA-Z0-9_]/.test(s[this.i])) { buf += s[this.i++]; this.col++; }
      if (buf === 'true' || buf === 'false') return {id:BOOLEANO, lex:buf, ln};
      if (KEYWORDS.hasOwnProperty(buf)) return {id:KEYWORDS[buf], lex:buf, ln};
      return {id:VAR, lex:buf, ln};
    }
    // Number (with optional suffix)
    if (/[0-9]/.test(s[this.i]) || (s[this.i]==='.' && this.i+1<s.length && /[0-9]/.test(s[this.i+1]))) {
      let buf = '', hasDot = false;
      while (this.i < s.length && (/[0-9]/.test(s[this.i]) || s[this.i]==='.')) {
        if (s[this.i]==='.') { if (hasDot) break; hasDot = true; }
        buf += s[this.i++]; this.col++;
      }
      if (this.i < s.length && /[a-zA-Z]/.test(s[this.i])) {
        while (this.i < s.length && /[a-zA-Z0-9/_]/.test(s[this.i])) { buf += s[this.i++]; this.col++; }
        return {id:NUM_CON_SUFIJO, lex:buf, ln};
      }
      return {id:NUM, lex:buf, ln};
    }
    // String
    if (s[this.i] === '"') {
      this.i++; this.col++; let buf = '';
      while (this.i < s.length && s[this.i] !== '"') { buf += s[this.i++]; this.col++; }
      if (this.i < s.length) { this.i++; this.col++; }
      return {id:CADENA, lex:buf, ln};
    }
    // Single-char symbols
    const syms = {'(':APARENTESIS,')':CPARENTESIS,'{':ALLAVE,'}':CLLAVE,'=':IGUAL,
      ';':PCOMA,',':COMA,':':DOS_PUNTOS,'.':PUNTO,'>':OP_MAYOR,'<':OP_MENOR,'/':SLASH};
    if (syms.hasOwnProperty(s[this.i])) {
      const c = s[this.i]; this.i++; this.col++;
      return {id:syms[c], lex:c, ln};
    }
    // Error
    const c = s[this.i]; this.i++; this.col++;
    return {id:ERROR, lex:c, ln};
  }
  analizar() {
    this.tokens = []; this.tokensInfo = []; this.error = null;
    while (true) {
      const t = this.getToken();
      if (t.id === ERROR) { this.error = `Carácter no reconocido '${t.lex}' en línea ${t.ln}`; return false; }
      this.tokens.push(t.id);
      this.tokensInfo.push({id:t.id, lexema:t.lex, linea:t.ln});
      if (t.id === FIN) break;
    }
    return true;
  }
}

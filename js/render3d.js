
let renderer3d=null, scene3d=null, camera3d=null, animFrame=null, teclaHandlers=null;

function createGeometry(forma) {
  if (!forma) return new THREE.BoxGeometry(5,5,5);
  const a = forma.args;
  switch(forma.tipo) {
    case CUBO: return new THREE.BoxGeometry(a[0]||5, a[1]||5, a[2]||5);
    case ESFERA: return new THREE.SphereGeometry(a[0]||5, 24, 24);
    case CILINDRO: return new THREE.CylinderGeometry(a[0]||3, a[0]||3, a[1]||10, 24);
    case CONO: return new THREE.ConeGeometry(a[0]||5, a[1]||10, 24);
    case PIRAMIDE: return new THREE.ConeGeometry(a[0]||5, a[1]||10, 4);
    default: return new THREE.BoxGeometry(5,5,5);
  }
}

function renderScene(data, container) {
  // Cleanup
  if (animFrame) cancelAnimationFrame(animFrame);
  if (renderer3d) { renderer3d.dispose(); renderer3d.domElement.remove(); }
  container.innerHTML = '';

  const canvas = document.createElement('canvas');
  canvas.id = 'canvas3d';
  container.appendChild(canvas);

  const w = container.clientWidth || 600;
  const h = container.clientHeight > 50 ? container.clientHeight - 40 : 400;
  canvas.width = w; canvas.height = h;

  scene3d = new THREE.Scene();
  scene3d.background = new THREE.Color(0x0b1120);

  camera3d = new THREE.PerspectiveCamera(50, w/h, 0.1, 5000);
  renderer3d = new THREE.WebGLRenderer({ canvas, antialias:true });
  renderer3d.setSize(w, h);
  renderer3d.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Scale factor
  const S = 1;
  let allPositions = [];
  let animatedMeshes = [];

  // Build scene objects
  const { entities, instances, posOverrides, cameraConfig, globals } = data;

  // Lights — la intensidad sale de `iluminacion: [r, g, b];` del DSL (rango 0..1)
  const il = (globals && globals.iluminacion) || [0.5, 0.8, 0.3];
  const ilProm = (il[0]+il[1]+il[2])/3 || 0.5;
  scene3d.add(new THREE.AmbientLight(0x4682B4, 0.5*ilProm + 0.15));
  const dl = new THREE.DirectionalLight(
    new THREE.Color(Math.min(1,il[0]||1), Math.min(1,il[1]||1), Math.min(1,il[2]||1)), 0.8);
  dl.position.set(50, 100, 80);
  scene3d.add(dl);
  const dl2 = new THREE.DirectionalLight(0x4682B4, 0.3*ilProm+0.1);
  dl2.position.set(-50, -30, 60);
  scene3d.add(dl2);

  // Grid
  const grid = new THREE.GridHelper(300, 30, 0x243352, 0x1a2540);
  grid.name = "grid3d";
  grid.rotation.x = Math.PI/2; // XY plane
  scene3d.add(grid);

  // Gira la malla sobre un eje del MUNDO (el que declara el DSL), no sobre sus ejes
  // locales. Es la diferencia clave: cilindros, conos y pirámides ya llegan rotados
  // 90° en X para pasar de Y-up a Z-up, así que sumar a mesh.rotation.z giraba en el
  // plano equivocado y además destruía esa corrección.
  // Debe declararse antes de addEntity, que ya lo usa para la orientación estática.
  const ejeTmp = new THREE.Vector3();
  function rotarEnEje(mesh, eje, delta) {
    if (!delta || !isFinite(delta)) return;
    const e = eje || [0,0,1];
    const len = Math.hypot(e[0]||0, e[1]||0, e[2]||0);
    if (!len) return;
    ejeTmp.set((e[0]||0)/len, (e[1]||0)/len, (e[2]||0)/len);
    mesh.rotateOnWorldAxis(ejeTmp, delta);
  }

  // Estado del jugador y de cuerpos estáticos
  let jugador = null;          // { group, controles, vel, bbox }
  const cajasEstaticas = [];   // AABB en coordenadas de mundo

  function addEntity(entName, worldPos) {
    const ent = entities[entName];
    if (!ent) return;
    const group = new THREE.Group();
    let minL = [Infinity,Infinity,Infinity], maxL = [-Infinity,-Infinity,-Infinity];
    for (const obj of ent.objects) {
      const geo = createGeometry(obj.forma);
      const c = obj.color || [128,128,128];
      const mat = new THREE.MeshPhongMaterial({
        color: new THREE.Color(c[0]/255, c[1]/255, c[2]/255),
        shininess: 30,
        transparent: true,
        opacity: 0.92
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.add(new THREE.LineSegments(
        new THREE.EdgesGeometry(geo),
        new THREE.LineBasicMaterial({color:0x4682B4, transparent:true, opacity:0.2})
      ));
      const p = obj.posicion || [0,0,0];
      mesh.position.set(p[0]*S, p[1]*S, p[2]*S);
      // Cylinder/cone are Y-up in Three.js, DSL uses Z-up
      if (obj.forma && [CILINDRO,CONO,PIRAMIDE].includes(obj.forma.tipo)) {
        mesh.rotation.x = Math.PI/2;
      }
      // Orientación estática declarada con `rotacion: [x, y, z];` (grados).
      // Se aplica DESPUÉS de la corrección Z-up y sobre ejes del mundo, para que
      // componga igual que las animaciones y el resultado sea predecible.
      if (obj.rotacion && obj.rotacion.length >= 3) {
        const gr = Math.PI/180;
        rotarEnEje(mesh, [1,0,0], (obj.rotacion[0]||0)*gr);
        rotarEnEje(mesh, [0,1,0], (obj.rotacion[1]||0)*gr);
        rotarEnEje(mesh, [0,0,1], (obj.rotacion[2]||0)*gr);
      }
      // Caja local del objeto, para colisiones y para el volumen del jugador
      geo.computeBoundingBox();
      const bb = geo.boundingBox;
      const half = [(bb.max.x-bb.min.x)/2, (bb.max.y-bb.min.y)/2, (bb.max.z-bb.min.z)/2];
      if (obj.forma && [CILINDRO,CONO,PIRAMIDE].includes(obj.forma.tipo)) {
        const t = half[1]; half[1] = half[2]; half[2] = t; // el mesh está rotado 90° en X
      }
      for (let k=0;k<3;k++) {
        minL[k] = Math.min(minL[k], p[k]-half[k]);
        maxL[k] = Math.max(maxL[k], p[k]+half[k]);
      }
      if (obj.animaciones && obj.animaciones.length > 0) {
        mesh.userData.animaciones = obj.animaciones;
        mesh.userData.basePosition = new THREE.Vector3(p[0]*S, p[1]*S, p[2]*S);
        animatedMeshes.push(mesh);
      }
      group.add(mesh);
      allPositions.push([worldPos[0]+p[0], worldPos[1]+p[1], worldPos[2]+p[2]]);
    }
    group.position.set(worldPos[0]*S, worldPos[1]*S, worldPos[2]*S);
    scene3d.add(group);

    if (ent.estatica && minL[0] !== Infinity) {
      cajasEstaticas.push({
        min: [minL[0]+worldPos[0], minL[1]+worldPos[1], minL[2]+worldPos[2]],
        max: [maxL[0]+worldPos[0], maxL[1]+worldPos[1], maxL[2]+worldPos[2]]
      });
    }
    if (ent.controles && !jugador && minL[0] !== Infinity) {
      jugador = {
        group,
        controles: ent.controles,
        vel: new THREE.Vector3(0,0,0),
        min: minL, max: maxL,          // volumen local respecto al origen de la entidad
        posInicial: group.position.clone(),
        enSuelo: false
      };
    }
  }

  if (instances.length > 0) {
    // Render instances from scene block
    for (const inst of instances) {
      const pos = posOverrides[inst.nombre] || [0,0,0];
      addEntity(inst.tipo, pos);
    }
  } else {
    // No scene block: render all entities at their default positions
    let offsetX = 0;
    for (const [name, ent] of Object.entries(entities)) {
      addEntity(name, [offsetX, 0, 0]);
      offsetX += 40;
    }
  }

  // Camera position based on scene bounds
  let maxDist = 50;
  for (const p of allPositions) {
    const d = Math.sqrt(p[0]*p[0]+p[1]*p[1]+p[2]*p[2]);
    if (d > maxDist) maxDist = d;
  }
  const camDist = maxDist * 2.5;

  // Orbit state
  let theta = Math.PI/4, phi = Math.PI/3;
  let dist = camDist;
  let target = new THREE.Vector3(0, 0, maxDist*0.3);

  if (cameraConfig && cameraConfig.posicion) {
    const cp = cameraConfig.posicion;
    target.set(0, 0, 0); 
    let dx = cp[0] - target.x, dy = cp[1] - target.y, dz = cp[2] - target.z;
    dist = Math.sqrt(dx*dx + dy*dy + dz*dz) || 1;
    phi = Math.acos(dz / dist);
    theta = Math.atan2(dy, dx);
  }

  function updateCam() {
    camera3d.position.set(
      target.x + dist*Math.sin(phi)*Math.cos(theta),
      target.y + dist*Math.sin(phi)*Math.sin(theta),
      target.z + dist*Math.cos(phi)
    );
    camera3d.up.set(0,0,1);
    camera3d.lookAt(target);
    renderer3d.render(scene3d, camera3d);
  }

  // Mouse orbit
  let drag=false, lastX=0, lastY=0;
  canvas.onmousedown = e => { drag=true; lastX=e.clientX; lastY=e.clientY; };
  canvas.onmousemove = e => {
    if (!drag) return;
    theta -= (e.clientX-lastX)*0.008;
    phi = Math.max(0.1, Math.min(Math.PI-0.1, phi+(e.clientY-lastY)*0.008));
    lastX=e.clientX; lastY=e.clientY; updateCam();
  };
  canvas.onmouseup = () => drag=false;
  canvas.onmouseleave = () => drag=false;
  canvas.onwheel = e => {
    dist = Math.max(10, Math.min(camDist*5, dist+e.deltaY*0.5));
    updateCam(); e.preventDefault();
  };
  // Touch support
  canvas.ontouchstart = e => {
    if(e.touches.length===1){drag=true;lastX=e.touches[0].clientX;lastY=e.touches[0].clientY;}
  };
  canvas.ontouchmove = e => {
    if(!drag||e.touches.length!==1) return;
    theta -= (e.touches[0].clientX-lastX)*0.008;
    phi = Math.max(0.1,Math.min(Math.PI-0.1,phi+(e.touches[0].clientY-lastY)*0.008));
    lastX=e.touches[0].clientX;lastY=e.touches[0].clientY;updateCam();e.preventDefault();
  };
  canvas.ontouchend = () => drag=false;

  const clock = new THREE.Clock();

  // Entrada de teclado (bloque controles del DSL)
  const teclas = {};
  if (teclaHandlers) {
    window.removeEventListener('keydown', teclaHandlers.down);
    window.removeEventListener('keyup', teclaHandlers.up);
    teclaHandlers = null;
  }
  if (jugador) {
    const nombreTecla = e => {
      if (e.key === ' ') return ' ';
      if (e.key === 'Shift') return 'shift';
      return e.key.toLowerCase();
    };
    // Si el foco está en el editor, las teclas son texto, no controles
    const enEditor = e => {
      const t = e.target;
      return t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' || t.tagName === 'SELECT');
    };
    const down = e => {
      if (enEditor(e)) return;
      const k = nombreTecla(e);
      if (!jugador.controles[k]) return;
      e.preventDefault();
      // `nueva` marca el flanco de subida: se reactiva sólo si la tecla estaba suelta,
      // así el impulso no se repite mientras se mantiene apretada pero sí al volver a pulsar
      if (!teclas[k] || !teclas[k].presionada) teclas[k] = { presionada:true, nueva:true };
    };
    const up = e => {
      if (enEditor(e)) return;
      const k = nombreTecla(e);
      if (teclas[k]) teclas[k].presionada = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    teclaHandlers = { down, up };
  }

  // Gravedad declarada en el DSL (`gravedad: [x,y,z];` o `fisicas.activar_gravedad(...)`)
  const G = (globals && globals.gravedad) || [0,0,0];

  function fisicaJugador(dt) {
    if (!jugador) return;
    const gp = jugador.group.position;
    const v = jugador.vel;

    // Aceleración: gravedad + fuerzas de las teclas mantenidas
    let ax = G[0], ay = G[1], az = G[2];
    for (const k in jugador.controles) {
      const t = teclas[k];
      if (!t || !t.presionada) continue;
      const c = jugador.controles[k];
      if (c.accion === 'fuerza') {
        ax += c.vector[0]; ay += c.vector[1]; az += c.vector[2];
      } else if (c.accion === 'impulso' && t.nueva) {
        // El impulso se aplica una sola vez por pulsación y sólo con apoyo en el suelo
        if (jugador.enSuelo) {
          v.x += c.vector[0]; v.y += c.vector[1]; v.z += c.vector[2];
        }
      } else if (c.accion === 'recargar' && t.nueva) {
        gp.set(jugador.posInicial.x, jugador.posInicial.y, jugador.posInicial.z);
        v.set(0,0,0);
      }
      t.nueva = false;
    }
    v.x += ax*dt; v.y += ay*dt; v.z += az*dt;

    // Rozamiento horizontal: sin él, `aplicar_fuerza` acelera indefinidamente.
    // La velocidad tope queda en fuerza/roce (con 12 y 1.5 → 8 u/s). Constante ajustable.
    const roce = jugador.enSuelo ? 1.5 : 0.3;
    v.x -= v.x*Math.min(1, roce*dt);
    v.y -= v.y*Math.min(1, roce*dt);

    // Integración eje por eje, revirtiendo el eje que choque contra un cuerpo estático
    const mover = (eje, delta) => {
      const antes = gp[eje];
      gp[eje] += delta;
      if (chocaEstatico()) { gp[eje] = antes; return true; }
      return false;
    };
    if (mover('x', v.x*dt)) v.x = 0;
    if (mover('y', v.y*dt)) v.y = 0;
    const chocoZ = mover('z', v.z*dt);
    if (chocoZ) { jugador.enSuelo = v.z < 0; v.z = 0; }

    // Suelo base en z=0 (la escena no simula el `colision` del Suelo todavía)
    if (gp.z + jugador.min[2] < 0) {
      gp.z = -jugador.min[2];
      v.z = 0; jugador.enSuelo = true;
    } else if (!chocoZ) {
      jugador.enSuelo = false;
    }
  }

  function chocaEstatico() {
    const gp = jugador.group.position;
    const mn = [gp.x+jugador.min[0], gp.y+jugador.min[1], gp.z+jugador.min[2]];
    const mx = [gp.x+jugador.max[0], gp.y+jugador.max[1], gp.z+jugador.max[2]];
    for (const c of cajasEstaticas) {
      if (mn[0]<c.max[0] && mx[0]>c.min[0] &&
          mn[1]<c.max[1] && mx[1]>c.min[1] &&
          mn[2]<c.max[2] && mx[2]>c.min[2]) return true;
    }
    return false;
  }

  // Animation loop
  // Periodo de un ciclo, en segundos. Una `velocidad` explícita manda sobre `duracion`;
  // si no hay ninguna, se cae al valor por defecto de velocidad (1 rad/s).
  function periodoAnim(anim) {
    if (anim.velocidadExplicita && anim.velocidad) return 2*Math.PI/Math.abs(anim.velocidad);
    if (anim.duracion) return anim.duracion;
    return 2*Math.PI/Math.abs(anim.velocidad || 1);
  }

  function animate() {
    const dt = Math.min(clock.getDelta(), 0.05); // evita saltos si la pestaña estuvo oculta
    fisicaJugador(dt);
    for (const mesh of animatedMeshes) {
      const anims = mesh.userData.animaciones;
      if (!mesh.userData.animEstado) mesh.userData.animEstado = [];
      for (let ai = 0; ai < anims.length; ai++) {
        const anim = anims[ai];
        // El estado va por malla, no por animación: varias instancias de la misma
        // entidad comparten el objeto `anim`, así que guardarlo ahí las anularía
        const est = mesh.userData.animEstado[ai] ||
                    (mesh.userData.animEstado[ai] = {angPrev:0, t:0, terminada:false});
        if (est.terminada) continue;

        // Manejo de loop y duración
        // `loop: true` (o ausente) repite indefinidamente. `loop: false` corre una sola
        // pasada: dura `duracion` si se declaró, o un ciclo completo si no, y luego
        // congela la malla en el estado alcanzado.
        const repite = anim.loop !== false;
        const periodo = periodoAnim(anim);
        let dtEf = dt;
        if (!repite) {
          const total = anim.duracion != null ? anim.duracion : periodo;
          if (est.t >= total) { est.terminada = true; continue; }
          dtEf = Math.min(dt, total - est.t);   // el último frame se recorta para
        }                                       // terminar exactamente en `total`
        est.t += dtEf;
        const t = est.t;                        // reloj propio, no el global

        if (anim.tipo === 'rotacion') {
          // Velocidad angular: la explícita manda; si no, se deduce de angulo/duracion
          let w = anim.velocidad;
          if (!anim.velocidadExplicita && anim.anguloRad != null && anim.duracion)
            w = anim.anguloRad / anim.duracion;
          rotarEnEje(mesh, anim.eje, w * dtEf);
        } else if (anim.tipo === 'rotacion_ciclica') {
          // Oscila dentro de `angulo: [min, max]` con periodo `duracion`
          const rango = anim.anguloRango || [-anim.velocidad*0.1, anim.velocidad*0.1];
          const centro = (rango[0]+rango[1])/2, semi = (rango[1]-rango[0])/2;
          const ang = centro + semi*Math.sin(2*Math.PI*t/periodo);
          rotarEnEje(mesh, anim.eje, ang - est.angPrev);
          est.angPrev = ang;
        } else if (anim.tipo === 'flotar' || anim.tipo === 'traslacion_ciclica' || anim.tipo === 'orbital') {
          const bp = mesh.userData.basePosition;
          const fase = 2*Math.PI*t/periodo;
          if (anim.tipo === 'orbital') {
             mesh.position.x = bp.x + Math.cos(fase) * anim.radio;
             mesh.position.y = bp.y + Math.sin(fase) * anim.radio;
          } else {
             const dx = anim.distancia[0]||0, dy = anim.distancia[1]||0, dz = anim.distancia[2]||0;
             mesh.position.x = bp.x + Math.sin(fase) * dx;
             mesh.position.y = bp.y + Math.sin(fase) * dy;
             mesh.position.z = bp.z + Math.sin(fase) * dz;
          }
        }
      }
    }
    updateCam();
    animFrame = requestAnimationFrame(animate);
  }
  animate();

  // Info
  const info = document.createElement('div');
  info.className = 'scene-info';
  const nEnts = Object.keys(entities).length;
  const nObjs = Object.values(entities).reduce((s,e)=>s+e.objects.length,0);
  const nInst = instances.length;
  info.innerHTML = `<span>${nEnts}</span> entidades · <span>${nObjs}</span> objetos · <span>${nInst||nEnts}</span> instancias · Arrastra para rotar, scroll para zoom` +
    (jugador ? ` · Controles: <span>${Object.keys(jugador.controles).map(k=>k===' '?'ESPACIO':k.toUpperCase()).join(' ')}</span> (si el cursor está en el editor, las teclas escriben texto)` : '');
  container.appendChild(info);

  // Handle resize
  const ro = new ResizeObserver(() => {
    const nw = container.clientWidth||600;
    const nh = container.clientHeight > 50 ? container.clientHeight - 40 : 400;
    camera3d.aspect = nw/nh;
    camera3d.updateProjectionMatrix();
    renderer3d.setSize(nw, nh);
    updateCam();
  });
  ro.observe(container);
}

// ==================================================================
//  EJEMPLOS PRECARGADOS
//  Solo datos: codigo fuente DSL de muestra. Sin dependencias.
// ==================================================================

const EXAMPLES = {
'Escena Completa (RPG)': `camara {
    posicion: [0, 0, 50];
    objetivo: Jugador;
    distancia: 60;
    angulo: [45, 0, 0];
    modo: "seguir";
    efectos: {
        vibracion_colision: true;
        zoom_dinamico: true;
    }
}

gravedad: [0, 0, -12.8];
iluminacion: [1.0, 1.0, 0.9];

entidad Suelo {
    objeto "piso" {
        forma: cubo(200, 200, 2);
        posicion: [0, 0, 0];
        color: [34, 139, 34];
        material: "cesped";
        animacion "ondular" {
            tipo: "onda";
            amplitud: 0.2;
            frecuencia: 2.0;
            loop: true;
        }
    }
    colision {
        forma: cubo(200, 200, 2);
        tipo: "solido";
        material: "tierra";
        rebote: 0.1;
        rugosidad: 0.9;
    }
    sonido {
        pisar: "paso_cesped.wav";
        volumen: 0.5;
    }
}

entidad Jugador {
    objeto "cuerpo" {
        forma: cubo(8, 8, 16);
        posicion: [0, 0, 8];
        color: [0, 100, 255];
        animacion "correr" {
            tipo: "rotacion_ciclica";
            eje: [0,0,1];
            angulo: [-5, 5];
            duracion: 0.3s;
            loop: true;
        }
        animacion "saltar" {
            tipo: "escalado_estirar";
            factor: [1, 1, 1.3];
            duracion: 0.2s;
            loop: false;
        }
    }
    objeto "cabeza" {
        forma: esfera(5);
        posicion: [0, 0, 21];
        color: [0, 100, 255];
    }
    objeto "brazo_izquierdo" {
        forma: cubo(3, 3, 12);
        posicion: [-5.5, 0, 9];
        color: [0, 100, 255];
    }
    objeto "brazo_derecho" {
        forma: cubo(3, 3, 12);
        posicion: [5.5, 0, 9];
        color: [0, 100, 255];
    }
    controles {
        W: aplicar_fuerza [0, 12, 0];
        S: aplicar_fuerza [0, -10, 0];
        A: aplicar_fuerza [-12, 0, 0];
        D: aplicar_fuerza [12, 0, 0];
        ESPACIO: aplicar_impulso [0, 0, 14] si (en_suelo o saltos_restantes > 0);
        SHIFT: aplicar_fuerza [0, 0, 20] modo "dash";
        R: recargar_escena;
    }
    colision {
        forma: cubo(8, 8, 16);
        tipo: "solido";
        material: "carne";
        rebote: 0.05;
        rugosidad: 0.6;
        al_colisionar_con Enemigo {
            aplicar_impulso [0, 0, 8] al_otro;
            reproducir_sonido "golpe.wav";
            perder_vida(1);
            animacion_temblor(0.5s);
        }
        al_colisionar_con Moneda {
            recolectar;
            reproducir_sonido "moneda.wav";
            sumar_puntaje(100);
        }
    }
}

entidad Moneda {
    objeto "disco" {
        forma: cilindro(3, 1);
        posicion: [0, 0, 0];
        rotacion: [90, 0, 0];
        color: [255, 215, 0];
        material: "oro";
        animacion "flotar" {
            tipo: "traslacion_ciclica";
            eje: [0, 0, 1];
            distancia: [0, 0, 2];
            duracion: 1.5s;
            loop: true;
            easing: "sine";
        }
        animacion "brillar" {
            tipo: "color_pulse";
            colores: [[255,215,0], [255,255,100], [255,215,0]];
            duracion: 0.8s;
            loop: true;
        }
        animacion "girar" {
            tipo: "rotacion";
            eje: [0,0,1];
            angulo: 360;
            duracion: 2s;
            loop: true;
        }
    }
    comportamiento {
        rotar: [0, 0, 5];
        atraer_jugador: true si distancia < 15;
    }
    colision {
        forma: esfera(4);
        tipo: "trigger";
        material: "metal_precioso";
        al_colisionar: {
            destruir;
            sumar_puntaje(100);
            spawn_efecto("estrella");
            reproducir_sonido("moneda.wav");
            animacion_camara("sacudida_leve");
        }
    }
}

entidad Enemigo {
    objeto "cuerpo" {
        forma: cubo(10, 10, 10);
        posicion: [0, 0, 5];
        color: [255, 0, 0];
        material: "metal";
        animacion "respirar" {
            tipo: "escalado_ciclico";
            factor: [1.05, 1.05, 1.02];
            duracion: 1.2s;
            loop: true;
        }
    }
    objeto "ojo" {
        forma: esfera(3);
        posicion: [0, 5, 7];
        color: [255, 255, 255];
    }
    comportamiento {
        fisica_simulada: true;
        gravedad_influencia: 1.0;
        patron "perseguir" {
            activar_si distancia(Jugador) < 30;
            aplicar_fuerza_hacia Jugador [8, 8, 0];
            velocidad_max: [6, 6, 0];
        }
        patron "patrullar" {
            puntos: [[50,0,7], [60,0,7], [50,0,7], [40,0,7]];
            velocidad: 3;
            loop: true;
        }
        ataque {
            tipo: "cuerpo_a_cuerpo";
            dano: 20;
            cooldown: 1.5s;
            animacion "embestir" {
                duracion: 0.4s;
                aplicar_impulso [0, 0, 12];
            }
        }
    }
    colision {
        forma: cubo(10, 10, 10);
        tipo: "solido";
        material: "acero";
        rebote: 0.2;
        rugosidad: 0.8;
        al_colisionar_con Jugador {
            aplicar_impulso [0, 0, 5] al_otro;
            restar_vida(20);
            reproducir_sonido "golpe_enemigo.wav";
            animacion_temblor(0.3s);
        }
    }
    sonido {
        paso: "paso_robot.wav";
        ataque: "golpe_metal.wav";
        muerte: "explosion.wav";
    }
}

entidad Muro {
    objeto "pared" {
        forma: cubo(5, 160, 20);
        posicion: [0, 0, 10];
        color: [120, 120, 120];
        material: "piedra";
    }
    colision {
        forma: cubo(5, 160, 20);
        tipo: "solido";
        material: "roca";
        rebote: 0.15;
        rugosidad: 0.85;
        al_colisionar_con "explosivo" {
            aplicar_fuerza [0, 0, 20] al_otro;
            destruir_si fuerza > 100;
        }
    }
    fisicas {
        masa: 1000;
        estatica: true;
    }
}

entidad MuroH {
    objeto "pared" {
        forma: cubo(160, 5, 20);
        posicion: [0, 0, 10];
        color: [120, 120, 120];
        material: "piedra";
    }
    colision {
        forma: cubo(160, 5, 20);
        tipo: "solido";
        material: "roca";
        rebote: 0.15;
        rugosidad: 0.85;
    }
    fisicas {
        masa: 1000;
        estatica: true;
    }
}

entidad PowerUp {
    objeto "cristal" {
        forma: esfera(4);
        color: [255, 0, 255];
        material: "cristal";
        animacion "flotar_brillar" {
            tipo: "orbital";
            radio: 2;
            velocidad: 90grados/s;
            loop: true;
        }
    }
    comportamiento {
        fisica_simulada: true;
        gravedad_influencia: 0.3;
        flotar: true;
        rotar: [5, 5, 5];
    }
    colision {
        forma: esfera(5);
        tipo: "trigger";
        al_colisionar: {
            destruir;
            Jugador.activar_powerup("super_salto", 10s);
            Jugador.cambiar_color([255,200,0]);
            reproducir_musica("powerup.wav");
            camara.efecto("desenfoque_radial", 0.5s);
        }
    }
}

escena juego1 {
    camara.iniciar();
    fisicas.activar_gravedad([0, 0, -12.8]);
    fisicas.activar_colisiones();
    fisicas.activar_viento([0.5, 0, 0]);
    Suelo s1;
    Jugador player1;
    Muro m1, m2;
    MuroH m3, m4;
    Moneda c1, c2, c3;
    Enemigo e1;
    PowerUp p1, p2;
    s1.set_posicion([0, 0, -1]);
    player1.set_posicion([0, 0, 0]);
    m1.set_posicion([80, 0, 0]);
    m2.set_posicion([-80, 0, 0]);
    m3.set_posicion([0, 80, 0]);
    m4.set_posicion([0, -80, 0]);
    c1.set_posicion([30, 20, 10]);
    c2.set_posicion([40, 25, 15]);
    c3.set_posicion([50, 20, 10]);
    e1.set_posicion([50, 0, 0]);
    p1.set_posicion([20, 15, 20]);
    p2.set_posicion([-20, 15, 20]);
    animacion.reproducir(player1.cuerpo, "correr", false);
    animacion.reproducir(player1.brazo_izquierdo, "balanceo_caminar", true);
    animacion.reproducir(player1.brazo_derecho, "balanceo_caminar", true);
    hud.mostrar_puntaje();
    hud.mostrar_vidas(3);
    hud.mostrar_powerup_timer();
    audio.reproducir_musica("tema_principal.mp3", loop=true, volumen=0.7);
}`,
'Cama': `entidad Cama {
    objeto "marco" {
        forma: cubo(44, 74, 4);
        posicion: [0, 0, 12];
        color: [139, 90, 43];
    }
    objeto "colchon" {
        forma: cubo(40, 70, 8);
        posicion: [0, 0, 18];
        color: [240, 240, 245];
    }
    objeto "cabecera" {
        forma: cubo(44, 4, 25);
        posicion: [0, -37, 24];
        color: [139, 90, 43];
    }
    objeto "almohada" {
        forma: cubo(20, 12, 5);
        posicion: [0, -28, 24];
        color: [255, 255, 255];
    }
    objeto "pata_1" {
        forma: cilindro(2, 12);
        posicion: [-20, 35, 6];
        color: [100, 60, 30];
    }
    objeto "pata_2" {
        forma: cilindro(2, 12);
        posicion: [20, 35, 6];
        color: [100, 60, 30];
    }
}`,
'Árbol': `entidad Arbol {
    objeto "tronco" {
        forma: cilindro(4, 25);
        posicion: [0, 0, 12];
        color: [101, 67, 33];
    }
    objeto "copa_baja" {
        forma: esfera(18);
        posicion: [0, 0, 32];
        color: [34, 139, 34];
    }
    objeto "copa_alta" {
        forma: esfera(12);
        posicion: [0, 0, 45];
        color: [0, 180, 0];
    }
}`,
'Muñeco de Nieve': `entidad Muneco {
    objeto "cuerpo" {
        forma: esfera(15);
        posicion: [0, 0, 15];
        color: [240, 240, 255];
    }
    objeto "cabeza" {
        forma: esfera(10);
        posicion: [0, 0, 35];
        color: [245, 245, 255];
    }
}`,
'Mesa': `entidad Mesa {
    objeto "superficie" {
        forma: cubo(50, 30, 3);
        posicion: [0, 0, 25];
        color: [160, 110, 60];
    }
    objeto "pata_1" {
        forma: cilindro(2, 25);
        posicion: [-22, -12, 12];
        color: [120, 80, 40];
    }
    objeto "pata_2" {
        forma: cilindro(2, 25);
        posicion: [22, -12, 12];
        color: [120, 80, 40];
    }
    objeto "pata_3" {
        forma: cilindro(2, 25);
        posicion: [-22, 12, 12];
        color: [120, 80, 40];
    }
    objeto "pata_4" {
        forma: cilindro(2, 25);
        posicion: [22, 12, 12];
        color: [120, 80, 40];
    }
}`,
'Hongo': `entidad Hongo {
    objeto "tallo" {
        forma: cilindro(4, 12);
        posicion: [0, 0, 6];
        color: [230, 220, 200];
    }
    objeto "sombrero" {
        forma: esfera(12);
        posicion: [0, 0, 16];
        color: [220, 40, 40];
    }
}`,
'Escalón': `entidad Escalon {
    objeto "piso_bajo" {
        forma: cubo(30, 20, 5);
        posicion: [0, 0, 2];
        color: [150, 150, 150];
    }
    objeto "piso_alto" {
        forma: cubo(30, 20, 5);
        posicion: [0, -20, 7];
        color: [170, 170, 170];
    }
}`,
'Cruz': `entidad Cruz {
    objeto "base" {
        forma: cilindro(10, 3);
        posicion: [0, 0, 1];
        color: [100, 100, 100];
    }
    objeto "vertical" {
        forma: cubo(6, 6, 40);
        posicion: [0, 0, 23];
        color: [200, 200, 200];
    }
    objeto "horizontal" {
        forma: cubo(30, 6, 6);
        posicion: [0, 0, 35];
        color: [200, 200, 200];
    }
}`,
'Setup Gamer': `entidad Escritorio {
    objeto "superficie" {
        forma: cubo(80, 50, 4);
        posicion: [0, 0, 35];
        color: [50, 50, 60];
    }
    objeto "pata_1" {
        forma: cilindro(2, 35);
        posicion: [-36, -21, 17];
        color: [40, 40, 50];
    }
    objeto "pata_2" {
        forma: cilindro(2, 35);
        posicion: [36, -21, 17];
        color: [40, 40, 50];
    }
    objeto "pata_3" {
        forma: cilindro(2, 35);
        posicion: [-36, 21, 17];
        color: [40, 40, 50];
    }
    objeto "pata_4" {
        forma: cilindro(2, 35);
        posicion: [36, 21, 17];
        color: [40, 40, 50];
    }
    objeto "pantalla" {
        forma: cubo(40, 3, 25);
        posicion: [0, -20, 52];
        color: [20, 20, 30];
    }
    objeto "soporte_monitor" {
        forma: cilindro(3, 12);
        posicion: [0, -20, 43];
        color: [60, 60, 70];
    }
    objeto "base_monitor" {
        forma: cilindro(10, 2);
        posicion: [0, -20, 38];
        color: [60, 60, 70];
    }
}

entidad Silla {
    objeto "asiento" {
        forma: cubo(35, 35, 4);
        posicion: [0, 30, 22];
        color: [30, 30, 40];
    }
    objeto "respaldo" {
        forma: cubo(35, 4, 35);
        posicion: [0, 48, 41];
        color: [30, 30, 40];
    }
    objeto "base_ruedas" {
        forma: cilindro(15, 2);
        posicion: [0, 30, 1];
        color: [50, 50, 60];
    }
    objeto "poste_silla" {
        forma: cilindro(3, 20);
        posicion: [0, 30, 12];
        color: [60, 60, 70];
    }
}

escena SetupGamer {
    Escritorio e1;
    Silla s1;
    e1.set_posicion([0, 0, 0]);
    s1.set_posicion([0, 30, 0]);
}`,
'Robot': `entidad Robot {
    objeto "cabeza" {
        forma: esfera(8);
        posicion: [0, 0, 52];
        color: [180, 180, 200];
    }
    objeto "ojo_izq" {
        forma: esfera(2);
        posicion: [-3, 6, 54];
        color: [0, 200, 255];
    }
    objeto "ojo_der" {
        forma: esfera(2);
        posicion: [3, 6, 54];
        color: [0, 200, 255];
    }
    objeto "torso" {
        forma: cubo(20, 12, 24);
        posicion: [0, 0, 34];
        color: [100, 100, 120];
    }
    objeto "brazo_izq" {
        forma: cilindro(3, 22);
        posicion: [-14, 0, 33];
        color: [140, 140, 160];
    }
    objeto "brazo_der" {
        forma: cilindro(3, 22);
        posicion: [14, 0, 33];
        color: [140, 140, 160];
    }
    objeto "pierna_izq" {
        forma: cilindro(3, 22);
        posicion: [-6, 0, 11];
        color: [100, 100, 120];
    }
    objeto "pierna_der" {
        forma: cilindro(3, 22);
        posicion: [6, 0, 11];
        color: [100, 100, 120];
    }
    objeto "pie_izq" {
        forma: cubo(8, 10, 3);
        posicion: [-6, 2, 1];
        color: [80, 80, 100];
    }
    objeto "pie_der" {
        forma: cubo(8, 10, 3);
        posicion: [6, 2, 1];
        color: [80, 80, 100];
    }
}`,
'Poste': `entidad Poste {
    objeto "base" {
        forma: cilindro(8, 2);
        posicion: [0, 0, 1];
        color: [80, 80, 80];
    }
    objeto "tubo" {
        forma: cilindro(2, 40);
        posicion: [0, 0, 22];
        color: [60, 60, 60];
    }
}`,
'Parque': `entidad Suelo {
    objeto "pasto" {
        forma: cubo(200, 200, 2);
        posicion: [0, 0, 1];
        color: [34, 139, 34];
    }
}

entidad Arbol {
    objeto "tronco" {
        forma: cilindro(4, 25);
        posicion: [0, 0, 14];
        color: [101, 67, 33];
    }
    objeto "copa" {
        forma: esfera(20);
        posicion: [0, 0, 35];
        color: [34, 139, 34];
    }
}

entidad Banca {
    objeto "asiento" {
        forma: cubo(30, 12, 3);
        posicion: [40, 0, 17];
        color: [139, 90, 43];
    }
    objeto "respaldo" {
        forma: cubo(30, 3, 15);
        posicion: [40, -6, 25];
        color: [139, 90, 43];
    }
    objeto "pata_izq" {
        forma: cilindro(2, 17);
        posicion: [28, 0, 8];
        color: [100, 60, 30];
    }
    objeto "pata_der" {
        forma: cilindro(2, 17);
        posicion: [52, 0, 8];
        color: [100, 60, 30];
    }
}

entidad Farola {
    objeto "poste" {
        forma: cilindro(2, 40);
        posicion: [-30, 20, 20];
        color: [60, 60, 60];
    }
    objeto "luz" {
        forma: esfera(5);
        posicion: [-30, 20, 42];
        color: [255, 230, 150];
    }
}

escena Parque {
    Suelo s1;
    Arbol a1, a2, a3;
    Banca b1;
    Farola f1;
    s1.set_posicion([0, 0, 1]);
    a1.set_posicion([20, 0, 10]);
    a2.set_posicion([-20, 0, 10]);
    a3.set_posicion([0, 0, 30]);
    b1.set_posicion([40, 0, 17]);
    f1.set_posicion([-30, 20, 20]);
}`,
'Sistema Solar (Animado)': `camara {
    posicion: [0, 80, 50];
    objetivo: "s1";
}

entidad SistemaSolar {
    objeto "sol" {
        forma: esfera(10);
        posicion: [0, 0, 0];
        color: [255, 200, 0];
        animacion "girar" {
            tipo: "rotacion";
            eje: [0, 0, 1];
            velocidad: 1.5;
        }
    }
    objeto "planeta" {
        forma: esfera(4);
        posicion: [0, 0, 0];
        color: [50, 100, 255];
        animacion "orbitar" {
            tipo: "orbital";
            radio: 30;
            velocidad: 2.0;
        }
    }
    objeto "luna" {
        forma: esfera(1.5);
        posicion: [0, 0, 0];
        color: [200, 200, 200];
        animacion "orbitar_luna" {
            tipo: "orbital";
            radio: 40;
            velocidad: 4.0;
        }
    }
}

escena Galaxia {
    SistemaSolar s1;
    s1.set_posicion([0, 0, 0]);
}`
};

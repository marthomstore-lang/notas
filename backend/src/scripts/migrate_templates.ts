import db from '../config/db';

const KINDER_REPORT_STRUCTURE = [
    {
        "ambito": "DESARROLLO PERSONAL Y SOCIAL",
        "nucleos": [
            {
                "name": "IDENTIDAD Y AUTONOMÍA",
                "oas": [
                    { "id": "oa2_1", "label": "OA2", "text": "Pide participar en juegos junto a algunos adultos o pares que no son parte del grupo o curso." },
                    { "id": "oa4_1", "label": "OA4", "text": "Utiliza, de manera autónoma, algunas estrategias para regular sus emociones o sentimientos." },
                    { "id": "oa5_1", "label": "OA5", "text": "Propone ideas (materiales, actividades, proyectos u otros) para desarrollar en diversas situaciones." },
                    { "id": "oa9_1", "label": "OA9", "text": "Realiza prácticas de higiene, alimentación y vestuario, por iniciativa propia, de manera autónoma." },
                    { "id": "oa13_1", "label": "OA13", "text": "Dramatiza situaciones, asumiendo una personificación o creando diálogos en situaciones cotidianas y juegos." }
                ]
            },
            {
                "name": "CONVIVENCIA Y CIUDADANÍA",
                "oas": [
                    { "id": "oa1_2", "label": "OA1", "text": "Cumple los roles o tareas comprometidas en actividades o juegos colaborativos en los que participa." },
                    { "id": "oa5_2", "label": "OA5", "text": "Realiza, de manera espontánea, acciones pacíficas para resolver un conflicto cotidiano con otros niños." },
                    { "id": "oa6_2", "label": "OA6", "text": "Cumple las normas creadas colaborativamente con pares y adultos, para el bienestar del grupo." },
                    { "id": "oa10_2", "label": "OA10", "text": "Respeta turnos de manera espontánea, en juegos y actividades cotidianas." }
                ]
            },
            {
                "name": "CORPORALIDAD Y MOVIMIENTO",
                "oas": [
                    { "id": "oa6_3", "label": "OA6", "text": "Combina, de forma autónoma y correcta, movimientos motrices finos que le permiten rasgar, plegar, construir, modelar, troquelar, recortar, bordar, pegar, dibujar, colorear, ensartar, trazar, escribir, entre otras, incorporando líneas curvas y mixtas." },
                    { "id": "oa7_3", "label": "OA7", "text": "Mantiene el equilibrio al adoptar posturas durante juegos y actividades cotidianas; por ejemplo, pararse en un pie, pararse en punta de pies, etc." },
                    { "id": "oa8_3", "label": "OA8", "text": "Ejecuta las posturas y movimientos que requiere para lograr sus objetivos al realizar acciones, como trepar sogas o escaleras, tirar la cuerda, entre otras." },
                    { "id": "oa9_3", "label": "OA9", "text": "Usa conceptos y nominaciones temporales como día/noche, hoy/mañana, antes/durante/después, en sus descripciones y relatos, durante situaciones cotidianas y juegos." }
                ]
            }
        ]
    },
    {
        "ambito": "COMUNICACIÓN INTEGRAL",
        "nucleos": [
            {
                "name": "LENGUAJE VERBAL",
                "oas": [
                    { "id": "oa3_4", "label": "OA3", "text": "Dice el fonema inicial y final de una palabra, a partir de canciones y juegos verbales. Relaciona (nombrando o pareando) palabras que tienen la misma sílaba inicial." },
                    { "id": "oa4_4", "label": "OA4", "text": "Explica el significado de una palabra nueva." },
                    { "id": "oa5_4", "label": "OA5", "text": "Relaciona las características de los textos que explora con el propósito que tienen (imágenes, títulos, formato, palabras conocidas, etc.)." },
                    { "id": "oa6_4", "label": "OA6", "text": "Explica el propósito de diferentes tipos de textos, según sus características y la información que entregan." },
                    { "id": "oa7_4", "label": "OA7", "text": "Lee vocales presentadas en diferentes formas (mayúsculas, minúsculas, imprenta y cursiva)." },
                    { "id": "oa8_4", "label": "OA8", "text": "Escribe algunas palabras significativas con todas las letras que lo componen; por ejemplo, su nombre." }
                ]
            },
            {
                "name": "LENGUAJE ARTÍSTICO",
                "oas": [
                    { "id": "oa3_5", "label": "OA3", "text": "Marca el ritmo con instrumentos musicales u objetos, en canciones interpretadas por sí mismo." },
                    { "id": "oa5_5", "label": "OA5", "text": "Combina líneas, formas, colores y texturas en sus creaciones de soporte en plano, para representar plásticamente emociones, ideas e intereses, incorporando detalles personales. Combina líneas, formas, colores y texturas en sus creaciones de soporte en volumen, para representar plásticamente emociones, ideas e intereses, incorporando algunos detalles personales. Crea diferentes producciones artísticas, utilizando técnicas o materiales de su agrado y elección, representando sus propios intereses e imaginación." },
                    { "id": "oa7_5", "label": "OA7", "text": "Dibuja varios elementos del entorno que son reconocibles por otros, incluyendo detalles como ventanas en las casas, ruedas en los autos, pétalos en las flores, entre otros, usando diversos tipos de materiales y soportes. Dibuja figuras humanas simples reconocibles por otros, incluyendo detalles como pestañas, cejas, nariz, codos, etc., en diversos soportes." }
                ]
            }
        ]
    },
    {
        "ambito": "INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO",
        "nucleos": [
            {
                "name": "EXPLORACIÓN DEL ENTORNO NATURAL",
                "oas": [
                    { "id": "oa1_6", "label": "OA1", "text": "Utiliza diversas fuentes y procedimientos para observar, manipular y buscar respuestas a sus preguntas sobre los cambios que ocurren." },
                    { "id": "oa2_6", "label": "OA2", "text": "Explica las causas de un fenómeno natural, a partir de lo que ha indagado, observado y experimentado." },
                    { "id": "oa6_6", "label": "OA6", "text": "Explica la relación entre las características de algunos animales y su hábitat." },
                    { "id": "oa7_6", "label": "OA7", "text": "Compara el proceso de crecimiento de personas, animales y plantas." },
                    { "id": "oa8_6", "label": "OA8", "text": "Explica los beneficios que tiene para el medio ambiente, realizar acciones como reciclar, reducir y reutilizar." },
                    { "id": "oa9_6", "label": "OA9", "text": "Representa gráficamente (mapas conceptuales, dibujos, tablas, fotografías u otros) los hallazgos obtenidos, explicando el proceso realizado." },
                    { "id": "oa10_6", "label": "OA10", "text": "Anticipa los resultados que podría obtener al combinar dos elementos en situaciones de experimentación directa." }
                ]
            },
            {
                "name": "COMPRENSIÓN DEL ENTORNO SOCIOCULTURAL",
                "oas": [
                    { "id": "oa1_7", "label": "OA1", "text": "Explica los diferentes roles que puede cumplir una persona en la sociedad; por ejemplo: “Soy hijo, hermano, nieto, amigo, estudiante, debo cumplir las normas en mi familia y en la escuela”." },
                    { "id": "oa4_7", "label": "OA4", "text": "Describe las necesidades y situaciones que cree motivaron la creación de ciertos inventos." },
                    { "id": "oa5_7", "label": "OA5", "text": "Describe algunos hechos significativos de su localidad y país (combate naval de Iquique), utilizando recursos como videos." }
                ]
            },
            {
                "name": "PENSAMIENTO MATEMÁTICO",
                "oas": [
                    { "id": "oa3_8", "label": "OA3", "text": "Utiliza dos o más conceptos de ubicación (dentro/fuera; encima/debajo/ entre; al frente de/detrás de), distancia (cerca/lejos) y dirección (adelante/ atrás/hacia el lado), al describir la posición de objetos y personas respecto de un punto u objeto de referencia." },
                    { "id": "oa4_8", "label": "OA4", "text": "Cuenta elementos para determinar en qué grupo hay “más”." },
                    { "id": "oa5_8", "label": "OA5", "text": "Utiliza conceptos de secuencia (antes/ahora/después/al mismo tiempo, día/noche), frecuencia (siempre/a veces/ nunca) y duración (larga/corta), al describir situaciones cotidianas." },
                    { "id": "oa6_8", "label": "OA6", "text": "Dice los números en orden desde el 1 hasta el 20 en situaciones cotidianas o juegos. Reconoce los números del 0 al 10. Cuenta del 1 al 10. Identifica posición de un número." },
                    { "id": "oa7_8", "label": "OA7", "text": "Utiliza grafismos simples (círculos, cruces, entre otras) para representar cantidades hasta el 10." }
                ]
            }
        ]
    }
];

const PREKINDER_REPORT_STRUCTURE = [
    {
        ambito: "DESARROLLO PERSONAL Y SOCIAL",
        nucleos: [
            {
                name: "IDENTIDAD Y AUTONOMÍA",
                oas: [
                    { id: "pk_dps_ia_oa1", label: "OA 1", text: "Señala (indica o nombra) la emoción o sentimiento que le provocan diversas narraciones o situaciones observadas." },
                    { id: "pk_dps_ia_oa2", label: "OA 2", text: "Participa en juegos o actividades junto a algunos adultos o pares que no son de su grupo o curso." },
                    { id: "pk_dps_ia_oa3", label: "OA 3", text: "Señala (indica o nombra) emociones o sentimientos en otros, a partir de narraciones o situaciones observadas." },
                    { id: "pk_dps_ia_oa5", label: "OA 5", text: "Plantea preferencias, opiniones e ideas, por iniciativa propia, en diversas situaciones cotidianas y juegos." },
                    { id: "pk_dps_ia_oa7", label: "OA 7", text: "Señala (indica o nombra) el rol que asume dentro de su familia (hijo/a, hermano/a, nieto/a, entre otros)." },
                    { id: "pk_dps_ia_oa8", label: "OA 8", text: "Señala (identifica o nombra) sus gustos y preferencias." },
                    { id: "pk_dps_ia_oa9", label: "OA 9", text: "Realiza prácticas de higiene, alimentación y vestuario, ante la sugerencia del adulto en situaciones cotidianas y juegos." }
                ]
            },
            {
                name: "CONVIVENCIA Y CIUDADANÍA",
                oas: [
                    { id: "pk_dps_cc_oa1", label: "OA 1", text: "Propone juegos o actividades para realizar con otros en forma espontánea." },
                    { id: "pk_dps_cc_oa3", label: "OA 3", text: "Comparte con otros materiales y pertenencias en distintas situaciones cotidianas." },
                    { id: "pk_dps_cc_oa5", label: "OA 5", text: "Señala (indica o nombra) el conflicto al que se enfrenta." },
                    { id: "pk_dps_cc_oa6", label: "OA 6", text: "Cumple algunas normas establecidas por otros, en juegos y situaciones cotidianas." },
                    { id: "pk_dps_cc_oa7", label: "OA 7", text: "Describe comportamientos y situaciones de riesgo que pueden atentar contra su bienestar y seguridad, o la de los demás, en contextos cotidianos o juegos." },
                    { id: "pk_dps_cc_oa10", label: "OA 10", text: "Acepta las decisiones de la mayoría, participando en juegos o actividades acordadas grupalmente." }
                ]
            },
            {
                name: "CORPORALIDAD Y MOVIMIENTO",
                oas: [
                    { id: "pk_dps_cm_oa1", label: "OA 1", text: "Describe qué acciones realiza junto a su familia para el cuidado de su cuerpo." },
                    { id: "pk_dps_cm_oa2", label: "OA 2", text: "Señala (indica o nombra) diversas acciones que puede realizar para cuidar su bienestar y apariencia personal (por ejemplo, bañarse, lavarse el pelo, cepillarse los dientes, etc.)." },
                    { id: "pk_dps_cm_oa3", label: "OA 3", text: "Señala (indica o nombra) partes más específicas de su cuerpo (por ejemplo, caderas, codos, muñecas, tobillos, talón) and su funcionalidad, en situaciones cotidianas y juegos." },
                    { id: "pk_dps_cm_oa6", label: "OA 6", text: "Realiza movimientos motrices finos cada vez más precisos y eficientes al dibujar libremente, colorear o rellenar dentro de algunos espacios sus propias creaciones." },
                    { id: "pk_dps_cm_oa7", label: "OA 7", text: "Mantiene el equilibrio al desplazarse siguiendo líneas rectas, curvas, zigzag o laberintos, en juegos o situaciones cotidianas." },
                    { id: "pk_dps_cm_oa9", label: "OA 9", text: "Realiza movimientos, posturas y desplazamientos, siguiendo instrucciones que involucran nociones espaciales como adelante/atrás/al lado/entre, usando como referencia la posición de su cuerpo, en situaciones cotidianas y lúdicas." }
                ]
            }
        ]
    },
    {
        ambito: "COMUNICACIÓN INTEGRAL",
        nucleos: [
            {
                name: "LENGUAJE VERBAL",
                oas: [
                    { id: "pk_ci_lv_oa1", label: "OA 1", text: "Pronuncia correctamente palabras sencillas." },
                    { id: "pk_ci_lv_oa2", label: "OA 2", text: "Responde preguntas explícitas a partir de un relato o explicación." },
                    { id: "pk_ci_lv_oa3_1", label: "OA 3", text: "Identifica (nombrando o pareando) palabras que riman." },
                    { id: "pk_ci_lv_oa3_2", label: "OA 3", text: "Separa (apuntando, aplaudiendo, graficando, nombrando, utilizando material concreto) las sílabas de las palabras, en situaciones de juego." },
                    { id: "pk_ci_lv_oa5", label: "OA 5", text: "Anticipa el contenido de los textos que explora, a partir de sus imágenes, en contextos cotidianos." },
                    { id: "pk_ci_lv_oa6", label: "OA 6", text: "Responde preguntas que hacen referencia al contenido explícito de un texto escuchado." },
                    { id: "pk_ci_lv_oa7_1", label: "OA 7", text: "Asocia el grafema con su correspondiente fonema de las vocales A-E." },
                    { id: "pk_ci_lv_oa7_2", label: "OA 7", text: "Reconoce su nombre escrito." },
                    { id: "pk_ci_lv_oa8_1", label: "OA 8", text: "Experimenta realizando trazos simples (rectos y curvos)." },
                    { id: "pk_ci_lv_oa8_2", label: "OA 8", text: "Escribe las vocales asociando el fonema que quiere representar A-E." },
                    { id: "pk_ci_lv_oa8_3", label: "OA 8", text: "Escribe su nombre." }
                ]
            },
            {
                name: "LENGUAJE ARTÍSTICO",
                oas: [
                    { id: "pk_ci_la_oa3", label: "OA 3", text: "Repite melodías o canciones, usando su voz, cuerpo, instrumentos musicales u objetos." },
                    { id: "pk_ci_la_oa4", label: "OA 4", text: "Usa gestos, movimientos, posturas, desplazamientos o la voz al imitar diferentes personajes, animales u objetos." },
                    { id: "pk_ci_la_oa5", label: "OA 5", text: "Incorpora líneas, formas, colores y texturas al crear sobre un soporte plano, para representar plásticamente emociones, ideas e intereses." },
                    { id: "pk_ci_la_oa6", label: "OA 6", text: "Combina materiales, técnicas y procedimientos en distintos lenguajes artísticos: visual, corporal o musical." },
                    { id: "pk_ci_la_oa7_1", label: "OA 7", text: "Usa trazos, formas y figuras para dibujar ideas, intereses y experiencias, dando nombre a sus creaciones." },
                    { id: "pk_ci_la_oa7_2", label: "OA 7", text: "Dibuja algunos elementos simples del entorno (sin incluir detalles) que son reconocibles por otros, usando diversos tipos de materiales y soportes." },
                    { id: "pk_ci_la_oa7_3", label: "OA 7", text: "Dibuja figuras humanas simples reconocibles por otros, incluyendo cabeza, tronco y extremidades, en diversos soportes." }
                ]
            }
        ]
    },
    {
        ambito: "INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO",
        nucleos: [
            {
                name: "EXPLORACIÓN DEL ENTORNO NATURAL",
                oas: [
                    { id: "pk_ice_een_oa1", label: "OA 1", text: "Explora el entorno, observando, manipulando y formulando preguntas sobre los cambios que ocurren en el entorno natural." },
                    { id: "pk_ice_een_oa6", label: "OA 6", text: "Describe características (reproducción, cubierta, desplazamiento, tamaño, morfología) de algunos animales." },
                    { id: "pk_ice_een_oa2", label: "OA 2", text: "Predice las consecuencias de un fenómeno natural que observa o conoce." },
                    { id: "pk_ice_een_oa7", label: "OA 7", text: "Nombra algunas características de personas en diferentes etapas de su proceso de crecimiento." },
                    { id: "pk_ice_een_oa8", label: "OA 8", text: "Describe algunas acciones que contribuyen al cuidado de ambientes sostenibles." },
                    { id: "pk_ice_een_oa9", label: "OA 9", text: "Representa (dibuja, dramatiza, fotografía, modela, entre otros) los hallazgos obtenidos y los instrumentos que utilizó al explorar el entorno." },
                    { id: "pk_ice_een_oa10", label: "OA 10", text: "Explora mezclas y disoluciones, describiendo semejanzas y diferencias entre ellas." }
                ]
            },
            {
                name: "COMPRENSIÓN DEL ENTORNO SOCIOCULTURAL",
                oas: [
                    { id: "pk_ice_ces_oa1", label: "OA 1", text: "Señala (indica o nombra) el rol que tiene cada integrante de su familia, tales como: padre, madre, abuela/o, hermana/o, hija/o, nieta/o, entre otros." },
                    { id: "pk_ice_ces_oa3", label: "OA 3", text: "Explica los beneficios del uso de algunos objetos tecnológicos." },
                    { id: "pk_ice_ces_oa4", label: "OA 4", text: "Describe características de algunas creaciones e inventos, explicando para qué sirven." },
                    { id: "pk_ice_ces_oa7", label: "OA 7", text: "Describe el servicio que cumplen algunas instituciones, organizaciones, lugares y obras de interés patrimonial que forman parte de su localidad." },
                    { id: "pk_ice_ces_oa8", label: "OA 8", text: "Describe lo que llama su atención sobre el aporte de algunas personas relevantes o personajes típicos de su comunidad." }
                ]
            },
            {
                name: "PENSAMIENTO MATEMÁTICO",
                oas: [
                    { id: "pk_ice_pm_oa1", label: "OA 1", text: "Extiende patrones de movimientos, gestos, sonidos, de material concreto o pictórico, de dos o tres elementos." },
                    { id: "pk_ice_pm_oa2_1", label: "OA 2", text: "Agrupa elementos por dos atributos que tienen en común (como forma, color, tamaño, función, masa o materialidad, entre otros), usando material concreto o pictórico." },
                    { id: "pk_ice_pm_oa2_2", label: "OA 2", text: "Ordena una serie, por ensayo y error, según longitud o capacidad para contener, usando material concreto o pictórico." },
                    { id: "pk_ice_pm_oa3", label: "OA 3", text: "Señala (indica o nombra) la posición de objetos y personas respecto de sí mismo, utilizando un concepto de ubicación (dentro/fuera; encima/debajo/ entre; al frente de/detrás de), distancia (cerca/lejos) y dirección (adelante/ atrás/hacia el lado), en situaciones cotidianas y lúdicas." },
                    { id: "pk_ice_pm_oa4", label: "OA 4", text: "Usa elementos concretos para representar un grupo con 'más', 'menos' o 'igual cantidad de elementos' que otro, en situaciones cotidianas." },
                    { id: "pk_ice_pm_oa5_1", label: "OA 5", text: "Ordena secuencias temporales de tres escenas o situaciones." },
                    { id: "pk_ice_pm_oa5_2", label: "OA 5", text: "Determina la frecuencia de acciones cotidianas usando conceptos como siempre/a veces/ nunca." },
                    { id: "pk_ice_pm_oa6_1", label: "OA 6", text: "Reconoce los números del 0-5." },
                    { id: "pk_ice_pm_oa6_2", label: "OA 6", text: "Cuenta elementos concretos (entre 1 y 10) determinando la cantidad, en situaciones cotidianas o juegos." },
                    { id: "pk_ice_pm_oa7_1", label: "OA 7", text: "Dispone la cantidad de elementos que indica un número, hasta el 5." },
                    { id: "pk_ice_pm_oa7_2", label: "OA 7", text: "Dibuja la cantidad de elementos que indica un número, hasta el 5." },
                    { id: "pk_ice_pm_oa10", label: "OA 10", text: "Nombra atributos (forma, cantidad de lados, caras) de figuras 2D." }
                ]
            }
        ]
    }
];

async function migrate() {
    try {
        console.log("Creando tabla report_templates...");
        await db.run(`
            CREATE TABLE IF NOT EXISTS report_templates (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                structure_json JSONB NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        console.log("Agregando columna report_template_id a levels...");
        await db.run(`
            ALTER TABLE levels 
            ADD COLUMN IF NOT EXISTS report_template_id INTEGER REFERENCES report_templates(id) ON DELETE SET NULL;
        `);

        console.log("Agregando columna template_id a personality_reports...");
        await db.run(`
            ALTER TABLE personality_reports 
            ADD COLUMN IF NOT EXISTS template_id INTEGER REFERENCES report_templates(id) ON DELETE SET NULL;
        `);

        console.log("Insertando plantilla por defecto para Kínder si no existe...");
        const existingKinder = await db.get("SELECT * FROM report_templates WHERE name = 'Informe de Kínder 2026'");
        
        if (!existingKinder) {
            await db.run(
                "INSERT INTO report_templates (name, structure_json) VALUES ($1, $2)", 
                ['Informe de Kínder 2026', JSON.stringify(KINDER_REPORT_STRUCTURE)]
            );
            console.log("Plantilla Kínder insertada con éxito.");
        } else {
            console.log("Plantilla Kínder ya existe.");
        }

        console.log("Insertando plantilla por defecto para Pre-Kínder si no existe...");
        const existingPreKinder = await db.get("SELECT * FROM report_templates WHERE name = 'Informe de Pre-Kínder 2026'");
        
        if (!existingPreKinder) {
            await db.run(
                "INSERT INTO report_templates (name, structure_json) VALUES ($1, $2)", 
                ['Informe de Pre-Kínder 2026', JSON.stringify(PREKINDER_REPORT_STRUCTURE)]
            );
            console.log("Plantilla Pre-Kínder insertada con éxito.");
        } else {
            console.log("Plantilla Pre-Kínder ya existe.");
        }

        console.log("Migración completada.");
        process.exit(0);
    } catch (err) {
        console.error("Error al migrar:", err);
        process.exit(1);
    }
}

migrate();

/**
 * Base de conocimiento de VetYa.
 * Todo el triaje sale de AQUÍ: reglas explícitas, revisables y deterministas.
 * La IA nunca decide el nivel de urgencia.
 *
 * AVISO: contenido orientativo de primeros auxilios. No sustituye una
 * consulta veterinaria. Ante duda, siempre acudir al veterinario.
 */

export const NIVELES = { verde: 0, amarillo: 1, rojo: 2 };

export const NIVEL_INFO = {
  rojo: {
    codigo: 'CRÍTICO',
    etiqueta: 'CORRE AHORA',
    resumen: 'Necesita atención veterinaria inmediata. No esperes a que mejore.',
    color: '#b3261e',
    seccion: 'Urgencia inmediata',
  },
  amarillo: {
    codigo: 'PRECAUCIÓN',
    etiqueta: 'ATIENDE HOY',
    resumen: 'Consulta hoy mismo. Si empeora, acude de inmediato.',
    color: '#b45309',
    seccion: 'Requiere atención hoy',
  },
  verde: {
    codigo: 'LEVE',
    etiqueta: 'PUEDE ESPERAR',
    resumen: 'Parece leve. Vigílalo y agenda cita si no mejora.',
    color: '#15803d',
    seccion: 'Molestias leves',
  },
};

/** Señales que por sí solas significan crítico. Se usan en el checklist. */
export const BANDERAS_ROJAS = [
  { id: 'respira', texto: '¿Le cuesta respirar o respira de forma extraña?' },
  { id: 'consciente', texto: '¿Está desmayado, no responde o no puede levantarse?' },
  { id: 'encias', texto: '¿Tiene las encías muy pálidas, blancas o azuladas?' },
  { id: 'sangre', texto: '¿Sangra mucho o no deja de sangrar?' },
  { id: 'veneno', texto: '¿Comió algo tóxico, veneno o un medicamento de humanos?' },
  { id: 'convulsion', texto: '¿Convulsiona, tiembla sin control o grita de dolor?' },
  { id: 'abdomen', texto: '¿Tiene el abdomen hinchado e intenta vomitar sin lograrlo?' },
  { id: 'trauma', texto: '¿Fue atropellado, se cayó de alto o recibió un golpe fuerte?' },
  { id: 'orina', texto: '¿Intenta orinar y no puede (sobre todo gatos machos)?' },
];

/**
 * Lista negra de tóxicos por especie.
 * `alias` sirve para detectar en el texto libre lo que escribió el dueño.
 * Nivel rojo = siempre emergencia. NO pasa por la IA.
 */
export const TOXICOS = [
  {
    id: 'chocolate',
    nombre: 'Chocolate o cacao',
    especies: ['perro', 'gato'],
    nivel: 'rojo',
    nota: 'La teobromina es peligrosa. El chocolate amargo, el cacao puro y el de repostería son los peores.',
    alias: ['chocolate', 'cacao', 'teobromina', 'chocolate negro', 'chocolate amargo'],
  },
  {
    id: 'uvas',
    nombre: 'Uvas o pasas',
    especies: ['perro', 'gato'],
    nivel: 'rojo',
    nota: 'Pueden dañar los riñones incluso en cantidades pequeñas.',
    alias: ['uva', 'uvas', 'pasa', 'pasas'],
  },
  {
    id: 'xilitol',
    nombre: 'Xilitol (chicles y dulces sin azúcar)',
    especies: ['perro', 'gato'],
    nivel: 'rojo',
    nota: 'Baja el azúcar en sangre muy rápido y puede dañar el hígado. Está en muchos chicles y dulces "sin azúcar".',
    alias: ['xilitol', 'chicle', 'chicles', 'sin azucar', 'edulcorante'],
  },
  {
    id: 'cebolla',
    nombre: 'Cebolla, ajo, cebollín o puerro',
    especies: ['perro', 'gato'],
    nivel: 'rojo',
    nota: 'Dañan los glóbulos rojos. Crudos, cocidos o en polvo son igual de peligrosos.',
    alias: ['cebolla', 'ajo', 'cebollin', 'puerro', 'ajo en polvo'],
  },
  {
    id: 'lirio',
    nombre: 'Lirio o azucena (lilium)',
    especies: ['gato'],
    nivel: 'rojo',
    nota: 'Extremadamente tóxico para gatos. Incluso el polen o el agua del florero pueden dañar el riñón.',
    alias: ['lirio', 'lirios', 'azucena', 'lilium', 'flor de pascua'],
  },
  {
    id: 'paracetamol',
    nombre: 'Paracetamol, acetaminofén o ibuprofeno',
    especies: ['perro', 'gato'],
    nivel: 'rojo',
    nota: 'NUNCA le des medicamentos de humanos. En gatos una sola tableta de paracetamol puede ser mortal.',
    alias: ['paracetamol', 'acetaminofen', 'ibuprofeno', 'aspirina', 'naproxeno', 'medicamento humano', 'pastilla'],
  },
  {
    id: 'raticida',
    nombre: 'Raticida o veneno para ratas',
    especies: ['perro', 'gato'],
    nivel: 'rojo',
    nota: 'Provoca hemorragias internas que aparecen días después. Aunque se vea bien, hay que tratarlo ya.',
    alias: ['raticida', 'veneno para ratas', 'mataratas', 'warfarina', 'bromadiolona', 'veneno'],
  },
  {
    id: 'anticongelante',
    nombre: 'Anticongelante o refrigerante',
    especies: ['perro', 'gato'],
    nivel: 'rojo',
    nota: 'Sabe dulce y por eso lo lamen. Daña los riñones muy rápido: las primeras horas son críticas.',
    alias: ['anticongelante', 'refrigerante', 'etilenglicol', 'agua del radiador'],
  },
  {
    id: 'marihuana',
    nombre: 'Marihuana o comestibles con cannabis',
    especies: ['perro', 'gato'],
    nivel: 'rojo',
    nota: 'Los comestibles son especialmente peligrosos. No regañes a la mascota: el veterinario necesita la verdad para tratarla.',
    alias: ['marihuana', 'cannabis', 'porro', 'comestible', 'brownie', 'hash'],
  },
  {
    id: 'organofosforado',
    nombre: 'Insecticida o pesticida',
    especies: ['perro', 'gato'],
    nivel: 'rojo',
    nota: 'Los organofosforados causan salivación intensa, temblores y pupilas pequeñas.',
    alias: ['insecticida', 'pesticida', 'organofosforado', 'veneno para insectos', 'fumigacion'],
  },
  {
    id: 'alcohol',
    nombre: 'Alcohol (cerveza, vino, licor, repostería)',
    especies: ['perro', 'gato'],
    nivel: 'rojo',
    nota: 'Los animales pequeños se intoxican con muy poco.',
    alias: ['alcohol', 'cerveza', 'vino', 'tequila', 'licor', 'ron', 'vodka'],
  },
  {
    id: 'metaldehido',
    nombre: 'Cebo para babosas o caracoles',
    especies: ['perro', 'gato'],
    nivel: 'rojo',
    nota: 'Causa temblores y convulsiones muy rápidamente.',
    alias: ['caracol', 'babosa', 'cebo para babosas', 'metaldehido'],
  },
  {
    id: 'baterias',
    nombre: 'Pila, batería o moneda',
    especies: ['perro', 'gato'],
    nivel: 'rojo',
    nota: 'Se atora y quema por dentro. No esperes a que "la expulse".',
    alias: ['pila', 'pilas', 'bateria', 'baterias', 'moneda', 'monedas'],
  },
  {
    id: 'aceites',
    nombre: 'Aceites esenciales (menta, eucalipto, árbol de té)',
    especies: ['gato'],
    nivel: 'rojo',
    nota: 'Los gatos casi no pueden procesarlos. También son peligrosos aplicados sobre la piel.',
    alias: ['aceite esencial', 'tea tree', 'arbol de te', 'eucalipto', 'menta', 'lavanda', 'difusor'],
  },
  {
    id: 'masa',
    nombre: 'Masa cruda con levadura',
    especies: ['perro', 'gato'],
    nivel: 'rojo',
    nota: 'La levadura fermenta dentro del estómago y produce alcohol, además de inflar el abdomen.',
    alias: ['masa cruda', 'masa de pan', 'levadura', 'pan crudo'],
  },
  {
    id: 'aguacate',
    nombre: 'Aguacate (hueso y hojas)',
    especies: ['perro'],
    nivel: 'amarillo',
    nota: 'En perros suele causar malestar estomacal. El hueso además puede atorarse.',
    alias: ['aguacate', 'persina', 'hueso de aguacate'],
  },
];

/** Catálogo de síntomas. Se muestran agrupados por nivel de urgencia. */
export const SINTOMAS = [
  // ------ Urgencia inmediata ------
  {
    id: 'no_respira',
    label: 'No respira o respira con esfuerzo',
    breve: 'Ahogo, encías azuladas o respiración muy trabajosa.',
    nivel: 'rojo',
    motivos: ['La respiración comprometida es una urgencia vital: no hay minutos que perder.'],
    pasos: [
      'Revisa su boca y nariz: si ves algo visible que le estorba, retíralo con cuidado.',
      'Mantén el cuello recto y el pecho despejado. No lo aprietes.',
      'Llévalo de inmediato al veterinario. Transpórtalo sobre una superficie firme y plana.',
    ],
  },
  {
    id: 'inconciente',
    label: 'Está desmayado o no responde',
    breve: 'No reacciona a tu voz ni intenta levantarse.',
    nivel: 'rojo',
    motivos: ['Un animal que no responde puede estar en choque o con un problema neurológico grave.'],
    pasos: [
      'Acuéstalo de lado con el cuello extendido y abrígalo.',
      'Comprueba que respire: mira si el pecho sube y baja.',
      'No le des agua ni comida. Trasládalo de inmediato al veterinario.',
    ],
  },
  {
    id: 'convulsion',
    label: 'Convulsiona o tiembla sin control',
    breve: 'Movimientos involuntarios o temblores intensos.',
    nivel: 'rojo',
    motivos: ['Las convulsiones pueden indicar intoxicación o daño neurológico.'],
    pasos: [
      'No le metas los dedos en la boca ni lo sujetes con fuerza.',
      'Retira muebles u objetos con los que pueda golpearse.',
      'Cronometra cuánto dura y traslada al veterinario en cuanto termine.',
    ],
  },
  {
    id: 'sangrado',
    label: 'Sangra y no deja de sangrar',
    breve: 'Hemorragia activa que no se detiene.',
    nivel: 'rojo',
    motivos: ['Una hemorragia que no se detiene puede provocar choque.'],
    pasos: [
      'Haz presión firme y directa con una gasa o trapo limpio durante 3 a 5 minutos sin levantar.',
      'Si se empapa, pon otra encima sin retirar la primera.',
      'Traslada al veterinario de inmediato. No pongas torniquete salvo sangrado masivo.',
    ],
  },
  {
    id: 'sangre_heces',
    label: 'Vómito o diarrea con sangre',
    breve: 'Sangre visible en lo que expulsa.',
    nivel: 'rojo',
    motivos: ['La sangre en vómito o heces puede indicar sangrado interno o intoxicación.'],
    pasos: [
      'No le des comida, agua ni medicamentos.',
      'Guarda una muestra en una bolsa limpia para que la vea el veterinario.',
      'Anota la hora de inicio y traslada de inmediato.',
    ],
  },
  {
    id: 'toxicos',
    label: 'Comió algo tóxico o un medicamento',
    breve: 'Veneno, planta, alimento prohibido o pastilla.',
    nivel: 'rojo',
    preguntas: [
      {
        id: 'sustancia',
        label: '¿Qué se comió?',
        tipo: 'toxicos',
        notaSinRespuesta: 'Si no sabes qué fue, trátalo como emergencia igual.',
      },
      {
        id: 'cuando',
        label: '¿Hace cuánto tiempo?',
        opciones: [
          { id: 'min', label: 'Menos de 30 minutos', delta: 0 },
          { id: 'horas', label: 'De 30 minutos a 2 horas', delta: 0 },
          { id: 'mucho', label: 'Hace más de 2 horas', delta: 0 },
        ],
      },
    ],
    motivos: ['Una intoxicación empeora con el tiempo: las primeras horas son las más importantes.'],
    pasos: [
      'NO induzcas el vómito por tu cuenta: con algunos productos (derivados del petróleo, ácidos) es más peligroso.',
      'Guarda el empaque, el frasco o el resto para que el veterinario sepa qué fue.',
      'Anota la hora y la cantidad aproximada, y traslada de inmediato a una veterinaria con urgencias.',
    ],
  },
  {
    id: 'abdomen',
    label: 'Abdomen hinchado e intenta vomitar sin lograrlo',
    breve: 'Vientre distendido y arcadas sin producto.',
    nivel: 'rojo',
    motivos: ['Puede ser una torsión de estómago, que es mortal en pocas horas.'],
    pasos: [
      'No le des agua ni comida.',
      'No presiones ni masajees el abdomen.',
      'Llévalo de inmediato en auto o taxi. No esperes a ver si mejora.',
    ],
  },
  {
    id: 'trauma',
    label: 'Atropellado, caída o golpe fuerte',
    breve: 'Accidente reciente con impacto.',
    nivel: 'rojo',
    motivos: ['Los golpes fuertes pueden causar hemorragias internas que no se ven por fuera.'],
    pasos: [
      'Inmovilízalo sobre una tabla, cartón firme o manta y no lo dobles.',
      'Cubre cualquier herida con un trapo limpio sin restregar.',
      'Traslada de inmediato. Si sospechas lesión de columna, muévelo lo menos posible.',
    ],
  },
  {
    id: 'golpe_calor',
    label: 'Jadeo intenso, encías rojas y no se calma',
    breve: 'Sospecha de golpe de calor.',
    nivel: 'rojo',
    motivos: ['El golpe de calor puede causar daño a órganos en minutos.'],
    pasos: [
      'Llévalo a la sombra o a un lugar fresco de inmediato.',
      'Moja patas, axilas e ingles con agua fresca (nunca helada) y abanícalo.',
      'Traslada de inmediato al veterinario aunque parezca mejorar.',
    ],
  },
  {
    id: 'no_orina',
    label: 'Intenta orinar y no puede',
    breve: 'Esfuerzo sin resultado. Frecuente en gatos machos.',
    nivel: 'rojo',
    motivos: ['Una obstrucción urinaria puede romper la vejiga. Es más común en gatos machos.'],
    pasos: [
      'No esperes a mañana: es una urgencia de horas.',
      'No le des agua ni medicamentos.',
      'Traslada de inmediato a una veterinaria con servicio 24 horas.',
    ],
  },
  {
    id: 'encias',
    label: 'Encías pálidas, blancas o azuladas',
    breve: 'El color normal de la encía es rosa.',
    nivel: 'rojo',
    motivos: ['Las encías pálidas o azuladas indican poco oxígeno o sangrado interno.'],
    pasos: [
      'Levanta el labio y revisa la encía: debe ser rosa.',
      'Mantén a la mascota en silencio y abrigada.',
      'Traslada de inmediato al veterinario.',
    ],
  },
  {
    id: 'dolor_intenso',
    label: 'Grita, se esconde o no deja que lo toquen',
    breve: 'Dolor evidente y agitación.',
    nivel: 'rojo',
    motivos: ['El dolor intenso y la agitación pueden indicar lesión grave o cólico.'],
    pasos: [
      'No lo manipules de más: puede morder sin querer por dolor.',
      'Transpórtalo con cuidado sobre una superficie firme.',
      'Traslada de inmediato al veterinario.',
    ],
  },
  {
    id: 'parto',
    label: 'Está pariendo y algo va mal',
    breve: 'Parto detenido o con complicaciones.',
    nivel: 'rojo',
    motivos: ['Un parto detenido pone en riesgo a la madre y a las crías.'],
    pasos: [
      'Si lleva más de 30 minutos pujando sin que nazca una cría, es urgencia.',
      'Mantén a la madre en un lugar oscuro, tibio y tranquilo.',
      'Traslada de inmediato al veterinario con las crías nacidas, abrigadas.',
    ],
  },

  // ------ Requiere atención hoy ------
  {
    id: 'vomito',
    label: 'Vomitó una o dos veces',
    breve: 'Sin sangre y con buen ánimo.',
    nivel: 'amarillo',
    preguntas: [
      {
        id: 'frecuencia',
        label: '¿Cuántas veces ha vomitado?',
        opciones: [
          { id: 'una', label: 'Una o dos', delta: 0 },
          { id: 'varias', label: 'Tres o más en el día', delta: 1, motivo: 'Vomitar repetidamente deshidrata rápido.' },
        ],
      },
      {
        id: 'animo',
        label: '¿Cómo se ve?',
        opciones: [
          { id: 'activo', label: 'Activo y con ganas de jugar', delta: 0 },
          { id: 'decaido', label: 'Decaído, sin ganas de moverse', delta: 1, motivo: 'Con vómito, el decaimiento es señal de alarma.' },
        ],
      },
    ],
    motivos: ['Un vómito aislado suele ser pasajero, pero hay que vigilar la hidratación.'],
    pasos: [
      'Retira la comida por 4 a 6 horas, deja agua limpia a libre acceso.',
      'Al volver a comer, dale porciones pequeñas y blandas (arroz con pollo sin sal ni condimentos).',
      'Si vomita más de 3 veces, se ve decaído o hay sangre, acude al veterinario.',
    ],
  },
  {
    id: 'diarrea',
    label: 'Diarrea sin sangre',
    breve: 'Heces blandas o líquidas.',
    nivel: 'amarillo',
    motivos: ['El mayor riesgo de la diarrea es la deshidratación.'],
    pasos: [
      'Asegúrate de que tome agua; la deshidratación es el mayor riesgo.',
      'No cambies la comida de golpe ni le des lácteos.',
      'Si dura más de 24 horas, hay sangre o decaimiento, acude al veterinario.',
    ],
  },
  {
    id: 'no_come',
    label: 'Dejó de comer',
    breve: 'Más de 24 h en gatos o 48 h en perros.',
    nivel: 'amarillo',
    motivos: ['En gatos el ayuno es más peligroso que en perros.'],
    pasos: [
      'En gatos no debe pasar más de 24 horas sin comer; en perros, más de 48.',
      'Ofrécele alimento tibio y con buen olor, en un lugar tranquilo.',
      'Si además vomita, bebe mucho o está decaído, acude hoy al veterinario.',
    ],
  },
  {
    id: 'cojera',
    label: 'Cojera o no apoya una pata',
    breve: 'Camina con dificultad o se queja al moverse.',
    nivel: 'amarillo',
    motivos: ['La cojera puede ser muscular o indicar una lesión mayor.'],
    pasos: [
      'Revisa la pata buscando heridas, espinas o hinchazón, sin forzarla.',
      'Déjalo en reposo 24 horas y evita escaleras y saltos.',
      'Si no apoya nada, hay fractura sospechada o empeora, acude al veterinario.',
    ],
  },
  {
    id: 'ojo',
    label: 'Ojo rojo, cerrado o con secreción',
    breve: 'Molestia ocular visible.',
    nivel: 'amarillo',
    motivos: ['Los problemas de ojos progresan rápido y pueden dejar secuelas.'],
    pasos: [
      'No le apliques gotas de humanos ni remedios caseros.',
      'Limpia con suero fisiológico por fuera, sin tocar el ojo.',
      'Acude hoy al veterinario: los problemas de ojo empeoran rápido.',
    ],
  },
  {
    id: 'otitis',
    label: 'Se rasca la oreja y la sacude',
    breve: 'Posible infección o cuerpo extraño en el oído.',
    nivel: 'amarillo',
    motivos: ['Una otitis no tratada puede dañar el oído de forma permanente.'],
    pasos: [
      'No introduzcas hisopos dentro del oído.',
      'Revisa si hay mal olor, enrojecimiento o suciedad oscura.',
      'Consulta hoy: una otitis no tratada puede dañar el oído.',
    ],
  },
  {
    id: 'otro',
    label: 'Otro síntoma (lo describo)',
    breve: 'Cuéntanos qué observas.',
    nivel: 'amarillo',
    motivos: ['Con la información disponible, lo prudente es valorarlo hoy.'],
    pasos: [
      'Describe lo que ves con tus palabras en el chat.',
      'Anota desde cuándo, si come y bebe normal y si cambió de comportamiento.',
      'Ante cualquier duda, consulta hoy al veterinario.',
    ],
  },

  // ------ Molestias leves ------
  {
    id: 'comezon',
    label: 'Comezón, estornudos o moco leve',
    breve: 'Sin dificultad para respirar.',
    nivel: 'verde',
    motivos: ['Comezón, estornudos o moco leve suelen ser cuadros pasajeros, sin señales de alarma.'],
    pasos: [
      'Vigílalo 24 a 48 horas y anota si empeora.',
      'Evita cambios de comida y revisa si hay pulgas.',
      'Si aparece dificultad para respirar, deja de ser leve: acude de inmediato.',
    ],
  },
  {
    id: 'herida',
    label: 'Herida leve o rasguño',
    breve: 'Herida superficial que no sangra de más.',
    nivel: 'verde',
    motivos: ['Una herida leve y superficial se puede manejar en casa con vigilancia.'],
    pasos: [
      'Lava con agua y jabón neutro, sin alcohol ni agua oxigenada.',
      'Cubre con gasa limpia y evita que se lama en exceso.',
      'Si la herida es profunda, no deja de sangrar o se infecta, acude al veterinario.',
    ],
  },
  {
    id: 'parasitos',
    label: 'Tiene pulgas o garrapatas',
    breve: 'Parásitos visibles en piel o pelaje.',
    nivel: 'verde',
    motivos: ['Las garrapatas transmiten enfermedades, así que no es solo un problema de piel.'],
    pasos: [
      'Retira la garrapata con pinzas, cerca de la cabeza, sin aplastarla.',
      'Consulta con el veterinario el antiparasitario adecuado para su peso y especie.',
      'Nunca uses productos de perro en gatos: muchos son tóxicos para ellos.',
    ],
  },
];

/** Directorio de números de emergencia. VERIFICA antes de publicar. */
export const CONTACTOS_EMERGENCIA = [
  {
    nombre: 'Emergencias en México',
    telefono: '911',
    nota: 'Servicios de emergencia. Útil si necesitas traslado o apoyo inmediato.',
  },
  {
    nombre: 'ASPCA Animal Poison Control (EE. UU.)',
    telefono: '+1 888 426 4435',
    nota: 'Línea veterinaria de toxicología 24 h. Se atiende en inglés y tiene costo por consulta. Úsala solo si no encuentras opción local.',
  },
];

import type { MuscleGroup } from '../types';

// Chip background colors as provided by the exercise list ("Color del label" column).
// Text and accent-bar colors are derived by darkening the base hex, rather than mapping to a
// fixed Tailwind color family, since these hexes don't align to Tailwind's palette.
export const MUSCLE_GROUP_COLOR: Record<MuscleGroup, string> = {
  Biceps: '#d0e0e3',
  Espalda: '#9fc5e8',
  Pecho: '#a2c4c9',
  Triceps: '#d9ead3',
  Hombro: '#b6d7a8',
  'Aductores y abductores': '#ffe599',
  Gluteo: '#f9cb9c',
  Gemelos: '#ea9999',
  Isquios: '#dd7e6b',
  Cuadriceps: '#d5a6bd',
  Cardio: '#d9d2e9',
  Movilidad: '#ffd966',
  Activacion: '#cccccc',
};

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case r:
      h = (g - b) / d + (g < b ? 6 : 0);
      break;
    case g:
      h = (b - r) / d + 2;
      break;
    default:
      h = (r - g) / d + 4;
  }
  return [h * 60, s, l];
}

function hueToRgb(p: number, q: number, t: number): number {
  let tt = t;
  if (tt < 0) tt += 1;
  if (tt > 1) tt -= 1;
  if (tt < 1 / 6) return p + (q - p) * 6 * tt;
  if (tt < 1 / 2) return q;
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
  return p;
}

function hslToHex(h: number, s: number, l: number): string {
  if (s === 0) {
    const v = Math.round(l * 255);
    return `#${[v, v, v].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hh = h / 360;
  const r = hueToRgb(p, q, hh + 1 / 3);
  const g = hueToRgb(p, q, hh);
  const b = hueToRgb(p, q, hh - 1 / 3);
  return `#${[r, g, b]
    .map((c) => Math.round(c * 255).toString(16).padStart(2, '0'))
    .join('')}`;
}

function darken(hex: string, amount: number): string {
  const [h, s, l] = hexToHsl(hex);
  return hslToHex(h, s, Math.max(0, l - amount));
}

export function chipBg(group: MuscleGroup): string {
  return MUSCLE_GROUP_COLOR[group];
}

export function chipText(group: MuscleGroup): string {
  return darken(MUSCLE_GROUP_COLOR[group], 0.45);
}

export function accentBar(group: MuscleGroup): string {
  return darken(MUSCLE_GROUP_COLOR[group], 0.2);
}

export const SEED_EXERCISES: Array<[string, MuscleGroup, string]> = [
  ['Curl de biceps martillo con barra', 'Biceps', 'https://www.youtube.com/results?search_query=barbell+hammer+curl+technique'],
  ['Curl de biceps martillo con mancuernas', 'Biceps', 'https://www.youtube.com/results?search_query=dumbbell+hammer+curl+technique'],
  ['Curl bayesian en banco con mancuernas', 'Biceps', 'https://www.youtube.com/results?search_query=bayesian+dumbbell+curl'],
  ['Curl de biceps alternado con mancuerna', 'Biceps', 'https://www.youtube.com/results?search_query=alternating+dumbbell+bicep+curl'],
  ['Curl bayesian en banco con polea', 'Biceps', 'https://www.youtube.com/results?search_query=bayesian+cable+curl'],
  ['Curl de biceps en banco scott con barra', 'Biceps', 'https://www.youtube.com/results?search_query=barbell+preacher+curl+technique'],
  ['Curl de biceps unilateral ven banco scott con mancuerna', 'Biceps', 'https://www.youtube.com/results?search_query=single+arm+preacher+curl'],
  ['Curl de biceps en maquina', 'Biceps', 'https://www.youtube.com/results?search_query=machine+bicep+curl'],
  ['Curl biceps inclinado', 'Biceps', 'https://www.youtube.com/shorts/koLVyY5pej0'],
  ['Remo bajo en maquina agarre amplio', 'Espalda', 'https://www.youtube.com/results?search_query=seated+cable+row+wide+grip'],
  ['Jalon al pecho agarre amplio', 'Espalda', 'https://www.youtube.com/results?search_query=lat+pulldown+wide+grip'],
  ['Jalon al pecho agarre cerrado', 'Espalda', 'https://www.youtube.com/results?search_query=lat+pulldown+close+grip'],
  ['Remo en maquina agarre cerrado', 'Espalda', 'https://www.youtube.com/results?search_query=machine+row+close+grip'],
  ['Remo en maquina agarre amplio', 'Espalda', 'https://www.youtube.com/results?search_query=machine+row+wide+grip'],
  ['Pullover', 'Espalda', 'https://www.youtube.com/results?search_query=lat+pullover+cable'],
  ['Remo T con ladnmine', 'Espalda', 'https://www.youtube.com/results?search_query=t+bar+row+landmine'],
  ['Facepull', 'Espalda', 'https://www.youtube.com/results?search_query=face+pull+technique'],
  ['Remo T en maquina', 'Espalda', 'https://www.youtube.com/results?search_query=t+bar+row+machine'],
  ['Remo lineal', 'Espalda', 'https://www.youtube.com/shorts/0SmtENVDLjc'],
  ['Press de banca plano (libre)', 'Pecho', 'https://www.youtube.com/results?search_query=barbell+bench+press+technique'],
  ['Press de banca plano en maquina', 'Pecho', 'https://www.youtube.com/results?search_query=machine+chest+press'],
  ['Press de banca inclinado (libre)', 'Pecho', 'https://www.youtube.com/results?search_query=incline+bench+press+technique'],
  ['Press de banca inclinado en maquina', 'Pecho', 'https://www.youtube.com/results?search_query=incline+machine+chest+press'],
  ['Press de banca declinado', 'Pecho', 'https://www.youtube.com/results?search_query=decline+bench+press+technique'],
  ['Floor press en puente de gluteos', 'Pecho', 'https://www.youtube.com/shorts/nNsb861Kt1M'],
  ['Press plano en torre', 'Pecho', 'https://www.youtube.com/results?search_query=cable+press+machine+chest'],
  ['Press inclinado en torre', 'Pecho', 'https://www.youtube.com/results?search_query=cable+incline+press+machine'],
  ['Extension de triceps en polea', 'Triceps', 'https://www.youtube.com/watch?v=2-LAMcpzODU'],
  ['Extension de triceps trasnuca', 'Triceps', 'https://www.youtube.com/watch?v=6SS6K3lAwZ8'],
  ['Extension de triceps con avance de píernas', 'Triceps', 'https://www.youtube.com/watch?v=J4nB2kW4R8Y'],
  ['Fondo de triceps en maquina', 'Triceps', 'https://www.youtube.com/watch?v=6kALZikXxLc'],
  ['Press frances en banc (acostado con barras)', 'Triceps', 'https://www.youtube.com/shorts/BTkLgHG7kzo'],
  ['Press frances en banco (sentado con mancuernas)', 'Triceps', 'https://www.youtube.com/results?search_query=press+frances+sentado'],
  ['Fondo de triceps en banco', 'Triceps', 'https://www.youtube.com/watch?v=0326dy_-CzM'],
  ['JM press en smith', 'Triceps', 'https://www.youtube.com/watch?v=b-nyTZBLpWo'],
  ['Vuelos laterales con mancuernas', 'Hombro', 'https://www.youtube.com/results?search_query=dumbbell+lateral+raise+technique'],
  ['Vuelos laterales unilateral en polea', 'Hombro', 'https://www.youtube.com/results?search_query=single+arm+cable+lateral+raise'],
  ['Vuelos laterales en maquina', 'Hombro', 'https://www.youtube.com/results?search_query=machine+lateral+raise'],
  ['Vuelos frontales alternados', 'Hombro', 'https://www.youtube.com/results?search_query=alternating+front+raise'],
  ['Vuelos frontales con barra/disco', 'Hombro', 'https://www.youtube.com/results?search_query=barbell+front+raise+technique'],
  ['Press militar en smith', 'Hombro', 'https://www.youtube.com/results?search_query=smith+machine+shoulder+press'],
  ['Press militar en maquina', 'Hombro', 'https://www.youtube.com/results?search_query=machine+shoulder+press'],
  ['Press militar con mancuernas', 'Hombro', 'https://www.youtube.com/results?search_query=dumbbell+shoulder+press'],
  ['Press militar con barra', 'Hombro', 'https://www.youtube.com/results?search_query=barbell+overhead+press+technique'],
  ['Press landmine (estocada)', 'Hombro', 'https://www.youtube.com/watch?v=J9rPiLnwj_E'],
  ['Aductores en maquina', 'Aductores y abductores', 'https://www.youtube.com/results?search_query=adductor+machine+gym'],
  ['Abductores en maquina', 'Aductores y abductores', 'https://www.youtube.com/results?search_query=abductor+machine+gym'],
  ['Abductores en polea', 'Aductores y abductores', 'https://www.youtube.com/results?search_query=cable+abduction+glute'],
  ['Aductores en polea', 'Aductores y abductores', 'https://www.youtube.com/results?search_query=cable+adduction+exercise'],
  ['Patada de gluteo en polea', 'Gluteo', 'https://www.youtube.com/results?search_query=cable+glute+kickback'],
  ['Patada de gluteo en maquina', 'Gluteo', 'https://www.youtube.com/results?search_query=machine+glute+kickback'],
  ['Pata de gluteo splinter', 'Gluteo', 'https://www.youtube.com/results?search_query=glute+kickback+variation'],
  ['Hip trust en maquina', 'Gluteo', 'https://www.youtube.com/results?search_query=hip+thrust+machine'],
  ['Elevacion de cadera', 'Gluteo', 'https://www.youtube.com/results?search_query=glute+bridge+exercise'],
  ['Gemelo sentado (soleo)', 'Gemelos', 'https://www.youtube.com/results?search_query=seated+calf+raise+soleus'],
  ['Pantorrillas en prensa', 'Gemelos', 'https://www.youtube.com/results?search_query=leg+press+calf+raise'],
  ['Pantorrillas parado', 'Gemelos', 'https://www.youtube.com/results?search_query=standing+calf+raise'],
  ['Peso muerto en smith', 'Isquios', 'https://www.youtube.com/results?search_query=smith+machine+deadlift'],
  ['Peso muerto sumo', 'Isquios', 'https://www.youtube.com/results?search_query=sumo+deadlift+barbell'],
  ['Peso muerto clasico', 'Isquios', 'https://www.youtube.com/results?search_query=conventional+deadlift+barbell'],
  ['Peso muerto con barra olimpica', 'Isquios', 'https://www.youtube.com/results?search_query=barbell+deadlift+technique'],
  ['Peso muerto rumano', 'Isquios', 'https://www.youtube.com/shorts/9z6AYqXkBbY'],
  ['Sillon de isquios', 'Isquios', 'https://www.youtube.com/results?search_query=leg+curl+machine'],
  ['Camilla de isquios', 'Isquios', 'https://www.youtube.com/results?search_query=lying+leg+curl+machine'],
  ['Peso muerto rumano asimetrico', 'Isquios', 'https://www.youtube.com/shorts/MEJ5vLjtSdg'],
  ['Sillon de cuadriceps', 'Cuadriceps', 'https://www.youtube.com/results?search_query=leg+extension+machine'],
  ['Prensa lineal 45 píes altos', 'Cuadriceps', 'https://www.youtube.com/results?search_query=leg+press+45+high+feet'],
  ['Prensa lineal 45 píes cerrados', 'Cuadriceps', 'https://www.youtube.com/results?search_query=leg+press+45+feet+close'],
  ['Prensa lineal 45 clasica', 'Cuadriceps', 'https://www.youtube.com/results?search_query=leg+press+45+technique'],
  ['Prensa lineal 45 sumo', 'Cuadriceps', 'https://www.youtube.com/results?search_query=leg+press+sumo+stance'],
  ['Prensa pendular clasico', 'Cuadriceps', 'https://www.youtube.com/results?search_query=pendulum+squat'],
  ['Prensa pendular pies altos', 'Cuadriceps', 'https://www.youtube.com/results?search_query=pendulum+squat+high+feet'],
  ['Sentadilla hack maquina', 'Cuadriceps', 'https://www.youtube.com/results?search_query=hack+squat+machine'],
  ['Super squat (pendulante) buenos dias', 'Cuadriceps', 'https://www.youtube.com/results?search_query=good+morning+exercise+smith'],
  ['Super squat (pendulante) step up gluteo', 'Cuadriceps', 'https://www.youtube.com/results?search_query=step+up+glute+focus'],
  ['Super squat (pendulante) sentallida', 'Cuadriceps', 'https://www.youtube.com/results?search_query=pendulum+squat+machine'],
  ['Estocadas', 'Cuadriceps', 'https://www.youtube.com/shorts/FO5KJzV2qb8'],
  ['Bulgaras', 'Cuadriceps', 'https://www.youtube.com/shorts/ODjwvOitOo0'],
  ['Sentadilla libre', 'Cuadriceps', 'https://www.youtube.com/results?search_query=bodyweight+squat+technique'],
  ['Sentadilla en smith', 'Cuadriceps', 'https://www.youtube.com/results?search_query=smith+machine+squat'],
  ['Sentadilla goblet', 'Cuadriceps', 'https://www.youtube.com/results?search_query=goblet+squat+technique'],
  ['Sentadilla sumo', 'Cuadriceps', 'https://www.youtube.com/results?search_query=sumo+squat+bodyweight'],
  ['Sentadilla sissi', 'Cuadriceps', 'https://www.youtube.com/results?search_query=sissy+squat+exercise'],
  ['Abductor parado', 'Cuadriceps', 'https://www.youtube.com/results?search_query=standing+abductor+machine'],
  ['Pendulum squat', 'Cuadriceps', 'https://www.youtube.com/results?search_query=pendulum+squat+machine'],
  ['Remo de aire', 'Cardio', 'https://www.youtube.com/results?search_query=air+rower+machine'],
  ['Air bike', 'Cardio', 'https://www.youtube.com/results?search_query=air+bike+workout'],
  ['Skierg', 'Cardio', 'https://www.youtube.com/results?search_query=ski+erg+technique'],
  ['Cinta curva', 'Cardio', 'https://www.youtube.com/results?search_query=curved+treadmill'],
  ['Cinta de correr', 'Cardio', 'https://www.youtube.com/results?search_query=treadmill+running+technique'],
  ['Eliptico', 'Cardio', 'https://www.youtube.com/results?search_query=elliptical+machine+workout'],
  ['Bici fija', 'Cardio', 'https://www.youtube.com/results?search_query=stationary+bike+workout'],
  ['Escalador', 'Cardio', 'https://www.youtube.com/results?search_query=stair+climber+machine'],
  ['Flexo-extensión de cuello', 'Movilidad', 'https://www.youtube.com/results?search_query=neck+flexion+extension+exercise'],
  ['Inclinaciones laterales', 'Movilidad', 'https://www.youtube.com/results?search_query=side+neck+tilt+exercise'],
  ['Círculos de hombros', 'Movilidad', 'https://www.youtube.com/results?search_query=shoulder+circles+mobility'],
  ['Postura gatobueno-gatomalo', 'Movilidad', 'https://www.youtube.com/results?search_query=cat+cow+mobility'],
  ['Giros de tronco', 'Movilidad', 'https://www.youtube.com/results?search_query=torso+twist+exercise'],
  ['Círculos de cadera', 'Movilidad', 'https://www.youtube.com/results?search_query=hip+circles+mobility'],
  ['Posición 90-90 (rotación de cadera)', 'Movilidad', 'https://www.youtube.com/results?search_query=90+90+hip+stretch'],
  ['Zancadas con apoyo', 'Movilidad', 'https://www.youtube.com/results?search_query=lunge+support+mobility'],
  ['Flexiones de rodilla', 'Movilidad', 'https://www.youtube.com/results?search_query=knee+mobility+exercise'],
  ['Movimientos de tobillo', 'Movilidad', 'https://www.youtube.com/results?search_query=ankle+mobility+drill'],
  ['Hombros con baston', 'Movilidad', 'https://www.youtube.com/shorts/RfZixPe6aGA'],
  ['Estiramiento de rana', 'Movilidad', 'https://www.youtube.com/shorts/ixHHbN5xbgE'],
  ['Retracciones escapulares', 'Movilidad', 'https://www.youtube.com/shorts/KpwCRQkK6Jk'],
  ['Kang squat', 'Movilidad', 'https://www.youtube.com/shorts/T3dsxZd7hZo'],
  ['Press acostado con baston', 'Movilidad', 'https://www.youtube.com/watch?v=l2_tRvGLl4I'],
  ['Bootstrappers', 'Movilidad', 'https://www.youtube.com/shorts/dfo1yB9qfQk'],
  ['Rotaciones de brazos', 'Movilidad', 'https://www.youtube.com/shorts/Mo2B1FJkuLg'],
  ['Groiner con rotacion', 'Movilidad', 'https://www.youtube.com/shorts/H6dYuu5vCMo'],
  ['Plancha carpa', 'Movilidad', 'https://www.youtube.com/watch?v=ZwPfQARk3qA'],
  ['Plancha frontal', 'Activacion', 'https://www.youtube.com/results?search_query=plank+front'],
  ['Bicho muerto (dead bug)', 'Activacion', 'https://www.youtube.com/results?search_query=dead+bug+exercise'],
  ['Plancha lateral', 'Activacion', 'https://www.youtube.com/results?search_query=side+plank+exercise'],
  ['Perro-pájaro (bird dog)', 'Activacion', 'https://www.youtube.com/results?search_query=bird+dog+exercise'],
  ["Caminata del granjero (farmer's walk)", 'Activacion', 'https://www.youtube.com/results?search_query=farmer+walk+exercise'],
  ['Rueda abdominal (ab wheel rollout)', 'Activacion', 'https://www.youtube.com/results?search_query=ab+wheel+rollout'],
  ['Press Pallof', 'Activacion', 'https://www.youtube.com/results?search_query=pallof+press+exercise'],
  ['Elevación de piernas colgado', 'Activacion', 'https://www.youtube.com/results?search_query=hanging+leg+raise'],
  ['Plancha invertida', 'Activacion', 'https://www.youtube.com/results?search_query=reverse+plank+exercise'],
  ['El escalador (mountain climbers)', 'Activacion', 'https://www.youtube.com/results?search_query=mountain+climbers+exercise'],
  ['Plank shoulder taps', 'Activacion', 'https://www.youtube.com/results?search_query=plank+shoulder+taps'],
  ['Russian twist', 'Activacion', 'https://www.youtube.com/results?search_query=russian+twist'],
  ['V ups', 'Activacion', 'https://www.youtube.com/results?search_query=v+ups'],
  ['Flutter kicks', 'Activacion', 'https://www.youtube.com/results?search_query=Flutter+kicks&sp=Eh2SARoKCS9tLzA3NzVscyoNRmx1dHRlciBraWNrc3gB'],
  ['Elevaciones de piernas', 'Activacion', 'https://www.youtube.com/results?search_query=Elevaci%C3%B3n+de+piernas&sp=EiaSASMKCi9tLzA0eTh0bTMqFUVsZXZhY2nDs24gZGUgcGllcm5hc3gB'],
  ['Dragon flag', 'Activacion', 'https://www.youtube.com/results?search_query=dragon+flag'],
  ['Heel touch', 'Activacion', 'https://www.youtube.com/results?search_query=heel+touches&sp=EiCSAR0KDS9nLzExZnAzN3N5Mm0qDGhlZWwgdG91Y2hlc3gB'],
  ['Abs side to side', 'Activacion', 'https://www.youtube.com/shorts/SPKn0KdDJPs'],
  ['Plancha twist', 'Activacion', 'https://www.youtube.com/shorts/27c2F6-Flx0'],
  ['Plank Jack', 'Activacion', 'https://www.youtube.com/watch?v=VasEy9dNzZM'],
];

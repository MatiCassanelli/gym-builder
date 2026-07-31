// Copy for the instructional first page of the plan. Kept here so the on-screen preview and
// the generated PDF render exactly the same text — they lay it out differently, but neither
// owns the wording.

export const PLAN_GUIDE_TITLE = 'Cómo leer y seguir tu plan';

export const PLAN_GUIDE_SUBTITLE =
  'Leé esta página una vez antes de arrancar. Explica qué significa cada parte de la planilla.';

export interface GuideItem {
  title: string;
  body: string;
}

export const PLAN_GUIDE_ITEMS: GuideItem[] = [
  {
    title: 'Día',
    body:
      'Cada bloque "DÍA 1", "DÍA 2"… es una sesión completa. No son días fijos de la semana: ' +
      'seguí el orden y respetá al menos un día de descanso entre sesiones que repiten los ' +
      'mismos músculos.',
  },
  {
    title: 'Serie (S1, S2, S3…)',
    body:
      'Cada columna es una serie del ejercicio. Leé la tabla en vertical: para cada serie ' +
      'tenés sus reps, su RIR objetivo y su pausa.',
  },
  {
    title: 'Reps / rango de reps',
    body:
      'Repeticiones a realizar en esa serie. Cuando ves un rango (ej. 6-8) podés autorregular: ' +
      'elegí un peso que te permita quedarte en ese rango con el RIR indicado, y si la fatiga ' +
      'acumula, bajá dentro del rango antes que bajar el peso.',
  },
  {
    title: 'Pausa',
    body:
      'Descanso entre esa serie y la siguiente. Cronometralo: pausas más cortas de lo indicado ' +
      'bajan el rendimiento de la serie siguiente, y más largas alargan la sesión sin beneficio.',
  },
  {
    title: 'Superserie',
    body:
      'Dos o más ejercicios agrupados en un mismo recuadro: se hacen uno inmediatamente después ' +
      'del otro, sin pausa entre ellos. La pausa recién se toma al terminar la ronda completa, ' +
      'y es la que figura en el último ejercicio del grupo.',
  },
  {
    title: 'Video y notas',
    body:
      'A la derecha de cada ejercicio: "Ver video" abre la demostración de la técnica, y en ' +
      'cursiva aparecen las indicaciones específicas de ese ejercicio (tempo, rango, apoyos, etc.).',
  },
];

export const RIR_TITLE = '¿Qué es el RIR?';

export const RIR_INTRO =
  'RIR (Repeticiones en Reserva) indica cuántas repeticiones te quedaron "en el tanque" antes ' +
  'del fallo técnico: el punto en el que ya no podés hacer otra repetición con buena técnica.';

export const RIR_EXAMPLES = [
  'RIR 0 — llegaste al fallo, no podías hacer ni una repe más.',
  'RIR 3 — te quedaron 3 repeticiones en reserva, podrías haber hecho 3 más.',
];

export const RIR_SCALE_NOTE =
  'Cuanto más bajo el RIR, mayor la intensidad del esfuerzo. (Equivale al RPE, la escala de ' +
  'percepción de esfuerzo: RPE 10 = RIR 0, RPE 7 = RIR 3. Usamos RIR porque es más objetivo y ' +
  'fácil de calcular.)';

export const RIR_HOWTO_TITLE = 'Cómo se calcula correctamente';

export const RIR_HOWTO_ITEMS: GuideItem[] = [
  {
    title: 'En la primera serie:',
    body:
      'compará las repeticiones que hiciste con las máximas que podrías haber hecho con esa ' +
      'carga. Ejemplo: con 60 kg hacés 8 repes, pero calculás que podrías haber llegado a 11 ' +
      'antes del fallo, esa serie fue con RIR 3 (11 - 8 = 3).',
  },
  {
    title: 'En las series siguientes:',
    body:
      'el objetivo es mantener el mismo peso y las mismas repeticiones que en la primera. Como ' +
      'el músculo se fatiga, el RIR real va bajando aunque la carga y las repes sean iguales: ' +
      'cada serie se siente más intensa que la anterior. Por eso el plan indica rangos de ' +
      'repeticiones, para poder bajar repes en las últimas series y no perder demasiado RIR.',
  },
  {
    title: 'Tip de verificación:',
    body:
      'en la última serie de cada ejercicio conviene acercarse más al fallo real. Si al hacerlo ' +
      'el RIR termina siendo el mismo que anotaste en las series anteriores, significa que en ' +
      'esas series te habías quedado corto y conviene corregir el registro.',
  },
];

export const WARMUP_TITLE = 'Antes de entrenar: movilidad, activación y entrada en calor';

export const WARMUP_SUBTITLE =
  'Se hace siempre, todos los días, antes del primer ejercicio de la sesión.';

export const PLAN_FOOTER_NOTE =
  'Cada fila muestra el ejercicio y su grupo muscular, el detalle serie por serie ' +
  '(repeticiones, RIR y pausa) y el video con las notas. RIR = repeticiones en reserva. Los ' +
  'ejercicios agrupados bajo "Superserie" se realizan uno tras otro, sin pausa entre ellos.';

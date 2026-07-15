import { jsPDF } from 'jspdf';
import { computeBlocks, supersetHeaderText } from './blocks';
import { accentBar, chipBg, chipText } from './muscleGroups';
import { formatDateEs, todayIso } from './format';
import type { Exercise, ExerciseBlock, RoutineInput } from '../types';

// Building the PDF ourselves (instead of window.print() -> browser "Save as PDF") is
// deliberate: mobile print-to-PDF pipelines (iOS/Android) rasterize the page and drop
// <a href> links, while desktop Chrome's print-to-PDF keeps them. jsPDF gives us the same
// byte-identical output — with real clickable link annotations — on every device.

const PAGE_MARGIN = 15;
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

const FONT = 'helvetica';

const COLOR = {
  stone950: '#0c0a09',
  stone700: '#44403c',
  stone500: '#78716c',
  stone300: '#d6d3d1',
  stone200: '#e7e5e4',
  white: '#ffffff',
  red700: '#b91c1c',
  red600: '#dc2626',
  red200: '#fecaca',
  red50: '#fef2f2',
  red400: '#f87171',
} as const;

function lineHeight(sizePt: number): number {
  return sizePt * 0.3528 * 1.3;
}

interface PdfRow {
  id: string;
  name: string;
  group?: Exercise['group'];
  series: string;
  reps: string;
  videoUrl?: string;
  note: string;
  accentBar: string;
  chipBg: string;
  chipText: string;
}

interface RowLayout {
  height: number;
  nameLines: string[];
  noteLines: string[];
  hasChip: boolean;
}

const ACCENT_W = 1.6;
const GAP_AFTER_ACCENT = 2.2;
const RIGHT_COL_W = 20;
const ROW_PAD_X = 2.5;
const ROW_PAD_TOP = 2;
const ROW_PAD_BOTTOM = 2;
const NAME_SIZE = 9.5;
const VIDEO_SIZE = 7.5;
const CHIP_SIZE = 6.5;
const NOTE_SIZE = 7.5;
const SERIES_SIZE = 9.5;
const CHIP_GAP_TOP = 1.3;
const CHIP_PAD_X = 1.8;
const NOTE_GAP_TOP = 1;
const VIDEO_GAP_LEFT = 2;

function layoutRow(doc: jsPDF, row: PdfRow, width: number): RowLayout {
  const contentX0 = ACCENT_W + GAP_AFTER_ACCENT;
  const availableNameWidth = width - contentX0 - RIGHT_COL_W - ROW_PAD_X;

  doc.setFont(FONT, 'bold');
  doc.setFontSize(VIDEO_SIZE);
  const videoBadgeWidth = row.videoUrl ? doc.getTextWidth('VIDEO') + VIDEO_GAP_LEFT : 0;

  doc.setFont(FONT, 'bold');
  doc.setFontSize(NAME_SIZE);
  const nameLines = doc.splitTextToSize(
    row.name,
    Math.max(availableNameWidth - videoBadgeWidth, 20),
  ) as string[];

  doc.setFont(FONT, 'italic');
  doc.setFontSize(NOTE_SIZE);
  const noteWidth = width - contentX0 - ROW_PAD_X;
  const noteLines = row.note
    ? (doc.splitTextToSize(`Nota: ${row.note}`, noteWidth) as string[])
    : [];

  let height = ROW_PAD_TOP + nameLines.length * lineHeight(NAME_SIZE) + ROW_PAD_BOTTOM;
  if (row.group) height += CHIP_GAP_TOP + lineHeight(CHIP_SIZE) + 1.2;
  if (noteLines.length) height += NOTE_GAP_TOP + noteLines.length * lineHeight(NOTE_SIZE);

  return { height, nameLines, noteLines, hasChip: Boolean(row.group) };
}

function drawRow(
  doc: jsPDF,
  row: PdfRow,
  x: number,
  y: number,
  width: number,
  layout: RowLayout,
): void {
  const contentX0 = x + ACCENT_W + GAP_AFTER_ACCENT;

  doc.setFillColor(row.accentBar);
  doc.rect(x, y, ACCENT_W, layout.height, 'F');

  let cursorY = y + ROW_PAD_TOP + lineHeight(NAME_SIZE) * 0.75;

  doc.setFont(FONT, 'bold');
  doc.setFontSize(NAME_SIZE);
  doc.setTextColor(COLOR.stone950);
  layout.nameLines.forEach((line, i) => {
    doc.text(line, contentX0, cursorY + i * lineHeight(NAME_SIZE));
  });

  if (row.videoUrl) {
    const lastLineY = cursorY + (layout.nameLines.length - 1) * lineHeight(NAME_SIZE);
    const lastLineWidth = doc.getTextWidth(layout.nameLines[layout.nameLines.length - 1]);
    doc.setFont(FONT, 'bold');
    doc.setFontSize(VIDEO_SIZE);
    doc.setTextColor(COLOR.red600);
    const badgeX = contentX0 + lastLineWidth + VIDEO_GAP_LEFT;
    doc.text('VIDEO', badgeX, lastLineY);
    const badgeWidth = doc.getTextWidth('VIDEO');
    doc.setDrawColor(COLOR.red600);
    doc.setLineWidth(0.25);
    doc.line(badgeX, lastLineY + 0.6, badgeX + badgeWidth, lastLineY + 0.6);
    doc.link(badgeX - 0.5, lastLineY - lineHeight(VIDEO_SIZE) + 1, badgeWidth + 1, lineHeight(VIDEO_SIZE), {
      url: row.videoUrl,
    });
  }

  cursorY = y + ROW_PAD_TOP + layout.nameLines.length * lineHeight(NAME_SIZE);

  if (layout.hasChip && row.group) {
    doc.setFont(FONT, 'bold');
    doc.setFontSize(CHIP_SIZE);
    const textWidth = doc.getTextWidth(row.group);
    const chipH = lineHeight(CHIP_SIZE) + 1.2;
    const chipY = cursorY + CHIP_GAP_TOP;
    doc.setFillColor(row.chipBg);
    doc.roundedRect(contentX0, chipY, textWidth + CHIP_PAD_X * 2, chipH, 0.8, 0.8, 'F');
    doc.setTextColor(row.chipText);
    doc.text(row.group, contentX0 + CHIP_PAD_X, chipY + chipH / 2 + CHIP_SIZE * 0.35 * 0.3528);
    cursorY = chipY + chipH;
  }

  if (layout.noteLines.length) {
    doc.setFont(FONT, 'italic');
    doc.setFontSize(NOTE_SIZE);
    doc.setTextColor(COLOR.stone700);
    const noteY = cursorY + NOTE_GAP_TOP + lineHeight(NOTE_SIZE) * 0.75;
    layout.noteLines.forEach((line, i) => {
      doc.text(line, contentX0, noteY + i * lineHeight(NOTE_SIZE));
    });
  }

  doc.setFont(FONT, 'bold');
  doc.setFontSize(SERIES_SIZE);
  doc.setTextColor(COLOR.stone950);
  doc.text(`${row.series} x ${row.reps}`, x + width - ROW_PAD_X, y + layout.height / 2 + SERIES_SIZE * 0.3528 * 0.35, {
    align: 'right',
  });
}

function toRow(entry: {
  id: string;
  exerciseId: string | null;
  series: string;
  reps: string;
  note: string;
}, exercisesMap: Map<string, Exercise>): PdfRow {
  const ex = entry.exerciseId ? exercisesMap.get(entry.exerciseId) : undefined;
  return {
    id: entry.id,
    name: ex?.name ?? '—',
    group: ex?.group,
    series: entry.series,
    reps: entry.reps,
    videoUrl: ex?.videoUrl,
    note: entry.note,
    accentBar: ex ? accentBar(ex.group) : COLOR.stone300,
    chipBg: ex ? chipBg(ex.group) : COLOR.stone200,
    chipText: ex ? chipText(ex.group) : COLOR.stone700,
  };
}

const BOX_PAD = 1.5;
const CONNECTOR_H = 3.8;
const HEADER_H = 6;
const HEADER_FONT_SIZE = 7.5;
const HEADER_PAD_X = 2.5;

function measureBlock(doc: jsPDF, block: ExerciseBlock, rows: PdfRow[], width: number) {
  if (block.type === 'single') {
    const layout = layoutRow(doc, rows[0], width);
    return { height: layout.height, rowLayouts: [layout] };
  }
  const innerWidth = width - BOX_PAD * 2;
  const rowLayouts = rows.map((row) => layoutRow(doc, row, innerWidth));
  const rowsHeight = rowLayouts.reduce((sum, l) => sum + l.height, 0);
  const connectorsHeight = CONNECTOR_H * (rows.length - 1);
  return { height: HEADER_H + rowsHeight + connectorsHeight + BOX_PAD * 2, rowLayouts };
}

function drawBlock(
  doc: jsPDF,
  block: ExerciseBlock,
  rows: PdfRow[],
  rowLayouts: RowLayout[],
  x: number,
  y: number,
  width: number,
): void {
  if (block.type === 'single') {
    drawRow(doc, rows[0], x, y, width, rowLayouts[0]);
    doc.setDrawColor(COLOR.stone200);
    doc.setLineWidth(0.2);
    doc.line(x, y + rowLayouts[0].height, x + width, y + rowLayouts[0].height);
    return;
  }

  doc.setFillColor(COLOR.red700);
  doc.rect(x, y, width, HEADER_H, 'F');
  doc.setFont(FONT, 'bold');
  doc.setFontSize(HEADER_FONT_SIZE);
  doc.setTextColor(COLOR.white);
  doc.text(
    supersetHeaderText(block.letter).toUpperCase(),
    x + HEADER_PAD_X,
    y + HEADER_H / 2 + HEADER_FONT_SIZE * 0.3528 * 0.35,
  );

  const innerWidth = width - BOX_PAD * 2;
  const innerX = x + BOX_PAD;
  let cursorY = y + HEADER_H + BOX_PAD;

  rows.forEach((row, i) => {
    if (i > 0) {
      const midY = cursorY + CONNECTOR_H / 2;
      doc.setDrawColor(COLOR.red200);
      doc.setLineWidth(0.3);
      doc.setFont(FONT, 'bold');
      doc.setFontSize(8);
      const plusWidth = doc.getTextWidth('+');
      const lineY = midY + 0.9;
      doc.line(innerX, lineY, innerX + innerWidth / 2 - plusWidth, lineY);
      doc.line(innerX + innerWidth / 2 + plusWidth, lineY, innerX + innerWidth, lineY);
      doc.setTextColor(COLOR.red600);
      doc.text('+', innerX + innerWidth / 2, lineY + 1, { align: 'center' });
      cursorY += CONNECTOR_H;
    }
    doc.setFillColor(COLOR.red50);
    doc.rect(innerX, cursorY, innerWidth, rowLayouts[i].height, 'F');
    drawRow(doc, row, innerX, cursorY, innerWidth, rowLayouts[i]);
    cursorY += rowLayouts[i].height;
  });

  const totalHeight = cursorY + BOX_PAD - y;
  doc.setDrawColor(COLOR.red400);
  doc.setLineWidth(0.5);
  doc.roundedRect(x, y, width, totalHeight, 1.5, 1.5, 'S');
}

async function loadLogo(): Promise<{ dataUrl: string; width: number; height: number } | null> {
  try {
    const res = await fetch('/forge-logo.png');
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error('logo failed to load'));
      img.src = dataUrl;
    });
    return { dataUrl, ...dims };
  } catch {
    return null;
  }
}

export async function buildRoutinePdf(
  routine: RoutineInput,
  exercisesMap: Map<string, Exercise>,
  authorName?: string,
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = PAGE_MARGIN;

  const logo = await loadLogo();
  const logoBoxSize = 16;
  let headerRightBottom: number;

  if (logo) {
    const scale = Math.min(logoBoxSize / logo.width, logoBoxSize / logo.height);
    const w = logo.width * scale;
    const h = logo.height * scale;
    doc.addImage(logo.dataUrl, PAGE_MARGIN, y, w, h);
  }

  doc.setFont(FONT, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(COLOR.stone500);
  const rightX = PAGE_MARGIN + CONTENT_WIDTH;
  doc.text(`Emitido: ${formatDateEs(todayIso())}`, rightX, y + 4, { align: 'right' });
  headerRightBottom = y + 4;
  if (authorName) {
    doc.setFont(FONT, 'bold');
    doc.setTextColor(COLOR.stone700);
    doc.text(`Profesor: ${authorName}`, rightX, y + 8.5, { align: 'right' });
    headerRightBottom = y + 8.5;
  }

  y = Math.max(y + logoBoxSize, headerRightBottom) + 3;
  doc.setDrawColor(COLOR.stone950);
  doc.setLineWidth(0.6);
  doc.line(PAGE_MARGIN, y, PAGE_MARGIN + CONTENT_WIDTH, y);
  y += 6;

  const infoFields: Array<[string, string]> = [
    ['ALUMNO', routine.student || '—'],
    ['INICIO DEL PLAN', formatDateEs(routine.startDate)],
    ['FIN DEL PLAN', formatDateEs(routine.endDate)],
    ['FRECUENCIA', `${routine.periodicity}x por semana`],
  ];
  const colWidth = CONTENT_WIDTH / 4;
  infoFields.forEach(([label, value], i) => {
    const colX = PAGE_MARGIN + i * colWidth;
    doc.setFont(FONT, 'bold');
    doc.setFontSize(7);
    doc.setTextColor(COLOR.stone500);
    doc.text(label, colX, y);
    doc.setFont(FONT, 'bold');
    doc.setFontSize(9);
    doc.setTextColor(COLOR.stone950);
    doc.text(value, colX, y + 5);
  });
  y += 10;

  if (routine.objective) {
    doc.setFont(FONT, 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(COLOR.stone500);
    doc.text('OBJETIVO: ', PAGE_MARGIN, y);
    const labelWidth = doc.getTextWidth('OBJETIVO: ');
    doc.setTextColor(COLOR.stone950);
    doc.text(routine.objective, PAGE_MARGIN + labelWidth, y);
    y += 6;
  }

  y += 2;

  for (const day of routine.days) {
    const blocks = computeBlocks(day);
    const blockRows = blocks.map((block) => block.entries.map((e) => toRow(e, exercisesMap)));

    const dayHeaderH = 7;
    if (y + dayHeaderH + 10 > PAGE_HEIGHT - PAGE_MARGIN) {
      doc.addPage();
      y = PAGE_MARGIN;
    }

    doc.setFillColor(COLOR.stone950);
    doc.rect(PAGE_MARGIN, y, CONTENT_WIDTH, dayHeaderH, 'F');
    doc.setFont(FONT, 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(COLOR.white);
    doc.text(`DÍA ${day.id}`, PAGE_MARGIN + 3, y + dayHeaderH / 2 + 1.3);
    y += dayHeaderH + 2.5;

    blocks.forEach((block, i) => {
      const rows = blockRows[i];
      const { height, rowLayouts } = measureBlock(doc, block, rows, CONTENT_WIDTH);
      if (y + height > PAGE_HEIGHT - PAGE_MARGIN) {
        doc.addPage();
        y = PAGE_MARGIN;
      }
      drawBlock(doc, block, rows, rowLayouts, PAGE_MARGIN, y, CONTENT_WIDTH);
      y += height + 2;
    });

    y += 3;
  }

  const footerText =
    'El color indica el grupo muscular de cada ejercicio. Los ejercicios agrupados bajo ' +
    '"Superserie" se realizan uno tras otro, sin pausa entre ellos.';
  doc.setFont(FONT, 'normal');
  doc.setFontSize(7);
  const footerLines = doc.splitTextToSize(footerText, CONTENT_WIDTH) as string[];
  const footerHeight = 3 + footerLines.length * lineHeight(7);
  if (y + footerHeight > PAGE_HEIGHT - PAGE_MARGIN) {
    doc.addPage();
    y = PAGE_MARGIN;
  }
  doc.setDrawColor(COLOR.stone200);
  doc.setLineWidth(0.2);
  doc.line(PAGE_MARGIN, y, PAGE_MARGIN + CONTENT_WIDTH, y);
  y += 3.5;
  doc.setTextColor(COLOR.stone500);
  footerLines.forEach((line, i) => {
    doc.text(line, PAGE_MARGIN, y + i * lineHeight(7));
  });

  return doc;
}

export async function exportRoutinePdf(
  routine: RoutineInput,
  exercisesMap: Map<string, Exercise>,
  authorName?: string,
): Promise<void> {
  const doc = await buildRoutinePdf(routine, exercisesMap, authorName);
  const safeStudent = (routine.student || 'alumno').trim().replace(/[^\p{L}\p{N}]+/gu, '_');
  doc.save(`Rutina_${safeStudent}_${todayIso()}.pdf`);
}

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

const KAPPA = 0.5522847498307936;

interface CornerRadii {
  tl: number;
  tr: number;
  br: number;
  bl: number;
}

// jsPDF's roundedRect only takes a single uniform radius. The day card needs the header's
// top corners rounded while its bottom edge stays flush against the content box (and vice
// versa for the content box), so we build the outline ourselves as a path of straight edges
// and cubic-bezier quarter-circles (approximated with the standard kappa constant), one
// corner at a time, skipping the curve entirely wherever that corner's radius is 0.
function roundedRectCorners(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  { tl, tr, br, bl }: CornerRadii,
  style: string,
): void {
  const segments: number[][] = [];
  segments.push([w - tl - tr, 0]);
  if (tr > 0) segments.push([KAPPA * tr, 0, tr, tr - KAPPA * tr, tr, tr]);
  segments.push([0, h - tr - br]);
  if (br > 0) segments.push([0, KAPPA * br, KAPPA * br - br, br, -br, br]);
  segments.push([-(w - br - bl), 0]);
  if (bl > 0) segments.push([-KAPPA * bl, 0, -bl, KAPPA * bl - bl, -bl, -bl]);
  segments.push([0, -(h - bl - tl)]);
  if (tl > 0) segments.push([0, -KAPPA * tl, tl - KAPPA * tl, -tl, tl, -tl]);
  doc.lines(segments, x + tl, y, [1, 1], style, true);
}

// The content box below the day header mirrors the preview's `border border-t-0
// rounded-b-[5px]`: a stroke down the left side, along the bottom (rounded at both bottom
// corners), and up the right side — but deliberately no line across the top, since the
// header's own fill already forms that edge.
function drawDayContentBorder(
  doc: jsPDF,
  x: number,
  yTop: number,
  width: number,
  height: number,
  r: number,
): void {
  const segments = [
    [0, height - r],
    [0, KAPPA * r, r - KAPPA * r, r, r, r],
    [width - 2 * r, 0],
    [KAPPA * r, 0, r, KAPPA * r - r, r, -r],
    [0, -(height - r)],
  ];
  doc.lines(segments, x, yTop, [1, 1], 'S', false);
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
  const contentX0 = ROW_PAD_X + ACCENT_W + GAP_AFTER_ACCENT;
  const availableNameWidth = width - contentX0 - RIGHT_COL_W - ROW_PAD_X;

  doc.setFont(FONT, 'bold');
  doc.setFontSize(VIDEO_SIZE);
  const videoBadgeWidth = row.videoUrl ? doc.getTextWidth('Video') + VIDEO_GAP_LEFT : 0;

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
  const barX = x + ROW_PAD_X;
  const contentX0 = barX + ACCENT_W + GAP_AFTER_ACCENT;

  const barH = layout.height - ROW_PAD_TOP - ROW_PAD_BOTTOM;
  doc.setFillColor(row.accentBar);
  doc.roundedRect(barX, y + ROW_PAD_TOP, ACCENT_W, barH, ACCENT_W / 2, ACCENT_W / 2, 'F');

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
    doc.text('Video', badgeX, lastLineY);
    const badgeWidth = doc.getTextWidth('Video');
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
const DAY_BOX_PAD = 3;
const BLOCK_GAP = 2.5;
const DAY_CARD_RADIUS = 1.5;
const SUPERSET_RADIUS = 1.8;
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

  const innerWidth = width - BOX_PAD * 2;
  const innerX = x + BOX_PAD;
  const rowsHeight = rowLayouts.reduce((sum, l) => sum + l.height, 0);
  const connectorsHeight = CONNECTOR_H * (rows.length - 1);
  const contentAreaHeight = rowsHeight + connectorsHeight + BOX_PAD * 2;
  const totalHeight = HEADER_H + contentAreaHeight;

  // The whole block gets one continuous light-red backdrop (not just each row), rounded
  // only at the bottom since it sits flush under the header. Drawn before the header fill
  // so the header's own rounded top corners paint over it cleanly.
  doc.setFillColor(COLOR.red50);
  roundedRectCorners(
    doc,
    x,
    y + HEADER_H,
    width,
    contentAreaHeight,
    { tl: 0, tr: 0, br: SUPERSET_RADIUS, bl: SUPERSET_RADIUS },
    'F',
  );

  doc.setFillColor(COLOR.red700);
  roundedRectCorners(
    doc,
    x,
    y,
    width,
    HEADER_H,
    { tl: SUPERSET_RADIUS, tr: SUPERSET_RADIUS, br: 0, bl: 0 },
    'F',
  );
  doc.setFont(FONT, 'bold');
  doc.setFontSize(HEADER_FONT_SIZE);
  doc.setTextColor(COLOR.white);
  doc.text(
    supersetHeaderText(block.letter).toUpperCase(),
    x + HEADER_PAD_X,
    y + HEADER_H / 2 + HEADER_FONT_SIZE * 0.3528 * 0.35,
  );

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
    drawRow(doc, row, innerX, cursorY, innerWidth, rowLayouts[i]);
    cursorY += rowLayouts[i].height;
  });

  doc.setDrawColor(COLOR.red400);
  doc.setLineWidth(0.5);
  roundedRectCorners(
    doc,
    x,
    y,
    width,
    totalHeight,
    { tl: SUPERSET_RADIUS, tr: SUPERSET_RADIUS, br: SUPERSET_RADIUS, bl: SUPERSET_RADIUS },
    'S',
  );
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

  let dayIndex = 0;
  for (const day of routine.days) {
    const blocks = computeBlocks(day);
    const blockRows = blocks.map((block) => block.entries.map((e) => toRow(e, exercisesMap)));

    const dayHeaderH = 7;
    const boxWidth = CONTENT_WIDTH - DAY_BOX_PAD * 2;
    const boxX = PAGE_MARGIN + DAY_BOX_PAD;
    const blockLayouts = blocks.map((block, i) => measureBlock(doc, block, blockRows[i], boxWidth));
    const contentHeight =
      blockLayouts.reduce((sum, b) => sum + b.height, 0) +
      BLOCK_GAP * Math.max(blocks.length - 1, 0);
    const boxHeight = DAY_BOX_PAD * 2 + contentHeight;
    const dayTotalHeight = dayHeaderH + boxHeight;

    // Every day after the first starts on a fresh page — mirrors the on-screen preview,
    // where each day reliably filled a page on its own. The first day is left to flow
    // naturally after the routine header since it may share the page with it.
    if (dayIndex > 0) {
      doc.addPage();
      y = PAGE_MARGIN;
    } else if (y + Math.min(dayTotalHeight, PAGE_HEIGHT - 2 * PAGE_MARGIN) > PAGE_HEIGHT - PAGE_MARGIN) {
      doc.addPage();
      y = PAGE_MARGIN;
    }

    doc.setFillColor(COLOR.stone950);
    roundedRectCorners(
      doc,
      PAGE_MARGIN,
      y,
      CONTENT_WIDTH,
      dayHeaderH,
      { tl: DAY_CARD_RADIUS, tr: DAY_CARD_RADIUS, br: 0, bl: 0 },
      'F',
    );
    doc.setFont(FONT, 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(COLOR.white);
    doc.text(`DÍA ${day.id}`, PAGE_MARGIN + 3, y + dayHeaderH / 2 + 1.3);

    const boxTop = y + dayHeaderH;
    let blockY = boxTop + DAY_BOX_PAD;

    blockLayouts.forEach(({ height, rowLayouts }, i) => {
      const block = blocks[i];
      const rows = blockRows[i];
      if (blockY + height > PAGE_HEIGHT - PAGE_MARGIN) {
        doc.addPage();
        blockY = PAGE_MARGIN;
      }
      drawBlock(doc, block, rows, rowLayouts, boxX, blockY, boxWidth);
      blockY += height + BLOCK_GAP;
    });

    const boxBottom = boxTop + boxHeight;
    doc.setDrawColor(COLOR.stone300);
    doc.setLineWidth(0.25);
    drawDayContentBorder(doc, PAGE_MARGIN, boxTop, CONTENT_WIDTH, boxHeight, DAY_CARD_RADIUS);

    y = boxBottom + 3;
    dayIndex += 1;
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

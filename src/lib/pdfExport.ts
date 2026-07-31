import { jsPDF } from 'jspdf';
import { computeBlocks, supersetHeaderText } from './blocks';
import { ACCENT, NEUTRAL, WARMUP_PALETTE, dayPalette } from './colors';
import type { DayPalette } from './colors';
import {
  ROW_COLUMN_RATIOS,
  SET_FIELD_ROWS,
  buildWarmupPhases,
  type WarmupPhaseView,
} from './routineModel';
import { formatDateEs, todayIso } from './format';
import {
  PLAN_FOOTER_NOTE,
  PLAN_GUIDE_ITEMS,
  PLAN_GUIDE_SUBTITLE,
  PLAN_GUIDE_TITLE,
  RIR_EXAMPLES,
  RIR_HOWTO_ITEMS,
  RIR_HOWTO_TITLE,
  RIR_INTRO,
  RIR_SCALE_NOTE,
  RIR_TITLE,
  WARMUP_SUBTITLE,
  WARMUP_TITLE,
} from './planGuide';
import type { Exercise, ExerciseBlock, RoutineEntry, RoutineInput, SetSpec } from '../types';

// Building the PDF ourselves (instead of window.print() -> browser "Save as PDF") is
// deliberate: mobile print-to-PDF pipelines (iOS/Android) rasterize the page and drop
// <a href> links, while desktop Chrome's print-to-PDF keeps them. jsPDF gives us the same
// byte-identical output — with real clickable link annotations — on every device.

const PAGE_MARGIN = 15;
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;
const PAGE_BOTTOM = PAGE_HEIGHT - PAGE_MARGIN;

const FONT = 'helvetica';

// pt -> mm, the unit the document is laid out in.
const PT_TO_MM = 0.3528;

function lineHeight(sizePt: number, factor = 1.3): number {
  return sizePt * PT_TO_MM * factor;
}

// Baseline offset that visually centers a single line of `sizePt` text in a box of `boxH`.
function centeredBaseline(boxH: number, sizePt: number): number {
  return boxH / 2 + sizePt * PT_TO_MM * 0.35;
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

// A vertical cursor that knows how to break the page. Everything on the first (instructional)
// page flows through it, so blocks never straddle a page boundary.
class Flow {
  y: number;

  doc: jsPDF;

  constructor(doc: jsPDF) {
    this.doc = doc;
    this.y = PAGE_MARGIN;
  }

  ensure(height: number): void {
    if (this.y + height <= PAGE_BOTTOM) return;
    this.doc.addPage();
    this.y = PAGE_MARGIN;
  }

  newPage(): void {
    this.doc.addPage();
    this.y = PAGE_MARGIN;
  }
}

// jsPDF's built-in Helvetica can only encode WinAnsi. Characters outside it (the ▶ play
// glyph, arrows, the U+2212 minus, emoji) don't just render as boxes — they knock the whole
// line's glyph positioning out, so they're swapped for ASCII equivalents on the way in. The
// on-screen preview keeps the nicer originals.
const PDF_TEXT_REPLACEMENTS: Array<[RegExp, string]> = [
  [/[▶►]\s*/g, ''],
  [/[⚡🔗📝]\s*/gu, ''],
  [/[→⇒]/g, '->'],
  [/[−–]/g, '-'],
  [/[“”]/g, '"'],
  [/[‘’]/g, "'"],
];

export function pdfSafe(text: string): string {
  return PDF_TEXT_REPLACEMENTS.reduce((acc, [pattern, to]) => acc.replace(pattern, to), text);
}

function splitLines(doc: jsPDF, text: string, width: number, sizePt: number, style: string): string[] {
  doc.setFont(FONT, style);
  doc.setFontSize(sizePt);
  return doc.splitTextToSize(pdfSafe(text), width) as string[];
}

function drawLines(
  doc: jsPDF,
  lines: string[],
  x: number,
  yTop: number,
  sizePt: number,
  style: string,
  color: string,
): number {
  doc.setFont(FONT, style);
  doc.setFontSize(sizePt);
  doc.setTextColor(color);
  const lh = lineHeight(sizePt, 1.35);
  lines.forEach((line, i) => {
    doc.text(line, x, yTop + lh * 0.78 + i * lh);
  });
  return lines.length * lh;
}

// ---------------------------------------------------------------------------
// Exercise rows — the 25% / 50% / 25% grid shared by the editor, the preview and this file.
// ---------------------------------------------------------------------------

interface PdfRow {
  id: string;
  name: string;
  group?: Exercise['group'];
  sets: SetSpec[];
  videoUrl?: string;
  note: string;
}

const NAME_SIZE = 7.5;
const CHIP_SIZE = 5.5;
const MATRIX_LABEL_SIZE = 5.5;
const MATRIX_VALUE_SIZE = 7;
const VIDEO_SIZE = 6;
const NOTE_SIZE = 6;

const ROW_PAD = 2;
const CHIP_PAD_X = 1.2;
const CHIP_GAP_TOP = 1;
const MATRIX_ROW_H = 4.2;
const MATRIX_ROWS = 4; // "Serie" header + reps + rir + pausa
const MATRIX_H = MATRIX_ROW_H * MATRIX_ROWS;

interface RowLayout {
  height: number;
  nameLines: string[];
  noteLines: string[];
  leftW: number;
  midW: number;
  rightW: number;
}

function layoutExerciseRow(doc: jsPDF, row: PdfRow, width: number): RowLayout {
  const leftW = width * ROW_COLUMN_RATIOS.left;
  const midW = width * ROW_COLUMN_RATIOS.mid;
  const rightW = width - leftW - midW;

  const nameLines = splitLines(doc, row.name, leftW - ROW_PAD * 2, NAME_SIZE, 'bold');
  const noteLines = row.note
    ? splitLines(doc, row.note, rightW - ROW_PAD * 2, NOTE_SIZE, 'italic')
    : [];

  let leftH = ROW_PAD * 2 + nameLines.length * lineHeight(NAME_SIZE);
  if (row.group) leftH += CHIP_GAP_TOP + lineHeight(CHIP_SIZE) + 1;

  let rightH = ROW_PAD * 2;
  if (row.videoUrl) rightH += lineHeight(VIDEO_SIZE) + 1;
  if (noteLines.length) rightH += noteLines.length * lineHeight(NOTE_SIZE, 1.35);

  return {
    height: Math.max(MATRIX_H, leftH, rightH),
    nameLines,
    noteLines,
    leftW,
    midW,
    rightW,
  };
}

function drawExerciseRow(
  doc: jsPDF,
  row: PdfRow,
  x: number,
  y: number,
  width: number,
  layout: RowLayout,
  palette: DayPalette,
  background: string,
): void {
  const { height, leftW, midW } = layout;

  doc.setFillColor(background);
  doc.rect(x, y, width, height, 'F');

  // --- left column: exercise name + muscle-group chip in the day's tone ---
  let cursorY = y + ROW_PAD;
  doc.setFont(FONT, 'bold');
  doc.setFontSize(NAME_SIZE);
  doc.setTextColor(NEUTRAL.ink);
  layout.nameLines.forEach((line, i) => {
    doc.text(line, x + ROW_PAD, cursorY + lineHeight(NAME_SIZE) * 0.78 + i * lineHeight(NAME_SIZE));
  });
  cursorY += layout.nameLines.length * lineHeight(NAME_SIZE);

  if (row.group) {
    doc.setFont(FONT, 'bold');
    doc.setFontSize(CHIP_SIZE);
    const groupLabel = pdfSafe(row.group);
    const chipW = doc.getTextWidth(groupLabel) + CHIP_PAD_X * 2;
    const chipH = lineHeight(CHIP_SIZE) + 1;
    const chipY = cursorY + CHIP_GAP_TOP;
    doc.setFillColor(palette.inner);
    doc.roundedRect(x + ROW_PAD, chipY, chipW, chipH, 0.7, 0.7, 'F');
    doc.setTextColor(palette.ink);
    doc.text(groupLabel, x + ROW_PAD + CHIP_PAD_X, chipY + centeredBaseline(chipH, CHIP_SIZE));
  }

  // --- middle column: the set matrix ---
  const matrixX = x + leftW;
  const colCount = row.sets.length;
  const colW = midW / (colCount + 1);

  doc.setFillColor(palette.faint);
  doc.rect(matrixX, y, midW, MATRIX_ROW_H, 'F');

  doc.setDrawColor(palette.border);
  doc.setLineWidth(0.15);
  for (let r = 1; r < MATRIX_ROWS; r += 1) {
    const lineY = y + MATRIX_ROW_H * r;
    doc.line(matrixX, lineY, matrixX + midW, lineY);
  }
  for (let c = 1; c <= colCount; c += 1) {
    const lineX = matrixX + colW * c;
    doc.line(lineX, y, lineX, y + MATRIX_H);
  }

  doc.setFont(FONT, 'bold');
  doc.setFontSize(MATRIX_LABEL_SIZE);
  doc.setTextColor(NEUTRAL.muted);
  doc.text('SERIE', matrixX + 1.5, y + centeredBaseline(MATRIX_ROW_H, MATRIX_LABEL_SIZE));

  doc.setFont(FONT, 'bold');
  doc.setFontSize(MATRIX_LABEL_SIZE);
  doc.setTextColor(palette.ink);
  for (let i = 0; i < colCount; i += 1) {
    doc.text(
      `S${i + 1}`,
      matrixX + colW * (i + 1) + colW / 2,
      y + centeredBaseline(MATRIX_ROW_H, MATRIX_LABEL_SIZE),
      { align: 'center' },
    );
  }

  SET_FIELD_ROWS.forEach(({ field, label }, rowIndex) => {
    const rowY = y + MATRIX_ROW_H * (rowIndex + 1);
    doc.setFont(FONT, 'bold');
    doc.setFontSize(MATRIX_LABEL_SIZE);
    doc.setTextColor(NEUTRAL.ink);
    doc.text(label.toUpperCase(), matrixX + 1.5, rowY + centeredBaseline(MATRIX_ROW_H, MATRIX_LABEL_SIZE));

    doc.setFontSize(MATRIX_VALUE_SIZE);
    for (let i = 0; i < row.sets.length; i += 1) {
      doc.text(
        row.sets[i][field] || '—',
        matrixX + colW * (i + 1) + colW / 2,
        rowY + centeredBaseline(MATRIX_ROW_H, MATRIX_VALUE_SIZE),
        { align: 'center' },
      );
    }
  });

  // --- right column: video link + note ---
  const rightX = x + leftW + midW;
  let rightY = y + ROW_PAD;
  if (row.videoUrl) {
    doc.setFont(FONT, 'bold');
    doc.setFontSize(VIDEO_SIZE);
    const label = 'Ver video';
    const pillW = doc.getTextWidth(label) + 2.4;
    const pillH = lineHeight(VIDEO_SIZE) + 0.6;
    doc.setFillColor(palette.inner);
    doc.roundedRect(rightX + ROW_PAD, rightY, pillW, pillH, 0.7, 0.7, 'F');
    doc.setTextColor(palette.ink);
    doc.text(label, rightX + ROW_PAD + 1.2, rightY + centeredBaseline(pillH, VIDEO_SIZE));
    doc.link(rightX + ROW_PAD, rightY, pillW, pillH, { url: row.videoUrl });
    rightY += pillH + 1;
  }
  if (layout.noteLines.length) {
    drawLines(doc, layout.noteLines, rightX + ROW_PAD, rightY - 0.6, NOTE_SIZE, 'italic', NEUTRAL.muted);
  }

  // --- column separators, drawn last so they sit above every fill ---
  doc.setDrawColor(palette.border);
  doc.setLineWidth(0.15);
  doc.line(x + leftW, y, x + leftW, y + height);
  doc.line(rightX, y, rightX, y + height);
}

function toRow(entry: RoutineEntry, exercisesMap: Map<string, Exercise>): PdfRow {
  const ex = entry.exerciseId ? exercisesMap.get(entry.exerciseId) : undefined;
  return {
    id: entry.id,
    name: ex?.name ?? '—',
    group: ex?.group,
    sets: entry.sets,
    videoUrl: ex?.videoUrl,
    note: entry.note,
  };
}

// ---------------------------------------------------------------------------
// Blocks (single exercise / superset)
// ---------------------------------------------------------------------------

const BOX_PAD = 1.5;
const DAY_BOX_PAD = 3;
const BLOCK_GAP = 2.5;
const DAY_CARD_RADIUS = 1.5;
const SUPERSET_RADIUS = 1.8;
const CONNECTOR_H = 3;
const SUPERSET_HEADER_H = 5;
const SUPERSET_HEADER_SIZE = 6.5;

function measureBlock(doc: jsPDF, block: ExerciseBlock, rows: PdfRow[], width: number) {
  if (block.type === 'single') {
    const layout = layoutExerciseRow(doc, rows[0], width);
    return { height: layout.height, rowLayouts: [layout] };
  }
  const innerWidth = width - BOX_PAD * 2;
  const rowLayouts = rows.map((row) => layoutExerciseRow(doc, row, innerWidth));
  const rowsHeight = rowLayouts.reduce((sum, l) => sum + l.height, 0);
  return {
    height: SUPERSET_HEADER_H + rowsHeight + CONNECTOR_H * (rows.length - 1) + BOX_PAD * 2,
    rowLayouts,
  };
}

function drawBlock(
  doc: jsPDF,
  block: ExerciseBlock,
  rows: PdfRow[],
  rowLayouts: RowLayout[],
  x: number,
  y: number,
  width: number,
  palette: DayPalette,
): void {
  if (block.type === 'single') {
    drawExerciseRow(doc, rows[0], x, y, width, rowLayouts[0], palette, NEUTRAL.white);
    doc.setDrawColor(palette.border);
    doc.setLineWidth(0.25);
    doc.roundedRect(x, y, width, rowLayouts[0].height, 1, 1, 'S');
    return;
  }

  const innerWidth = width - BOX_PAD * 2;
  const innerX = x + BOX_PAD;
  const rowsHeight = rowLayouts.reduce((sum, l) => sum + l.height, 0);
  const contentHeight = rowsHeight + CONNECTOR_H * (rows.length - 1) + BOX_PAD * 2;
  const totalHeight = SUPERSET_HEADER_H + contentHeight;

  // The whole block gets one continuous wash of the day's color (not just each row), rounded
  // only at the bottom since it sits flush under the header.
  doc.setFillColor(palette.wash);
  roundedRectCorners(
    doc,
    x,
    y + SUPERSET_HEADER_H,
    width,
    contentHeight,
    { tl: 0, tr: 0, br: SUPERSET_RADIUS, bl: SUPERSET_RADIUS },
    'F',
  );

  doc.setFillColor(palette.border);
  roundedRectCorners(
    doc,
    x,
    y,
    width,
    SUPERSET_HEADER_H,
    { tl: SUPERSET_RADIUS, tr: SUPERSET_RADIUS, br: 0, bl: 0 },
    'F',
  );
  doc.setFont(FONT, 'bold');
  doc.setFontSize(SUPERSET_HEADER_SIZE);
  doc.setTextColor(palette.ink);
  doc.text(
    supersetHeaderText(block.letter).toUpperCase(),
    x + 2.5,
    y + centeredBaseline(SUPERSET_HEADER_H, SUPERSET_HEADER_SIZE),
  );

  let cursorY = y + SUPERSET_HEADER_H + BOX_PAD;
  rows.forEach((row, i) => {
    if (i > 0) {
      const lineY = cursorY + CONNECTOR_H / 2;
      doc.setDrawColor(palette.inner);
      doc.setLineWidth(0.3);
      doc.setFont(FONT, 'bold');
      doc.setFontSize(7);
      const plusWidth = doc.getTextWidth('+');
      doc.line(innerX, lineY, innerX + innerWidth / 2 - plusWidth, lineY);
      doc.line(innerX + innerWidth / 2 + plusWidth, lineY, innerX + innerWidth, lineY);
      doc.setTextColor(palette.ink);
      doc.text('+', innerX + innerWidth / 2, lineY + 0.9, { align: 'center' });
      cursorY += CONNECTOR_H;
    }
    drawExerciseRow(doc, row, innerX, cursorY, innerWidth, rowLayouts[i], palette, palette.wash);
    if (i > 0) {
      doc.setDrawColor(palette.border);
      doc.setLineWidth(0.15);
      doc.line(innerX, cursorY, innerX + innerWidth, cursorY);
    }
    cursorY += rowLayouts[i].height;
  });

  doc.setDrawColor(palette.border);
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

// ---------------------------------------------------------------------------
// First page — how to read the plan, RIR primer and the warm-up block
// ---------------------------------------------------------------------------

const GUIDE_COL_GAP = 6;
const GUIDE_BAR_W = 0.7;
const GUIDE_TEXT_INDENT = 2.5;
const GUIDE_TITLE_SIZE = 8;
const GUIDE_BODY_SIZE = 6.5;

function measureGuideItem(doc: jsPDF, body: string, width: number): string[] {
  return splitLines(doc, body, width - GUIDE_TEXT_INDENT, GUIDE_BODY_SIZE, 'normal');
}

function drawPlanGuide(flow: Flow): void {
  const { doc } = flow;
  const colWidth = (CONTENT_WIDTH - GUIDE_COL_GAP) / 2;

  flow.ensure(14);
  doc.setDrawColor(NEUTRAL.line);
  doc.setLineWidth(0.2);
  doc.line(PAGE_MARGIN, flow.y, PAGE_MARGIN + CONTENT_WIDTH, flow.y);
  flow.y += 5;

  doc.setFont(FONT, 'bold');
  doc.setFontSize(11);
  doc.setTextColor(NEUTRAL.ink);
  doc.text(PLAN_GUIDE_TITLE, PAGE_MARGIN, flow.y);
  flow.y += 4;
  doc.setFont(FONT, 'normal');
  doc.setFontSize(7);
  doc.setTextColor(NEUTRAL.muted);
  doc.text(PLAN_GUIDE_SUBTITLE, PAGE_MARGIN, flow.y);
  flow.y += 5;

  for (let i = 0; i < PLAN_GUIDE_ITEMS.length; i += 2) {
    const pair = PLAN_GUIDE_ITEMS.slice(i, i + 2);
    const bodies = pair.map((item) => measureGuideItem(doc, item.body, colWidth));
    const heights = bodies.map(
      (lines) => lineHeight(GUIDE_TITLE_SIZE) + lines.length * lineHeight(GUIDE_BODY_SIZE, 1.35),
    );
    const rowHeight = Math.max(...heights);
    flow.ensure(rowHeight + 3);

    pair.forEach((item, col) => {
      const x = PAGE_MARGIN + col * (colWidth + GUIDE_COL_GAP);
      doc.setFillColor(ACCENT.base);
      doc.rect(x, flow.y, GUIDE_BAR_W, heights[col], 'F');
      doc.setFont(FONT, 'bold');
      doc.setFontSize(GUIDE_TITLE_SIZE);
      doc.setTextColor(NEUTRAL.ink);
      doc.text(item.title, x + GUIDE_TEXT_INDENT, flow.y + lineHeight(GUIDE_TITLE_SIZE) * 0.78);
      drawLines(
        doc,
        bodies[col],
        x + GUIDE_TEXT_INDENT,
        flow.y + lineHeight(GUIDE_TITLE_SIZE),
        GUIDE_BODY_SIZE,
        'normal',
        NEUTRAL.text,
      );
    });
    flow.y += rowHeight + 3;
  }
}

const RIR_BOX_PAD = 4;

function drawRirPrimer(flow: Flow): void {
  const { doc } = flow;
  const innerWidth = CONTENT_WIDTH - RIR_BOX_PAD * 2;

  const introLines = splitLines(doc, RIR_INTRO, innerWidth, 6.5, 'normal');
  const exampleWidth = (innerWidth - 3) / 2;
  const exampleLines = RIR_EXAMPLES.map((t) =>
    splitLines(doc, t, exampleWidth - 4, 6.5, 'normal'),
  );
  const exampleH =
    Math.max(...exampleLines.map((l) => l.length)) * lineHeight(6.5, 1.35) + 3;
  const scaleLines = splitLines(doc, RIR_SCALE_NOTE, innerWidth, 6.5, 'normal');
  const howtoLines = RIR_HOWTO_ITEMS.map((item) => {
    doc.setFont(FONT, 'bold');
    doc.setFontSize(6.5);
    const titleWidth = doc.getTextWidth(`${pdfSafe(item.title)} `);
    const body = pdfSafe(item.body);
    // The bold lead-in shortens only the first line; the rest wrap to the full width.
    const firstLine = splitLines(doc, body, innerWidth - titleWidth, 6.5, 'normal')[0] ?? '';
    const rest = splitLines(doc, body.slice(firstLine.length).trim(), innerWidth, 6.5, 'normal');
    return { titleWidth, firstLine, rest };
  });

  const boxHeight =
    RIR_BOX_PAD * 2 +
    lineHeight(9) +
    1 +
    introLines.length * lineHeight(6.5, 1.35) +
    2 +
    exampleH +
    2 +
    scaleLines.length * lineHeight(6.5, 1.35) +
    4 +
    lineHeight(8) +
    howtoLines.reduce((sum, h) => sum + (1 + h.rest.length) * lineHeight(6.5, 1.35) + 1, 0);

  flow.ensure(boxHeight + 4);

  const boxY = flow.y;
  doc.setFillColor(NEUTRAL.surface);
  doc.setDrawColor(NEUTRAL.line);
  doc.setLineWidth(0.25);
  doc.roundedRect(PAGE_MARGIN, boxY, CONTENT_WIDTH, boxHeight, 2, 2, 'FD');

  const x = PAGE_MARGIN + RIR_BOX_PAD;
  let y = boxY + RIR_BOX_PAD;

  doc.setFont(FONT, 'bold');
  doc.setFontSize(9);
  doc.setTextColor(NEUTRAL.ink);
  doc.text(RIR_TITLE, x, y + lineHeight(9) * 0.78);
  y += lineHeight(9) + 1;

  y += drawLines(doc, introLines, x, y, 6.5, 'normal', NEUTRAL.text) + 2;

  RIR_EXAMPLES.forEach((_, i) => {
    const exX = x + i * (exampleWidth + 3);
    doc.setFillColor(NEUTRAL.white);
    doc.setDrawColor(NEUTRAL.line);
    doc.setLineWidth(0.2);
    doc.roundedRect(exX, y, exampleWidth, exampleH, 1, 1, 'FD');
    drawLines(doc, exampleLines[i], exX + 2, y + 1.2, 6.5, 'normal', NEUTRAL.text);
  });
  y += exampleH + 2;

  y += drawLines(doc, scaleLines, x, y, 6.5, 'normal', NEUTRAL.text) + 4;

  doc.setFont(FONT, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(NEUTRAL.ink);
  doc.text(RIR_HOWTO_TITLE, x, y + lineHeight(8) * 0.78);
  y += lineHeight(8);

  RIR_HOWTO_ITEMS.forEach((item, i) => {
    const { titleWidth, firstLine, rest } = howtoLines[i];
    const lh = lineHeight(6.5, 1.35);
    doc.setFont(FONT, 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(NEUTRAL.ink);
    doc.text(item.title, x, y + lh * 0.78);
    doc.setFont(FONT, 'normal');
    doc.setTextColor(NEUTRAL.text);
    doc.text(firstLine, x + titleWidth, y + lh * 0.78);
    y += lh;
    if (rest.length) y += drawLines(doc, rest, x, y, 6.5, 'normal', NEUTRAL.text);
    y += 1;
  });

  flow.y = boxY + boxHeight + 4;
}

const WARMUP_ITEM_SIZE = 6.5;
const WARMUP_HEADER_H = 4.5;
const WARMUP_BOX_PAD = 2;

function drawWarmup(flow: Flow, phases: WarmupPhaseView[], note: string): void {
  const { doc } = flow;

  flow.ensure(12);
  doc.setFont(FONT, 'bold');
  doc.setFontSize(9);
  doc.setTextColor(NEUTRAL.ink);
  doc.text(WARMUP_TITLE, PAGE_MARGIN, flow.y + 3);
  flow.y += 6;
  doc.setFont(FONT, 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(NEUTRAL.muted);
  doc.text(WARMUP_SUBTITLE, PAGE_MARGIN, flow.y);
  flow.y += 4;

  const colWidth = (CONTENT_WIDTH - WARMUP_BOX_PAD * 2 - 6) / 2;

  const VIDEO_LABEL = 'Ver video';
  doc.setFont(FONT, 'bold');
  doc.setFontSize(6);
  const videoPillW = doc.getTextWidth(VIDEO_LABEL) + 2.4;
  const videoPillH = lineHeight(6) + 0.6;
  const videoReserve = videoPillW + 2;

  phases.forEach((phase) => {
    const itemLines = phase.items.map((item) => {
      const suffix = [item.dose ? ` — ${item.dose}` : '', item.note ? ` · ${item.note}` : ''].join('');
      return splitLines(doc, `${item.name}${suffix}`, colWidth - (item.videoUrl ? videoReserve : 0), WARMUP_ITEM_SIZE, 'normal');
    });
    const rowCount = Math.ceil(phase.items.length / 2);
    let itemsHeight = 0;
    for (let r = 0; r < rowCount; r += 1) {
      const left = itemLines[r * 2]?.length ?? 0;
      const right = itemLines[r * 2 + 1]?.length ?? 0;
      itemsHeight += Math.max(left, right) * lineHeight(WARMUP_ITEM_SIZE, 1.35) + 0.8;
    }
    const boxHeight = WARMUP_HEADER_H + WARMUP_BOX_PAD * 2 + itemsHeight;
    flow.ensure(boxHeight + 2);

    const boxY = flow.y;
    doc.setDrawColor(WARMUP_PALETTE.border);
    doc.setLineWidth(0.25);
    doc.roundedRect(PAGE_MARGIN, boxY, CONTENT_WIDTH, boxHeight, 1.5, 1.5, 'S');
    doc.setFillColor(WARMUP_PALETTE.base);
    roundedRectCorners(
      doc,
      PAGE_MARGIN,
      boxY,
      CONTENT_WIDTH,
      WARMUP_HEADER_H,
      { tl: 1.5, tr: 1.5, br: 0, bl: 0 },
      'F',
    );
    doc.setFont(FONT, 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(WARMUP_PALETTE.ink);
    doc.text(
      phase.header.toUpperCase(),
      PAGE_MARGIN + 3,
      boxY + centeredBaseline(WARMUP_HEADER_H, 6.5),
    );

    let itemY = boxY + WARMUP_HEADER_H + WARMUP_BOX_PAD;
    for (let r = 0; r < rowCount; r += 1) {
      let rowHeight = 0;
      for (let c = 0; c < 2; c += 1) {
        const index = r * 2 + c;
        const item = phase.items[index];
        if (!item) continue;
        const x = PAGE_MARGIN + 3 + c * (colWidth + 6);
        const lines = itemLines[index];
        // The exercise name is bold, the dose/note that follow it are not — so the first
        // line is drawn in two pieces and the wrapped remainder in one.
        const lh = lineHeight(WARMUP_ITEM_SIZE, 1.35);
        doc.setFont(FONT, 'bold');
        doc.setFontSize(WARMUP_ITEM_SIZE);
        doc.setTextColor(NEUTRAL.ink);
        const safeName = pdfSafe(item.name);
        const firstLine = lines[0] ?? safeName;
        const boldPart = firstLine.startsWith(safeName) ? safeName : firstLine;
        doc.text(boldPart, x, itemY + lh * 0.78);
        const boldWidth = doc.getTextWidth(boldPart);
        doc.setFont(FONT, 'normal');
        doc.setTextColor(NEUTRAL.text);
        let firstLineWidth = boldWidth;
        if (firstLine.length > boldPart.length) {
          const remainder = firstLine.slice(boldPart.length);
          doc.text(remainder, x + boldWidth, itemY + lh * 0.78);
          firstLineWidth += doc.getTextWidth(remainder);
        }
        if (lines.length > 1) {
          drawLines(doc, lines.slice(1), x, itemY + lh, WARMUP_ITEM_SIZE, 'normal', NEUTRAL.text);
        }
        if (item.videoUrl) {
          const gap = 1.5;
          const maxPillX = x + colWidth - videoPillW;
          const pillX = Math.min(x + firstLineWidth + gap, maxPillX);
          const pillY = itemY + (lh - videoPillH) / 2;
          doc.setFont(FONT, 'bold');
          doc.setFontSize(6);
          doc.setFillColor(WARMUP_PALETTE.inner);
          doc.roundedRect(pillX, pillY, videoPillW, videoPillH, 0.6, 0.6, 'F');
          doc.setTextColor(WARMUP_PALETTE.ink);
          doc.text(VIDEO_LABEL, pillX + 1.2, pillY + centeredBaseline(videoPillH, 6));
          doc.link(pillX, pillY, videoPillW, videoPillH, { url: item.videoUrl });
        }
        rowHeight = Math.max(rowHeight, lines.length * lh);
      }
      itemY += rowHeight + 0.8;
    }

    flow.y = boxY + boxHeight + 2;
  });

  if (note) {
    const noteLines = splitLines(doc, note, CONTENT_WIDTH - 6, 6.5, 'normal');
    const boxHeight = noteLines.length * lineHeight(6.5, 1.35) + 4;
    flow.ensure(boxHeight + 2);
    doc.setDrawColor(NEUTRAL.border);
    doc.setLineWidth(0.25);
    doc.roundedRect(PAGE_MARGIN, flow.y, CONTENT_WIDTH, boxHeight, 1.5, 1.5, 'S');
    drawLines(doc, noteLines, PAGE_MARGIN + 3, flow.y + 1.5, 6.5, 'normal', NEUTRAL.text);
    flow.y += boxHeight + 2;
  }
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
  const flow = new Flow(doc);

  const logo = await loadLogo();
  const logoBoxSize = 16;
  let headerRightBottom: number;

  if (logo) {
    const scale = Math.min(logoBoxSize / logo.width, logoBoxSize / logo.height);
    doc.addImage(logo.dataUrl, PAGE_MARGIN, flow.y, logo.width * scale, logo.height * scale);
  }

  doc.setFont(FONT, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(NEUTRAL.muted);
  const rightX = PAGE_MARGIN + CONTENT_WIDTH;
  doc.text(`Emitido: ${formatDateEs(todayIso())}`, rightX, flow.y + 4, { align: 'right' });
  headerRightBottom = flow.y + 4;
  if (authorName) {
    doc.setFont(FONT, 'bold');
    doc.setTextColor(NEUTRAL.text);
    doc.text(pdfSafe(`Profesor: ${authorName}`), rightX, flow.y + 8.5, { align: 'right' });
    headerRightBottom = flow.y + 8.5;
  }

  flow.y = Math.max(flow.y + logoBoxSize, headerRightBottom) + 3;
  doc.setDrawColor(NEUTRAL.ink);
  doc.setLineWidth(0.6);
  doc.line(PAGE_MARGIN, flow.y, PAGE_MARGIN + CONTENT_WIDTH, flow.y);
  flow.y += 6;

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
    doc.setTextColor(NEUTRAL.muted);
    doc.text(label, colX, flow.y);
    doc.setFont(FONT, 'bold');
    doc.setFontSize(9);
    doc.setTextColor(NEUTRAL.ink);
    doc.text(pdfSafe(value), colX, flow.y + 5);
  });
  flow.y += 10;

  if (routine.objective) {
    doc.setFont(FONT, 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(NEUTRAL.muted);
    doc.text('OBJETIVO: ', PAGE_MARGIN, flow.y);
    const labelWidth = doc.getTextWidth('OBJETIVO: ');
    doc.setTextColor(NEUTRAL.ink);
    doc.text(pdfSafe(routine.objective), PAGE_MARGIN + labelWidth, flow.y);
    flow.y += 6;
  }

  drawPlanGuide(flow);
  drawRirPrimer(flow);

  const warmupPhases = buildWarmupPhases(routine.warmup, exercisesMap);

  if (warmupPhases.length > 0 || routine.warmup.note) {
    drawWarmup(flow, warmupPhases, routine.warmup.note);
  }

  // Every training day starts on a fresh page, after the instructional first page.
  routine.days.forEach((day) => {
    const palette = dayPalette(day.id);
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

    flow.newPage();

    doc.setFillColor(palette.base);
    roundedRectCorners(
      doc,
      PAGE_MARGIN,
      flow.y,
      CONTENT_WIDTH,
      dayHeaderH,
      { tl: DAY_CARD_RADIUS, tr: DAY_CARD_RADIUS, br: 0, bl: 0 },
      'F',
    );
    doc.setFont(FONT, 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(palette.ink);
    doc.text(`DÍA ${day.id}`, PAGE_MARGIN + 3, flow.y + dayHeaderH / 2 + 1.3);

    const boxTop = flow.y + dayHeaderH;
    let blockY = boxTop + DAY_BOX_PAD;

    blockLayouts.forEach(({ height, rowLayouts }, i) => {
      if (blockY + height > PAGE_BOTTOM) {
        doc.addPage();
        blockY = PAGE_MARGIN;
      }
      drawBlock(doc, blocks[i], blockRows[i], rowLayouts, boxX, blockY, boxWidth, palette);
      blockY += height + BLOCK_GAP;
    });

    doc.setDrawColor(palette.border);
    doc.setLineWidth(0.25);
    drawDayContentBorder(doc, PAGE_MARGIN, boxTop, CONTENT_WIDTH, boxHeight, DAY_CARD_RADIUS);

    flow.y = boxTop + boxHeight + 3;
  });

  doc.setFont(FONT, 'normal');
  doc.setFontSize(7);
  const footerLines = splitLines(doc, PLAN_FOOTER_NOTE, CONTENT_WIDTH, 7, 'normal');
  flow.ensure(3 + footerLines.length * lineHeight(7));
  doc.setDrawColor(NEUTRAL.line);
  doc.setLineWidth(0.2);
  doc.line(PAGE_MARGIN, flow.y, PAGE_MARGIN + CONTENT_WIDTH, flow.y);
  flow.y += 3.5;
  doc.setTextColor(NEUTRAL.muted);
  footerLines.forEach((line, i) => {
    doc.text(line, PAGE_MARGIN, flow.y + i * lineHeight(7));
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

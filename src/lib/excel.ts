import ExcelJS from "exceljs";

// Las dos exportaciones del panel comparten formato: encabezado azul fijo,
// autofiltro y anchos por columna. Vive aquí para que ambas salgan iguales y
// para no repetir el armado del libro en cada ruta.

export type SheetColumn<T> = {
  header: string;
  width: number;
  value: (row: T) => string | number | Date | null;
  /** Formato de celda de Excel, p. ej. "dd/mm/yyyy hh:mm" para fechas. */
  numFmt?: string;
  /** Ajustar el texto dentro de la celda, para columnas largas. */
  wrap?: boolean;
};

export async function buildWorkbook<T>(
  sheetName: string,
  columns: SheetColumn<T>[],
  rows: T[]
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "FIME · Asignación de Salones";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: "frozen", ySplit: 1 }]
  });

  sheet.columns = columns.map(column => ({ header: column.header, width: column.width }));

  for (const row of rows) {
    sheet.addRow(columns.map(column => column.value(row)));
  }

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.alignment = { vertical: "middle" };
  headerRow.height = 22;
  headerRow.eachCell(cell => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F3B54" } };
  });

  // Los encabezados quedan como autofiltro para que quien reciba el archivo
  // pueda seguir acotando sin volver a pedir otra exportación.
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };

  columns.forEach((column, index) => {
    if (column.numFmt) sheet.getColumn(index + 1).numFmt = column.numFmt;
    if (column.wrap) sheet.getColumn(index + 1).alignment = { wrapText: true };
  });

  return workbook.xlsx.writeBuffer();
}

export function spreadsheetResponse(buffer: ArrayBuffer, fileBaseName: string) {
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileBaseName}-${stamp}.xlsx"`,
      "Cache-Control": "no-store"
    }
  });
}

export const DATE_FORMAT = "dd/mm/yyyy hh:mm";

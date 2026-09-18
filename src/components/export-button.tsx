"use client";

import { useState } from "react";
import { FileSpreadsheet, Loader2 } from "lucide-react";

// Se descarga por fetch y no con un enlace directo para poder avisar cuando algo
// sale mal: si la sesión expiró, un enlace guardaría la página de login dentro
// de un archivo .xlsx que Excel ya no puede abrir.
export function ExportButton({
  url,
  fileBaseName,
  emptyMessage,
  title
}: {
  url: string;
  fileBaseName: string;
  /** Cuando viene, el botón se deshabilita y muestra este motivo. */
  emptyMessage?: string;
  title: string;
}) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = async () => {
    setExporting(true);
    setError(null);

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(await response.text() || "No se pudo generar el archivo.");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = objectUrl;
      link.download = `${fileBaseName}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar el archivo.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="export-button"
        onClick={download}
        disabled={exporting || !!emptyMessage}
        title={emptyMessage || title}
      >
        {exporting
          ? <><Loader2 size={14} className="spin" /> Generando...</>
          : <><FileSpreadsheet size={14} /> Exportar Excel</>}
      </button>
      {error && <p className="export-error">{error}</p>}
    </>
  );
}

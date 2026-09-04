"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { approveRequestAction, rejectRequestAction } from "@/app/actions";

export function RequestActions({ requestId, coordinator }: { requestId: number; coordinator: string }) {
  const [dialog, setDialog] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // El resultado se descartaba: cuando la accion fallaba (choque de horario,
  // salon inhabilitado, permisos) el modal se cerraba sin decir nada y la
  // solicitud seguia pendiente sin explicacion.
  const runAction = async (
    action: (formData: FormData) => Promise<{ ok: boolean; error?: string }>,
    formData: FormData,
    fallback: string
  ) => {
    const result = await action(formData);

    if (!result || !result.ok) {
      setError(result?.error || fallback);
      return;
    }

    setError(null);
    setDialog(null);
  };

  const closeDialog = () => {
    setDialog(null);
    setError(null);
  };

  const approveAction = (formData: FormData) =>
    runAction(approveRequestAction, formData, "No se pudo aprobar la solicitud.");

  const rejectAction = (formData: FormData) =>
    runAction(rejectRequestAction, formData, "No se pudo rechazar la solicitud.");

  return (
    <>
      <div className="row-actions">
        <button className="approve-icon" onClick={() => setDialog("approve")} aria-label="Aceptar"><Check size={16} /></button>
        <button className="reject-icon" onClick={() => setDialog("reject")} aria-label="Rechazar"><X size={16} /></button>
      </div>

      {dialog && (
        <div className="modal-backdrop" onClick={closeDialog}>
          <div className="modal confirm-modal" onClick={e => e.stopPropagation()}>
            {error && <div className="modal-error">{error}</div>}
            {dialog === "approve" ? (
              <>
                <h2>Aceptar petición</h2>
                <p>¿Estás seguro de aceptar esta petición?</p>
                <strong className="request-owner">Solicitud de {coordinator}</strong>
                <div className="modal-buttons">
                  <form action={approveAction}><input type="hidden" name="requestId" value={requestId} /><button className="primary" type="submit">Aceptar petición</button></form>
                  <button onClick={closeDialog}>Cancelar</button>
                </div>
              </>
            ) : (
              <>
                <h2>Rechazar petición</h2>
                <p>Explica el motivo de rechazo de la petición.</p>
                <form action={rejectAction} className="reject-form">
                  <input type="hidden" name="requestId" value={requestId} />
                  <textarea name="reason" minLength={5} required placeholder="Esta petición fue rechazada porque..." />
                  <button type="submit">Rechazar petición</button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

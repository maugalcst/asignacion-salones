"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { approveRequestAction, rejectRequestAction } from "@/app/actions";

export function RequestActions({ requestId, coordinator }: { requestId: number; coordinator: string }) {
  const [dialog, setDialog] = useState<"approve" | "reject" | null>(null);

  const approveAction = async (formData: FormData) => { await approveRequestAction(formData); };
  const rejectAction = async (formData: FormData) => { await rejectRequestAction(formData); };

  return (
    <>
      <div className="row-actions">
        <button className="approve-icon" onClick={() => setDialog("approve")} aria-label="Aceptar"><Check size={16} /></button>
        <button className="reject-icon" onClick={() => setDialog("reject")} aria-label="Rechazar"><X size={16} /></button>
      </div>

      {dialog && (
        <div className="modal-backdrop" onClick={() => setDialog(null)}>
          <div className="modal confirm-modal" onClick={e => e.stopPropagation()}>
            {dialog === "approve" ? (
              <>
                <h2>Aceptar petición</h2>
                <p>¿Estás seguro de aceptar esta petición?</p>
                <strong className="request-owner">Solicitud de {coordinator}</strong>
                <div className="modal-buttons">
                  <form action={approveAction}><input type="hidden" name="requestId" value={requestId} /><button className="primary" type="submit">Aceptar petición</button></form>
                  <button onClick={() => setDialog(null)}>Cancelar</button>
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

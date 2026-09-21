"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  Briefcase,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader,
  Lock,
  Mail,
  ShieldCheck,
  User as UserIcon
} from "lucide-react";
import { updateEmailAction, updatePasswordAction } from "@/app/actions";

export type UserSettingsData = {
  id: number;
  name: string;
  username: string;
  email: string | null;
  role: string;
  employeeNumber?: string | null;
  career?: { acronym: string; name: string } | null;
};

type Notice = {
  type: "success" | "error";
  text: string;
};

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Super Administrador",
  ADMIN: "Administrador",
  COORDINATOR: "Coordinador",
  TEACHER: "Auxiliar"
};

export function UserSettingsForm({ user }: { user: UserSettingsData }) {
  // Estado para el correo
  const [email, setEmail] = useState(user.email || "");
  const [emailNotice, setEmailNotice] = useState<Notice | null>(null);
  const [isPendingEmail, startEmailTransition] = useTransition();

  // Estado para la contraseña
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<Notice | null>(null);
  const [isPendingPassword, startPasswordTransition] = useTransition();

  const handleEmailSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEmailNotice(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailNotice({ type: "error", text: "Por favor ingresa un correo electrónico." });
      return;
    }

    startEmailTransition(async () => {
      const formData = new FormData();
      formData.set("email", trimmedEmail);

      const result = await updateEmailAction(undefined, formData);
      if (!result.ok) {
        setEmailNotice({ type: "error", text: result.error || "No se pudo actualizar el correo." });
      } else {
        setEmailNotice({ type: "success", text: result.message || "Correo electrónico actualizado con éxito." });
      }
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordNotice(null);

    if (!currentPassword) {
      setPasswordNotice({ type: "error", text: "Ingresa tu contraseña actual." });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordNotice({ type: "error", text: "La nueva contraseña debe tener al menos 6 caracteres." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordNotice({ type: "error", text: "La confirmación de la nueva contraseña no coincide." });
      return;
    }

    startPasswordTransition(async () => {
      const formData = new FormData();
      formData.set("currentPassword", currentPassword);
      formData.set("newPassword", newPassword);
      formData.set("confirmPassword", confirmPassword);

      const result = await updatePasswordAction(undefined, formData);
      if (!result.ok) {
        setPasswordNotice({ type: "error", text: result.error || "No se pudo actualizar la contraseña." });
      } else {
        setPasswordNotice({ type: "success", text: result.message || "Contraseña actualizada con éxito." });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    });
  };

  return (
    <div className="settings-container">
      {/* Tarjeta de Resumen de Cuenta */}
      <section className="settings-profile-card">
        <div className="settings-profile-avatar">
          <UserIcon size={32} />
        </div>
        <div className="settings-profile-details">
          <div className="settings-profile-header">
            <h2>{user.name}</h2>
            <span className="settings-badge role-badge">
              <ShieldCheck size={14} />
              {roleLabels[user.role] || user.role}
            </span>
            {user.career && (
              <span className="settings-badge career-badge">
                <Building2 size={14} />
                {user.career.acronym}
              </span>
            )}
            {user.employeeNumber && (
              <span className="settings-badge employee-badge">
                <Briefcase size={14} />
                No. {user.employeeNumber}
              </span>
            )}
          </div>
          <p className="settings-profile-username">@{user.username}</p>
        </div>
      </section>

      {/* Cuadrícula de Configuraciones */}
      <div className="settings-grid">
        {/* Card: Correo Electrónico */}
        <section className="settings-card">
          <div className="settings-card-header">
            <div className="settings-icon-wrap">
              <Mail size={20} />
            </div>
            <div>
              <h3>Correo electrónico</h3>
              <p>Actualiza la dirección vinculada a tu cuenta para notificaciones y acceso.</p>
            </div>
          </div>

          <form onSubmit={handleEmailSubmit} className="settings-form">
            <div className="form-field">
              <label htmlFor="settings-email">Correo institucional</label>
              <div className="input-wrap">
                <Mail size={16} className="input-icon" />
                <input
                  id="settings-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@uanl.edu.mx"
                  required
                  disabled={isPendingEmail}
                />
              </div>
              <small className="field-hint">
                Asegúrate de tener acceso a este correo para futuras comunicaciones.
              </small>
            </div>

            {emailNotice && (
              <div
                role="alert"
                className={`settings-notice ${emailNotice.type === "error" ? "error" : "success"}`}
              >
                {emailNotice.type === "error" ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
                <span>{emailNotice.text}</span>
              </div>
            )}

            <div className="settings-card-footer">
              <button
                type="submit"
                disabled={isPendingEmail}
                className="settings-submit-btn"
              >
                {isPendingEmail && <Loader size={16} className="spin" />}
                {isPendingEmail ? "Guardando..." : "Guardar correo"}
              </button>
            </div>
          </form>
        </section>

        {/* Card: Cambiar Contraseña */}
        <section className="settings-card">
          <div className="settings-card-header">
            <div className="settings-icon-wrap">
              <KeyRound size={20} />
            </div>
            <div>
              <h3>Cambiar contraseña</h3>
              <p>Establece una contraseña segura de al menos 6 caracteres.</p>
            </div>
          </div>

          <form onSubmit={handlePasswordSubmit} className="settings-form">
            <div className="form-field">
              <label htmlFor="currentPassword">Contraseña actual</label>
              <div className="input-wrap">
                <Lock size={16} className="input-icon" />
                <input
                  id="currentPassword"
                  type={showCurrentPass ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña actual"
                  required
                  disabled={isPendingPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="password-toggle-btn"
                  title={showCurrentPass ? "Ocultar contraseña" : "Ver contraseña"}
                  tabIndex={-1}
                >
                  {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="newPassword">Nueva contraseña</label>
              <div className="input-wrap">
                <Lock size={16} className="input-icon" />
                <input
                  id="newPassword"
                  type={showNewPass ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  disabled={isPendingPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="password-toggle-btn"
                  title={showNewPass ? "Ocultar contraseña" : "Ver contraseña"}
                  tabIndex={-1}
                >
                  {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="confirmPassword">Confirmar nueva contraseña</label>
              <div className="input-wrap">
                <Lock size={16} className="input-icon" />
                <input
                  id="confirmPassword"
                  type={showConfirmPass ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite tu nueva contraseña"
                  required
                  minLength={6}
                  disabled={isPendingPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="password-toggle-btn"
                  title={showConfirmPass ? "Ocultar contraseña" : "Ver contraseña"}
                  tabIndex={-1}
                >
                  {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {passwordNotice && (
              <div
                role="alert"
                className={`settings-notice ${passwordNotice.type === "error" ? "error" : "success"}`}
              >
                {passwordNotice.type === "error" ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
                <span>{passwordNotice.text}</span>
              </div>
            )}

            <div className="settings-card-footer">
              <button
                type="submit"
                disabled={isPendingPassword}
                className="settings-submit-btn"
              >
                {isPendingPassword && <Loader size={16} className="spin" />}
                {isPendingPassword ? "Actualizando..." : "Actualizar contraseña"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

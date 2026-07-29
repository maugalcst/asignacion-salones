"use client";

import { useActionState } from "react";
import { Loader, Lock, User } from "lucide-react";
import { loginAction } from "@/app/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);

  return (
    <form action={action} className="login-form">
      <div className="login-field">
        <label htmlFor="username">Usuario</label>
        <div className="input-wrap">
          <User size={16} className="input-icon" />
          <input id="username" name="username" type="text" placeholder="usuario@uanl.edu.mx" required />
        </div>
      </div>
      <div className="login-field">
        <label htmlFor="password">Contraseña</label>
        <div className="input-wrap">
          <Lock size={16} className="input-icon" />
          <input id="password" name="password" type="password" required minLength={6} placeholder="••••••••" />
        </div>
      </div>
      {state?.error && <p className="form-error">{state.error}</p>}
      <button type="submit" disabled={pending} className="login-btn">
        {pending && <Loader size={18} className="spin" />}
        {pending ? "Ingresando..." : "Ingresar"}
      </button>
    </form>
  );
}

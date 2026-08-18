"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type LoginCardProps = {
  title: string;
  subtitle: string;
};

export default function LoginCard({
  title,
  subtitle,
}: LoginCardProps) {
  const router = useRouter();

  const [cedula, setCedula] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setLoading(true);

    const cedulaLimpia = cedula.replace(/\D/g, "");
    const emailTecnico = `${cedulaLimpia}@zonahorarios.local`;

    const { data, error: loginError } =
      await supabase.auth.signInWithPassword({
        email: emailTecnico,
        password,
      });

    if (loginError || !data.user) {
      setError("Cédula o contraseña incorrecta.");
      setLoading(false);
      return;
    }

    const { data: empleado, error: empleadoError } =
      await supabase
        .from("empleados")
        .select("nombre, apellido, rol, activo, auth_user_id")
        .eq("auth_user_id", data.user.id)
        .single();

    if (empleadoError || !empleado) {
      setError("No se encontró el empleado asociado.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    if (!empleado.activo) {
      setError("Este usuario se encuentra inactivo.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    if (empleado.rol === "administrador") {
      router.push("/admin");
    } else {
      router.push("/dashboard");
    }

    router.refresh();
  }

  return (
    <div className="w-full max-w-md rounded-[28px] bg-white p-7 shadow-2xl sm:p-8">
      <div className="mb-7">
        <h1 className="text-3xl font-bold tracking-tight text-[#0b1f5e]">
          {title}
        </h1>

        <p className="mt-2 text-base text-gray-500">
          {subtitle}
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-5">
        {/* CÉDULA */}
        <div>
          <label
            htmlFor="cedula"
            className="mb-2 block text-sm font-semibold text-gray-700"
          >
            Cédula
          </label>

          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#0b1f5e]">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21a8 8 0 0 0-16 0" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>

            <input
              id="cedula"
              type="text"
              inputMode="numeric"
              autoComplete="username"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              placeholder="Ingresá tu cédula"
              className="h-14 w-full rounded-xl border border-gray-300 bg-white pl-12 pr-4 text-base text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#0b1f5e] focus:ring-2 focus:ring-[#0b1f5e]/10"
              required
            />
          </div>
        </div>

        {/* CONTRASEÑA */}
        <div>
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-semibold text-gray-700"
          >
            Contraseña
          </label>

          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#0b1f5e]">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect
                  width="14"
                  height="11"
                  x="5"
                  y="11"
                  rx="2"
                  ry="2"
                />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
            </div>

            <input
              id="password"
              type={mostrarPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingresá tu contraseña"
              className="h-14 w-full rounded-xl border border-gray-300 bg-white pl-12 pr-12 text-base text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#0b1f5e] focus:ring-2 focus:ring-[#0b1f5e]/10"
              required
            />

            <button
              type="button"
              onClick={() => setMostrarPassword(!mostrarPassword)}
              className="absolute inset-y-0 right-0 flex items-center px-4 text-[#0b1f5e]"
              aria-label={
                mostrarPassword
                  ? "Ocultar contraseña"
                  : "Mostrar contraseña"
              }
            >
              {mostrarPassword ? (
                <svg
                  width="23"
                  height="23"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m2 2 20 20" />
                  <path d="M6.7 6.7C4.9 8 3.4 9.8 2.5 12c1.8 4.2 5.4 7 9.5 7 1.5 0 2.9-.4 4.2-1" />
                  <path d="M10.7 10.7a2 2 0 0 0 2.6 2.6" />
                  <path d="M14.8 9.2A4 4 0 0 0 9.2 14.8" />
                  <path d="M9.9 5.1A9.6 9.6 0 0 1 12 5c4.1 0 7.7 2.8 9.5 7a10.9 10.9 0 0 1-2.1 3.3" />
                </svg>
              ) : (
                <svg
                  width="23"
                  height="23"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2.1 12a10.9 10.9 0 0 1 19.8 0 10.9 10.9 0 0 1-19.8 0Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 h-14 w-full rounded-xl bg-[#081b54] text-base font-bold tracking-wide text-white shadow-lg transition hover:bg-[#061642] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "INGRESANDO..." : "INGRESAR"}
        </button>
      </form>
    </div>
  );
}
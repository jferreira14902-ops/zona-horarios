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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setLoading(true);

    const cedulaLimpia = cedula.replace(/\D/g, "");
    const emailTecnico = `${cedulaLimpia}@zonahorarios.local`;

    console.log("Email técnico:", emailTecnico);

    // 1. LOGIN
    const { data, error: loginError } =
      await supabase.auth.signInWithPassword({
        email: emailTecnico,
        password,
      });

    console.log("LOGIN DATA:", data);
    console.log("LOGIN ERROR:", loginError);

    if (loginError || !data.user) {
      setError(
        loginError?.message ?? "Cédula o contraseña incorrecta."
      );
      setLoading(false);
      return;
    }

    console.log("USER ID:", data.user.id);

    // 2. BUSCAR EMPLEADO
    const { data: empleado, error: empleadoError } =
      await supabase
        .from("empleados")
        .select("nombre, apellido, rol, activo, auth_user_id")
        .eq("auth_user_id", data.user.id)
        .single();

    console.log("EMPLEADO:", empleado);
    console.log("EMPLEADO ERROR:", empleadoError);

    if (empleadoError || !empleado) {
      setError("No se encontró el empleado asociado.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    // 3. COMPROBAR SI ESTÁ ACTIVO
    if (!empleado.activo) {
      setError("Este usuario se encuentra inactivo.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    // 4. REDIRECCIONAR SEGÚN EL ROL
    if (empleado.rol === "administrador") {
      router.push("/admin");
    } else {
      router.push("/dashboard");
    }

    router.refresh();
  }

  return (
    <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-blue-700">
          {title}
        </h1>

        <p className="mt-2 text-gray-500">
          {subtitle}
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium">
            Cédula
          </label>

          <input
            type="text"
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
            placeholder="Ingrese su cédula"
            className="w-full rounded-lg border p-3"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Contraseña
          </label>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="********"
            className="w-full rounded-lg border p-3"
            required
          />
        </div>

        {error && (
          <p className="text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-700 p-3 font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
        >
          {loading ? "INGRESANDO..." : "INGRESAR"}
        </button>
      </form>
    </div>
  );
}
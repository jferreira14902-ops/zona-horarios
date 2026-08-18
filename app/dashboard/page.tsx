"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Empleado = {
  id: string;
  nombre: string;
  apellido: string;
};

type Estado = "trabajado" | "falto" | "lluvia";

export default function DashboardPage() {
  const [empleado, setEmpleado] = useState<Empleado | null>(null);

  const [estado, setEstado] = useState<Estado>("trabajado");

  const [inicioDescanso, setInicioDescanso] = useState("12:00");
  const [finDescanso, setFinDescanso] = useState("13:00");
  const [salida, setSalida] = useState("17:30");

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data: empleadoData, error: empleadoError } =
      await supabase
        .from("empleados")
        .select("id, nombre, apellido")
        .eq("auth_user_id", user.id)
        .single();

    if (empleadoError || !empleadoData) {
      setError("No se pudo cargar el empleado.");
      setLoading(false);
      return;
    }

    setEmpleado(empleadoData);

    const fechaHoy = obtenerFechaHoy();

    const { data: jornada } = await supabase
      .from("jornadas")
      .select(
        "estado, inicio_descanso, fin_descanso, salida"
      )
      .eq("empleado_id", empleadoData.id)
      .eq("fecha", fechaHoy)
      .maybeSingle();

    if (jornada) {
      setEstado(jornada.estado as Estado);

      if (jornada.inicio_descanso) {
        setInicioDescanso(
          jornada.inicio_descanso.slice(0, 5)
        );
      }

      if (jornada.fin_descanso) {
        setFinDescanso(
          jornada.fin_descanso.slice(0, 5)
        );
      }

      if (jornada.salida) {
        setSalida(jornada.salida.slice(0, 5));
      }
    }

    setLoading(false);
  }

  function obtenerFechaHoy() {
    const ahora = new Date();

    const year = ahora.getFullYear();
    const month = String(
      ahora.getMonth() + 1
    ).padStart(2, "0");
    const day = String(
      ahora.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  async function guardarJornada() {
    if (!empleado) return;

    setGuardando(true);
    setMensaje("");
    setError("");

    const fechaHoy = obtenerFechaHoy();

    const jornada = {
      empleado_id: empleado.id,
      fecha: fechaHoy,
      entrada: "07:30",
      estado,

      inicio_descanso:
        estado === "trabajado"
          ? inicioDescanso
          : null,

      fin_descanso:
        estado === "trabajado"
          ? finDescanso
          : null,

      salida:
        estado === "trabajado"
          ? salida
          : null,
    };

    const { error: guardarError } =
      await supabase
        .from("jornadas")
        .upsert(jornada, {
          onConflict: "empleado_id,fecha",
        });

    if (guardarError) {
      console.error(guardarError);
      setError("No se pudo guardar la jornada.");
      setGuardando(false);
      return;
    }

    setMensaje("Jornada guardada correctamente.");
    setGuardando(false);
  }

  async function cerrarSesion() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        Cargando...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-blue-700">
              Zona Horarios
            </h1>

            <p className="text-sm text-gray-500">
              Registro de jornada
            </p>
          </div>

          <button
            onClick={cerrarSesion}
            className="rounded-lg border px-4 py-2 text-sm"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl p-6">
        <div className="mb-6">
          <h2 className="text-3xl font-bold">
            Hola, {empleado?.nombre}
          </h2>

          <p className="mt-1 text-gray-500">
            Completá tu jornada de hoy
          </p>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="mb-6">
            <label className="mb-2 block font-medium">
              Estado del día
            </label>

            <select
              value={estado}
              onChange={(e) =>
                setEstado(e.target.value as Estado)
              }
              className="w-full rounded-lg border p-3"
            >
              <option value="trabajado">
                Trabajado
              </option>

              <option value="falto">
                Falté
              </option>

              <option value="lluvia">
                Suspendido por lluvia
              </option>
            </select>
          </div>

          {estado === "trabajado" && (
            <div className="space-y-5">
              <div>
                <label className="mb-2 block font-medium">
                  Entrada
                </label>

                <input
                  value="07:30"
                  disabled
                  className="w-full rounded-lg border bg-gray-100 p-3"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium">
                  Inicio descanso
                </label>

                <input
                  type="time"
                  value={inicioDescanso}
                  onChange={(e) =>
                    setInicioDescanso(e.target.value)
                  }
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium">
                  Fin descanso
                </label>

                <input
                  type="time"
                  value={finDescanso}
                  onChange={(e) =>
                    setFinDescanso(e.target.value)
                  }
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium">
                  Salida
                </label>

                <input
                  type="time"
                  value={salida}
                  onChange={(e) =>
                    setSalida(e.target.value)
                  }
                  className="w-full rounded-lg border p-3"
                />
              </div>
            </div>
          )}

          {error && (
            <p className="mt-5 text-sm text-red-600">
              {error}
            </p>
          )}

          {mensaje && (
            <p className="mt-5 text-sm text-green-700">
              {mensaje}
            </p>
          )}

          <button
            onClick={guardarJornada}
            disabled={guardando}
            className="mt-6 w-full rounded-lg bg-blue-700 p-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
          >
            {guardando
              ? "Guardando..."
              : "Guardar jornada"}
          </button>
        </div>
      </div>
    </main>
  );
}
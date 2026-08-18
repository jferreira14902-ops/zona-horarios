"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Empleado = {
  id: string;
  nombre: string;
  apellido: string;
  cedula: string;
  telefono: string | null;
  rol: string;
  activo: boolean;
};

export default function AdminPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [cedula, setCedula] = useState("");
  const [telefono, setTelefono] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [formError, setFormError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    cargarEmpleados();
  }, []);

  async function cargarEmpleados() {
    setLoading(true);

    const { data, error } = await supabase
      .from("empleados")
      .select("id, nombre, apellido, cedula, telefono, rol, activo")
      .order("apellido", { ascending: true });

    if (error) {
      console.error("ERROR CARGANDO EMPLEADOS:", error);
    } else {
      setEmpleados(data ?? []);
    }

    setLoading(false);
  }

  async function crearEmpleado(e: React.FormEvent) {
    e.preventDefault();

    setGuardando(true);
    setFormError("");
    setMensaje("");

    try {
      const response = await fetch("/api/empleados", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre,
          apellido,
          cedula,
          telefono,
        }),
      });

      const texto = await response.text();

      console.log("STATUS API:", response.status);
      console.log("RESPUESTA API:", texto);

      let resultado: {
        error?: string;
        empleado?: Empleado;
      } = {};

      if (texto) {
        try {
          resultado = JSON.parse(texto);
        } catch {
          console.error("La API no devolvió JSON válido.");
        }
      }

      if (!response.ok) {
        setFormError(
          resultado.error ??
            `Error del servidor (${response.status}).`
        );
        return;
      }

      setNombre("");
      setApellido("");
      setCedula("");
      setTelefono("");
      setMostrarFormulario(false);

      setMensaje("Empleado creado correctamente.");

      await cargarEmpleados();
    } catch (error) {
      console.error("ERROR FETCH:", error);
      setFormError("Ocurrió un error al crear el empleado.");
    } finally {
      setGuardando(false);
    }
  }

  function cancelarFormulario() {
    setMostrarFormulario(false);
    setFormError("");
    setNombre("");
    setApellido("");
    setCedula("");
    setTelefono("");
  }

  async function cerrarSesion() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <main className="min-h-screen bg-slate-100">
      {/* HEADER */}
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-blue-700">
              Zona Horarios
            </h1>

            <p className="text-sm text-gray-500">
              Panel de administración
            </p>
          </div>

          <button
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
            onClick={cerrarSesion}
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      {/* NAVEGACIÓN */}
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl gap-2 px-6 py-3">
          <button
            onClick={() => {
              window.location.href = "/admin";
            }}
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
          >
            Empleados
          </button>

          <button
            onClick={() => {
              window.location.href = "/admin/jornadas";
            }}
            className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
          >
            Jornadas
          </button>
        </div>
      </div>

      {/* CONTENIDO */}
      <div className="mx-auto max-w-6xl p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">
              Empleados
            </h2>

            <p className="mt-1 text-gray-500">
              Administración del personal de Zona Ingeniería
            </p>
          </div>

          <button
            onClick={() => {
              setMostrarFormulario(true);
              setFormError("");
              setMensaje("");
            }}
            className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
          >
            + Nuevo empleado
          </button>
        </div>

        {mensaje && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {mensaje}
          </div>
        )}

        {mostrarFormulario && (
          <form
            onSubmit={crearEmpleado}
            className="mb-6 rounded-xl border bg-white p-6 shadow-sm"
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold">
                  Nuevo empleado
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  La contraseña inicial será su cédula.
                </p>
              </div>

              <button
                type="button"
                onClick={cancelarFormulario}
                className="text-sm text-gray-500 hover:text-gray-800"
              >
                Cancelar
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Nombre
                </label>

                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full rounded-lg border p-3"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Apellido
                </label>

                <input
                  type="text"
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                  className="w-full rounded-lg border p-3"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Cédula
                </label>

                <input
                  type="text"
                  inputMode="numeric"
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value)}
                  placeholder="Ej: 48974011"
                  className="w-full rounded-lg border p-3"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Teléfono
                </label>

                <input
                  type="text"
                  inputMode="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ej: 091450427"
                  className="w-full rounded-lg border p-3"
                />
              </div>
            </div>

            {formError && (
              <p className="mt-4 text-sm text-red-600">
                {formError}
              </p>
            )}

            <div className="mt-5 flex gap-3">
              <button
                type="submit"
                disabled={guardando}
                className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {guardando
                  ? "Creando..."
                  : "Crear empleado"}
              </button>

              <button
                type="button"
                onClick={cancelarFormulario}
                className="rounded-lg border px-5 py-3 font-semibold hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          {loading ? (
            <p className="p-6 text-gray-500">
              Cargando empleados...
            </p>
          ) : empleados.length === 0 ? (
            <p className="p-6 text-gray-500">
              No hay empleados registrados.
            </p>
          ) : (
            <div className="divide-y">
              {empleados.map((empleado) => (
                <div
                  key={empleado.id}
                  className="flex items-center justify-between gap-4 p-5"
                >
                  <div>
                    <h3 className="text-lg font-semibold">
                      {empleado.nombre} {empleado.apellido}
                    </h3>

                    <div className="mt-1 text-sm text-gray-500">
                      CI {empleado.cedula}

                      {empleado.telefono
                        ? ` · ${empleado.telefono}`
                        : ""}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-medium ${
                        empleado.activo
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {empleado.activo
                        ? "Activo"
                        : "Inactivo"}
                    </span>

                    <span className="text-sm capitalize text-gray-500">
                      {empleado.rol}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type EmpleadoRelacionado = {
  nombre: string;
  apellido: string;
  cedula: string;
};

type Jornada = {
  id: string;
  fecha: string;
  entrada: string | null;
  inicio_descanso: string | null;
  fin_descanso: string | null;
  salida: string | null;
  estado: string;
  empleado: EmpleadoRelacionado[];
};

type Estado = "trabajado" | "falto" | "lluvia";

export default function JornadasPage() {
  const hoy = obtenerFechaLocal();

  const [desde, setDesde] = useState(hoy);
  const [hasta, setHasta] = useState(hoy);

  const [jornadas, setJornadas] = useState<Jornada[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [jornadaEditando, setJornadaEditando] =
    useState<Jornada | null>(null);

  const [editEstado, setEditEstado] =
    useState<Estado>("trabajado");

  const [editEntrada, setEditEntrada] =
    useState("07:30");

  const [editInicioDescanso, setEditInicioDescanso] =
    useState("12:00");

  const [editFinDescanso, setEditFinDescanso] =
    useState("13:00");

  const [editSalida, setEditSalida] =
    useState("17:30");

  const [guardandoEdicion, setGuardandoEdicion] =
    useState(false);

  const [errorEdicion, setErrorEdicion] =
    useState("");

  useEffect(() => {
    cargarJornadas();
  }, []);

  function obtenerFechaLocal() {
    const fecha = new Date();

    const year = fecha.getFullYear();
    const month = String(
      fecha.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      fecha.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  async function cargarJornadas() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("jornadas")
      .select(`
        id,
        fecha,
        entrada,
        inicio_descanso,
        fin_descanso,
        salida,
        estado,
        empleado:empleados!fk_empleado (
          nombre,
          apellido,
          cedula
        )
      `)
      .gte("fecha", desde)
      .lte("fecha", hasta)
      .order("fecha", { ascending: false });

    if (error) {
      console.error(error);
      setError("No se pudieron cargar las jornadas.");
      setJornadas([]);
    } else {
      setJornadas((data ?? []) as Jornada[]);
    }

    setLoading(false);
  }

  function obtenerEmpleado(jornada: Jornada) {
    return jornada.empleado?.[0] ?? null;
  }

  function horaCorta(valor: string | null) {
    if (!valor) return "-";

    return valor.slice(0, 5);
  }

  function formatearFecha(fecha: string) {
    const [year, month, day] =
      fecha.split("-");

    return `${day}/${month}/${year}`;
  }

  function nombreEstado(estado: string) {
    if (estado === "trabajado") {
      return "Trabajado";
    }

    if (estado === "falto") {
      return "Faltó";
    }

    if (estado === "lluvia") {
      return "Suspendido por lluvia";
    }

    return estado;
  }

  function esViernes(fecha: string) {
    const [year, month, day] = fecha
      .split("-")
      .map(Number);

    const fechaLocal = new Date(
      year,
      month - 1,
      day
    );

    return fechaLocal.getDay() === 5;
  }

  function salidaPredeterminada(fecha: string) {
    return esViernes(fecha)
      ? "16:30"
      : "17:30";
  }

  function calcularHoras(jornada: Jornada) {
    if (
      jornada.estado !== "trabajado" ||
      !jornada.entrada ||
      !jornada.salida
    ) {
      return "-";
    }

    function convertirAMinutos(hora: string) {
      const [horas, minutos] = hora
        .slice(0, 5)
        .split(":")
        .map(Number);

      return horas * 60 + minutos;
    }

    let minutosTotales =
      convertirAMinutos(jornada.salida) -
      convertirAMinutos(jornada.entrada);

    if (
      jornada.inicio_descanso &&
      jornada.fin_descanso
    ) {
      minutosTotales -=
        convertirAMinutos(
          jornada.fin_descanso
        ) -
        convertirAMinutos(
          jornada.inicio_descanso
        );
    }

    if (minutosTotales < 0) {
      return "-";
    }

    const horas =
      Math.floor(minutosTotales / 60);

    const minutos =
      minutosTotales % 60;

    return `${horas}:${String(
      minutos
    ).padStart(2, "0")}`;
  }

  function abrirEdicion(jornada: Jornada) {
    setJornadaEditando(jornada);

    setEditEstado(
      jornada.estado as Estado
    );

    setEditEntrada(
      jornada.entrada
        ? jornada.entrada.slice(0, 5)
        : "07:30"
    );

    setEditInicioDescanso(
      jornada.inicio_descanso
        ? jornada.inicio_descanso.slice(0, 5)
        : "12:00"
    );

    setEditFinDescanso(
      jornada.fin_descanso
        ? jornada.fin_descanso.slice(0, 5)
        : "13:00"
    );

    setEditSalida(
      jornada.salida
        ? jornada.salida.slice(0, 5)
        : salidaPredeterminada(jornada.fecha)
    );

    setErrorEdicion("");
  }

  function cerrarEdicion() {
    setJornadaEditando(null);
    setErrorEdicion("");
  }

  function restaurarValores() {
    if (!jornadaEditando) return;

    setEditEstado("trabajado");
    setEditEntrada("07:30");
    setEditInicioDescanso("12:00");
    setEditFinDescanso("13:00");

    setEditSalida(
      salidaPredeterminada(
        jornadaEditando.fecha
      )
    );

    setErrorEdicion("");
  }

  async function guardarEdicion() {
    if (!jornadaEditando) return;

    setGuardandoEdicion(true);
    setErrorEdicion("");

    if (
      editEstado === "trabajado" &&
      (!editEntrada || !editSalida)
    ) {
      setErrorEdicion(
        "Entrada y salida son obligatorias."
      );

      setGuardandoEdicion(false);
      return;
    }

    const datosActualizados = {
      estado: editEstado,

      entrada:
        editEstado === "trabajado"
          ? editEntrada
          : null,

      inicio_descanso:
        editEstado === "trabajado"
          ? editInicioDescanso || null
          : null,

      fin_descanso:
        editEstado === "trabajado"
          ? editFinDescanso || null
          : null,

      salida:
        editEstado === "trabajado"
          ? editSalida
          : null,
    };

    const { error } = await supabase
      .from("jornadas")
      .update(datosActualizados)
      .eq("id", jornadaEditando.id);

    if (error) {
      console.error(error);

      setErrorEdicion(
        "No se pudo actualizar la jornada."
      );

      setGuardandoEdicion(false);
      return;
    }

    setJornadaEditando(null);

    setMensaje(
      "Jornada actualizada correctamente."
    );

    await cargarJornadas();

    setGuardandoEdicion(false);

    window.setTimeout(() => {
      setMensaje("");
    }, 3000);
  }

  async function exportarExcel() {
    if (jornadas.length === 0) return;

    const ExcelJS =
      await import("exceljs");

    const workbook =
      new ExcelJS.Workbook();

    const worksheet =
      workbook.addWorksheet("Jornadas");

    worksheet.columns = [
      {
        header: "Fecha",
        key: "fecha",
        width: 14,
      },
      {
        header: "Nombre",
        key: "nombre",
        width: 20,
      },
      {
        header: "Apellido",
        key: "apellido",
        width: 20,
      },
      {
        header: "Cédula",
        key: "cedula",
        width: 14,
      },
      {
        header: "Entrada",
        key: "entrada",
        width: 12,
      },
      {
        header: "Inicio descanso",
        key: "inicio_descanso",
        width: 18,
      },
      {
        header: "Fin descanso",
        key: "fin_descanso",
        width: 18,
      },
      {
        header: "Salida",
        key: "salida",
        width: 12,
      },
      {
        header: "Estado",
        key: "estado",
        width: 24,
      },
      {
        header: "Horas trabajadas",
        key: "horas",
        width: 18,
      },
    ];

    jornadas.forEach((jornada) => {
      const empleado =
        obtenerEmpleado(jornada);

      worksheet.addRow({
        fecha:
          formatearFecha(jornada.fecha),

        nombre:
          empleado?.nombre ?? "",

        apellido:
          empleado?.apellido ?? "",

        cedula:
          empleado?.cedula ?? "",

        entrada:
          horaCorta(jornada.entrada),

        inicio_descanso:
          horaCorta(
            jornada.inicio_descanso
          ),

        fin_descanso:
          horaCorta(
            jornada.fin_descanso
          ),

        salida:
          horaCorta(jornada.salida),

        estado:
          nombreEstado(jornada.estado),

        horas:
          calcularHoras(jornada),
      });
    });

    worksheet.getRow(1).font = {
      bold: true,
    };

    worksheet.views = [
      {
        state: "frozen",
        ySplit: 1,
      },
    ];

    const buffer =
      await workbook.xlsx.writeBuffer();

    const blob = new Blob(
      [buffer as BlobPart],
      {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }
    );

    const url =
      window.URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      `Zona_Horarios_${desde}_al_${hasta}.xlsx`;

    document.body.appendChild(link);

    link.click();

    link.remove();

    window.URL.revokeObjectURL(url);
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
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
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
            className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
          >
            Empleados
          </button>

          <button
            onClick={() => {
              window.location.href = "/admin/jornadas";
            }}
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
          >
            Jornadas
          </button>
        </div>
      </div>

      {/* CONTENIDO */}
      <div className="mx-auto max-w-6xl p-6">
        <div className="mb-6">
          <h2 className="text-3xl font-bold">
            Jornadas
          </h2>

          <p className="mt-1 text-gray-500">
            Consulta, edición y exportación
            de registros
          </p>
        </div>

        {mensaje && (
          <div className="mb-5 rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
            {mensaje}
          </div>
        )}

        <div className="mb-6 rounded-xl border bg-white p-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Desde
              </label>

              <input
                type="date"
                value={desde}
                onChange={(e) =>
                  setDesde(e.target.value)
                }
                className="w-full rounded-lg border p-3"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Hasta
              </label>

              <input
                type="date"
                value={hasta}
                onChange={(e) =>
                  setHasta(e.target.value)
                }
                className="w-full rounded-lg border p-3"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={cargarJornadas}
                className="w-full rounded-lg bg-blue-700 p-3 font-semibold text-white hover:bg-blue-800"
              >
                Buscar
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        <div className="mb-4 flex items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            {jornadas.length} jornada
            {jornadas.length === 1
              ? ""
              : "s"}
          </p>

          <button
            onClick={exportarExcel}
            disabled={
              jornadas.length === 0
            }
            className="rounded-lg border bg-white px-5 py-3 font-semibold hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Exportar Excel
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full min-w-[1000px] text-left">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="p-4">Fecha</th>
                <th className="p-4">Empleado</th>
                <th className="p-4">Estado</th>
                <th className="p-4">Entrada</th>
                <th className="p-4">Descanso</th>
                <th className="p-4">Salida</th>
                <th className="p-4">Horas</th>
                <th className="p-4">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="p-6 text-gray-500"
                  >
                    Cargando jornadas...
                  </td>
                </tr>
              ) : jornadas.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="p-6 text-gray-500"
                  >
                    No hay jornadas en este período.
                  </td>
                </tr>
              ) : (
                jornadas.map(
                  (jornada) => {
                    const empleado =
                      obtenerEmpleado(
                        jornada
                      );

                    return (
                      <tr
                        key={jornada.id}
                        className="border-b last:border-b-0"
                      >
                        <td className="p-4">
                          {formatearFecha(
                            jornada.fecha
                          )}
                        </td>

                        <td className="p-4 font-medium">
                          {empleado
                            ? `${empleado.nombre} ${empleado.apellido}`
                            : "-"}
                        </td>

                        <td className="p-4">
                          {nombreEstado(
                            jornada.estado
                          )}
                        </td>

                        <td className="p-4">
                          {horaCorta(
                            jornada.entrada
                          )}
                        </td>

                        <td className="p-4">
                          {horaCorta(
                            jornada.inicio_descanso
                          )}{" "}
                          -{" "}
                          {horaCorta(
                            jornada.fin_descanso
                          )}
                        </td>

                        <td className="p-4">
                          {horaCorta(
                            jornada.salida
                          )}
                        </td>

                        <td className="p-4 font-medium">
                          {calcularHoras(
                            jornada
                          )}
                        </td>

                        <td className="p-4">
                          <button
                            onClick={() =>
                              abrirEdicion(
                                jornada
                              )
                            }
                            className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    );
                  }
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL EDICIÓN */}
      {jornadaEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-6">
              <h3 className="text-2xl font-bold">
                Editar jornada
              </h3>

              <p className="mt-1 text-gray-500">
                {(() => {
                  const empleado =
                    obtenerEmpleado(
                      jornadaEditando
                    );

                  return empleado
                    ? `${empleado.nombre} ${empleado.apellido}`
                    : "Empleado";
                })()}
              </p>

              <p className="text-sm text-gray-400">
                {formatearFecha(
                  jornadaEditando.fecha
                )}
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Estado
                </label>

                <select
                  value={editEstado}
                  onChange={(e) =>
                    setEditEstado(
                      e.target.value as Estado
                    )
                  }
                  className="w-full rounded-lg border p-3"
                >
                  <option value="trabajado">
                    Trabajado
                  </option>

                  <option value="falto">
                    Faltó
                  </option>

                  <option value="lluvia">
                    Suspendido por lluvia
                  </option>
                </select>
              </div>

              {editEstado ===
                "trabajado" && (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Entrada
                    </label>

                    <input
                      type="time"
                      value={editEntrada}
                      onChange={(e) =>
                        setEditEntrada(
                          e.target.value
                        )
                      }
                      className="w-full rounded-lg border p-3"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Inicio descanso
                    </label>

                    <input
                      type="time"
                      value={
                        editInicioDescanso
                      }
                      onChange={(e) =>
                        setEditInicioDescanso(
                          e.target.value
                        )
                      }
                      className="w-full rounded-lg border p-3"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Fin descanso
                    </label>

                    <input
                      type="time"
                      value={
                        editFinDescanso
                      }
                      onChange={(e) =>
                        setEditFinDescanso(
                          e.target.value
                        )
                      }
                      className="w-full rounded-lg border p-3"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Salida
                    </label>

                    <input
                      type="time"
                      value={editSalida}
                      onChange={(e) =>
                        setEditSalida(
                          e.target.value
                        )
                      }
                      className="w-full rounded-lg border p-3"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={
                      restaurarValores
                    }
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm font-semibold hover:bg-gray-100"
                  >
                    Restaurar valores por defecto
                  </button>
                </>
              )}

              {errorEdicion && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  {errorEdicion}
                </div>
              )}
            </div>

            <div className="mt-7 flex gap-3">
              <button
                type="button"
                onClick={cerrarEdicion}
                disabled={
                  guardandoEdicion
                }
                className="flex-1 rounded-lg border p-3 font-semibold hover:bg-gray-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={guardarEdicion}
                disabled={
                  guardandoEdicion
                }
                className="flex-1 rounded-lg bg-blue-700 p-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {guardandoEdicion
                  ? "Guardando..."
                  : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
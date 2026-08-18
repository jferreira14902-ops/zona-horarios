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

export default function JornadasPage() {
  const hoy = obtenerFechaLocal();

  const [desde, setDesde] = useState(hoy);
  const [hasta, setHasta] = useState(hoy);

  const [jornadas, setJornadas] = useState<Jornada[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    cargarJornadas();
  }, []);

  function obtenerFechaLocal() {
    const fecha = new Date();

    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, "0");
    const day = String(fecha.getDate()).padStart(2, "0");

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

    console.log("JORNADAS:", data);
    console.log("ERROR JORNADAS:", error);

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
    const [year, month, day] = fecha.split("-");

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
        convertirAMinutos(jornada.fin_descanso) -
        convertirAMinutos(jornada.inicio_descanso);
    }

    if (minutosTotales < 0) {
      return "-";
    }

    const horas = Math.floor(minutosTotales / 60);
    const minutos = minutosTotales % 60;

    return `${horas}:${String(minutos).padStart(2, "0")}`;
  }

  async function exportarExcel() {
    if (jornadas.length === 0) return;

    const ExcelJS = await import("exceljs");

    const workbook = new ExcelJS.Workbook();

    const worksheet = workbook.addWorksheet("Jornadas");

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
      const empleado = obtenerEmpleado(jornada);

      worksheet.addRow({
        fecha: formatearFecha(jornada.fecha),
        nombre: empleado?.nombre ?? "",
        apellido: empleado?.apellido ?? "",
        cedula: empleado?.cedula ?? "",
        entrada: horaCorta(jornada.entrada),
        inicio_descanso: horaCorta(
          jornada.inicio_descanso
        ),
        fin_descanso: horaCorta(
          jornada.fin_descanso
        ),
        salida: horaCorta(jornada.salida),
        estado: nombreEstado(jornada.estado),
        horas: calcularHoras(jornada),
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

    const buffer = await workbook.xlsx.writeBuffer();

    const blob = new Blob([buffer as BlobPart], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");

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
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-blue-700">
              Zona Horarios
            </h1>

            <p className="text-sm text-gray-500">
              Jornadas
            </p>
          </div>

          <button
            onClick={() => {
              window.location.href = "/admin";
            }}
            className="rounded-lg border px-4 py-2 text-sm font-medium"
          >
            Volver
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl p-6">
        <div className="mb-6">
          <h2 className="text-3xl font-bold">
            Jornadas
          </h2>

          <p className="mt-1 text-gray-500">
            Consulta y exportación de registros
          </p>
        </div>

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

        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {jornadas.length} jornada
            {jornadas.length === 1 ? "" : "s"}
          </p>

          <button
            onClick={exportarExcel}
            disabled={jornadas.length === 0}
            className="rounded-lg border bg-white px-5 py-3 font-semibold hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Exportar Excel
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full min-w-[900px] text-left">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="p-4">Fecha</th>
                <th className="p-4">Empleado</th>
                <th className="p-4">Estado</th>
                <th className="p-4">Entrada</th>
                <th className="p-4">Descanso</th>
                <th className="p-4">Salida</th>
                <th className="p-4">Horas</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-6 text-gray-500"
                  >
                    Cargando jornadas...
                  </td>
                </tr>
              ) : jornadas.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-6 text-gray-500"
                  >
                    No hay jornadas en este período.
                  </td>
                </tr>
              ) : (
                jornadas.map((jornada) => {
                  const empleado = obtenerEmpleado(jornada);

                  return (
                    <tr
                      key={jornada.id}
                      className="border-b last:border-b-0"
                    >
                      <td className="p-4">
                        {formatearFecha(jornada.fecha)}
                      </td>

                      <td className="p-4 font-medium">
                        {empleado
                          ? `${empleado.nombre} ${empleado.apellido}`
                          : "-"}
                      </td>

                      <td className="p-4">
                        {nombreEstado(jornada.estado)}
                      </td>

                      <td className="p-4">
                        {horaCorta(jornada.entrada)}
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
                        {horaCorta(jornada.salida)}
                      </td>

                      <td className="p-4 font-medium">
                        {calcularHoras(jornada)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
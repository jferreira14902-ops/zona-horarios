import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      return NextResponse.json(
        { error: "Falta NEXT_PUBLIC_SUPABASE_URL en el servidor." },
        { status: 500 }
      );
    }

    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor." },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const body = await request.json();

    const nombre = String(body.nombre ?? "").trim();
    const apellido = String(body.apellido ?? "").trim();
    const cedula = String(body.cedula ?? "").replace(/\D/g, "");
    const telefono =
      String(body.telefono ?? "").trim() || null;

    if (!nombre || !apellido || !cedula) {
      return NextResponse.json(
        {
          error:
            "Nombre, apellido y cédula son obligatorios.",
        },
        { status: 400 }
      );
    }

    const { data: existente, error: buscarError } =
      await supabaseAdmin
        .from("empleados")
        .select("id")
        .eq("cedula", cedula)
        .maybeSingle();

    if (buscarError) {
      return NextResponse.json(
        { error: buscarError.message },
        { status: 500 }
      );
    }

    if (existente) {
      return NextResponse.json(
        { error: "Ya existe un empleado con esa cédula." },
        { status: 409 }
      );
    }

    const emailTecnico =
      `${cedula}@zonahorarios.local`;

    const {
      data: authData,
      error: authError,
    } = await supabaseAdmin.auth.admin.createUser({
      email: emailTecnico,
      password: cedula,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        {
          error:
            authError?.message ??
            "No se pudo crear el usuario.",
        },
        { status: 400 }
      );
    }

    const { data: empleado, error: empleadoError } =
      await supabaseAdmin
        .from("empleados")
        .insert({
          auth_user_id: authData.user.id,
          nombre,
          apellido,
          cedula,
          telefono,
          rol: "empleado",
          activo: true,
        })
        .select(
          "id, nombre, apellido, cedula, telefono, rol, activo"
        )
        .single();

    if (empleadoError) {
      await supabaseAdmin.auth.admin.deleteUser(
        authData.user.id
      );

      return NextResponse.json(
        { error: empleadoError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { empleado },
      { status: 201 }
    );
  } catch (error) {
    console.error("ERROR API EMPLEADOS:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error interno del servidor.",
      },
      { status: 500 }
    );
  }
}
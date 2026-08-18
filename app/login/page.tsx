import Image from "next/image";
import LoginCard from "@/components/LoginCard";

export default function LoginPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">

      {/* Fondo */}
      <Image
        src="/login-bg.jpg"
        alt="Fondo"
        fill
        priority
        className="object-cover"
      />

      {/* Capa azul oscura */}
      <div className="absolute inset-0 bg-[#071c57]/80" />

      {/* Contenido */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-10">

        {/* Logo */}
        <Image
          src="/logo_zona.png"
          alt="Zona Ingeniería"
          width={600}
          height={400}
          className="mb-2 w-[430px] md:w-[520px]"
        />

        <LoginCard
          title="Bienvenido"
          subtitle="Ingresá para continuar"
        />

        <div className="mt-8 text-center text-white/80">
          <p className="font-semibold">
            Zona Ingeniería
          </p>

          <p className="text-sm">
            Sistema de Horarios
          </p>

          <p className="mt-2 text-xs opacity-70">
            Versión 1.0.0
          </p>
        </div>

      </div>
    </main>
  );
}
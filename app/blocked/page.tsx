import { logout } from '@/app/actions/auth'

export default function BlockedPage() {
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
  const waLink = whatsapp
    ? `https://wa.me/${whatsapp}?text=Hola%2C%20quiero%20activar%20mi%20cuenta%20en%20la%20app`
    : null

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <div className="max-w-md w-full rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-zinc-100">Acceso no disponible</h1>
          <p className="text-sm text-zinc-400">Tu cuenta no tiene acceso activo.</p>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-left space-y-2">
          <p className="text-xs font-medium text-zinc-300">Esto puede deberse a:</p>
          <ul className="text-xs text-zinc-500 space-y-1 list-disc list-inside">
            <li>Tu cuenta está pendiente de activación por el administrador</li>
            <li>Tu suscripción venció y necesita renovarse</li>
            <li>Tu cuenta fue desactivada</li>
          </ul>
        </div>

        <div className="space-y-3">
          {waLink && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full rounded-lg bg-green-700 hover:bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition-colors"
            >
              Contactar por WhatsApp
            </a>
          )}

          <form action={logout}>
            <button
              type="submit"
              className="w-full rounded-lg border border-zinc-700 px-4 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

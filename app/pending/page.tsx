export default function PendingPage() {
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
  const waLink = whatsapp
    ? `https://wa.me/${whatsapp}?text=Hola%2C%20quiero%20que%20activen%20mi%20cuenta%20en%20la%20app%20de%20finanzas`
    : null

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <div className="max-w-md w-full rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center space-y-6">
        <div className="space-y-2">
          <div className="text-3xl">📋</div>
          <h1 className="text-xl font-semibold text-zinc-100">¡Registro exitoso!</h1>
          <p className="text-sm text-zinc-400">
            Tu cuenta está pendiente de activación.
          </p>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-500">
          El administrador revisará tu solicitud y te dará acceso. Te avisarán cuando tu cuenta esté lista.
        </div>

        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full rounded-lg bg-green-700 hover:bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition-colors"
          >
            Contactar al administrador por WhatsApp
          </a>
        )}
      </div>
    </div>
  )
}

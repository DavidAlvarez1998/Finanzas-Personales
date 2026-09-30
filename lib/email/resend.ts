import { Resend } from 'resend'

let _client: Resend | null = null

function getResendClient(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error(
      'RESEND_API_KEY is not set. Provision it in your environment before sending emails.'
    )
  }
  if (!_client) {
    _client = new Resend(process.env.RESEND_API_KEY)
  }
  return _client
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
): Promise<void> {
  if (!process.env.APP_URL) {
    throw new Error(
      'APP_URL is not set. Set it to your application base URL (e.g. https://yourapp.com).'
    )
  }

  if (!process.env.RESEND_FROM_EMAIL) {
    throw new Error(
      'RESEND_FROM_EMAIL is not set. Set it to your verified sending domain (e.g. noreply@yourdomain.com).'
    )
  }
  const from = process.env.RESEND_FROM_EMAIL

  const client = getResendClient()

  const { error } = await client.emails.send({
    from,
    to,
    subject: 'Restablecer tu contraseña',
    html: `
      <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
      <p>
        <a href="${resetUrl}">Hacer clic aquí para restablecer tu contraseña</a>
      </p>
      <p>Este enlace expira en <strong>1 hora</strong>.</p>
      <p>Si no solicitaste este cambio, podés ignorar este email.</p>
    `,
  })

  if (error) {
    throw new Error(`Resend error: ${error.message}`)
  }
}

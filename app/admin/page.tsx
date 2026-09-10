import { getAllUsers } from '@/lib/supabase/admin-dal'
import { UserRow } from './_components/user-row'

export default async function AdminPage() {
  const allUsers = await getAllUsers()
  const superadminEmail = process.env.SUPERADMIN_EMAIL ?? ''
  const users = allUsers.filter(u => u.email !== superadminEmail)

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-1 text-zinc-100">Panel de Administración</h1>
      <p className="text-sm text-zinc-500 mb-6">{users.length} {users.length === 1 ? 'cliente' : 'clientes'}</p>
      <div className="space-y-3">
        {users.map(u => (
          <UserRow key={u.id} user={u} />
        ))}
        {users.length === 0 && (
          <p className="text-sm text-zinc-600 text-center py-12">No hay clientes registrados todavía.</p>
        )}
      </div>
    </div>
  )
}

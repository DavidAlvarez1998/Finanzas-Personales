import { getAllUsers } from '@/lib/supabase/admin-dal'
import { UserRow } from './_components/user-row'

export default async function AdminPage() {
  const users = await getAllUsers()

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-zinc-100">Panel de Administración</h1>
      <div className="text-sm text-zinc-500 mb-4">{users.length} usuarios</div>
      <div className="space-y-2">
        {users.map(u => (
          <UserRow key={u.id} user={u} />
        ))}
      </div>
    </div>
  )
}

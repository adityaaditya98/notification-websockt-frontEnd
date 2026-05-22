import UserRow from './UserRow'
import type { Dispatch, SetStateAction } from 'react'

type User = { id?: string; _id?: string; name: string; email: string; role: string }

type Props = {
  users: User[]
  editedUsers: Record<string, { name: string; email: string; role: string; id: string }>
  setEditedUsers: Dispatch<SetStateAction<Record<string, { name: string; email: string; role: string; id: string }>>>
  handleSave: (userId: string) => Promise<void>
  savingUserId?: string
  onSignOut: () => void
  notification?: string
}

export default function AdminPanel({ users, editedUsers, setEditedUsers, handleSave, savingUserId, onSignOut, notification }: Props) {
  const getUserId = (u: User) => u.id ?? u._id ?? ''

  return (
    <div className="admin-panel">
      <p className="welcome-message">Admin portal</p>
      <p className="welcome-text">Edit user details and change roles below.</p>
      {notification && <p className="notification">{notification}</p>}
      <div className="user-table">
        <div className="user-row user-row--header">
          <span>Name</span>
          <span>Email</span>
          <span>Role</span>
          <span>Actions</span>
        </div>
        {users.map((u) => {
          const id = getUserId(u)
          const edited = editedUsers[id] ?? { name: u.name, email: u.email, role: u.role, id }
          return (
            <UserRow
              key={id}
              user={u}
              edited={edited}
              onChange={(changes) =>
                setEditedUsers((prev) => ({ ...prev, [id]: { ...edited, ...changes, id } }))
              }
              onSave={() => handleSave(id)}
              isSaving={savingUserId === id}
            />
          )
        })}
      </div>
      <button type="button" className="primary-button" onClick={onSignOut}>
        Sign out
      </button>
    </div>
  )
}

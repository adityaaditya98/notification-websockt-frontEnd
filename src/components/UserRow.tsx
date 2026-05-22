type User = { id?: string; _id?: string; name: string; email: string; role: string }

type Props = {
  user: User
  edited: { name: string; email: string; role: string; id?: string }
  onChange: (changes: { name?: string; email?: string; role?: string }) => void
  onSave: () => void
  isSaving?: boolean
}

export default function UserRow({ user, edited, onChange, onSave, isSaving }: Props) {
  return (
    <div className="user-row" data-user-id={user.id ?? user._id}>
      <input type="text" value={edited.name} onChange={(e) => onChange({ name: e.target.value })} />
      <input type="email" value={edited.email} onChange={(e) => onChange({ email: e.target.value })} />
      <select value={edited.role} onChange={(e) => onChange({ role: e.target.value })}>
        <option value="USER">USER</option>
        <option value="ADMIN">ADMIN</option>
      </select>
      <button type="button" className="primary-button" onClick={onSave} disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save'}
      </button>
    </div>
  )
}

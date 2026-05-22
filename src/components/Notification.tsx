export default function Notification({ message }: { message?: string }) {
  if (!message) return null
  return <p className="notification">{message}</p>
}

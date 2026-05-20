import { Inbox, Upload } from 'lucide-react'

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'No data available',
  description = 'Upload a sales file to get started',
  action = null,
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 24px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--bg-card-hover)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <Icon size={24} style={{ color: 'var(--text-muted)' }} />
      </div>
      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
        {title}
      </p>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 280, lineHeight: 1.5 }}>
        {description}
      </p>
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  )
}

export function NoDataYet() {
  return (
    <EmptyState
      icon={Upload}
      title="No Sales Data Found"
      description="Go to Data Management to upload your first sales dump file."
    />
  )
}

export default function PlainServerError() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        background: '#f8fafc',
        padding: '1rem',
        fontFamily: 'Inter, system-ui, sans-serif',
        textAlign: 'center',
      }}
    >
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>
        Something went wrong
      </h1>
      <p style={{ fontSize: '0.875rem', color: '#475569', margin: 0 }}>Please try again later.</p>
    </div>
  )
}

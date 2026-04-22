export default function PlainNotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        background: '#f8fafc',
        padding: '1rem',
        fontFamily: 'Inter, system-ui, sans-serif',
        textAlign: 'center',
      }}
    >
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>Page not found</h1>
      <p style={{ fontSize: '0.875rem', color: '#475569', maxWidth: '28rem', margin: 0 }}>
        The page you requested does not exist or has been moved.
      </p>
      <a
        href="/"
        style={{
          borderRadius: '0.5rem',
          background: '#34547a',
          color: '#fff',
          padding: '0.5rem 1rem',
          fontSize: '0.875rem',
          fontWeight: 500,
          textDecoration: 'none',
        }}
      >
        Back to home
      </a>
    </div>
  )
}

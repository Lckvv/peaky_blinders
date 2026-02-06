export default function Home() {
  return (
    <main style={{ maxWidth: 700, margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>⏱ Margonem Map Timer</h1>
      <p style={{ color: '#888', marginBottom: 20 }}>
        Śledź czas spędzony na mapach w Margonem. Rywalizuj z innymi!
      </p>

      <a href="/dashboard" style={{
        display: 'block', textAlign: 'center', padding: '14px 20px',
        background: 'linear-gradient(135deg, #6c3483, #2980b9)', color: '#fff',
        borderRadius: 10, fontSize: 16, fontWeight: 'bold', textDecoration: 'none', marginBottom: 32,
      }}>
        ⚡ Zaloguj się i zainstaluj skrypt
      </a>

      <section style={{ background: '#1a1a2e', borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, marginTop: 0 }}>Jak zacząć?</h2>
        <ol style={{ lineHeight: 2, color: '#ccc' }}>
          <li>Zainstaluj <a href="https://www.tampermonkey.net/" style={{ color: '#3498db' }}>Tampermonkey</a> w przeglądarce</li>
          <li>Przejdź do <a href="/dashboard" style={{ color: '#3498db' }}>dashboardu</a> i zarejestruj się</li>
          <li>Kliknij <strong>„Zainstaluj skrypt"</strong> — Tampermonkey otworzy okno instalacji</li>
          <li>Wejdź na mapę w grze — timer startuje automatycznie!</li>
        </ol>
      </section>

      <section style={{ background: '#1a1a2e', borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, marginTop: 0 }}>API Endpoints</h2>
        <div style={{ fontFamily: 'monospace', fontSize: 13, lineHeight: 2.2, color: '#aaa' }}>
          <div><span style={{ color: '#27ae60' }}>POST</span> /api/auth/register — rejestracja</div>
          <div><span style={{ color: '#27ae60' }}>POST</span> /api/auth/login — logowanie</div>
          <div><span style={{ color: '#3498db' }}>GET</span>&nbsp; /api/auth/api-key — lista kluczy</div>
          <div><span style={{ color: '#27ae60' }}>POST</span> /api/auth/api-key — nowy klucz</div>
          <div><span style={{ color: '#27ae60' }}>POST</span> /api/timer/session — zapisz sesję (TM)</div>
          <div><span style={{ color: '#3498db' }}>GET</span>&nbsp; /api/timer/sessions — moje sesje</div>
          <div><span style={{ color: '#3498db' }}>GET</span>&nbsp; /api/timer/leaderboard?monster=Kic — ranking</div>
        </div>
      </section>

      <section style={{ background: '#1a1a2e', borderRadius: 12, padding: 24 }}>
        <h2 style={{ fontSize: 20, marginTop: 0 }}>Przykład rejestracji</h2>
        <pre style={{ background: '#0a0a1a', padding: 16, borderRadius: 8, overflow: 'auto', fontSize: 12, lineHeight: 1.6 }}>
{`curl -X POST ${typeof window !== 'undefined' ? window.location.origin : 'https://your-app.up.railway.app'}/api/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "gracz@example.com",
    "username": "MojaNazwa",
    "password": "tajnehaslo123"
  }'

# Odpowiedź:
# {
#   "user": { "id": "...", "username": "MojaNazwa" },
#   "apiKey": "mgt_a1b2c3d4e5f6...",  <-- SKOPIUJ TO!
#   "message": "Account created! ..."
# }`}
        </pre>
      </section>
    </main>
  );
}

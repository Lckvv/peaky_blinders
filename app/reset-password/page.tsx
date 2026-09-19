import { Suspense } from 'react';
import ResetPasswordForm from './ResetPasswordForm';

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c4bba8' }}>
          Ładowanie…
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}

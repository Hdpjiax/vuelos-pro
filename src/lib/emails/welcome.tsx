import * as React from 'react';

export function WelcomeEmail({ fullName }: { fullName: string }) {
  return (
    <html>
      <body style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f0f4f8', margin: 0, padding: 0 }}>
        <table width="100%" cellPadding={0} cellSpacing={0} style={{ padding: '40px 20px' }}>
          <tr>
            <td align="center">
              <table width="600" cellPadding={0} cellSpacing={0} style={{
                backgroundColor: '#ffffff',
                borderRadius: '24px',
                overflow: 'hidden',
                boxShadow: '0 4px 24px rgba(0,0,0,0.08)'
              }}>

                {/* Header */}
                <tr>
                  <td style={{ backgroundColor: '#0369a1', padding: '40px 48px', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.5px' }}>
                      ✈️ VuelosPro
                    </p>
                    <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#bae6fd' }}>
                      Tu plataforma de vuelos privados
                    </p>
                  </td>
                </tr>

                {/* Body */}
                <tr>
                  <td style={{ padding: '48px' }}>
                    <p style={{ margin: '0 0 16px', fontSize: '26px', fontWeight: 900, color: '#0f172a' }}>
                      ¡Bienvenido, {fullName}! 👋
                    </p>
                    <p style={{ margin: '0 0 24px', fontSize: '16px', color: '#475569', lineHeight: '1.7' }}>
                      Tu cuenta en <strong>VuelosPro</strong> ha sido creada exitosamente.
                      Ya puedes iniciar sesión y comenzar a gestionar tus vuelos privados.
                    </p>

                    {/* CTA Button */}
                    <table cellPadding={0} cellSpacing={0} style={{ margin: '32px 0' }}>
                      <tr>
                        <td style={{ backgroundColor: '#0369a1', borderRadius: '14px', padding: '14px 32px' }}>
                          <a href="https://vuelospro.com/login" style={{
                            color: '#ffffff',
                            textDecoration: 'none',
                            fontSize: '15px',
                            fontWeight: 900,
                          }}>
                            Iniciar sesión →
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style={{ margin: '24px 0 0', fontSize: '14px', color: '#94a3b8', lineHeight: '1.6' }}>
                      Si no creaste esta cuenta, puedes ignorar este correo.
                    </p>
                  </td>
                </tr>

                {/* Footer */}
                <tr>
                  <td style={{ backgroundColor: '#f8fafc', padding: '24px 48px', borderTop: '1px solid #e2e8f0' }}>
                    <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
                      © 2026 VuelosPro · Todos los derechos reservados
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  );
}

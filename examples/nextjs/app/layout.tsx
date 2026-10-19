import type { ReactNode } from 'react';
import '../../../packages/tokens/dist/css/inteiro.css';
import '../../../packages/design-system/src/components.css';
import '../../../packages/composition/src/fonts.css';
export const metadata = { title:'INTEIRO Next fixture' };
export default function Layout({children}:{children:ReactNode}) {
  return <html lang="pt-BR" data-in-theme="light" data-in-density="calm"><body className="in-root">{children}</body></html>;
}

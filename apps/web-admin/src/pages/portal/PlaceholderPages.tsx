import '../admin/AdminPages.css';

function Placeholder({ title }: { title: string }) {
  return (
    <div className="page">
      <div className="page-placeholder">
        <h2>{title}</h2>
        <p>Em construção.</p>
      </div>
    </div>
  );
}

export function MidiaPage() {
  return <Placeholder title="Biblioteca de Mídia" />;
}

export function MateriasPage() {
  return <Placeholder title="Matérias" />;
}

export function InteracoesPage() {
  return <Placeholder title="Interações" />;
}

export function LayoutPage() {
  return <Placeholder title="Layout" />;
}

export function CoresPage() {
  return <Placeholder title="Cores" />;
}

export function FontesPage() {
  return <Placeholder title="Font-Family" />;
}

export function LogotipoPage() {
  return <Placeholder title="Logotipo" />;
}

export function FaviconPage() {
  return <Placeholder title="Favicon" />;
}

export function BannerPage() {
  return <Placeholder title="Banner" />;
}

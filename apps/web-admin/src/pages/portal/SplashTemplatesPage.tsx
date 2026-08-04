import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import StickyPageHeader from '../../components/StickyPageHeader';
import { usePortalName } from '../../hooks/usePortalName';
import { usePortalState } from '../../hooks/usePortalState';
import { SPLASH_APPLY_TEMPLATE_KEY, type SplashTemplate } from './SplashPage';
import '../admin/AdminPages.css';
import './SplashTemplatesPage.css';

// Ready-made content for the announcements a splash is actually used for
// most — pick one, land in Splash with it pre-filled, tweak the text. Not
// stored per-portal (unlike a saved template): these are fixed, shipped with
// the app, the same for every portal.
const BUILT_IN_TEMPLATES: SplashTemplate[] = [
  {
    id: 'builtin-fato-relevante',
    nome: 'Fato Relevante',
    config: {
      size: 'md',
      titulo: 'Fato Relevante',
      texto: 'A Companhia comunica aos seus acionistas e ao mercado em geral o seguinte Fato Relevante:',
      conteudo: 'Descreva aqui o conteúdo completo do Fato Relevante, incluindo contexto, decisão tomada e seus efeitos esperados.',
      legenda: '',
      buttons: [{ label: 'Ver documento completo', url: '', variant: 'primary' }],
    },
  },
  {
    id: 'builtin-comunicado-mercado',
    nome: 'Comunicado ao Mercado',
    config: {
      size: 'md',
      titulo: 'Comunicado ao Mercado',
      texto: 'A Companhia vem a público prestar o seguinte esclarecimento:',
      conteudo: 'Descreva aqui o conteúdo do comunicado.',
      legenda: '',
      buttons: [{ label: 'Saiba mais', url: '', variant: 'primary' }],
    },
  },
  {
    id: 'builtin-convocacao-ago',
    nome: 'Convocação AGO',
    config: {
      size: 'lg',
      titulo: 'Convocação para Assembleia Geral Ordinária',
      texto: 'Ficam os senhores acionistas convocados para a Assembleia Geral Ordinária a ser realizada conforme os termos abaixo.',
      conteudo: 'Data, horário, local (ou modalidade digital) e ordem do dia da assembleia.',
      legenda: 'Dúvidas: fale com a área de Relações com Investidores.',
      buttons: [{ label: 'Ver edital de convocação', url: '', variant: 'primary' }],
    },
  },
  {
    id: 'builtin-aviso-manutencao',
    nome: 'Aviso de Manutenção',
    config: {
      size: 'sm',
      titulo: 'Manutenção Programada',
      texto: 'Este site passará por uma manutenção programada e pode ficar temporariamente indisponível.',
      conteudo: '',
      legenda: '',
      buttons: [],
    },
  },
];

export default function SplashTemplatesPage() {
  const portalName = usePortalName();
  const navigate = useNavigate();
  const [templates, setTemplates] = usePortalState<SplashTemplate[]>('portal_splash_templates', 'splash_templates', []);
  const [confirmDelete, setConfirmDelete] = useState<SplashTemplate | null>(null);

  function useTemplate(tpl: SplashTemplate) {
    sessionStorage.setItem(SPLASH_APPLY_TEMPLATE_KEY, JSON.stringify(tpl.config));
    navigate('/portal/splash');
  }

  function deleteTemplate(id: string) {
    setTemplates(templates.filter(t => t.id !== id));
    setConfirmDelete(null);
  }

  function renderCard(tpl: SplashTemplate, removable: boolean) {
    return (
      <div key={tpl.id} className="splash-tpl-card">
        <div className="splash-tpl-card__head">
          <span className="material-symbols-outlined splash-tpl-card__icon">campaign</span>
          <div className="splash-tpl-card__info">
            <span className="splash-tpl-card__nome">{tpl.nome}</span>
            <span className="splash-tpl-card__meta">{tpl.config.size === 'sm' ? 'Pequeno' : tpl.config.size === 'lg' ? 'Largo' : 'Médio'}{tpl.config.buttons.length > 0 ? ` · ${tpl.config.buttons.length} botão(ões)` : ''}</span>
          </div>
        </div>
        {tpl.config.texto && <p className="splash-tpl-card__preview">{tpl.config.texto}</p>}
        <div className="splash-tpl-card__actions">
          <button type="button" className="btn-primary" onClick={() => useTemplate(tpl)}>Usar este modelo</button>
          {removable && (
            <button type="button" className="btn-action btn-action--danger" onClick={() => setConfirmDelete(tpl)}>
              <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>delete</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <StickyPageHeader
        title="Templates de Splash"
        description={<>Modelos prontos ou salvos para o splash do portal <strong>{portalName}</strong>. Escolha um para pré-preencher o conteúdo em Splash → Editar.</>}
      />

      <p className="splash-tpl-section-label">Modelos prontos</p>
      <div className="splash-tpl-grid">
        {BUILT_IN_TEMPLATES.map(tpl => renderCard(tpl, false))}
      </div>

      <p className="splash-tpl-section-label">Meus modelos salvos</p>
      {templates.length === 0 ? (
        <p className="splash-tpl-empty">
          Nenhum modelo salvo ainda. Em Splash → Editar, ajuste o conteúdo e clique em "Salvar como modelo" para guardá-lo aqui.
        </p>
      ) : (
        <div className="splash-tpl-grid">
          {templates.map(tpl => renderCard(tpl, true))}
        </div>
      )}

      {confirmDelete && (
        <div className="splash-tpl-confirm-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="splash-tpl-confirm" onClick={e => e.stopPropagation()}>
            <p>Excluir o modelo <strong>"{confirmDelete.nome}"</strong>?</p>
            <div className="modal-footer">
              <button type="button" className="btn-outline" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button type="button" className="btn-danger"
                onClick={() => deleteTemplate(confirmDelete.id)}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

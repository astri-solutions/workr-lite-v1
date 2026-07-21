import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import StickyPageHeader from '../../components/StickyPageHeader';
import Modal from '../../components/Modal';
import ChangePasswordModal from '../../components/ChangePasswordModal';
import { usePortalName } from '../../hooks/usePortalName';
import { usePortalState } from '../../hooks/usePortalState';
import '../admin/AdminPages.css';
import '../../components/InformacoesModal.css';
import '../admin/InformacoesPage.css';

export const INFORMACOES_PORTAL_KEY = 'portal_informacoes';
export const IDIOMAS_KEY = 'portal_idiomas';

interface LanguageOption {
  code: string;
  label: string;
}

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'pt-BR', label: 'Português' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
];

const DEFAULT_LANGUAGES = ['pt-BR'];

interface AddressValues {
  pais: string;
  estado: string;
  cidade: string;
  endereco: string;
  cep: string;
}

interface FieldValues {
  nome: string;
  address: AddressValues;
  telefone: string;
  empresa: string;
  email: string;
  emailRecup: string;
}

interface EditState {
  field: keyof Omit<FieldValues, 'address'>;
  title: string;
  label: string;
  type: string;
  placeholder: string;
  draft: string;
}

const PAISES = ['Brasil', 'Portugal', 'Estados Unidos', 'Argentina', 'Chile', 'Colômbia', 'México'];

function formatAddress(a: AddressValues): string {
  const parts = [a.endereco, a.cidade, a.estado, a.pais].filter(Boolean);
  return parts.join(', ') || '–';
}

function SettingsRow({
  label,
  value,
  readOnly,
  onClick,
  renderValue,
}: {
  label: string;
  value: string;
  readOnly?: boolean;
  onClick?: () => void;
  renderValue?: () => React.ReactNode;
}) {
  return (
    <div className="info-row">
      <div
        className="info-row__main"
        onClick={!readOnly ? onClick : undefined}
        style={{ cursor: readOnly ? 'default' : 'pointer' }}
      >
        <span className="info-row__label">{label}</span>
        <span className="info-row__value">
          {renderValue ? renderValue() : value || '–'}
        </span>
        {!readOnly && (
          <svg className="info-row__chevron" width="16" height="16" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        )}
      </div>
    </div>
  );
}

export default function InformacoesPortalPage() {
  const portalName = usePortalName();
  const { user } = useAuth();

  const [values, setValues] = usePortalState<FieldValues>(INFORMACOES_PORTAL_KEY, 'informacoes', {
    nome: user?.name ?? '',
    address: { pais: 'Brasil', estado: '', cidade: '', endereco: '', cep: '' },
    telefone: '',
    empresa: '',
    email: user?.email ?? '',
    emailRecup: '',
  });

  const [idiomas, setIdiomas] = usePortalState<string[]>(IDIOMAS_KEY, 'idiomas', DEFAULT_LANGUAGES);

  const [edit, setEdit] = useState<EditState | null>(null);
  const [changePwOpen, setChangePwOpen] = useState(false);
  const [addrOpen, setAddrOpen] = useState(false);
  const [addrDraft, setAddrDraft] = useState<AddressValues>(values.address);

  function toggleLanguage(code: string) {
    setIdiomas((current) => {
      const active = current.includes(code);
      // O primeiro idioma é o principal e não pode ser removido enquanto
      // for o único selecionado.
      if (active) {
        if (current.length === 1) return current;
        return current.filter((c) => c !== code);
      }
      return [...current, code];
    });
  }

  function openEdit(
    field: keyof Omit<FieldValues, 'address'>,
    title: string,
    label: string,
    type = 'text',
    placeholder = '',
  ) {
    setEdit({ field, title, label, type, placeholder: placeholder || label, draft: values[field] as string });
  }

  function handleSave() {
    if (!edit) return;
    setValues((v) => ({ ...v, [edit.field]: edit.draft }));
    setEdit(null);
  }

  function openAddr() {
    setAddrDraft(values.address);
    setAddrOpen(true);
  }

  function handleAddrSave() {
    setValues((v) => ({ ...v, address: addrDraft }));
    setAddrOpen(false);
  }

  return (
    <div className="page">
      <StickyPageHeader
        title="Informações da conta"
        description={<>Configurações e dados do portal <strong>{portalName}</strong>.</>}
      />

      <div className="info-section">
        <p className="info-section__hint">
          As informações fornecidas abaixo aparecerão nas suas faturas.
        </p>
        <div className="info-rows">
          <SettingsRow label="Nome" value={values.nome}
            onClick={() => openEdit('nome', 'Atualize seu nome', 'Nome')} />
          <SettingsRow label="Endereço" value={formatAddress(values.address)}
            onClick={openAddr} />
          <SettingsRow label="Número de telefone" value={values.telefone}
            onClick={() => openEdit('telefone', 'Atualize seu telefone', 'Número de telefone', 'tel')} />
          <SettingsRow label="Empresa" value={values.empresa}
            onClick={() => openEdit('empresa', 'Atualize sua empresa', 'Empresa')} />
          <SettingsRow label="Moeda da conta" value="BRL" readOnly />
        </div>
      </div>

      <div className="info-section">
        <div className="info-section__header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.75" className="info-section__icon">
            <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
            <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
          </svg>
          <span className="info-section__title">Idiomas</span>
        </div>
        <p className="info-section__hint">
          Ative os idiomas em que o portal aceita conteúdo. Com mais de um idioma ativo, a barra
          superior do site passa a exibir automaticamente o seletor de idioma, e os formulários de
          Documentos e Canais passam a mostrar abas para cadastrar o conteúdo em cada idioma.
        </p>
        <div className="info-rows">
          {LANGUAGE_OPTIONS.map((opt) => {
            const active = idiomas.includes(opt.code);
            const isPrimary = idiomas[0] === opt.code;
            return (
              <SettingsRow
                key={opt.code}
                label={opt.label}
                value=""
                readOnly
                renderValue={() => (
                  <label className="info-lang-toggle" onClick={(e) => e.stopPropagation()}>
                    {isPrimary && <span className="info-lang-toggle__badge">Principal</span>}
                    <input
                      type="checkbox"
                      checked={active}
                      disabled={active && idiomas.length === 1}
                      onChange={() => toggleLanguage(opt.code)}
                    />
                  </label>
                )}
              />
            );
          })}
        </div>
      </div>

      <div className="info-section">
        <div className="info-section__header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.75" className="info-section__icon">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span className="info-section__title">Configurações da conta</span>
        </div>
        <div className="info-rows">
          <SettingsRow label="E-mail" value={values.email}
            onClick={() => openEdit('email', 'Atualize seu e-mail', 'E-mail', 'email')} />
          <SettingsRow label="E-mail de recuperação" value={values.emailRecup}
            onClick={() => openEdit('emailRecup', 'E-mail de recuperação', 'E-mail de recuperação', 'email', 'Adicionar e-mail de recuperação')} />
          <SettingsRow label="Mudar senha" value="············"
            onClick={() => setChangePwOpen(true)} />
          <SettingsRow
            label="Verificação em duas etapas"
            value="active"
            readOnly
            renderValue={() => (
              <span className="info-badge-active">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Ativado
              </span>
            )}
          />
          <SettingsRow label="Membro desde" value="2025-01-12 09:00" readOnly />
        </div>
      </div>

      {edit && (
        <Modal
          open
          onClose={() => setEdit(null)}
          title={edit.title}
          size="sm"
          footer={
            <>
              <button className="info-edit-btn-cancel" type="button" onClick={() => setEdit(null)}>
                Cancelar
              </button>
              <button className="info-edit-btn-save" type="button" onClick={handleSave}>
                Salvar
              </button>
            </>
          }
        >
          <div className="info-edit-field">
            <label className="info-edit-label">{edit.label}</label>
            <div className="info-edit-input-wrap">
              <input
                className="info-edit-input"
                type={edit.type}
                placeholder={edit.placeholder}
                value={edit.draft}
                onChange={(e) => setEdit((s) => s ? { ...s, draft: e.target.value } : s)}
                autoFocus
              />
            </div>
          </div>
        </Modal>
      )}

      <ChangePasswordModal open={changePwOpen} onClose={() => setChangePwOpen(false)} />

      <Modal
        open={addrOpen}
        onClose={() => setAddrOpen(false)}
        title="Atualize seu endereço"
        size="sm"
        footer={
          <>
            <button className="info-edit-btn-cancel" type="button" onClick={() => setAddrOpen(false)}>
              Cancelar
            </button>
            <button className="info-edit-btn-save" type="button" onClick={handleAddrSave}>
              Salvar
            </button>
          </>
        }
      >
        <div className="info-addr-fields">
          <div className="info-edit-field">
            <label className="info-edit-label">País</label>
            <div className="info-edit-select-wrap">
              <select
                className="info-edit-select"
                value={addrDraft.pais}
                onChange={(e) => setAddrDraft((s) => ({ ...s, pais: e.target.value }))}
              >
                {PAISES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <svg className="info-edit-select-caret" width="16" height="16" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>

          <div className="info-edit-field">
            <label className="info-edit-label">Estado/Região <span className="info-edit-optional">(opcional)</span></label>
            <div className="info-edit-input-wrap">
              <input className="info-edit-input" type="text" placeholder="Ex: SP"
                value={addrDraft.estado}
                onChange={(e) => setAddrDraft((s) => ({ ...s, estado: e.target.value }))} />
            </div>
          </div>

          <div className="info-edit-field">
            <label className="info-edit-label">Cidade</label>
            <div className="info-edit-input-wrap">
              <input className="info-edit-input" type="text" placeholder="Ex: São Paulo"
                value={addrDraft.cidade}
                onChange={(e) => setAddrDraft((s) => ({ ...s, cidade: e.target.value }))} />
            </div>
          </div>

          <div className="info-edit-field">
            <label className="info-edit-label">Endereço</label>
            <div className="info-edit-input-wrap">
              <input className="info-edit-input" type="text" placeholder="Rua, número"
                value={addrDraft.endereco}
                onChange={(e) => setAddrDraft((s) => ({ ...s, endereco: e.target.value }))} />
            </div>
          </div>

          <div className="info-edit-field">
            <label className="info-edit-label">CEP</label>
            <div className="info-edit-input-wrap">
              <input className="info-edit-input" type="text" placeholder="00000-000"
                value={addrDraft.cep}
                onChange={(e) => setAddrDraft((s) => ({ ...s, cep: e.target.value }))} />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

import { useState } from 'react';
import PageHeader from '../../components/PageHeader';
import Modal from '../../components/Modal';
import '../admin/AdminPages.css';
import '../../components/InformacoesModal.css';
import './InformacoesPage.css';

interface FieldValues {
  nome: string;
  endereco: string;
  telefone: string;
  empresa: string;
  email: string;
  emailRecup: string;
}

interface EditState {
  field: keyof FieldValues;
  title: string;
  label: string;
  type: string;
  placeholder: string;
  draft: string;
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

export default function InformacoesPage() {
  const [values, setValues] = useState<FieldValues>({
    nome: 'Admin Astri',
    endereco: '',
    telefone: '',
    empresa: 'Astri Solutions',
    email: 'admin@astri.solutions',
    emailRecup: '',
  });

  const [edit, setEdit] = useState<EditState | null>(null);

  function openEdit(field: keyof FieldValues, title: string, label: string, type = 'text', placeholder = '') {
    setEdit({ field, title, label, type, placeholder: placeholder || label, draft: values[field] });
  }

  function handleSave() {
    if (!edit) return;
    setValues((v) => ({ ...v, [edit.field]: edit.draft }));
    setEdit(null);
  }

  return (
    <div className="page">
      <PageHeader
        title="Informações da conta"
        description="Gerencie seus dados pessoais e configurações da conta."
      />

      <div className="info-section">
        <p className="info-section__hint">
          As informações fornecidas abaixo aparecerão nas suas faturas.
        </p>
        <div className="info-rows">
          <SettingsRow label="Nome" value={values.nome}
            onClick={() => openEdit('nome', 'Atualize seu nome', 'Nome')} />
          <SettingsRow label="Endereço" value={values.endereco}
            onClick={() => openEdit('endereco', 'Atualize seu endereço', 'Endereço')} />
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
          <SettingsRow label="Mudar senha" value="············" readOnly />
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
    </div>
  );
}

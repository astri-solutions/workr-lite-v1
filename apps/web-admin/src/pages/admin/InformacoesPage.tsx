import { useState } from 'react';
import PageHeader from '../../components/PageHeader';
import '../admin/AdminPages.css';
import '../../components/InformacoesModal.css';

interface RowState {
  value: string;
  editing: boolean;
  draft: string;
}

function makeRow(value: string): RowState {
  return { value, editing: false, draft: value };
}

function SettingsRow({
  label,
  row,
  onEdit,
  onSave,
  onCancel,
  onChange,
  readOnly,
  type = 'text',
  placeholder,
  renderValue,
}: {
  label: string;
  row: RowState;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onChange: (v: string) => void;
  readOnly?: boolean;
  type?: string;
  placeholder?: string;
  renderValue?: (v: string) => React.ReactNode;
}) {
  return (
    <div className={`info-row${row.editing ? ' info-row--editing' : ''}`}>
      <div
        className="info-row__main"
        onClick={!readOnly && !row.editing ? onEdit : undefined}
        style={{ cursor: readOnly || row.editing ? 'default' : 'pointer' }}
      >
        <span className="info-row__label">{label}</span>
        <span className="info-row__value">
          {renderValue ? renderValue(row.value) : row.value || '–'}
        </span>
        {!readOnly && !row.editing && (
          <svg className="info-row__chevron" width="16" height="16" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        )}
      </div>

      {row.editing && (
        <div className="info-row__edit">
          <div className="info-input-wrap">
            <input
              className="info-input"
              type={type}
              placeholder={placeholder || label}
              value={row.draft}
              onChange={(e) => onChange(e.target.value)}
              autoFocus
            />
          </div>
          <div className="info-row__edit-actions">
            <button className="info-btn-cancel" type="button" onClick={onCancel}>Cancelar</button>
            <button className="info-btn-save" type="button" onClick={onSave}>Salvar</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function InformacoesPage() {
  const [nome, setNome] = useState(makeRow('Admin Astri'));
  const [endereco, setEndereco] = useState(makeRow(''));
  const [telefone, setTelefone] = useState(makeRow(''));
  const [empresa, setEmpresa] = useState(makeRow('Astri Solutions'));
  const [email, setEmail] = useState(makeRow('admin@astri.solutions'));
  const [emailRecup, setEmailRecup] = useState(makeRow(''));

  function startEdit(setter: React.Dispatch<React.SetStateAction<RowState>>) {
    setter((s) => ({ ...s, editing: true, draft: s.value }));
  }

  function saveEdit(setter: React.Dispatch<React.SetStateAction<RowState>>) {
    setter((s) => ({ ...s, value: s.draft, editing: false }));
  }

  function cancelEdit(setter: React.Dispatch<React.SetStateAction<RowState>>) {
    setter((s) => ({ ...s, editing: false, draft: s.value }));
  }

  function change(setter: React.Dispatch<React.SetStateAction<RowState>>, v: string) {
    setter((s) => ({ ...s, draft: v }));
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
          <SettingsRow label="Nome" row={nome}
            onEdit={() => startEdit(setNome)} onSave={() => saveEdit(setNome)}
            onCancel={() => cancelEdit(setNome)} onChange={(v) => change(setNome, v)} />
          <SettingsRow label="Endereço" row={endereco}
            onEdit={() => startEdit(setEndereco)} onSave={() => saveEdit(setEndereco)}
            onCancel={() => cancelEdit(setEndereco)} onChange={(v) => change(setEndereco, v)} />
          <SettingsRow label="Número de telefone" row={telefone} type="tel"
            onEdit={() => startEdit(setTelefone)} onSave={() => saveEdit(setTelefone)}
            onCancel={() => cancelEdit(setTelefone)} onChange={(v) => change(setTelefone, v)} />
          <SettingsRow label="Empresa" row={empresa}
            onEdit={() => startEdit(setEmpresa)} onSave={() => saveEdit(setEmpresa)}
            onCancel={() => cancelEdit(setEmpresa)} onChange={(v) => change(setEmpresa, v)} />
          <SettingsRow label="Moeda da conta" row={{ value: 'BRL', editing: false, draft: 'BRL' }}
            readOnly onEdit={() => {}} onSave={() => {}} onCancel={() => {}} onChange={() => {}} />
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
          <SettingsRow label="E-mail" row={email} type="email"
            onEdit={() => startEdit(setEmail)} onSave={() => saveEdit(setEmail)}
            onCancel={() => cancelEdit(setEmail)} onChange={(v) => change(setEmail, v)} />
          <SettingsRow label="E-mail de recuperação" row={emailRecup} type="email"
            placeholder="Adicionar e-mail de recuperação"
            onEdit={() => startEdit(setEmailRecup)} onSave={() => saveEdit(setEmailRecup)}
            onCancel={() => cancelEdit(setEmailRecup)} onChange={(v) => change(setEmailRecup, v)} />
          <SettingsRow label="Mudar senha" row={{ value: '············', editing: false, draft: '' }}
            readOnly onEdit={() => {}} onSave={() => {}} onCancel={() => {}} onChange={() => {}} />
          <SettingsRow
            label="Verificação em duas etapas"
            row={{ value: 'active', editing: false, draft: '' }}
            readOnly
            onEdit={() => {}} onSave={() => {}} onCancel={() => {}} onChange={() => {}}
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
          <SettingsRow label="Membro desde" row={{ value: '2025-01-12 09:00', editing: false, draft: '' }}
            readOnly onEdit={() => {}} onSave={() => {}} onCancel={() => {}} onChange={() => {}} />
        </div>
      </div>
    </div>
  );
}

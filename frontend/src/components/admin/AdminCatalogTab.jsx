import { useState } from 'react';
import { api } from '../../api/client.js';

function Field({ label, children }) {
  return (
    <label style={{ display: 'block', marginBottom: 8 }}>
      <span className="muted" style={{ display: 'block', marginBottom: 4 }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function inputStyle() {
  return { width: '100%', padding: 8, marginBottom: 4 };
}

export default function AdminCatalogTab({ universities, onUpdated }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [expandedUni, setExpandedUni] = useState(null);

  const [uniForm, setUniForm] = useState({
    slug: '',
    name: '',
    city: '',
    type: '',
    official_site: '',
  });

  const [facultyForm, setFacultyForm] = useState({ university_id: '', slug: '', name: '' });
  const [specialtyForm, setSpecialtyForm] = useState({ faculty_id: '', slug: '', name: '', contract_cost: '' });
  const [ruleForm, setRuleForm] = useState({
    specialty_id: '',
    season_year: new Date().getFullYear(),
    main_score_min: '',
    subject_requirements_json: '{}',
  });
  const [scoreForm, setScoreForm] = useState({
    program_rule_id: '',
    year: new Date().getFullYear() - 1,
    budget_cutoff: '',
    contract_cutoff: '',
    seats_budget: '',
    seats_contract: '',
  });

  async function run(action) {
    setBusy(true);
    setError('');
    try {
      await action();
      onUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function parseJson(text, fallback = {}) {
    try {
      return JSON.parse(text || '{}');
    } catch {
      throw new Error('Некорректный JSON в предметных требованиях');
    }
  }

  return (
    <>
      {error && <div className="error">{error}</div>}

      <div className="card">
        <h2>Новый вуз</h2>
        <Field label="Slug">
          <input
            style={inputStyle()}
            value={uniForm.slug}
            onChange={(e) => setUniForm({ ...uniForm, slug: e.target.value })}
            placeholder="ksucta"
          />
        </Field>
        <Field label="Название">
          <input
            style={inputStyle()}
            value={uniForm.name}
            onChange={(e) => setUniForm({ ...uniForm, name: e.target.value })}
          />
        </Field>
        <Field label="Город">
          <input
            style={inputStyle()}
            value={uniForm.city}
            onChange={(e) => setUniForm({ ...uniForm, city: e.target.value })}
          />
        </Field>
        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={() =>
            run(async () => {
              await api.adminCreateUniversity(uniForm);
              setUniForm({ slug: '', name: '', city: '', type: '', official_site: '' });
            })
          }
        >
          Создать вуз
        </button>
      </div>

      <div className="card">
        <h2>Факультет / программа / правила</h2>
        <Field label="Вуз (для факультета)">
          <select
            style={inputStyle()}
            value={facultyForm.university_id}
            onChange={(e) => setFacultyForm({ ...facultyForm, university_id: e.target.value })}
          >
            <option value="">— выберите —</option>
            {universities.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Slug факультета">
          <input
            style={inputStyle()}
            value={facultyForm.slug}
            onChange={(e) => setFacultyForm({ ...facultyForm, slug: e.target.value })}
          />
        </Field>
        <Field label="Название факультета">
          <input
            style={inputStyle()}
            value={facultyForm.name}
            onChange={(e) => setFacultyForm({ ...facultyForm, name: e.target.value })}
          />
        </Field>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy}
          onClick={() =>
            run(async () => {
              await api.adminCreateFaculty(facultyForm);
              setFacultyForm({ university_id: facultyForm.university_id, slug: '', name: '' });
            })
          }
        >
          Добавить факультет
        </button>

        <hr style={{ margin: '16px 0', borderColor: 'var(--border)' }} />

        <Field label="Факультет (для программы)">
          <select
            style={inputStyle()}
            value={specialtyForm.faculty_id}
            onChange={(e) => setSpecialtyForm({ ...specialtyForm, faculty_id: e.target.value })}
          >
            <option value="">— выберите —</option>
            {universities.flatMap((u) =>
              (u.faculties || []).map((f) => (
                <option key={f.id} value={f.id}>
                  {u.name} → {f.name}
                </option>
              ))
            )}
          </select>
        </Field>
        <Field label="Slug программы">
          <input
            style={inputStyle()}
            value={specialtyForm.slug}
            onChange={(e) => setSpecialtyForm({ ...specialtyForm, slug: e.target.value })}
          />
        </Field>
        <Field label="Название программы">
          <input
            style={inputStyle()}
            value={specialtyForm.name}
            onChange={(e) => setSpecialtyForm({ ...specialtyForm, name: e.target.value })}
          />
        </Field>
        <Field label="Стоимость контракта">
          <input
            style={inputStyle()}
            type="number"
            value={specialtyForm.contract_cost}
            onChange={(e) => setSpecialtyForm({ ...specialtyForm, contract_cost: e.target.value })}
          />
        </Field>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy}
          onClick={() =>
            run(async () => {
              await api.adminCreateSpecialty({
                ...specialtyForm,
                contract_cost: specialtyForm.contract_cost ? Number(specialtyForm.contract_cost) : null,
              });
              setSpecialtyForm({
                faculty_id: specialtyForm.faculty_id,
                slug: '',
                name: '',
                contract_cost: '',
              });
            })
          }
        >
          Добавить программу
        </button>

        <hr style={{ margin: '16px 0', borderColor: 'var(--border)' }} />

        <Field label="Программа (для правила)">
          <select
            style={inputStyle()}
            value={ruleForm.specialty_id}
            onChange={(e) => setRuleForm({ ...ruleForm, specialty_id: e.target.value })}
          >
            <option value="">— выберите —</option>
            {universities.flatMap((u) =>
              (u.faculties || []).flatMap((f) =>
                (f.specialties || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {u.name} → {s.name}
                  </option>
                ))
              )
            )}
          </select>
        </Field>
        <Field label="Сезон (год)">
          <input
            style={inputStyle()}
            type="number"
            value={ruleForm.season_year}
            onChange={(e) => setRuleForm({ ...ruleForm, season_year: e.target.value })}
          />
        </Field>
        <Field label="Мин. основной балл">
          <input
            style={inputStyle()}
            type="number"
            value={ruleForm.main_score_min}
            onChange={(e) => setRuleForm({ ...ruleForm, main_score_min: e.target.value })}
          />
        </Field>
        <Field label="Предметные требования (JSON)">
          <textarea
            style={{ ...inputStyle(), minHeight: 60 }}
            value={ruleForm.subject_requirements_json}
            onChange={(e) => setRuleForm({ ...ruleForm, subject_requirements_json: e.target.value })}
          />
        </Field>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy}
          onClick={() =>
            run(async () => {
              await api.adminCreateProgramRule({
                specialty_id: ruleForm.specialty_id,
                season_year: Number(ruleForm.season_year),
                main_score_min: ruleForm.main_score_min ? Number(ruleForm.main_score_min) : null,
                subject_requirements_json: parseJson(ruleForm.subject_requirements_json),
              });
            })
          }
        >
          Добавить правило
        </button>

        <hr style={{ margin: '16px 0', borderColor: 'var(--border)' }} />

        <Field label="ID правила (для проходных)">
          <input
            style={inputStyle()}
            value={scoreForm.program_rule_id}
            onChange={(e) => setScoreForm({ ...scoreForm, program_rule_id: e.target.value })}
            placeholder="UUID из дерева ниже"
          />
        </Field>
        <Field label="Год снимка">
          <input
            style={inputStyle()}
            type="number"
            value={scoreForm.year}
            onChange={(e) => setScoreForm({ ...scoreForm, year: e.target.value })}
          />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Field label="Бюджет cutoff">
            <input
              style={inputStyle()}
              type="number"
              step="0.1"
              value={scoreForm.budget_cutoff}
              onChange={(e) => setScoreForm({ ...scoreForm, budget_cutoff: e.target.value })}
            />
          </Field>
          <Field label="Контракт cutoff">
            <input
              style={inputStyle()}
              type="number"
              step="0.1"
              value={scoreForm.contract_cutoff}
              onChange={(e) => setScoreForm({ ...scoreForm, contract_cutoff: e.target.value })}
            />
          </Field>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy}
          onClick={() =>
            run(async () => {
              await api.adminCreatePassingScore({
                program_rule_id: scoreForm.program_rule_id,
                year: Number(scoreForm.year),
                budget_cutoff: scoreForm.budget_cutoff ? Number(scoreForm.budget_cutoff) : null,
                contract_cutoff: scoreForm.contract_cutoff ? Number(scoreForm.contract_cutoff) : null,
                seats_budget: scoreForm.seats_budget ? Number(scoreForm.seats_budget) : null,
                seats_contract: scoreForm.seats_contract ? Number(scoreForm.seats_contract) : null,
              });
            })
          }
        >
          Добавить проходные
        </button>
      </div>

      <h2>Дерево каталога</h2>
      {universities.map((uni) => (
        <div key={uni.id} className="card admin-card">
          <button
            type="button"
            className="btn-link"
            onClick={() => setExpandedUni(expandedUni === uni.id ? null : uni.id)}
          >
            {expandedUni === uni.id ? '▼' : '▶'} {uni.name} ({uni.slug}) · {uni.city || '—'}
          </button>
          {expandedUni === uni.id && (
            <div style={{ marginTop: 12 }}>
              {(uni.faculties || []).map((fac) => (
                <div key={fac.id} style={{ marginBottom: 12, paddingLeft: 12 }}>
                  <strong>{fac.name}</strong> ({fac.slug})
                  <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                    {(fac.specialties || []).map((spec) => (
                      <li key={spec.id} style={{ marginBottom: 8 }}>
                        {spec.name} ({spec.slug})
                        {(spec.programRules || []).map((rule) => (
                          <div key={rule.id} className="muted" style={{ fontSize: '0.85rem' }}>
                            Правило {rule.season_year}: min {rule.main_score_min ?? '—'} · id:{' '}
                            <code>{rule.id}</code>
                            {(rule.passingScores || []).map((ps) => (
                              <span key={ps.id}>
                                {' '}
                                · {ps.year}: бюджет {ps.budget_cutoff ?? '—'} / контракт{' '}
                                {ps.contract_cutoff ?? '—'}
                              </span>
                            ))}
                          </div>
                        ))}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </>
  );
}

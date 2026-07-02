import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useToast } from '../ux/ToastContext.jsx';
import UniLogo from '../UniLogo.jsx';
import {
  UNI_TYPES,
  CATALOG_STATUSES,
  TRUST_LEVELS,
  slugify,
  emptyUniversity,
  emptyFaculty,
  emptySpecialty,
  emptyRule,
  emptyPassingScore,
  parseJson,
  countPrograms,
} from './catalogUtils.js';

function Field({ label, hint, children }) {
  return (
    <label className="admin-field">
      <span className="admin-field-label">{label}</span>
      {hint && <span className="admin-field-hint">{hint}</span>}
      {children}
    </label>
  );
}

function Section({ title, subtitle, actions, children }) {
  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <div>
          <h3>{title}</h3>
          {subtitle && <p className="muted">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export default function AdminCatalogTab({ universities, onUpdated }) {
  const toast = useToast();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [mode, setMode] = useState('edit');

  const [uniForm, setUniForm] = useState(emptyUniversity());
  const [facultyForm, setFacultyForm] = useState(emptyFaculty());
  const [specialtyForm, setSpecialtyForm] = useState(emptySpecialty());
  const [ruleForm, setRuleForm] = useState(emptyRule());
  const [scoreForm, setScoreForm] = useState(emptyPassingScore());

  const [expandedFaculty, setExpandedFaculty] = useState(null);
  const [expandedSpecialty, setExpandedSpecialty] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return universities;
    return universities.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.slug?.toLowerCase().includes(q) ||
        u.city?.toLowerCase().includes(q)
    );
  }, [universities, search]);

  const selected = useMemo(
    () => universities.find((u) => u.id === selectedId) || null,
    [universities, selectedId]
  );

  useEffect(() => {
    if (mode === 'edit' && selected) {
      setUniForm({
        slug: selected.slug || '',
        name: selected.name || '',
        city: selected.city || '',
        type: selected.type || 'Государственный',
        description: selected.description || '',
        official_site: selected.official_site || '',
        status: selected.status || 'active',
        is_featured: Boolean(selected.is_featured),
        sort_order: Number(selected.sort_order) || 0,
      });
      setLogoFile(null);
      setLogoPreview(selected.logo_url || '');
    }
  }, [selected, mode]);

  async function run(action, successMsg) {
    setBusy(true);
    setError('');
    try {
      await action();
      await onUpdated();
      if (successMsg) toast.success(successMsg);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  function startCreate() {
    setMode('create');
    setSelectedId(null);
    setUniForm(emptyUniversity());
    setFacultyForm(emptyFaculty());
    setSpecialtyForm(emptySpecialty());
    setRuleForm(emptyRule());
    setScoreForm(emptyPassingScore());
    setExpandedFaculty(null);
    setExpandedSpecialty(null);
    setLogoFile(null);
    setLogoPreview('');
  }

  function onLogoPick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  function selectUniversity(uni) {
    setMode('edit');
    setSelectedId(uni.id);
    setUniForm({
      slug: uni.slug || '',
      name: uni.name || '',
      city: uni.city || '',
      type: uni.type || 'Государственный',
      description: uni.description || '',
      official_site: uni.official_site || '',
      status: uni.status || 'active',
      is_featured: Boolean(uni.is_featured),
      sort_order: Number(uni.sort_order) || 0,
    });
    setFacultyForm(emptyFaculty(uni.id));
    setSpecialtyForm(emptySpecialty());
    setRuleForm(emptyRule());
    setScoreForm(emptyPassingScore());
    setExpandedFaculty(null);
    setExpandedSpecialty(null);
    setLogoFile(null);
    setLogoPreview(uni.logo_url || '');
  }

  function onNameChange(name) {
    setUniForm((prev) => ({
      ...prev,
      name,
      slug: mode === 'create' && !prev.slug ? slugify(name) : prev.slug,
    }));
  }

  async function saveUniversity() {
    const payload = {
      ...uniForm,
      sort_order: Number(uniForm.sort_order) || 0,
      is_featured: Boolean(uniForm.is_featured),
    };
    const hasLogo = Boolean(logoFile);
    if (mode === 'create') {
      await run(async () => {
        const res = await api.adminCreateUniversity(payload);
        const id = res.university?.id;
        setMode('edit');
        setSelectedId(id || null);
        if (logoFile && id) {
          await api.adminUploadUniversityLogo(id, logoFile);
          setLogoFile(null);
        }
      }, hasLogo ? 'Вуз и логотип сохранены' : 'Вуз создан');
    } else if (selected) {
      await run(async () => {
        await api.adminUpdateUniversity(selected.id, payload);
        if (logoFile) {
          await api.adminUploadUniversityLogo(selected.id, logoFile);
          setLogoFile(null);
        }
      }, hasLogo ? 'Вуз и логотип сохранены' : 'Данные вуза сохранены');
    }
  }

  function universityFormFields() {
    return (
      <div className="admin-form-grid">
        <Field label="Логотип вуза *" hint="PNG, JPEG, WebP или SVG, до 2 МБ">
          <div className="admin-logo-upload">
            <UniLogo name={uniForm.name} logoUrl={logoPreview} size={72} className="admin-logo-preview" />
            <label className="admin-file-btn">
              <span>{logoPreview ? 'Заменить логотип' : 'Загрузить логотип'}</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={onLogoPick}
              />
            </label>
          </div>
        </Field>
        <Field label="Название *">
          <input
            className="admin-input"
            value={uniForm.name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Кыргызский государственный технический университет"
          />
        </Field>
        <Field label="Slug (URL) *" hint="Используется в /universities/slug">
          <input
            className="admin-input"
            value={uniForm.slug}
            onChange={(e) => setUniForm({ ...uniForm, slug: slugify(e.target.value) })}
            placeholder="ksucta"
          />
        </Field>
        <Field label="Город">
          <input
            className="admin-input"
            value={uniForm.city}
            onChange={(e) => setUniForm({ ...uniForm, city: e.target.value })}
            placeholder="Бишкек"
          />
        </Field>
        <Field label="Тип вуза">
          <select
            className="admin-input"
            value={uniForm.type}
            onChange={(e) => setUniForm({ ...uniForm, type: e.target.value })}
          >
            {UNI_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Официальный сайт">
          <input
            className="admin-input"
            type="url"
            value={uniForm.official_site}
            onChange={(e) => setUniForm({ ...uniForm, official_site: e.target.value })}
            placeholder="https://..."
          />
        </Field>
        <Field label="Статус">
          <select
            className="admin-input"
            value={uniForm.status}
            onChange={(e) => setUniForm({ ...uniForm, status: e.target.value })}
          >
            {CATALOG_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Порядок сортировки">
          <input
            className="admin-input"
            type="number"
            value={uniForm.sort_order}
            onChange={(e) => setUniForm({ ...uniForm, sort_order: e.target.value })}
          />
        </Field>
        <Field label="На главной">
          <label className="admin-checkbox">
            <input
              type="checkbox"
              checked={uniForm.is_featured}
              onChange={(e) => setUniForm({ ...uniForm, is_featured: e.target.checked })}
            />
            Показывать в подборках
          </label>
        </Field>
        <Field label="Описание вуза">
          <textarea
            className="admin-input admin-textarea"
            rows={4}
            value={uniForm.description}
            onChange={(e) => setUniForm({ ...uniForm, description: e.target.value })}
            placeholder="Краткая информация о вузе для страницы каталога"
          />
        </Field>
      </div>
    );
  }

  function renderFacultyBlock(faculty) {
    const isOpen = expandedFaculty === faculty.id;

    return (
      <div key={faculty.id} className="admin-tree-item">
        <button
          type="button"
          className="admin-tree-toggle"
          onClick={() => setExpandedFaculty(isOpen ? null : faculty.id)}
        >
          <span>{isOpen ? '▼' : '▶'}</span>
          <strong>{faculty.name}</strong>
          <span className="muted">({faculty.slug})</span>
          <span className={`admin-badge admin-badge--${faculty.status}`}>{faculty.status}</span>
        </button>

        {isOpen && (
          <div className="admin-tree-body">
            <div className="admin-form-grid admin-form-grid--compact">
              <Field label="Название">
                <input
                  className="admin-input"
                  defaultValue={faculty.name}
                  id={`fac-name-${faculty.id}`}
                />
              </Field>
              <Field label="Slug">
                <input
                  className="admin-input"
                  defaultValue={faculty.slug}
                  id={`fac-slug-${faculty.id}`}
                />
              </Field>
              <Field label="Описание">
                <textarea
                  className="admin-input admin-textarea"
                  rows={2}
                  defaultValue={faculty.description || ''}
                  id={`fac-desc-${faculty.id}`}
                />
              </Field>
            </div>
            <div className="admin-inline-actions">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await api.adminUpdateFaculty(faculty.id, {
                      name: document.getElementById(`fac-name-${faculty.id}`).value,
                      slug: slugify(document.getElementById(`fac-slug-${faculty.id}`).value),
                      description: document.getElementById(`fac-desc-${faculty.id}`).value,
                    });
                  }, 'Факультет сохранён')
                }
              >
                Сохранить факультет
              </button>
            </div>

            <div className="admin-subblock">
              <h4>Программы / специальности</h4>
              {(faculty.specialties || []).map((spec) => renderSpecialtyBlock(spec))}

              <div className="admin-add-form">
                <p className="muted">Новая программа</p>
                <div className="admin-form-grid admin-form-grid--compact">
                  <Field label="Название">
                    <input
                      className="admin-input"
                      value={specialtyForm.faculty_id === faculty.id ? specialtyForm.name : ''}
                      onChange={(e) =>
                        setSpecialtyForm({
                          ...emptySpecialty(faculty.id),
                          faculty_id: faculty.id,
                          name: e.target.value,
                          slug: slugify(e.target.value),
                        })
                      }
                    />
                  </Field>
                  <Field label="Slug">
                    <input
                      className="admin-input"
                      value={specialtyForm.faculty_id === faculty.id ? specialtyForm.slug : ''}
                      onChange={(e) =>
                        setSpecialtyForm((prev) =>
                          prev.faculty_id === faculty.id
                            ? { ...prev, slug: slugify(e.target.value) }
                            : prev
                        )
                      }
                    />
                  </Field>
                  <Field label="Стоимость контракта (сом)">
                    <input
                      className="admin-input"
                      type="number"
                      value={specialtyForm.faculty_id === faculty.id ? specialtyForm.contract_cost : ''}
                      onChange={(e) =>
                        setSpecialtyForm((prev) =>
                          prev.faculty_id === faculty.id ? { ...prev, contract_cost: e.target.value } : prev
                        )
                      }
                    />
                  </Field>
                  <Field label="О профессии">
                    <textarea
                      className="admin-input admin-textarea"
                      rows={2}
                      value={
                        specialtyForm.faculty_id === faculty.id ? specialtyForm.profession_description : ''
                      }
                      onChange={(e) =>
                        setSpecialtyForm((prev) =>
                          prev.faculty_id === faculty.id
                            ? { ...prev, profession_description: e.target.value }
                            : prev
                        )
                      }
                    />
                  </Field>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={busy || specialtyForm.faculty_id !== faculty.id || !specialtyForm.name}
                  onClick={() =>
                    run(async () => {
                      await api.adminCreateSpecialty({
                        faculty_id: faculty.id,
                        slug: specialtyForm.slug || slugify(specialtyForm.name),
                        name: specialtyForm.name,
                        profession_description: specialtyForm.profession_description || null,
                        contract_cost: specialtyForm.contract_cost
                          ? Number(specialtyForm.contract_cost)
                          : null,
                      });
                      setSpecialtyForm(emptySpecialty(faculty.id));
                    }, 'Программа добавлена')
                  }
                >
                  + Добавить программу
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderSpecialtyBlock(spec) {
    const isOpen = expandedSpecialty === spec.id;

    return (
      <div key={spec.id} className="admin-tree-subitem">
        <button
          type="button"
          className="admin-tree-toggle admin-tree-toggle--sub"
          onClick={() => setExpandedSpecialty(isOpen ? null : spec.id)}
        >
          <span>{isOpen ? '▼' : '▶'}</span>
          <strong>{spec.name}</strong>
          <Link to={`/programs/${spec.slug}`} target="_blank" className="admin-link">
            открыть
          </Link>
        </button>

        {isOpen && (
          <div className="admin-tree-body admin-tree-body--nested">
            <div className="admin-form-grid admin-form-grid--compact">
              <Field label="Название">
                <input
                  className="admin-input"
                  defaultValue={spec.name}
                  id={`spec-name-${spec.id}`}
                />
              </Field>
              <Field label="Slug">
                <input
                  className="admin-input"
                  defaultValue={spec.slug}
                  id={`spec-slug-${spec.id}`}
                />
              </Field>
              <Field label="Контракт (сом)">
                <input
                  className="admin-input"
                  type="number"
                  defaultValue={spec.contract_cost ?? ''}
                  id={`spec-cost-${spec.id}`}
                />
              </Field>
              <Field label="Описание профессии">
                <textarea
                  className="admin-input admin-textarea"
                  rows={2}
                  defaultValue={spec.profession_description || ''}
                  id={`spec-desc-${spec.id}`}
                />
              </Field>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const cost = document.getElementById(`spec-cost-${spec.id}`).value;
                  await api.adminUpdateSpecialty(spec.id, {
                    name: document.getElementById(`spec-name-${spec.id}`).value,
                    slug: slugify(document.getElementById(`spec-slug-${spec.id}`).value),
                    profession_description: document.getElementById(`spec-desc-${spec.id}`).value,
                    contract_cost: cost ? Number(cost) : null,
                  });
                }, 'Программа сохранена')
              }
            >
              Сохранить программу
            </button>

            <div className="admin-subblock">
              <h4>Правила поступления</h4>
              {(spec.programRules || []).map((rule) => (
                <div key={rule.id} className="admin-rule-card">
                  <div className="admin-rule-head">
                    <strong>Сезон {rule.season_year}</strong>
                    <span className="muted">мин. балл: {rule.main_score_min ?? '—'}</span>
                    {!rule.is_active && <span className="admin-badge">неактивно</span>}
                  </div>
                  <div className="admin-form-grid admin-form-grid--compact">
                    <Field label="Мин. основной балл">
                      <input
                        className="admin-input"
                        type="number"
                        defaultValue={rule.main_score_min ?? ''}
                        id={`rule-min-${rule.id}`}
                      />
                    </Field>
                    <Field label="Сезон">
                      <input
                        className="admin-input"
                        type="number"
                        defaultValue={rule.season_year}
                        id={`rule-year-${rule.id}`}
                      />
                    </Field>
                    <Field label="Источник (URL)">
                      <input
                        className="admin-input"
                        defaultValue={rule.source_url || ''}
                        id={`rule-src-${rule.id}`}
                      />
                    </Field>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        await api.adminUpdateProgramRule(rule.id, {
                          season_year: Number(document.getElementById(`rule-year-${rule.id}`).value),
                          main_score_min: document.getElementById(`rule-min-${rule.id}`).value
                            ? Number(document.getElementById(`rule-min-${rule.id}`).value)
                            : null,
                          source_url: document.getElementById(`rule-src-${rule.id}`).value || null,
                        });
                      }, 'Правило обновлено')
                    }
                  >
                    Сохранить правило
                  </button>

                  <div className="admin-passing-list">
                    <p className="muted">Проходные баллы по годам</p>
                    {(rule.passingScores || []).map((ps) => (
                      <div key={ps.id} className="admin-passing-row">
                        <span>
                          <strong>{ps.year}</strong> · бюджет {ps.budget_cutoff ?? '—'} / контракт{' '}
                          {ps.contract_cutoff ?? '—'} · места {ps.seats_budget ?? '—'} /{' '}
                          {ps.seats_contract ?? '—'}
                        </span>
                        <button
                          type="button"
                          className="btn-link"
                          disabled={busy}
                          onClick={() => {
                            const budget = prompt('Бюджет cutoff', String(ps.budget_cutoff ?? ''));
                            if (budget === null) return;
                            run(async () => {
                              await api.adminUpdatePassingScore(ps.id, {
                                budget_cutoff: budget ? Number(budget) : null,
                              });
                            }, 'Проходной балл обновлён');
                          }}
                        >
                          править
                        </button>
                      </div>
                    ))}
                  </div>

                  {scoreForm.program_rule_id === rule.id ? (
                    <div className="admin-add-form">
                      <div className="admin-form-grid admin-form-grid--compact">
                        <Field label="Год">
                          <input
                            className="admin-input"
                            type="number"
                            value={scoreForm.year}
                            onChange={(e) => setScoreForm({ ...scoreForm, year: e.target.value })}
                          />
                        </Field>
                        <Field label="Бюджет">
                          <input
                            className="admin-input"
                            type="number"
                            step="0.1"
                            value={scoreForm.budget_cutoff}
                            onChange={(e) => setScoreForm({ ...scoreForm, budget_cutoff: e.target.value })}
                          />
                        </Field>
                        <Field label="Контракт">
                          <input
                            className="admin-input"
                            type="number"
                            step="0.1"
                            value={scoreForm.contract_cutoff}
                            onChange={(e) => setScoreForm({ ...scoreForm, contract_cutoff: e.target.value })}
                          />
                        </Field>
                        <Field label="Мест (бюджет)">
                          <input
                            className="admin-input"
                            type="number"
                            value={scoreForm.seats_budget}
                            onChange={(e) => setScoreForm({ ...scoreForm, seats_budget: e.target.value })}
                          />
                        </Field>
                        <Field label="Мест (контракт)">
                          <input
                            className="admin-input"
                            type="number"
                            value={scoreForm.seats_contract}
                            onChange={(e) => setScoreForm({ ...scoreForm, seats_contract: e.target.value })}
                          />
                        </Field>
                      </div>
                      <div className="admin-inline-actions">
                        <button
                          type="button"
                          className="btn"
                          disabled={busy}
                          onClick={() =>
                            run(async () => {
                              await api.adminCreatePassingScore({
                                program_rule_id: rule.id,
                                year: Number(scoreForm.year),
                                budget_cutoff: scoreForm.budget_cutoff
                                  ? Number(scoreForm.budget_cutoff)
                                  : null,
                                contract_cutoff: scoreForm.contract_cutoff
                                  ? Number(scoreForm.contract_cutoff)
                                  : null,
                                seats_budget: scoreForm.seats_budget
                                  ? Number(scoreForm.seats_budget)
                                  : null,
                                seats_contract: scoreForm.seats_contract
                                  ? Number(scoreForm.seats_contract)
                                  : null,
                              });
                              setScoreForm(emptyPassingScore(rule.id));
                            }, 'Проходные добавлены')
                          }
                        >
                          Сохранить проходные
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => setScoreForm(emptyPassingScore())}
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="btn-link"
                      onClick={() => setScoreForm(emptyPassingScore(rule.id))}
                    >
                      + Добавить проходные за год
                    </button>
                  )}
                </div>
              ))}

              <div className="admin-add-form">
                <p className="muted">Новое правило поступления</p>
                <div className="admin-form-grid admin-form-grid--compact">
                  <Field label="Сезон (год)">
                    <input
                      className="admin-input"
                      type="number"
                      value={ruleForm.specialty_id === spec.id ? ruleForm.season_year : ''}
                      onChange={(e) =>
                        setRuleForm({
                          ...emptyRule(spec.id),
                          specialty_id: spec.id,
                          season_year: e.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="Мин. балл">
                    <input
                      className="admin-input"
                      type="number"
                      value={ruleForm.specialty_id === spec.id ? ruleForm.main_score_min : ''}
                      onChange={(e) =>
                        setRuleForm((prev) =>
                          prev.specialty_id === spec.id ? { ...prev, main_score_min: e.target.value } : prev
                        )
                      }
                    />
                  </Field>
                  <Field label="Предметы (JSON)">
                    <textarea
                      className="admin-input admin-textarea"
                      rows={2}
                      value={
                        ruleForm.specialty_id === spec.id ? ruleForm.subject_requirements_json : '{}'
                      }
                      onChange={(e) =>
                        setRuleForm((prev) =>
                          prev.specialty_id === spec.id
                            ? { ...prev, subject_requirements_json: e.target.value }
                            : prev
                        )
                      }
                    />
                  </Field>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={busy || ruleForm.specialty_id !== spec.id}
                  onClick={() =>
                    run(async () => {
                      await api.adminCreateProgramRule({
                        specialty_id: spec.id,
                        season_year: Number(ruleForm.season_year),
                        main_score_min: ruleForm.main_score_min
                          ? Number(ruleForm.main_score_min)
                          : null,
                        subject_requirements_json: parseJson(
                          ruleForm.subject_requirements_json,
                          'JSON предметов'
                        ),
                      });
                      setRuleForm(emptyRule(spec.id));
                    }, 'Правило добавлено')
                  }
                >
                  + Добавить правило
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="admin-catalog">
      {error && <div className="error">{error}</div>}

      <div className="admin-catalog-layout">
        <aside className="admin-catalog-sidebar">
          <div className="admin-catalog-sidebar-head">
            <h2>Вузы</h2>
            <button type="button" className="btn" onClick={startCreate}>
              + Вуз
            </button>
          </div>
          <input
            className="admin-input"
            type="search"
            placeholder="Поиск по названию, slug, городу..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="admin-uni-list">
            {filtered.map((uni) => (
              <button
                key={uni.id}
                type="button"
                className={`admin-uni-list-item${selectedId === uni.id && mode === 'edit' ? ' active' : ''}`}
                onClick={() => selectUniversity(uni)}
              >
                <div className="admin-uni-list-row">
                  <UniLogo name={uni.name} logoUrl={uni.logo_url} size={36} className="admin-uni-list-logo" />
                  <div className="admin-uni-list-text">
                    <strong>{uni.name}</strong>
                    <span className="muted">
                      {uni.city || '—'} · {countPrograms(uni)} прогр.
                    </span>
                  </div>
                </div>
                <span className={`admin-badge admin-badge--${uni.status}`}>{uni.status}</span>
              </button>
            ))}
            {!filtered.length && <p className="muted">Вузы не найдены</p>}
          </div>
        </aside>

        <main className="admin-catalog-main">
          {mode === 'create' && (
            <>
              <Section title="Новый вуз" subtitle="Заполните основную информацию и сохраните">
                {universityFormFields()}
                <div className="admin-inline-actions">
                  <button type="button" className="btn" disabled={busy || !uniForm.name || !uniForm.slug || !logoPreview} onClick={saveUniversity}>
                    Создать вуз
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={startCreate}>
                    Очистить
                  </button>
                </div>
              </Section>
            </>
          )}

          {mode === 'edit' && !selected && (
            <div className="admin-catalog-empty">
              <h2>Каталог вузов</h2>
              <p className="muted">
                Выберите вуз слева или нажмите «+ Вуз», чтобы добавить новый. Здесь можно редактировать
                описание, факультеты, программы, правила поступления и проходные баллы.
              </p>
            </div>
          )}

          {mode === 'edit' && selected && (
            <>
              <Section
                title={selected.name}
                subtitle={`/${selected.slug} · ${selected.city || 'город не указан'}`}
                actions={
                  <Link to={`/universities/${selected.slug}`} target="_blank" className="btn btn-secondary">
                    Открыть на сайте
                  </Link>
                }
              >
                {universityFormFields()}
                <div className="admin-inline-actions">
                  <button type="button" className="btn" disabled={busy} onClick={saveUniversity}>
                    Сохранить вуз
                  </button>
                </div>
              </Section>

              <Section
                title="Факультеты"
                subtitle="Структура вуза: факультет → программа → правила → проходные баллы"
              >
                {(selected.faculties || []).map((faculty) => renderFacultyBlock(faculty))}

                <div className="admin-add-form admin-add-form--highlight">
                  <h4>Новый факультет</h4>
                  <div className="admin-form-grid admin-form-grid--compact">
                    <Field label="Название">
                      <input
                        className="admin-input"
                        value={facultyForm.university_id === selected.id ? facultyForm.name : ''}
                        onChange={(e) =>
                          setFacultyForm({
                            ...emptyFaculty(selected.id),
                            university_id: selected.id,
                            name: e.target.value,
                            slug: slugify(e.target.value),
                          })
                        }
                      />
                    </Field>
                    <Field label="Slug">
                      <input
                        className="admin-input"
                        value={facultyForm.university_id === selected.id ? facultyForm.slug : ''}
                        onChange={(e) =>
                          setFacultyForm((prev) =>
                            prev.university_id === selected.id
                              ? { ...prev, slug: slugify(e.target.value) }
                              : prev
                          )
                        }
                      />
                    </Field>
                    <Field label="Описание">
                      <textarea
                        className="admin-input admin-textarea"
                        rows={2}
                        value={facultyForm.university_id === selected.id ? facultyForm.description : ''}
                        onChange={(e) =>
                          setFacultyForm((prev) =>
                            prev.university_id === selected.id
                              ? { ...prev, description: e.target.value }
                              : prev
                          )
                        }
                      />
                    </Field>
                  </div>
                  <button
                    type="button"
                    className="btn"
                    disabled={busy || facultyForm.university_id !== selected.id || !facultyForm.name}
                    onClick={() =>
                      run(async () => {
                        await api.adminCreateFaculty({
                          university_id: selected.id,
                          slug: facultyForm.slug || slugify(facultyForm.name),
                          name: facultyForm.name,
                          description: facultyForm.description || null,
                        });
                        setFacultyForm(emptyFaculty(selected.id));
                      }, 'Факультет добавлен')
                    }
                  >
                    + Добавить факультет
                  </button>
                </div>
              </Section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

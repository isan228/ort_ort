import { useState } from 'react';
import { api } from '../../api/client.js';

function UserCard({ user, roles, onUpdated }) {
  const [roleCode, setRoleCode] = useState(user.role?.code || 'user');
  const [status, setStatus] = useState(user.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setBusy(true);
    setError('');
    try {
      await api.adminUpdateUser(user.id, { role_code: roleCode, status });
      onUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const label =
    user.profile?.nickname || user.email || user.phone || user.id;

  return (
    <div className="card admin-card">
      <h3>{label}</h3>
      <p className="muted">
        {user.email || '—'} {user.phone ? `· ${user.phone}` : ''}
      </p>
      <p className="muted">
        Фаза: {user.phase} · Роль: {user.role?.name || user.role?.code}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <label>
          Роль
          <select
            value={roleCode}
            onChange={(e) => setRoleCode(e.target.value)}
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
          >
            {roles.map((role) => (
              <option key={role.id} value={role.code}>
                {role.name} ({role.code})
              </option>
            ))}
          </select>
        </label>
        <label>
          Статус
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
          >
            <option value="active">active</option>
            <option value="blocked">blocked</option>
          </select>
        </label>
      </div>
      {error && <div className="error">{error}</div>}
      <button type="button" className="btn" disabled={busy} onClick={save}>
        Сохранить
      </button>
    </div>
  );
}

export default function AdminUsersTab({ users, roles, total, onSearch, onUpdated }) {
  const [search, setSearch] = useState('');

  return (
    <>
      <div className="card">
        <h2>Пользователи ({total})</h2>
        <div className="admin-actions">
          <input
            type="search"
            placeholder="Email, телефон, ник..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 200, padding: 8 }}
          />
          <button type="button" className="btn btn-secondary" onClick={() => onSearch(search)}>
            Найти
          </button>
        </div>
      </div>

      {users.map((user) => (
        <UserCard key={user.id} user={user} roles={roles} onUpdated={onUpdated} />
      ))}
      {!users.length && <p className="muted">Пользователи не найдены.</p>}
    </>
  );
}

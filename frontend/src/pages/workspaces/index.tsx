import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/router';
import { apiFetch } from '../../lib/api';

interface Workspace {
  id: string;
  name: string;
  myRole: string;
}

export default function WorkspacesPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) {
      router.replace('/login');
      return;
    }
    load();
  }, []);

  async function load() {
    const data = await apiFetch('/workspaces');
    setWorkspaces(data);
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    await apiFetch('/workspaces', { method: 'POST', body: JSON.stringify({ name: newName }) });
    setNewName('');
    load();
  }

  function logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    router.push('/login');
  }

  return (
    <div>
      <div className="topbar">
        <strong>Workspaces</strong>
        <button onClick={logout}>Log out</button>
      </div>
      <div className="container">
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: 8 }}>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New workspace name" />
          <button type="submit">Create</button>
        </form>

        <div className="workspace-list">
          {workspaces.map((ws) => (
            <div key={ws.id} className="workspace-card" onClick={() => router.push(`/workspaces/${ws.id}`)}>
              <div>{ws.name}</div>
              <span className="role-badge">{ws.myRole}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

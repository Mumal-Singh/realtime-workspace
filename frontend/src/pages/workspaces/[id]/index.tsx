import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/router';
import { apiFetch } from '../../../lib/api';

export default function WorkspaceDetailPage() {
  const router = useRouter();
  const { id } = router.query as { id: string };

  const [boards, setBoards] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [newBoardName, setNewBoardName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!id) return;
    loadBoards();
    loadActivity();
  }, [id]);

  async function loadBoards() {
    const data = await apiFetch(`/workspaces/${id}/boards`);
    setBoards(data);
  }

  async function loadActivity() {
    const data = await apiFetch(`/workspaces/${id}/activity`);
    setActivity(data.items);
  }

  async function handleCreateBoard(e: FormEvent) {
    e.preventDefault();
    if (!newBoardName.trim()) return;
    await apiFetch(`/workspaces/${id}/boards`, { method: 'POST', body: JSON.stringify({ name: newBoardName }) });
    setNewBoardName('');
    loadBoards();
  }

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    setMessage('');
    try {
      await apiFetch(`/workspaces/${id}/members`, {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      setMessage(`Invited ${inviteEmail} as ${inviteRole}`);
      setInviteEmail('');
    } catch (err: any) {
      setMessage(err.message);
    }
  }

  return (
    <div>
      <div className="topbar">
        <button onClick={() => router.push('/workspaces')}>&larr; Workspaces</button>
      </div>
      <div className="container">
        <h2>Boards</h2>
        <form onSubmit={handleCreateBoard} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input value={newBoardName} onChange={(e) => setNewBoardName(e.target.value)} placeholder="New board name" />
          <button type="submit">Create board</button>
        </form>

        <div className="workspace-list">
          {boards.map((b) => (
            <div key={b.id} className="workspace-card" onClick={() => router.push(`/workspaces/${id}/boards/${b.id}`)}>
              {b.name}
            </div>
          ))}
        </div>

        <div className="sidebar-panel">
          <h3>Invite a member</h3>
          <form onSubmit={handleInvite} style={{ display: 'flex', gap: 8 }}>
            <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="Email (must already have an account)" type="email" />
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
              <option value="ADMIN">Admin</option>
              <option value="MEMBER">Member</option>
              <option value="VIEWER">Viewer</option>
            </select>
            <button type="submit">Invite</button>
          </form>
          {message && <p>{message}</p>}
        </div>

        <div className="sidebar-panel">
          <h3>Activity</h3>
          {activity.map((a) => (
            <div key={a.id} className="activity-item">
              <strong>{a.actor?.name}</strong> {a.action.replace('.', ' ')} &middot; {new Date(a.createdAt).toLocaleString()}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

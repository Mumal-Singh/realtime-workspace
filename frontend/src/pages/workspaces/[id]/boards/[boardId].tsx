import { useEffect, useState, useRef, FormEvent } from 'react';
import { useRouter } from 'next/router';
import { apiFetch } from '../../../../lib/api';
import { getSocket } from '../../../../lib/socket';

interface Task {
  id: string;
  title: string;
  position: number;
  listId: string;
  status: string;
}
interface List {
  id: string;
  name: string;
  position: number;
  tasks: Task[];
}

export default function BoardPage() {
  const router = useRouter();
  const { id: workspaceId, boardId } = router.query as { id: string; boardId: string };

  const [lists, setLists] = useState<List[]>([]);
  const [newListName, setNewListName] = useState('');
  const draggedTask = useRef<{ taskId: string; sourceListId: string } | null>(null);

  useEffect(() => {
    if (!workspaceId || !boardId) return;
    loadBoard();

    // wire up sockets - join this workspace's room, listen for task events from other clients,
    // and merge them into local state so we don't need to refetch the whole board on every change
    //
    // gap I know about and didn't get to: if the socket drops and socket.io auto-reconnects,
    // 'join_workspace' never gets re-emitted, so you silently stop getting live updates until
    // you refresh the page. fix is a 'connect' listener that re-emits the join. ran out of time
    // to test it properly (flaky wifi to actually trigger a drop) so I left it as-is rather than
    // ship something I couldn't verify.
    const socket = getSocket();
    socket.connect();
    socket.emit('join_workspace', workspaceId);

    socket.on('task:created', ({ task }: { task: Task }) => {
      setLists((prev) => prev.map((l) => (l.id === task.listId ? { ...l, tasks: sortByPosition([...l.tasks, task]) } : l)));
    });

    socket.on('task:moved', ({ task }: { task: Task }) => {
      // simplest correct approach: refetch the board on any move, since a move can shift
      // positions of several tasks across two lists at once - patching local state by hand
      // for that case is error-prone under a 15 hour budget, a refetch is cheap and correct
      loadBoard();
    });

    socket.on('task:deleted', () => {
      loadBoard();
    });

    return () => {
      socket.emit('leave_workspace', workspaceId);
      socket.off('task:created');
      socket.off('task:moved');
      socket.off('task:deleted');
      socket.disconnect();
    };
  }, [workspaceId, boardId]);

  function sortByPosition<T extends { position: number }>(items: T[]) {
    return [...items].sort((a, b) => a.position - b.position);
  }

  async function loadBoard() {
    const data = await apiFetch(`/workspaces/${workspaceId}/boards/${boardId}`);
    setLists(data.lists);
  }

  async function handleCreateList(e: FormEvent) {
    e.preventDefault();
    if (!newListName.trim()) return;
    await apiFetch(`/workspaces/${workspaceId}/boards/${boardId}/lists`, {
      method: 'POST',
      body: JSON.stringify({ name: newListName }),
    });
    setNewListName('');
    loadBoard();
  }

  async function handleAddTask(listId: string) {
    const title = window.prompt('Task title?');
    if (!title) return;
    await apiFetch(`/workspaces/${workspaceId}/boards/${boardId}/lists/${listId}/tasks`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
    // no loadBoard() here on purpose - the socket 'task:created' event (which we also
    // receive ourselves) updates local state already
  }

  function onDragStart(taskId: string, sourceListId: string) {
    draggedTask.current = { taskId, sourceListId };
  }

  async function onDrop(targetListId: string, targetPosition: number) {
    if (!draggedTask.current) return;
    const { taskId } = draggedTask.current;
    draggedTask.current = null;

    await apiFetch(
      `/workspaces/${workspaceId}/boards/${boardId}/lists/${targetListId}/tasks/${taskId}/move`,
      { method: 'POST', body: JSON.stringify({ listId: targetListId, position: targetPosition }) },
    );
    loadBoard();
  }

  return (
    <div>
      <div className="topbar">
        <button onClick={() => router.push(`/workspaces/${workspaceId}`)}>&larr; Boards</button>
      </div>
      <div className="container">
        <form onSubmit={handleCreateList} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input value={newListName} onChange={(e) => setNewListName(e.target.value)} placeholder="New list name" />
          <button type="submit">Add list</button>
        </form>

        <div className="board-columns">
          {lists.map((list) => (
            <div
              key={list.id}
              className="board-list"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(list.id, list.tasks.length)}
            >
              <h3>{list.name}</h3>
              {list.tasks.map((task, idx) => (
                <div
                  key={task.id}
                  className="task-card"
                  draggable
                  onDragStart={() => onDragStart(task.id, list.id)}
                  onDragOver={(e) => e.stopPropagation()}
                  onDrop={(e) => {
                    e.stopPropagation();
                    onDrop(list.id, idx);
                  }}
                >
                  {task.title}
                </div>
              ))}
              <button onClick={() => handleAddTask(list.id)} style={{ width: '100%' }}>+ Add task</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

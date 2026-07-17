import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Modal } from '../components/Modal';
import { request } from '../services/api';

type Project = {
  id: string;
  name: string;
  code: string;
  location?: string;
  budget?: number;
  currency?: string;
  description?: string;
};

export const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState<{ name: string; code: string; location: string; otherLocation?: string; budget: number; currency: string; description: string }>({ name: '', code: '', location: '', otherLocation: '', budget: 0, currency: 'IDR', description: '' });
  const [showOtherLocation, setShowOtherLocation] = useState(false);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const data = await request<Project[]>('/projects');
      setProjects(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', code: '', location: '', otherLocation: '', budget: 0, currency: 'IDR', description: '' });
    setShowOtherLocation(false);
    setModalOpen(true);
  };

  const openEdit = (p: Project) => {
    setEditing(p);
    const loc = p.location || '';
    const isOther = loc !== '' && !['Jakarta','Banten','Cikarang','Surabaya','Bandung'].includes(loc);
    setForm({ name: p.name || '', code: p.code || '', location: isOther ? 'other' : loc, otherLocation: isOther ? loc : '', budget: p.budget || 0, currency: p.currency || 'IDR', description: p.description || '' });
    setShowOtherLocation(isOther);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...form }; 
      // Resolve location if 'other' selected
      if (payload.location === 'other') {
        payload.location = payload.otherLocation || '';
      }

      if (editing) {
        const updated = await request<Project>(`/projects/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        setProjects(projects.map(p => p.id === updated.id ? updated : p));
      } else {
        const created = await request<Project>('/projects', { method: 'POST', body: JSON.stringify(payload) });
        setProjects([created, ...projects]);
      }
      setModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Error saving project');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this project?')) return;
    try {
      await request<void>(`/projects/${id}`, { method: 'DELETE' });
      setProjects(projects.filter(p => p.id !== id));
    } catch (err) {
      console.error(err);
      alert('Delete failed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Project Setup</h1>
          <p className="text-sm text-zinc-500">Create, edit, and manage projects.</p>
        </div>
        <div>
          <button onClick={openCreate} className="flex items-center gap-2 bg-brand-600 text-white px-3 py-1.5 rounded-md"><Plus size={14}/> New Project</button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900/40 text-zinc-500 uppercase text-xs">
              <tr>
                <th className="p-3">Code</th>
                <th className="p-3">Name</th>
                <th className="p-3">Location</th>
                <th className="p-3">Budget</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={5} className="p-4">Loading...</td></tr> : (
                projects.map(p => (
                  <tr key={p.id} className="border-t">
                    <td className="p-3 font-mono">{p.code}</td>
                    <td className="p-3 font-medium">{p.name}</td>
                    <td className="p-3">{p.location}</td>
                    <td className="p-3">{p.budget ? `$${p.budget}` : '-'}</td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(p)} className="p-1.5 bg-zinc-100 rounded"><Edit2 size={14} /></button>
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 bg-red-50 rounded text-red-600"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Project' : 'New Project'}>
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="text-xs">Project Code</label>
            <input required value={form.code} onChange={e => setForm({...form, code: e.target.value})} className="w-full bg-zinc-100 dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"/>
          </div>
          <div>
            <label className="text-xs">Project Name</label>
            <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-zinc-100 dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"/>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs">Location (City / Region)</label>
              <select required value={form.location} onChange={e => { const v = e.target.value; setForm({...form, location: v}); setShowOtherLocation(v === 'other'); }} className="w-full bg-zinc-100 dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500">
                <option value="">Select location</option>
                <option value="Jakarta">Jakarta</option>
                <option value="Banten">Banten</option>
                <option value="Cikarang">Cikarang</option>
                <option value="Surabaya">Surabaya</option>
                <option value="Bandung">Bandung</option>
                <option value="other">Other (specify)</option>
              </select>
            </div>
            <div>
              <label className="text-xs">Budget</label>
              <input type="number" placeholder="0" value={form.budget} onChange={e => setForm({...form, budget: Number(e.target.value)})} className="w-full bg-zinc-100 dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"/>
            </div>
          </div>
          {showOtherLocation && (
            <div>
              <label className="text-xs">Specify Location</label>
              <input value={form.otherLocation} onChange={e => setForm({...form, otherLocation: e.target.value})} placeholder="e.g. Kota X, Province Y" className="w-full bg-zinc-100 dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"/>
            </div>
          )}
          <div>
            <label className="text-xs">Currency</label>
            <select value={form.currency} onChange={e => setForm({...form, currency: e.target.value})} className="w-full bg-zinc-100 dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500">
              <option value="IDR">IDR</option>
              <option value="USD">USD</option>
              <option value="SGD">SGD</option>
              <option value="RMB">RMB</option>
              <option value="YEN">YEN</option>
              <option value="EURO">EURO</option>
            </select>
          </div>
          <div>
            <label className="text-xs">Description</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full bg-zinc-100 dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"/>
          </div>
          <div className="flex gap-2"><button type="button" onClick={() => setModalOpen(false)} className="p-2 rounded border">Cancel</button><button type="submit" className="p-2 rounded bg-brand-600 text-white">Save</button></div>
        </form>
      </Modal>
    </div>
  );
};

export default ProjectsPage;

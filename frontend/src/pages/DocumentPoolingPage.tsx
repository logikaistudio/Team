import React, { useState, useEffect, useRef } from 'react';
import { Upload, Download, Trash2, FileText, File, FileSpreadsheet, FileImage, FolderOpen, FolderPlus, Pencil, FolderX } from 'lucide-react';
import { request } from '../services/api';
import { useStore } from '../store/useStore';

interface Project {
  id: string;
  name: string;
}

interface ProjectDocument {
  id: string;
  folderId?: string | null;
  name: string;
  type: string;
  size: number;
  filePath: string;
  uploadedBy: string;
  createdAt: string;
}

interface DocumentFolder {
  id: string;
  name: string;
  parentId?: string | null;
}

export const DocumentPoolingPage: React.FC = () => {
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // On mount: load project list
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await request<Project[]>('/projects');
        setProjects(data);
        if (data.length > 0) {
          setSelectedProjectId(data[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch projects', error);
      }
    };
    loadProjects();
  }, []);

  // When project changes: reload documents
  useEffect(() => {
    if (selectedProjectId) {
      setSelectedFolderId('all');
      fetchFolders();
      fetchDocuments();
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (selectedProjectId) {
      fetchDocuments();
    }
  }, [selectedProjectId, selectedFolderId]);

  const fetchFolders = async () => {
    if (!selectedProjectId) return;
    try {
      const data = await request<DocumentFolder[]>(`/projects/${selectedProjectId}/documents/folders`);
      setFolders(data);
    } catch (error) {
      console.error('Failed to fetch folders', error);
      setFolders([]);
    }
  };

  const fetchDocuments = async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const query = selectedFolderId === 'all'
        ? ''
        : selectedFolderId === 'root'
          ? '?folderId=root'
          : `?folderId=${encodeURIComponent(selectedFolderId)}`;
      const data = await request<ProjectDocument[]>(`/projects/${selectedProjectId}/documents${query}`);
      setDocuments(data);
    } catch (error) {
      console.error('Failed to fetch documents', error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedProjectId) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    if (selectedFolderId !== 'all' && selectedFolderId !== 'root') {
      formData.append('folderId', selectedFolderId);
    }

    try {
      await request(`/projects/${selectedProjectId}/documents`, {
        method: 'POST',
        body: formData,
      });
      await fetchDocuments();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Failed to upload document', error);
      const message = error instanceof Error ? error.message : 'Unknown upload error';
      alert(`Upload gagal: ${message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!selectedProjectId) return;
    const name = prompt('Nama folder baru:');
    if (!name || !name.trim()) return;
    try {
      await request(`/projects/${selectedProjectId}/documents/folders`, {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), parentId: null }),
      });
      await fetchFolders();
    } catch (error) {
      console.error('Failed to create folder', error);
      alert('Gagal membuat folder.');
    }
  };

  const handleRenameFolder = async (folder: DocumentFolder) => {
    const nextName = prompt('Ubah nama folder:', folder.name);
    if (!nextName || !nextName.trim() || nextName.trim() === folder.name) return;
    try {
      await request(`/projects/${selectedProjectId}/documents/folders/${folder.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: nextName.trim() }),
      });
      await fetchFolders();
    } catch (error) {
      console.error('Failed to rename folder', error);
      alert('Gagal mengubah nama folder.');
    }
  };

  const handleDeleteFolder = async (folder: DocumentFolder) => {
    if (!confirm(`Hapus folder "${folder.name}"? Dokumen di dalamnya akan dipindah ke root.`)) return;
    try {
      await request(`/projects/${selectedProjectId}/documents/folders/${folder.id}`, { method: 'DELETE' });
      if (selectedFolderId === folder.id) {
        setSelectedFolderId('all');
      }
      await fetchFolders();
      await fetchDocuments();
    } catch (error) {
      console.error('Failed to delete folder', error);
      alert('Gagal menghapus folder.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus dokumen ini?')) return;
    try {
      await request(`/projects/${selectedProjectId}/documents/${id}`, { method: 'DELETE' });
      await fetchDocuments();
    } catch (error) {
      console.error('Failed to delete document', error);
      alert('Gagal menghapus dokumen.');
    }
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="text-red-500 shrink-0" size={18} />;
    if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv') || type.includes('sheet'))
      return <FileSpreadsheet className="text-emerald-500 shrink-0" size={18} />;
    if (type.includes('image')) return <FileImage className="text-blue-500 shrink-0" size={18} />;
    return <File className="text-zinc-500 shrink-0" size={18} />;
  };

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const handleDownload = async (doc: ProjectDocument) => {
    try {
      const token = useStore.getState().accessToken;
      const response = await fetch(doc.filePath, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) {
        throw new Error('Download failed');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download document', error);
      alert('Gagal mengunduh dokumen.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pooling Document</h1>
          <p className="text-zinc-500 text-sm">Simpan dan kelola semua dokumen proyek (PDF, Excel, Word, Gambar, dll).</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* Project Selector */}
          <div className="relative">
            <div className="flex items-center gap-2 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg min-w-[200px]">
              <FolderOpen size={14} className="text-brand-500 shrink-0" />
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-transparent text-xs font-semibold text-zinc-700 dark:text-zinc-200 flex-1 outline-none cursor-pointer"
              >
                {projects.length === 0 && <option value="">— No Projects —</option>}
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Upload Button */}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileUpload}
          />
          <button
            onClick={() => {
              if (!selectedProjectId) { alert('Pilih proyek terlebih dahulu.'); return; }
              fileInputRef.current?.click();
            }}
            disabled={uploading || !selectedProjectId}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg shadow-lg shadow-brand-500/20 transition-all"
          >
            <Upload size={14} />
            <span>{uploading ? 'Uploading...' : 'Upload File'}</span>
          </button>
        </div>
      </div>

      {/* Document Table */}
      <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        {/* Folder toolbar */}
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setSelectedFolderId('all')}
                className={`px-2.5 py-1 rounded-md text-xs border ${selectedFolderId === 'all' ? 'bg-brand-600 text-white border-brand-600' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300'}`}
              >
                All
              </button>
              <button
                onClick={() => setSelectedFolderId('root')}
                className={`px-2.5 py-1 rounded-md text-xs border ${selectedFolderId === 'root' ? 'bg-brand-600 text-white border-brand-600' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300'}`}
              >
                Root
              </button>
              {folders.map((folder) => (
                <div key={folder.id} className="inline-flex items-center gap-1">
                  <button
                    onClick={() => setSelectedFolderId(folder.id)}
                    className={`px-2.5 py-1 rounded-md text-xs border ${selectedFolderId === folder.id ? 'bg-brand-600 text-white border-brand-600' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300'}`}
                  >
                    {folder.name}
                  </button>
                  <button onClick={() => handleRenameFolder(folder)} className="p-1 text-zinc-500 hover:text-brand-500" title="Rename folder">
                    <Pencil size={12} />
                  </button>
                  <button onClick={() => handleDeleteFolder(folder)} className="p-1 text-zinc-500 hover:text-red-500" title="Delete folder">
                    <FolderX size={12} />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={handleCreateFolder}
              disabled={!selectedProjectId}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 dark:bg-zinc-700 hover:bg-zinc-800 text-white text-xs rounded-md disabled:opacity-50"
            >
              <FolderPlus size={13} />
              <span>Add Folder</span>
            </button>
          </div>
        </div>

        {!selectedProjectId ? (
          <div className="p-12 text-center flex flex-col items-center">
            <FolderOpen className="text-zinc-300 dark:text-zinc-700 mb-4" size={48} />
            <p className="text-zinc-500 text-sm">Pilih proyek untuk melihat dokumennya.</p>
          </div>
        ) : loading ? (
          <div className="p-12 text-center text-zinc-500 text-sm">Memuat dokumen...</div>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <FileText className="text-zinc-300 dark:text-zinc-700 mb-4" size={48} />
            <p className="text-zinc-500 text-sm">Belum ada dokumen untuk proyek <strong>{selectedProject?.name}</strong>.</p>
            <p className="text-zinc-400 text-xs mt-1">Klik "Upload File" untuk menambahkan dokumen.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 bg-zinc-50 dark:bg-zinc-900/40 text-[11px] uppercase tracking-wider">
                <th className="p-3 font-semibold">Nama File</th>
                <th className="p-3 w-40 font-semibold">Folder</th>
                <th className="p-3 w-28 font-semibold">Tipe</th>
                <th className="p-3 w-24 text-right font-semibold">Ukuran</th>
                <th className="p-3 w-48 font-semibold">Tanggal Upload</th>
                <th className="p-3 w-24 text-center font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/20 transition-colors group">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {getFileIcon(doc.type)}
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-xs" title={doc.name}>
                        {doc.name}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-zinc-500">
                    {folders.find((f) => f.id === doc.folderId)?.name || 'Root'}
                  </td>
                  <td className="p-3 text-zinc-500">
                    {(doc.type.split('/')[1] || doc.type).toUpperCase()}
                  </td>
                  <td className="p-3 text-right text-zinc-500 font-mono">
                    {formatSize(doc.size)}
                  </td>
                  <td className="p-3 text-zinc-500">
                    {new Date(doc.createdAt).toLocaleString('id-ID')}
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => handleDownload(doc)}
                        className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded transition-colors"
                        title="Download"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors"
                        title="Hapus"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

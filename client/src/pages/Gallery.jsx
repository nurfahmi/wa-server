import React, { useState, useEffect } from 'react';
import axios from 'axios';
import clsx from 'clsx';
import { Image as ImageIcon, Video, FileText, Trash2, ExternalLink, Loader2, RefreshCw } from 'lucide-react';

export default function Gallery() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('image'); // image, video, document, all
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    fetchFiles();
  }, [filter]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const endpoint = filter === 'all' ? '/api/whatsapp/files' : `/api/whatsapp/files?type=${filter}`;
      const res = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setFiles(res.data.files || []);
    } catch (err) {
      console.error("Failed to fetch files", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm("Are you sure you want to delete this file?")) return;
    setDeleting(fileId);
    try {
      await axios.delete(`/api/whatsapp/files/${fileId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setFiles(prev => prev.filter(f => f.id !== fileId));
    } catch (err) {
      alert("Failed to delete file");
    } finally {
      setDeleting(null);
    }
  };

  const TABS = [
    { id: 'image', label: 'Images', icon: ImageIcon },
    { id: 'video', label: 'Videos', icon: Video },
    { id: 'document', label: 'Docs', icon: FileText },
    { id: 'all', label: 'All Files', icon: RefreshCw },
  ];

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 fade-in">
        <div>
           <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight mb-2">Media Gallery</h1>
           <p className="text-muted-foreground text-lg">Manage your uploaded and received media assets.</p>
        </div>
        <div className="flex bg-muted/50 p-1.5 rounded-2xl self-start">
           {TABS.map(tab => (
             <button
               key={tab.id}
               onClick={() => setFilter(tab.id)}
               className={clsx(
                 "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all",
                 filter === tab.id 
                   ? "bg-primary text-primary-foreground shadow-md" 
                   : "text-muted-foreground hover:text-foreground hover:bg-muted"
               )}
             >
               <tab.icon className="w-4 h-4" />
               {tab.label}
             </button>
           ))}
        </div>
      </div>

      {loading ? (
         <div className="flex justify-center items-center h-64">
           <Loader2 className="w-10 h-10 text-primary animate-spin" />
         </div>
      ) : files.length === 0 ? (
         <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-3xl bg-card/50">
           <div className="p-4 bg-muted rounded-full mb-4">
               {filter === 'image' ? <ImageIcon className="w-8 h-8 text-muted-foreground/50"/> : <FileText className="w-8 h-8 text-muted-foreground/50"/>}
           </div>
           <p className="text-muted-foreground font-medium">No files found.</p>
         </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {files.map((file, i) => (
            <div key={file.id} className="group relative bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 animate-in fade-in zoom-in-95" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="aspect-square bg-muted relative overflow-hidden">
                {file.fileType === 'image' ? (
                  <img src={file.filePath} alt={file.originalName} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                ) : file.fileType === 'video' ? (
                   <div className="w-full h-full flex items-center justify-center bg-black/10">
                     <Video className="w-12 h-12 text-foreground/20" />
                   </div>
                ) : (
                   <div className="w-full h-full flex items-center justify-center bg-indigo-50/50">
                     <FileText className="w-12 h-12 text-indigo-200" />
                   </div>
                )}
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
                   <a 
                     href={file.filePath} 
                     target="_blank" 
                     rel="noreferrer" 
                     className="p-3 bg-white/10 hover:bg-white text-white hover:text-primary rounded-xl backdrop-blur-md transition-all transform hover:scale-105"
                     title="View Original"
                   >
                     <ExternalLink className="w-5 h-5" />
                   </a>
                   <button 
                     onClick={() => handleDelete(file.id)}
                     disabled={deleting === file.id}
                     className="p-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl backdrop-blur-md transition-all transform hover:scale-105"
                     title="Delete"
                   >
                     {deleting === file.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                   </button>
                </div>
              </div>
              
              <div className="p-4">
                <h3 className="font-bold text-sm truncate mb-1" title={file.originalName}>{file.originalName || file.storedName}</h3>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                  <span>{(file.size / 1024).toFixed(0)} KB</span>
                  <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import clsx from 'clsx';
import { useLanguage } from '../context/LanguageContext';
import { useModal } from '../context/ModalContext';
import { 
  Image as ImageIcon, 
  Video, 
  FileText, 
  Trash2, 
  ExternalLink, 
  Loader2, 
  RefreshCw, 
  Grid3X3, 
  List, 
  ChevronLeft, 
  ChevronRight,
  Download,
  Calendar,
  HardDrive
} from 'lucide-react';

export default function Gallery() {
  const { t } = useLanguage();
  const { showAlert, showConfirm } = useModal();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('image'); // image, video, document, all
  const [deleting, setDeleting] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // grid, list
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);

  useEffect(() => {
    fetchFiles();
    setCurrentPage(1); // Reset to page 1 when filter changes
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
    if (!await showConfirm({ title: t('modal.warning'), message: t('gallery.deleteConfirm') || "Are you sure you want to delete this file?", type: 'danger' })) return;
    setDeleting(fileId);
    try {
      await axios.delete(`/api/whatsapp/files/${fileId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setFiles(prev => prev.filter(f => f.id !== fileId));
      await showAlert({ title: t('modal.success'), message: t('messages.deleteSuccess'), type: 'success' });
    } catch (err) {
      console.error(err);
      await showAlert({ title: t('modal.error'), message: t('gallery.deleteFailed') || "Failed to delete file", type: 'danger' });
    } finally {
      setDeleting(null);
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(files.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentFiles = files.slice(startIndex, endIndex);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const TABS = [
    { id: 'image', label: t('gallery.images') || 'Images', icon: ImageIcon },
    { id: 'video', label: t('gallery.videos') || 'Videos', icon: Video },
    { id: 'document', label: t('gallery.documents') || 'Docs', icon: FileText },
    { id: 'all', label: t('gallery.allFiles') || 'All Files', icon: RefreshCw },
  ];

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 fade-in">
        <div>
           <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight mb-2">{t('gallery.title')}</h1>
           <p className="text-muted-foreground text-lg">{t('gallery.subtitle') || 'Manage your uploaded and received media assets.'}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex bg-muted/50 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={clsx(
                "p-2.5 rounded-lg transition-all",
                viewMode === 'grid' 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
              title={t('gallery.gridView') || 'Grid View'}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={clsx(
                "p-2.5 rounded-lg transition-all",
                viewMode === 'list' 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
              title={t('gallery.listView') || 'List View'}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex bg-muted/50 p-1.5 rounded-2xl self-start mb-8 overflow-x-auto">
         {TABS.map(tab => (
           <button
             key={tab.id}
             onClick={() => setFilter(tab.id)}
             className={clsx(
               "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
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

      {/* Stats Bar */}
      {!loading && files.length > 0 && (
        <div className="flex items-center justify-between mb-6 text-sm text-muted-foreground">
          <span className="font-medium">
            {t('gallery.showing') || 'Showing'} {startIndex + 1}-{Math.min(endIndex, files.length)} {t('gallery.of') || 'of'} {files.length} {t('gallery.files') || 'files'}
          </span>
          <span className="font-medium">
            {t('gallery.page') || 'Page'} {currentPage} / {totalPages}
          </span>
        </div>
      )}

      {loading ? (
         <div className="flex justify-center items-center h-64">
           <Loader2 className="w-10 h-10 text-primary animate-spin" />
         </div>
      ) : files.length === 0 ? (
         <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-3xl bg-card/50">
           <div className="p-4 bg-muted rounded-full mb-4">
               {filter === 'image' ? <ImageIcon className="w-8 h-8 text-muted-foreground/50"/> : <FileText className="w-8 h-8 text-muted-foreground/50"/>}
           </div>
           <p className="text-muted-foreground font-medium">{t('gallery.noImages')}</p>
         </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {currentFiles.map((file, i) => (
            <div key={file.id} className="group relative bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 animate-in fade-in zoom-in-95" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="aspect-square bg-muted relative overflow-hidden">
                {file.fileType === 'image' ? (
                  <img src={file.filePath} alt={file.originalName} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                ) : file.fileType === 'video' ? (
                   <div className="w-full h-full flex items-center justify-center bg-black/10">
                     <Video className="w-12 h-12 text-foreground/20" />
                   </div>
                ) : (
                   <div className="w-full h-full flex items-center justify-center bg-indigo-50/50 dark:bg-indigo-900/20">
                     <FileText className="w-12 h-12 text-indigo-200 dark:text-indigo-500/50" />
                   </div>
                )}
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
                   <a 
                     href={file.filePath} 
                     target="_blank" 
                     rel="noreferrer" 
                     className="p-3 bg-white/10 hover:bg-white text-white hover:text-primary rounded-xl backdrop-blur-md transition-all transform hover:scale-105"
                     title={t('gallery.viewImage') || "View Original"}
                   >
                     <ExternalLink className="w-5 h-5" />
                   </a>
                   <a 
                     href={file.filePath} 
                     download={file.originalName}
                     className="p-3 bg-white/10 hover:bg-white text-white hover:text-emerald-600 rounded-xl backdrop-blur-md transition-all transform hover:scale-105"
                     title={t('gallery.download') || "Download"}
                   >
                     <Download className="w-5 h-5" />
                   </a>
                   <button 
                     onClick={() => handleDelete(file.id)}
                     disabled={deleting === file.id}
                     className="p-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl backdrop-blur-md transition-all transform hover:scale-105"
                     title={t('delete') || "Delete"}
                   >
                     {deleting === file.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                   </button>
                </div>
              </div>
              
              <div className="p-4">
                <h3 className="font-bold text-sm truncate mb-1" title={file.originalName}>{file.originalName || file.storedName}</h3>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                  <span>{formatFileSize(file.size)}</span>
                  <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-muted-foreground">{t('gallery.preview') || 'Preview'}</th>
                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-muted-foreground">{t('gallery.fileName') || 'File Name'}</th>
                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-muted-foreground">{t('gallery.type') || 'Type'}</th>
                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-muted-foreground">{t('gallery.size') || 'Size'}</th>
                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-muted-foreground">{t('gallery.date') || 'Date'}</th>
                  <th className="px-6 py-4 text-right text-xs font-black uppercase tracking-wider text-muted-foreground">{t('gallery.actions') || 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {currentFiles.map((file, i) => (
                  <tr key={file.id} className="hover:bg-muted/30 transition-colors animate-in fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                    <td className="px-6 py-4">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted border border-border">
                        {file.fileType === 'image' ? (
                          <img src={file.filePath} alt={file.originalName} className="w-full h-full object-cover" />
                        ) : file.fileType === 'video' ? (
                          <div className="w-full h-full flex items-center justify-center bg-black/5">
                            <Video className="w-6 h-6 text-muted-foreground" />
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-indigo-50/50 dark:bg-indigo-900/20">
                            <FileText className="w-6 h-6 text-indigo-400" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-sm text-foreground truncate max-w-xs" title={file.originalName}>
                        {file.originalName || file.storedName}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={clsx(
                        "px-3 py-1 rounded-full text-xs font-bold uppercase",
                        file.fileType === 'image' && "bg-emerald-500/10 text-emerald-600",
                        file.fileType === 'video' && "bg-purple-500/10 text-purple-600",
                        file.fileType === 'document' && "bg-blue-500/10 text-blue-600"
                      )}>
                        {file.fileType}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <HardDrive className="w-3.5 h-3.5" />
                        {formatFileSize(file.size)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(file.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <a 
                          href={file.filePath} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title={t('gallery.viewImage') || "View"}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <a 
                          href={file.filePath} 
                          download={file.originalName}
                          className="p-2 text-emerald-600 hover:bg-emerald-500/10 rounded-lg transition-colors"
                          title={t('gallery.download') || "Download"}
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button 
                          onClick={() => handleDelete(file.id)}
                          disabled={deleting === file.id}
                          className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                          title={t('delete') || "Delete"}
                        >
                          {deleting === file.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {!loading && files.length > itemsPerPage && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className={clsx(
              "p-3 rounded-xl border border-border transition-all",
              currentPage === 1 
                ? "opacity-50 cursor-not-allowed bg-muted" 
                : "bg-card hover:bg-muted hover:border-primary/20"
            )}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              // Show first page, last page, and pages around current
              if (
                page === 1 || 
                page === totalPages || 
                (page >= currentPage - 1 && page <= currentPage + 1)
              ) {
                return (
                  <button
                    key={page}
                    onClick={() => goToPage(page)}
                    className={clsx(
                      "w-10 h-10 rounded-xl font-bold text-sm transition-all",
                      page === currentPage 
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                        : "bg-card border border-border hover:bg-muted"
                    )}
                  >
                    {page}
                  </button>
                );
              }
              // Show ellipsis
              if (page === currentPage - 2 || page === currentPage + 2) {
                return (
                  <span key={page} className="px-2 text-muted-foreground">...</span>
                );
              }
              return null;
            })}
          </div>
          
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={clsx(
              "p-3 rounded-xl border border-border transition-all",
              currentPage === totalPages 
                ? "opacity-50 cursor-not-allowed bg-muted" 
                : "bg-card hover:bg-muted hover:border-primary/20"
            )}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}

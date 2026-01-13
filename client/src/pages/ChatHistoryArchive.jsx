import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Chat History Archive Page
 * 
 * Allows users to:
 * - Browse archived devices and their chat history
 * - View conversations in a WhatsApp-like interface
 * - Restore chat history to active devices
 * - Search across all archived messages
 * - Bulk restore from multiple devices
 */
const ChatHistoryArchive = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const messagesEndRef = useRef(null);
  
  // Tab state
  const [activeTab, setActiveTab] = useState('browse'); // 'browse' | 'search' | 'bulk'
  
  // Core State
  const [loading, setLoading] = useState(true);
  const [archivedDevices, setArchivedDevices] = useState([]);
  const [activeDevices, setActiveDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restorePreview, setRestorePreview] = useState(null);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreOptions, setRestoreOptions] = useState({
    targetDeviceId: null,
    mode: 'matching',
    includeAIMemory: true,
    includeIntentScores: true
  });
  const [error, setError] = useState(null);
  const [isMobileMessageView, setIsMobileMessageView] = useState(false);
  
  // Global Search State
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState([]);
  const [globalSearchLoading, setGlobalSearchLoading] = useState(false);
  const [globalSearchTotal, setGlobalSearchTotal] = useState(0);
  const [globalSearchPage, setGlobalSearchPage] = useState(1);
  
  // Bulk Restore State
  const [selectedDevicesForBulk, setSelectedDevicesForBulk] = useState([]);
  const [bulkPreview, setBulkPreview] = useState(null);
  const [bulkRestoreLoading, setBulkRestoreLoading] = useState(false);
  
  // Archive Stats State
  const [archiveStats, setArchiveStats] = useState(null);

  // Fetch archived devices
  const fetchArchivedDevices = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/chat-history/archived-devices`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setArchivedDevices(data.devices || []);
        if (data.devices?.length > 0 && !selectedDevice) {
          setSelectedDevice(data.devices[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching archived devices:', err);
      setError('Failed to load archived devices');
    } finally {
      setLoading(false);
    }
  }, [selectedDevice]);

  // Fetch active devices (for restore target)
  const fetchActiveDevices = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/chat-history/active-devices`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setActiveDevices(data.devices || []);
        if (data.devices?.length > 0) {
          setRestoreOptions(prev => ({ ...prev, targetDeviceId: data.devices[0].id }));
        }
      }
    } catch (err) {
      console.error('Error fetching active devices:', err);
    }
  }, []);

  // Fetch conversations for selected device
  const fetchConversations = useCallback(async () => {
    if (!selectedDevice) return;
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      
      const res = await fetch(
        `${API_BASE}/api/chat-history/devices/${selectedDevice.id}/conversations?${params}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.success) {
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    }
  }, [selectedDevice, searchQuery]);

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async () => {
    if (!selectedDevice || !selectedConversation) return;
    try {
      setMessagesLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${API_BASE}/api/chat-history/devices/${selectedDevice.id}/messages/${selectedConversation.chatId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setMessagesLoading(false);
    }
  }, [selectedDevice, selectedConversation]);

  // Preview restore operation
  const previewRestore = async () => {
    if (!selectedDevice || !restoreOptions.targetDeviceId) return;
    try {
      setRestoreLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/chat-history/restore/preview`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sourceDeviceId: selectedDevice.id,
          targetDeviceId: restoreOptions.targetDeviceId,
          mode: restoreOptions.mode
        })
      });
      const data = await res.json();
      if (data.success) {
        setRestorePreview(data.preview);
      }
    } catch (err) {
      console.error('Error previewing restore:', err);
    } finally {
      setRestoreLoading(false);
    }
  };

  // Execute restore
  const executeRestore = async () => {
    if (!selectedDevice || !restoreOptions.targetDeviceId) return;
    try {
      setRestoreLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/chat-history/restore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sourceDeviceId: selectedDevice.id,
          targetDeviceId: restoreOptions.targetDeviceId,
          mode: restoreOptions.mode,
          includeAIMemory: restoreOptions.includeAIMemory,
          includeIntentScores: restoreOptions.includeIntentScores
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Restore completed! ${data.result.merged} chats merged, ${data.result.added} added, ${data.result.messagesRestored} messages restored.`);
        setShowRestoreModal(false);
        setRestorePreview(null);
      } else {
        alert('Restore failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error executing restore:', err);
      alert('Error executing restore: ' + err.message);
    } finally {
      setRestoreLoading(false);
    }
  };

  // Global search across all archived messages
  const executeGlobalSearch = async (page = 1) => {
    if (!globalSearchQuery || globalSearchQuery.trim().length < 2) return;
    
    try {
      setGlobalSearchLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        q: globalSearchQuery,
        page: page.toString(),
        limit: '30'
      });
      
      const res = await fetch(`${API_BASE}/api/chat-history/search?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        setGlobalSearchResults(data.results || []);
        setGlobalSearchTotal(data.total || 0);
        setGlobalSearchPage(page);
      }
    } catch (err) {
      console.error('Error in global search:', err);
    } finally {
      setGlobalSearchLoading(false);
    }
  };

  // Fetch archive stats
  const fetchArchiveStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/chat-history/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setArchiveStats(data.stats);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  // Preview bulk restore
  const previewBulkRestore = async () => {
    if (selectedDevicesForBulk.length === 0 || !restoreOptions.targetDeviceId) return;
    
    try {
      setBulkRestoreLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/chat-history/restore/bulk/preview`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sourceDeviceIds: selectedDevicesForBulk,
          targetDeviceId: restoreOptions.targetDeviceId,
          mode: restoreOptions.mode
        })
      });
      const data = await res.json();
      if (data.success) {
        setBulkPreview(data);
      }
    } catch (err) {
      console.error('Error previewing bulk restore:', err);
    } finally {
      setBulkRestoreLoading(false);
    }
  };

  // Execute bulk restore
  const executeBulkRestore = async () => {
    if (selectedDevicesForBulk.length === 0 || !restoreOptions.targetDeviceId) return;
    
    try {
      setBulkRestoreLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/chat-history/restore/bulk`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sourceDeviceIds: selectedDevicesForBulk,
          targetDeviceId: restoreOptions.targetDeviceId,
          mode: restoreOptions.mode,
          includeAIMemory: restoreOptions.includeAIMemory,
          includeIntentScores: restoreOptions.includeIntentScores
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Bulk restore completed! ${data.totalMerged} chats merged, ${data.totalAdded} added, ${data.totalMessagesRestored} messages restored from ${data.deviceResults.length} devices.`);
        setBulkPreview(null);
        setSelectedDevicesForBulk([]);
      } else {
        alert('Bulk restore failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error executing bulk restore:', err);
      alert('Error executing bulk restore: ' + err.message);
    } finally {
      setBulkRestoreLoading(false);
    }
  };

  // Toggle device selection for bulk restore
  const toggleDeviceForBulk = (deviceId) => {
    setSelectedDevicesForBulk(prev => 
      prev.includes(deviceId) 
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  // Effects
  useEffect(() => {
    fetchArchivedDevices();
    fetchActiveDevices();
    fetchArchiveStats();
  }, []);

  useEffect(() => {
    if (selectedDevice) {
      fetchConversations();
    }
  }, [selectedDevice, searchQuery]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages();
    }
  }, [selectedConversation]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('id-ID', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit' });
    }
  };

  // Render message bubble
  const renderMessage = (msg) => {
    const isOutgoing = msg.fromMe || msg.direction === 'outgoing';
    
    return (
      <div
        key={msg.id}
        className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} mb-2`}
      >
        <div
          className={`max-w-[75%] rounded-lg px-3 py-2 ${
            isOutgoing
              ? 'bg-green-500 text-white rounded-br-none'
              : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded-bl-none shadow'
          }`}
        >
          {/* Media content */}
          {msg.mediaUrl && msg.messageType === 'image' && (
            <img 
              src={msg.mediaUrl} 
              alt="Media" 
              className="max-w-full rounded mb-1 cursor-pointer"
              onClick={() => window.open(msg.mediaUrl, '_blank')}
            />
          )}
          
          {/* Text content */}
          {msg.content && (
            <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
          )}
          {msg.caption && (
            <p className="text-sm whitespace-pre-wrap break-words mt-1">{msg.caption}</p>
          )}
          
          {/* Metadata */}
          <div className={`flex items-center justify-end gap-1 mt-1 ${
            isOutgoing ? 'text-green-100' : 'text-gray-400'
          }`}>
            {msg.isAiGenerated && (
              <span className="text-xs">🤖</span>
            )}
            {msg.agentName && (
              <span className="text-xs">{msg.agentName}</span>
            )}
            <span className="text-xs">
              {new Date(msg.timestamp).toLocaleTimeString('id-ID', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
        {/* Header with Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              📦 {t('chatHistoryArchive.title') || 'Chat History Archive'}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {t('chatHistoryArchive.browseArchivedChats') || 'Browse and restore chat history from archived devices'}
            </p>
          </div>
          
          {/* Stats Cards */}
          {archiveStats && (
            <div className="flex gap-3 text-xs">
              <div className="bg-blue-50 dark:bg-blue-900/30 px-3 py-2 rounded-lg">
                <span className="text-blue-600 dark:text-blue-400 font-bold">{archiveStats.deviceCount}</span>
                <span className="text-blue-500 dark:text-blue-300 ml-1">{t('chatHistoryArchive.devices') || 'Devices'}</span>
              </div>
              <div className="bg-green-50 dark:bg-green-900/30 px-3 py-2 rounded-lg">
                <span className="text-green-600 dark:text-green-400 font-bold">{archiveStats.chatCount}</span>
                <span className="text-green-500 dark:text-green-300 ml-1">{t('chatHistoryArchive.chats') || 'Chats'}</span>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/30 px-3 py-2 rounded-lg">
                <span className="text-purple-600 dark:text-purple-400 font-bold">{archiveStats.messageCount?.toLocaleString()}</span>
                <span className="text-purple-500 dark:text-purple-300 ml-1">{t('chatHistoryArchive.messages') || 'Messages'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-4">
          <button
            onClick={() => setActiveTab('browse')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'browse'
                ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow'
                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
            }`}
          >
            📂 {t('chatHistoryArchive.browseTab') || 'Browse'}
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'search'
                ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow'
                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
            }`}
          >
            🔍 {t('chatHistoryArchive.globalSearchTab') || 'Global Search'}
          </button>
          <button
            onClick={() => setActiveTab('bulk')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'bulk'
                ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow'
                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
            }`}
          >
            📦 {t('chatHistoryArchive.bulkRestoreTab') || 'Bulk Restore'}
          </button>
        </div>

        {archivedDevices.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-xl p-8">
            <div className="text-6xl mb-4">📭</div>
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {t('chatHistoryArchive.noArchivedDevices') || 'No Archived Devices'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
              {t('chatHistoryArchive.noArchivedDevicesDesc') || 'When you archive a device instead of deleting it, the chat history will be preserved here for future reference or restoration.'}
            </p>
            <button
              onClick={() => navigate('/devices')}
              className="mt-4 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              {t('chatHistoryArchive.goToDevices') || 'Go to Devices'}
            </button>
          </div>
        ) : (
          <>
            {/* Global Search Tab */}
            {activeTab === 'search' && (
              <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                🔍 {t('chatHistoryArchive.globalSearchTab') || 'Global Search'}
              </h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={t('chatHistoryArchive.searchPlaceholder') || 'Search across all archived messages...'}
                  value={globalSearchQuery}
                  onChange={(e) => setGlobalSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && executeGlobalSearch(1)}
                  className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg"
                />
                <button
                  onClick={() => executeGlobalSearch(1)}
                  disabled={globalSearchLoading || globalSearchQuery.length < 2}
                  className="px-6 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  {globalSearchLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : '🔍'}
                  {t('chatHistoryArchive.globalSearchTab') || 'Search'}
                </button>
              </div>
              {globalSearchQuery.length > 0 && globalSearchQuery.length < 2 && (
                <p className="text-xs text-red-500 mt-1">{t('chatHistoryArchive.searchMinChars') || 'Minimum 2 characters required'}</p>
              )}
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto mt-4 space-y-3">
              {globalSearchResults.length > 0 ? (
                <>
                  <p className="text-sm text-gray-500 dark:text-gray-400 px-1">
                    {t('chatHistoryArchive.foundMessages') || 'Found messages'}: {globalSearchTotal}
                  </p>
                  {/* Search Results */}
                  <div className="flex-1 overflow-y-auto p-4">
                    {globalSearchLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                      </div>
                    ) : globalSearchResults.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <div className="text-5xl mb-3">🔍</div>
                        <p>{t('chatHistoryArchive.searchForMessages') || 'Search for messages across all archived devices'}</p>
                        <p className="text-sm mt-1">{t('chatHistoryArchive.searchMinChars') || 'Minimum 2 characters required'}</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {globalSearchResults.map((result, idx) => (
                          <div 
                            key={`${result.id}-${idx}`}
                            className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                                {(result.contactName || result.contactPhone || '?')[0].toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-gray-800 dark:text-white">
                                    {result.contactName || result.contactPhone}
                                  </span>
                                  <span className="text-xs text-gray-400">
                                    {t('chatHistoryArchive.fromDevice') || 'from'} {result.deviceAlias}
                                  </span>
                                  <span className="text-xs text-gray-400">
                                    {new Date(result.timestamp).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 whitespace-pre-wrap">
                                  {result.highlightedContent?.split('**').map((part, i) => 
                                    i % 2 === 1 
                                      ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-700 px-0.5 rounded">{part}</mark>
                                      : part
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {/* Pagination */}
                        {globalSearchTotal > 30 && (
                          <div className="flex justify-center gap-2 pt-4">
                            <button
                              onClick={() => executeGlobalSearch(globalSearchPage - 1)}
                              disabled={globalSearchPage === 1}
                              className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg disabled:opacity-50"
                            >
                              {t('chatHistoryArchive.previous') || 'Previous'}
                            </button>
                            <span className="px-4 py-2 text-gray-600 dark:text-gray-300">
                              {t('chatHistoryArchive.page')} {globalSearchPage} {t('chatHistoryArchive.of')} {Math.ceil(globalSearchTotal / 30)}
                            </span>
                            <button
                              onClick={() => executeGlobalSearch(globalSearchPage + 1)}
                              disabled={globalSearchPage >= Math.ceil(globalSearchTotal / 30)}
                              className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg disabled:opacity-50"
                            >
                              {t('chatHistoryArchive.next') || 'Next'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <div className="text-5xl mb-3">🔍</div>
                  <p>{t('chatHistoryArchive.searchForMessages') || 'Search for messages across all archived devices'}</p>
                  <p className="text-sm mt-1">{t('chatHistoryArchive.searchMinChars') || 'Minimum 2 characters required'}</p>
                </div>
              )}
            </div>
          </div>
            )}

            {/* Bulk Restore Tab */}
            {activeTab === 'bulk' && (
              <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden p-6">
                <div className="mb-6">
                  <h3 className="font-bold text-gray-800 dark:text-white mb-1">
                    📦 {t('chatHistoryArchive.bulkRestoreTitle') || 'Bulk Restore from Multiple Devices'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {t('chatHistoryArchive.bulkRestoreDesc') || 'Select multiple archived devices to restore all their chat history to one active device'}
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto mb-6">
                  {/* Device Selection */}
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('chatHistoryArchive.selectDevicesToRestore') || 'Select Archived Devices to Restore'}
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {archivedDevices.map((device) => (
                        <label
                          key={device.id}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            selectedDevicesForBulk.includes(device.id)
                              ? 'border-green-500 bg-green-50 dark:bg-green-900/20 shadow-sm'
                              : 'border-gray-200 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-500/50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedDevicesForBulk.includes(device.id)}
                            onChange={() => toggleDeviceForBulk(device.id)}
                            className="rounded text-green-500 focus:ring-green-500"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 dark:text-white truncate">
                              📱 {device.alias}
                            </p>
                            <p className="text-xs text-gray-500">
                              {device.chatCount} chats • {device.messageCount} messages
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Target Device Selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('chatHistoryArchive.selectTargetDevice') || 'Target Active Device'}
                    </label>
                    <select
                      value={restoreOptions.targetDeviceId || ''}
                      onChange={(e) => setRestoreOptions(prev => ({ ...prev, targetDeviceId: parseInt(e.target.value) }))}
                      className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">{t('chatHistoryArchive.selectTargetPlaceholder') || 'Select target device...'}</option>
                      {activeDevices.map((device) => (
                        <option key={device.id} value={device.id}>
                          📱 {device.alias} ({device.realPhoneNumber || device.phoneNumber || 'No number'}) - {device.status}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Bulk Preview */}
                  {bulkPreview && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl mb-4 border border-green-100 dark:border-green-800">
                      <h4 className="font-medium text-green-800 dark:text-green-300 mb-3 flex items-center gap-2">
                        📊 {t('chatHistoryArchive.restorePreview') || 'Bulk Restore Preview'}
                      </h4>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                          <p className="text-gray-500 text-xs mb-1">{t('chatHistoryArchive.willMerge') || 'Will Merge'}</p>
                          <p className="font-bold text-green-600 text-lg">{bulkPreview.totalStats?.matchingChats || 0}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                          <p className="text-gray-500 text-xs mb-1">{t('chatHistoryArchive.willAdd') || 'Will Add'}</p>
                          <p className="font-bold text-blue-600 text-lg">{bulkPreview.totalStats?.newChats || 0}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                          <p className="text-gray-500 text-xs mb-1">{t('chatHistoryArchive.totalMessages') || 'Total Messages'}</p>
                          <p className="font-bold text-lg">{bulkPreview.totalStats?.totalMessages?.toLocaleString() || 0}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                          <p className="text-gray-500 text-xs mb-1">{t('chatHistoryArchive.devices') || 'Devices'}</p>
                          <p className="font-bold text-lg">{bulkPreview.sourceDeviceCount || 0}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={previewBulkRestore}
                      disabled={selectedDevicesForBulk.length === 0 || !restoreOptions.targetDeviceId || bulkRestoreLoading}
                      className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-xl font-medium transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                    >
                      {bulkRestoreLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : '📊'}
                      {t('chatHistoryArchive.previewRestore') || 'Preview Restore'}
                    </button>
                    <button
                      onClick={executeBulkRestore}
                      disabled={!bulkPreview || bulkRestoreLoading}
                      className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-xl font-medium transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                    >
                      {bulkRestoreLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : '🔄'}
                      {t('chatHistoryArchive.executeBulkRestore') || 'Execute Bulk Restore'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Browse Tab */}
            {activeTab === 'browse' && (
            <div className="flex-1 flex flex-col gap-4 min-h-0">
              {/* Restore Button */}
              {selectedDevice && activeDevices.length > 0 && (
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setShowRestoreModal(true);
                      previewRestore();
                    }}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center gap-2 transition-colors"
                  >
                    🔄 {t('chatHistoryArchive.restoreToDevice') || 'Restore to Active Device'}
                  </button>
                </div>
              )}
            {/* Device Selector */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('chatHistoryArchive.selectArchivedDevice') || 'Select Archived Device'}
              </label>
              <select
                value={selectedDevice?.id || ''}
                onChange={(e) => {
                  const device = archivedDevices.find(d => d.id === parseInt(e.target.value));
                  setSelectedDevice(device);
                  setSelectedConversation(null);
                  setMessages([]);
                }}
                className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {archivedDevices.map((device) => (
                  <option key={device.id} value={device.id}>
                    📱 {device.alias} ({device.realPhoneNumber || device.phoneNumber || 'No number'}) 
                    - {device.chatCount} chats, {device.messageCount} messages
                    - Archived: {new Date(device.archivedAt).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>

            {/* Chat Interface */}
            <div className={`flex-1 flex gap-4 min-h-0 ${isMobileMessageView ? 'flex-col' : ''}`}>
              {/* Conversation List */}
              <div className={`${isMobileMessageView && selectedConversation ? 'hidden md:block' : ''} w-full md:w-1/3 bg-white dark:bg-gray-800 rounded-xl shadow-sm flex flex-col min-h-0`}>
                {/* Search */}
                <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                  <input
                    type="text"
                    placeholder={t('chatHistoryArchive.searchConversations') || 'Search conversations...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                
                {/* Conversations */}
                <div className="flex-1 overflow-y-auto">
                  {conversations.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      {t('chatHistoryArchive.noConversations') || 'No conversations found'}
                    </div>
                  ) : (
                    conversations.map((conv) => (
                      <div
                        key={conv.id}
                        onClick={() => {
                          setSelectedConversation(conv);
                          setIsMobileMessageView(true);
                        }}
                        className={`p-3 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                          selectedConversation?.id === conv.id ? 'bg-green-50 dark:bg-green-900/20' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-semibold">
                            {conv.profilePictureUrl ? (
                              <img 
                                src={conv.profilePictureUrl} 
                                alt="" 
                                className="w-12 h-12 rounded-full object-cover"
                              />
                            ) : (
                              (conv.contactName || conv.phoneNumber || '?')[0].toUpperCase()
                            )}
                          </div>
                          
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="font-medium text-gray-800 dark:text-white truncate">
                                {conv.contactName || conv.phoneNumber || 'Unknown'}
                              </h3>
                              <span className="text-xs text-gray-400">
                                {formatTime(conv.lastMessageTimestamp)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {conv.lastMessageContent || 'No messages'}
                            </p>
                          </div>
                        </div>
                        
                        {/* Labels/Intent */}
                        <div className="flex items-center gap-1 mt-1 ml-15">
                          {conv.purchaseIntentStage && conv.purchaseIntentStage !== 'cold' && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              conv.purchaseIntentStage === 'hot' ? 'bg-red-100 text-red-700' :
                              conv.purchaseIntentStage === 'interested' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {conv.purchaseIntentStage}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Message Viewer */}
              <div className={`${isMobileMessageView && !selectedConversation ? 'hidden md:flex' : ''} flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm flex flex-col min-h-0`}>
                {selectedConversation ? (
                  <>
                    {/* Chat Header */}
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
                      {/* Back button for mobile */}
                      <button
                        onClick={() => {
                          setSelectedConversation(null);
                          setIsMobileMessageView(false);
                        }}
                        className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      >
                        ←
                      </button>
                      
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-semibold">
                        {(selectedConversation.contactName || selectedConversation.phoneNumber || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-800 dark:text-white">
                          {selectedConversation.contactName || selectedConversation.phoneNumber}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {selectedConversation.phoneNumber}
                        </p>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900/50">
                      {messagesLoading ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                          {t('chatHistoryArchive.noMessages') || 'No messages in this conversation'}
                        </div>
                      ) : (
                        <>
                          {messages.map(renderMessage)}
                          <div ref={messagesEndRef} />
                        </>
                      )}
                    </div>

                    {/* Footer note */}
                    <div className="p-2 text-center text-xs text-gray-400 border-t border-gray-200 dark:border-gray-700">
                      📦 {t('chatHistoryArchive.archivedConversation') || 'This is an archived conversation (read-only)'}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <div className="text-5xl mb-3">💬</div>
                      <p>{t('chatHistoryArchive.selectConversation') || 'Select a conversation to view messages'}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
            )}
          </>
        )}

        {/* Restore Modal */}
        {showRestoreModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  🔄 {t('chatHistoryArchive.restoreChatHistory') || 'Restore Chat History'}
                </h2>
                <button
                  onClick={() => {
                    setShowRestoreModal(false);
                    setRestorePreview(null);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 space-y-4">
                {/* Source Device */}
                <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('chatHistoryArchive.sourceDevice') || 'Source (Archived)'}
                  </p>
                  <p className="font-medium text-gray-800 dark:text-white">
                    📱 {selectedDevice?.alias} ({selectedDevice?.realPhoneNumber || selectedDevice?.phoneNumber})
                  </p>
                </div>

                {/* Target Device */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('chatHistoryArchive.targetDevice') || 'Target (Active Device)'}
                  </label>
                  <select
                    value={restoreOptions.targetDeviceId || ''}
                    onChange={(e) => {
                      setRestoreOptions(prev => ({ ...prev, targetDeviceId: parseInt(e.target.value) }));
                      // Re-preview when target changes
                      setTimeout(previewRestore, 100);
                    }}
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                  >
                    {activeDevices.map((device) => (
                      <option key={device.id} value={device.id}>
                        📱 {device.alias} ({device.realPhoneNumber || device.phoneNumber || 'No number'}) 
                        - {device.status}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Restore Options */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('chatHistoryArchive.restoreMode') || 'Restore Mode'}
                  </label>
                  
                  <label className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                    <input
                      type="radio"
                      name="restoreMode"
                      value="matching"
                      checked={restoreOptions.mode === 'matching'}
                      onChange={() => {
                        setRestoreOptions(prev => ({ ...prev, mode: 'matching' }));
                        setTimeout(previewRestore, 100);
                      }}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 dark:text-white">
                        {t('chatHistoryArchive.matchingPhoneNumbers') || 'Matching Phone Numbers Only'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t('chatHistoryArchive.matchingPhoneNumbersDesc') || 'Only restore chats where the same phone number exists in both devices'}
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                    <input
                      type="radio"
                      name="restoreMode"
                      value="all"
                      checked={restoreOptions.mode === 'all'}
                      onChange={() => {
                        setRestoreOptions(prev => ({ ...prev, mode: 'all' }));
                        setTimeout(previewRestore, 100);
                      }}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 dark:text-white">
                        {t('chatHistoryArchive.allConversations') || 'All Conversations'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t('chatHistoryArchive.allConversationsDesc') || 'Restore all chats - matching ones will be merged, new ones will be added'}
                      </p>
                    </div>
                  </label>

                  {/* Additional Options */}
                  <div className="space-y-2 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={restoreOptions.includeAIMemory}
                        onChange={(e) => setRestoreOptions(prev => ({ 
                          ...prev, 
                          includeAIMemory: e.target.checked 
                        }))}
                        className="rounded"
                      />
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                      {t('chatHistoryArchive.includeAIMemory') || 'Include AI Memory & Context'}
                    </label>
                    </label>
                    
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={restoreOptions.includeIntentScores}
                        onChange={(e) => setRestoreOptions(prev => ({ 
                          ...prev, 
                          includeIntentScores: e.target.checked 
                        }))}
                        className="rounded"
                      />
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                      {t('chatHistoryArchive.includeIntentScores') || 'Include Purchase Intent Scores'}
                    </label>
                    </label>
                  </div>
                </div>

                {/* Preview */}
                {restoreLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500 mr-2"></div>
                    {t('chatHistoryArchive.calculating') || 'Calculating...'}
                  </div>
                ) : restorePreview && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg space-y-2">
                    <h3 className="font-medium text-green-800 dark:text-green-300">
                      📊 {t('chatHistoryArchive.restorePreview') || 'Restore Preview'}
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-white dark:bg-gray-800 p-2 rounded">
                        <p className="text-gray-500">{t('chatHistoryArchive.willMerge') || 'Will Merge'}</p>
                        <p className="font-bold text-green-600">{restorePreview.stats?.matchingChats || 0} chats</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-2 rounded">
                        <p className="text-gray-500">{t('chatHistoryArchive.willAdd') || 'Will Add'}</p>
                        <p className="font-bold text-blue-600">{restorePreview.stats?.newChats || 0} chats</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-2 rounded">
                        <p className="text-gray-500">{t('chatHistoryArchive.totalMessages') || 'Total Messages'}</p>
                        <p className="font-bold">{restorePreview.stats?.totalMessages || 0}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-2 rounded">
                        <p className="text-gray-500">{t('chatHistoryArchive.skipped') || 'Skipped'}</p>
                        <p className="font-bold text-gray-400">{restorePreview.skipped?.length || 0}</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      ⚠️ {t('chatHistoryArchive.originalDataPreserved') || 'Original data in archived device will be preserved'}
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowRestoreModal(false);
                    setRestorePreview(null);
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  {t('modal.cancel') || 'Cancel'}
                </button>
                <button
                  onClick={executeRestore}
                  disabled={restoreLoading || !restorePreview}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  {restoreLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      {t('chatHistoryArchive.restoring') || 'Restoring...'}
                    </>
                  ) : (
                    <>🔄 {t('chatHistoryArchive.restoreNow') || 'Restore Now'}</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  );
};

export default ChatHistoryArchive;

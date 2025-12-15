import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings as SettingsIcon, 
  Plus, 
  Download, 
  Play, 
  Image as ImageIcon, 
  Type, 
  ArrowLeft,
  Sparkles,
  Save,
  Trash2,
  Home,
  PenTool,
  Folder as FolderIcon,
  FolderPlus,
  RefreshCw,
  LogOut,
  Clock,
  ThumbsUp,
  AlertCircle,
  Smile,
  MoreVertical,
  ArrowRightLeft,
  Volume2,
  User,
  Key,
  X,
  FileText,
  FileSpreadsheet,
  Printer,
  Heart
} from 'lucide-react';
import { Card, Settings, ViewState, Folder } from './types';
import { generateFlashcardsFromList } from './services/geminiService';
import DrawingCanvas from './components/DrawingCanvas';

// --- SRS Logic Constants ---
const REVIEW_INTERVALS = {
  AGAIN: 10, // 10 minutes
  HARD: 15,  // 15 minutes
  GOOD: 1440, // 1 day (minutes)
  EASY: 2880  // 2 days (minutes)
};

// --- Helper Functions ---
const detectLanguage = (text: string): string => {
  if (/[\u0E00-\u0E7F]/.test(text)) return 'th-TH'; // Thai
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return 'ja-JP'; // Japanese
  if (/[\uAC00-\uD7AF]/.test(text)) return 'ko-KR'; // Korean
  if (/[\u4E00-\u9FA5]/.test(text)) return 'zh-CN'; // Chinese
  return 'en-US'; // Default
};

const speakText = (text: string) => {
    if (!window.speechSynthesis) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const lang = detectLanguage(text);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;

    // Try to find a matching voice for better quality
    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find(v => v.lang.includes(lang.split('-')[0])); // fuzzy match 'th' in 'th-TH'
    if (matchingVoice) {
        utterance.voice = matchingVoice;
    }

    window.speechSynthesis.speak(utterance);
};

// Robust HTML cleaner for example sentences
const cleanHTML = (html: string) => {
    if (!html) return '';
    // 1. Unescape HTML entities that might be returned by AI
    let decoded = html
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
    
    // 2. Add styling to bold tags
    decoded = decoded.replace(/<b>/gi, '<b class="text-moe-primary">');
    decoded = decoded.replace(/<strong>/gi, '<b class="text-moe-primary">');
    
    return decoded;
};

// Helper to strip HTML for export
const stripHTML = (html: string) => {
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

const getGreeting = (name: string, dueCount: number) => {
  const hour = new Date().getHours();
  let timeGreeting = '';
  if (hour < 5) timeGreeting = '这么晚了还在努力吗？';
  else if (hour < 11) timeGreeting = '早安！今天也是充满希望的一天～';
  else if (hour < 14) timeGreeting = '午安，记得吃午饭哦！';
  else if (hour < 19) timeGreeting = '下午好！来复习几个单词提提神吧？';
  else timeGreeting = '晚上好，今天的任务完成了吗？';

  if (dueCount > 10) return `${timeGreeting} 我们积压了 ${dueCount} 个卡片，一起加油消灭它们吧！`;
  if (dueCount > 0) return `${timeGreeting} 只有 ${dueCount} 个卡片需要复习，很快就能搞定！`;
  return `${timeGreeting} 现在没有复习任务，去休息一下或者制作新卡片吧？`;
};

// --- Sub-components for Screens ---

const WelcomeScreen: React.FC<{ onComplete: (settings: Settings) => void }> = ({ onComplete }) => {
  const [apiKey, setApiKey] = useState('');
  const [name, setName] = useState('');
  const [provider, setProvider] = useState<'google' | 'siliconflow'>('google');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-moe-50 text-center relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-moe-200 rounded-full blur-3xl opacity-20"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-moe-500 rounded-full blur-3xl opacity-20"></div>

      <div className="w-full max-w-md bg-white/80 backdrop-blur-md p-8 rounded-5xl shadow-xl shadow-moe-100 mb-8 border border-white z-10">
        <div className="w-24 h-24 bg-moe-100 rounded-full mx-auto mb-6 flex items-center justify-center text-4xl shadow-inner ring-4 ring-white">
          🐱
        </div>
        <h1 className="text-2xl font-bold text-moe-text mb-2">欢迎回家!</h1>
        <p className="text-gray-400 mb-8 text-sm">我是你的学习伴侣，让我们一起搭建温馨的学习角落吧。</p>

        <div className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 ml-2">怎么称呼你呢？</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：Momo"
              className="w-full bg-moe-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-moe-200 outline-none text-moe-text placeholder-gray-300 transition-all"
            />
          </div>

          <div>
             <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 ml-2">AI 能量来源</label>
             <div className="flex gap-2">
               <button 
                onClick={() => setProvider('google')}
                className={`flex-1 py-3 rounded-2xl text-sm font-semibold transition-all ${provider === 'google' ? 'bg-moe-primary text-white shadow-md transform scale-105' : 'bg-moe-50 text-gray-400 hover:bg-moe-100'}`}
               >
                 Google Gemini
               </button>
               <button 
                onClick={() => setProvider('siliconflow')}
                className={`flex-1 py-3 rounded-2xl text-sm font-semibold transition-all ${provider === 'siliconflow' ? 'bg-moe-primary text-white shadow-md transform scale-105' : 'bg-moe-50 text-gray-400 hover:bg-moe-100'}`}
               >
                 硅基流动
               </button>
             </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 ml-2">API Key</label>
            <input 
              type="password" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="在此输入你的 Key..."
              className="w-full bg-moe-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-moe-200 outline-none text-moe-text placeholder-gray-300 transition-all"
            />
            <a 
              href={provider === 'google' ? "https://aistudio.google.com/app/apikey" : "https://siliconflow.cn"} 
              target="_blank" 
              rel="noreferrer"
              className="block text-xs text-moe-primary mt-2 ml-2 hover:underline flex items-center gap-1"
            >
              <Key size={12}/> 点击获取 {provider === 'google' ? 'Gemini' : 'SiliconFlow'} Key →
            </a>
          </div>
        </div>

        <button 
          disabled={!apiKey || !name}
          onClick={() => onComplete({ apiKey, provider, userName: name })}
          className="w-full mt-8 bg-moe-text text-white font-bold py-4 rounded-3xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
        >
          开始旅程
        </button>
      </div>
    </div>
  );
};

const SettingsScreen: React.FC<{
  settings: Settings;
  stats: { total: number; learned: number; due: number };
  onUpdateSettings: (s: Settings) => void;
  onBack: () => void;
}> = ({ settings, stats, onUpdateSettings, onBack }) => {
  const [name, setName] = useState(settings.userName);
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [provider, setProvider] = useState(settings.provider);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    onUpdateSettings({ ...settings, userName: name, apiKey, provider });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="p-4 flex items-center gap-4 border-b border-gray-100 bg-white z-10">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100">
          <X size={24} className="text-moe-text" />
        </button>
        <h2 className="text-xl font-bold text-moe-text">设置 & 统计</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Stats Section */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-moe-50 p-4 rounded-3xl flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-bold text-moe-text">{stats.total}</span>
            <span className="text-xs text-gray-400 mt-1 font-bold">总卡片</span>
          </div>
          <div className="bg-[#e2f0cb] p-4 rounded-3xl flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-bold text-green-600">{stats.learned}</span>
            <span className="text-xs text-green-600/70 mt-1 font-bold">已掌握</span>
          </div>
          <div className="bg-[#ffe4e1] p-4 rounded-3xl flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-bold text-moe-primary">{stats.due}</span>
            <span className="text-xs text-moe-primary/70 mt-1 font-bold">待复习</span>
          </div>
        </div>

        {/* Profile Section */}
        <div className="space-y-4">
          <h3 className="font-bold text-moe-text text-lg flex items-center gap-2">
              <User size={20} className="text-moe-primary"/> 个人信息
          </h3>
          <div className="bg-moe-50/50 p-4 rounded-2xl">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">昵称</label>
            <input 
              value={name} 
              onChange={e => setName(e.target.value)} 
              className="w-full bg-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-moe-200 border border-gray-100"
            />
          </div>
        </div>

        {/* AI Settings Section */}
        <div className="space-y-4">
          <h3 className="font-bold text-moe-text text-lg flex items-center gap-2">
              <Key size={20} className="text-moe-primary"/> AI 设置
          </h3>
          <div className="bg-moe-50/50 p-4 rounded-2xl space-y-4">
             <div>
                 <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">AI 提供商</label>
                 <div className="flex gap-2">
                   <button onClick={() => setProvider('google')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${provider === 'google' ? 'border-moe-primary bg-white text-moe-primary shadow-sm' : 'border-transparent bg-gray-100 text-gray-400'}`}>Google</button>
                   <button onClick={() => setProvider('siliconflow')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${provider === 'siliconflow' ? 'border-moe-primary bg-white text-moe-primary shadow-sm' : 'border-transparent bg-gray-100 text-gray-400'}`}>SiliconFlow</button>
                 </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">API Key</label>
                <input 
                  type="password"
                  value={apiKey} 
                  onChange={e => setApiKey(e.target.value)} 
                  className="w-full bg-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-moe-200 border border-gray-100"
                  placeholder="sk-..."
                />
              </div>
          </div>
        </div>
      </div>

      <div className="p-6 border-t border-gray-100">
        <button 
          onClick={handleSave}
          className="w-full bg-moe-text text-white font-bold py-4 rounded-3xl hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          {isSaved ? <span className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2"><ThumbsUp size={20}/> 已保存</span> : "保存修改"}
        </button>
      </div>
    </div>
  );
};

const HomeScreen: React.FC<{ 
  user: string, 
  totalCards: number,
  dueCount: number,
  folders: Folder[],
  currentFolderId: string,
  onSwitchFolder: (id: string) => void,
  onCreateFolder: (name: string) => void,
  onNavigate: (view: ViewState) => void,
  onOpenSettings: () => void
}> = ({ user, totalCards, dueCount, folders, currentFolderId, onSwitchFolder, onCreateFolder, onNavigate, onOpenSettings }) => {
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  
  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName('');
      setIsCreatingFolder(false);
    }
  };

  const currentFolderName = folders.find(f => f.id === currentFolderId)?.name || '未知';

  return (
    <div className="h-full overflow-y-auto no-scrollbar pb-6">
      <div className="p-6 pt-12 md:p-12 md:max-w-7xl md:mx-auto md:min-h-[90vh] md:flex md:flex-col md:justify-center">
        
        {/* Header - Always visible */}
        <div className="flex justify-between items-start mb-6">
           {/* Mascot Dialogue Area */}
          <div className="flex items-start gap-4 flex-1">
             <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-md text-3xl flex-shrink-0 border-2 border-moe-50 z-10 relative">
                🐱
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 border-2 border-white rounded-full"></div>
             </div>
             <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-moe-50 relative -mt-2 animate-in fade-in slide-in-from-left-2 duration-500">
                <h1 className="text-lg font-bold text-moe-text mb-1">嗨, {user}!</h1>
                <p className="text-gray-500 text-sm leading-relaxed">
                   {getGreeting(user, dueCount)}
                </p>
             </div>
          </div>
          <button 
            onClick={onOpenSettings} 
            className="p-3 bg-white rounded-2xl shadow-sm text-gray-400 hover:text-moe-primary transition-colors hover:rotate-90 duration-300"
          >
            <SettingsIcon size={24} />
          </button>
        </div>

        <div className="flex flex-col md:flex-row md:items-stretch md:gap-8">
          
          {/* Left Column (Tablet): Stats & Folders */}
          <div className="w-full md:w-5/12 space-y-6 flex flex-col">
            {/* Folder List */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              {folders.map(folder => (
                <button
                  key={folder.id}
                  onClick={() => onSwitchFolder(folder.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                    currentFolderId === folder.id 
                      ? 'bg-moe-text text-white shadow-md transform -translate-y-0.5' 
                      : 'bg-white text-gray-400 hover:bg-gray-50'
                  }`}
                >
                  {folder.name}
                </button>
              ))}
              <button 
                onClick={() => setIsCreatingFolder(true)}
                className="flex-shrink-0 px-3 py-2 rounded-xl bg-moe-100 text-moe-primary hover:bg-moe-200 transition-colors"
              >
                <FolderPlus size={18} />
              </button>
            </div>

            {/* Stats Card */}
            <div 
              onClick={() => onNavigate(ViewState.FOLDER_DETAIL)}
              className="bg-white p-6 md:p-8 rounded-4xl shadow-xl shadow-moe-100/50 relative overflow-hidden group cursor-pointer active:scale-95 transition-all flex-1 flex flex-col justify-end border border-white hover:border-moe-100"
            >
              <div className="absolute -right-4 -top-4 w-32 h-32 bg-moe-50 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
              <div className="absolute right-10 top-10 text-moe-100 opacity-20 group-hover:opacity-40 transition-opacity">
                  <FolderIcon size={80} />
              </div>

              <div className="relative z-10 flex justify-between items-end">
                <div>
                  <p className="text-gray-400 text-xs md:text-sm font-bold uppercase tracking-wide mb-2 flex items-center gap-2">
                    <FolderIcon size={14} className="text-moe-primary"/>
                    {currentFolderName}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl md:text-7xl font-bold text-moe-text">{dueCount}</span>
                    <span className="text-gray-400 md:text-lg font-medium">/ {totalCards} 张</span>
                  </div>
                  <div className="mt-2 text-xs text-moe-primary font-bold bg-moe-50 inline-block px-2 py-1 rounded-lg">
                      点击管理卡片
                  </div>
                </div>
                {dueCount === 0 && (
                  <div className="text-4xl md:text-6xl animate-bounce">🎉</div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column (Tablet): Action Grid */}
          <div className="w-full md:w-7/12 mt-6 md:mt-0 flex flex-col h-full">
             <div className="grid grid-cols-2 gap-4 h-full md:flex-1">
                <button 
                  onClick={() => setShowCreateMenu(true)}
                  className="aspect-square md:aspect-auto md:h-auto bg-[#ffe4e1] rounded-4xl p-4 flex flex-col items-center justify-center gap-3 text-moe-text hover:shadow-lg transition-all active:scale-95 group relative overflow-hidden"
                >
                   <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                  <div className="w-14 h-14 bg-white/60 rounded-2xl flex items-center justify-center shadow-sm relative z-10 group-hover:scale-110 transition-transform">
                    <Plus size={28} className="text-[#ff9a9e]"/>
                  </div>
                  <span className="font-bold md:text-lg relative z-10">新建闪卡</span>
                </button>

                <button 
                  onClick={() => onNavigate(ViewState.IMPORT)}
                  className="aspect-square md:aspect-auto md:h-auto bg-[#e2f0cb] rounded-4xl p-4 flex flex-col items-center justify-center gap-3 text-moe-text hover:shadow-lg transition-all active:scale-95 group relative overflow-hidden"
                >
                   <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                  <div className="w-14 h-14 bg-white/60 rounded-2xl flex items-center justify-center shadow-sm relative z-10 group-hover:scale-110 transition-transform">
                    <Sparkles size={28} className="text-[#88d8b0]"/>
                  </div>
                  <span className="font-bold md:text-lg relative z-10">AI 导入</span>
                </button>

                <button 
                  onClick={() => onNavigate(ViewState.REVIEW)}
                  className="col-span-2 bg-[#c7ceea] rounded-4xl p-6 flex items-center justify-between text-moe-text hover:shadow-lg transition-all active:scale-95 md:h-auto md:flex-1 group relative overflow-hidden"
                >
                   <div className="absolute inset-0 bg-white/20 translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
                  <div className="flex flex-col text-left justify-center h-full relative z-10">
                    <span className="font-bold text-xl md:text-2xl mb-1">开始复习</span>
                    <span className="text-sm opacity-70 md:text-base">
                        {dueCount > 0 ? `还有 ${dueCount} 个单词等着你哦` : "复习完成！要再来一组吗？"}
                    </span>
                  </div>
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-white/60 rounded-full flex items-center justify-center shadow-sm relative z-10 group-hover:rotate-12 transition-transform">
                    <Play size={32} className="md:w-10 md:h-10 text-[#96a5d9] ml-1" fill="currentColor" />
                  </div>
                </button>
            </div>
          </div>

        </div>
      </div>

      {/* Modal for Create Selection */}
      {showCreateMenu && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in fade-in duration-200">
          <div className="bg-white p-6 rounded-4xl shadow-2xl w-3/4 max-w-sm border border-moe-100">
            <h3 className="text-xl font-bold text-center mb-6 text-moe-text">你想怎么制作卡片？</h3>
            <div className="space-y-4">
              <button 
                onClick={() => { setShowCreateMenu(false); onNavigate(ViewState.CREATE); }} 
                className="w-full bg-moe-50 hover:bg-moe-100 p-4 rounded-3xl flex items-center gap-4 transition-colors group"
              >
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-moe-primary shadow-sm group-hover:scale-110 transition-transform">
                  <Type size={24} />
                </div>
                <div className="text-left">
                  <div className="font-bold text-moe-text text-lg">文本卡片</div>
                  <div className="text-xs text-gray-400">经典的文字和定义</div>
                </div>
              </button>

              <button 
                onClick={() => { setShowCreateMenu(false); onNavigate(ViewState.CREATE + '_DRAW'); }}
                className="w-full bg-moe-50 hover:bg-moe-100 p-4 rounded-3xl flex items-center gap-4 transition-colors group"
              >
                 <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-moe-primary shadow-sm group-hover:scale-110 transition-transform">
                  <PenTool size={24} />
                </div>
                <div className="text-left">
                  <div className="font-bold text-moe-text text-lg">手写卡片</div>
                  <div className="text-xs text-gray-400">自由涂鸦和绘图</div>
                </div>
              </button>

               <button 
                onClick={() => setShowCreateMenu(false)}
                className="w-full mt-4 py-3 rounded-2xl text-gray-400 text-sm font-bold hover:bg-gray-50"
              >
                还是算了吧
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for New Folder */}
      {isCreatingFolder && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in fade-in duration-200">
          <div className="bg-white p-6 rounded-3xl shadow-2xl w-3/4 max-w-sm">
            <h3 className="text-lg font-bold mb-4 text-moe-text">新建文件夹</h3>
            <input 
              autoFocus
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              placeholder="例如：英语单词"
              className="w-full bg-moe-50 rounded-xl px-4 py-3 mb-4 outline-none focus:ring-2 focus:ring-moe-primary"
            />
            <div className="flex gap-2">
              <button onClick={() => setIsCreatingFolder(false)} className="flex-1 py-3 text-gray-400 font-bold hover:bg-gray-50 rounded-xl">取消</button>
              <button onClick={handleCreateFolder} className="flex-1 py-3 bg-moe-text text-white rounded-xl font-bold shadow-md">创建</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const FolderDetailScreen: React.FC<{
    folder: Folder,
    allFolders: Folder[],
    cards: Card[],
    onBack: () => void,
    onDeleteCard: (id: string) => void,
    onMoveCard: (id: string, folderId: string) => void
}> = ({ folder, allFolders, cards, onBack, onDeleteCard, onMoveCard }) => {
    const [movingCardId, setMovingCardId] = useState<string | null>(null);
    const [showExport, setShowExport] = useState(false);

    // Parse logic for structured export
    const parseCardContent = (card: Card) => {
      let word = card.frontType === 'text' ? card.frontContent : '[Image]';
      let phonetic = card.phonetic || '';
      let meaning = '';
      let example = '';
      let translation = '';

      if (card.backType === 'text') {
        const content = card.backContent;
        // Attempt to extract using known delimiters from import
        // Format: Back\n\n例句: Example\n(Translation)
        const parts = content.split('\n\n例句: ');
        if (parts.length > 1) {
           meaning = stripHTML(parts[0]);
           const examplePart = parts[1];
           const exParts = examplePart.split('\n(');
           if (exParts.length > 1) {
             example = stripHTML(exParts[0]);
             translation = exParts[1].replace(')', '');
           } else {
             example = stripHTML(examplePart);
           }
        } else {
           meaning = stripHTML(content);
        }
      } else {
        meaning = '[Image]';
      }

      return { word, phonetic, meaning, example, translation };
    };

    const handleExport = (format: 'txt' | 'csv' | 'pdf') => {
      if (cards.length === 0) return;
      const data = cards.map(parseCardContent);
      
      if (format === 'csv') {
        const header = "\uFEFFWord,Phonetic,Meaning,Example,Example Translation\n";
        const rows = data.map(d => 
          `"${d.word.replace(/"/g, '""')}","${d.phonetic.replace(/"/g, '""')}","${d.meaning.replace(/"/g, '""')}","${d.example.replace(/"/g, '""')}","${d.translation.replace(/"/g, '""')}"`
        ).join('\n');
        const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `moe_cards_${folder.name}.csv`;
        link.click();
      } else if (format === 'txt') {
        // Tab separated for generic use or Anki
        const rows = data.map(d => `${d.word}\t${d.phonetic}\t${d.meaning}\t${d.example}\t${d.translation}`).join('\n');
        const blob = new Blob([rows], { type: 'text/plain;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `moe_cards_${folder.name}.txt`;
        link.click();
      } else if (format === 'pdf') {
        // Use window.print() approach
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          const rowsHtml = data.map(d => `
            <div class="card">
              <div class="word-row">
                <span class="word">${d.word}</span>
                <span class="phonetic">${d.phonetic}</span>
              </div>
              <div class="meaning">${d.meaning}</div>
              <div class="example">
                <div class="en">${d.example}</div>
                <div class="cn">${d.translation}</div>
              </div>
            </div>
          `).join('');

          printWindow.document.write(`
            <html>
              <head>
                <title>Export - ${folder.name}</title>
                <style>
                  @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@500;700&family=Noto+Sans+SC:wght@400;700&display=swap');
                  body { font-family: 'Quicksand', 'Noto Sans SC', sans-serif; padding: 20px; color: #4a4a4a; }
                  h1 { text-align: center; color: #ff9a9e; margin-bottom: 30px; }
                  .card { border: 1px solid #ffe4e1; padding: 15px; border-radius: 12px; margin-bottom: 15px; page-break-inside: avoid; background: #fffafb; }
                  .word-row { display: flex; align-items: baseline; gap: 10px; margin-bottom: 5px; }
                  .word { font-size: 1.5em; font-weight: bold; color: #ff9a9e; }
                  .phonetic { font-family: monospace; color: #888; font-size: 0.9em; }
                  .meaning { font-weight: bold; margin-bottom: 8px; }
                  .example { font-size: 0.9em; color: #666; background: #fff; padding: 8px; border-radius: 8px; }
                  .example .cn { color: #999; font-size: 0.85em; margin-top: 2px; }
                  @media print { .no-print { display: none; } body { background: white; } }
                </style>
              </head>
              <body>
                <h1>${folder.name}</h1>
                ${rowsHtml}
                <script>window.print();</script>
              </body>
            </html>
          `);
          printWindow.document.close();
        }
      }
      setShowExport(false);
    };

    return (
        <div className="flex flex-col h-full bg-white relative">
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-gray-100 bg-white z-10">
                <div className="flex items-center gap-4">
                  <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100">
                      <ArrowLeft size={24} className="text-moe-text" />
                  </button>
                  <div>
                      <h2 className="text-xl font-bold text-moe-text">{folder.name}</h2>
                      <p className="text-xs text-gray-400">{cards.length} 张卡片</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowExport(true)}
                  className="px-4 py-2 bg-moe-50 text-moe-primary rounded-xl font-bold text-sm hover:bg-moe-100 flex items-center gap-2"
                >
                  <Download size={16} /> 导出
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {cards.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <div className="text-4xl mb-2">📦</div>
                        <p>这个文件夹是空的</p>
                    </div>
                ) : (
                    cards.map(card => (
                        <div key={card.id} className="bg-moe-50 rounded-2xl p-4 flex items-center justify-between group">
                            <div className="flex-1 min-w-0 pr-4">
                                <div className="font-bold text-moe-text truncate">
                                    {card.frontType === 'image' ? '[图片]' : card.frontContent}
                                </div>
                                <div className="text-sm text-gray-500 truncate mt-1">
                                    {card.backType === 'image' ? '[图片]' : stripHTML(card.backContent)}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setMovingCardId(card.id)}
                                    className="p-2 bg-white rounded-xl text-moe-primary shadow-sm hover:bg-moe-100"
                                >
                                    <ArrowRightLeft size={16} />
                                </button>
                                <button 
                                    onClick={() => {
                                        if(window.confirm('确定要删除这张卡片吗？')) onDeleteCard(card.id);
                                    }}
                                    className="p-2 bg-white rounded-xl text-red-400 shadow-sm hover:bg-red-50"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Export Modal */}
            {showExport && (
              <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in fade-in duration-200">
                  <div className="bg-white p-6 rounded-3xl shadow-2xl w-3/4 max-w-sm">
                      <h3 className="text-lg font-bold mb-6 text-moe-text text-center">选择导出格式</h3>
                      <div className="space-y-3">
                        <button onClick={() => handleExport('txt')} className="w-full p-4 rounded-2xl bg-moe-50 hover:bg-moe-100 flex items-center gap-3 transition-colors">
                          <div className="bg-white p-2 rounded-lg text-moe-primary"><FileText size={20}/></div>
                          <div className="text-left"><div className="font-bold text-moe-text">TXT 文本</div><div className="text-xs text-gray-400">适合 Anki 导入</div></div>
                        </button>
                        <button onClick={() => handleExport('csv')} className="w-full p-4 rounded-2xl bg-moe-50 hover:bg-moe-100 flex items-center gap-3 transition-colors">
                          <div className="bg-white p-2 rounded-lg text-green-500"><FileSpreadsheet size={20}/></div>
                          <div className="text-left"><div className="font-bold text-moe-text">CSV 表格</div><div className="text-xs text-gray-400">适合 Excel 编辑</div></div>
                        </button>
                        <button onClick={() => handleExport('pdf')} className="w-full p-4 rounded-2xl bg-moe-50 hover:bg-moe-100 flex items-center gap-3 transition-colors">
                          <div className="bg-white p-2 rounded-lg text-red-400"><Printer size={20}/></div>
                          <div className="text-left"><div className="font-bold text-moe-text">PDF 打印</div><div className="text-xs text-gray-400">精美排版，适合阅读</div></div>
                        </button>
                      </div>
                      <button onClick={() => setShowExport(false)} className="w-full mt-6 py-3 text-gray-400 font-bold hover:bg-gray-50 rounded-xl">取消</button>
                  </div>
              </div>
            )}

            {/* Move Modal */}
            {movingCardId && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in fade-in duration-200">
                    <div className="bg-white p-6 rounded-3xl shadow-2xl w-3/4 max-w-sm">
                        <h3 className="text-lg font-bold mb-4 text-moe-text">移动到文件夹</h3>
                        <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
                            {allFolders.map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => {
                                        onMoveCard(movingCardId, f.id);
                                        setMovingCardId(null);
                                    }}
                                    className={`w-full p-3 rounded-xl text-left font-bold text-sm ${f.id === folder.id ? 'bg-moe-text text-white' : 'bg-moe-50 text-moe-text hover:bg-moe-100'}`}
                                >
                                    {f.name}
                                </button>
                            ))}
                        </div>
                        <button 
                            onClick={() => setMovingCardId(null)}
                            className="w-full py-3 text-gray-400 font-bold hover:bg-gray-50 rounded-xl"
                        >
                            取消
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const CreateCardScreen: React.FC<{ 
  initialMode: 'text' | 'image',
  folders: Folder[],
  initialFolderId: string,
  onBack: () => void, 
  onSave: (card: Omit<Card, 'id' | 'createdAt' | 'nextReviewTime' | 'interval' | 'repetition' | 'easeFactor'>) => void 
}> = ({ initialMode, folders, initialFolderId, onBack, onSave }) => {
  const [frontType, setFrontType] = useState<'text' | 'image'>(initialMode);
  const [backType, setBackType] = useState<'text' | 'image'>(initialMode);
  const [frontContent, setFrontContent] = useState('');
  const [backContent, setBackContent] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState(initialFolderId);
  const [canvasVersion, setCanvasVersion] = useState(0);

  const handleSave = () => {
    if (!frontContent.trim() || !backContent.trim()) {
      alert("请填写卡片的正面和背面哦！");
      return;
    }
    onSave({
      frontType,
      frontContent,
      backType,
      backContent,
      folderId: selectedFolderId,
      tags: []
    });
    setFrontContent('');
    setBackContent('');
    setCanvasVersion(v => v + 1);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 flex items-center gap-4 border-b border-gray-100">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft size={24} className="text-moe-text" />
        </button>
        <h2 className="text-xl font-bold text-moe-text">制作新卡片</h2>
      </div>

      <div className="px-6 pt-4">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1 block">保存到文件夹</label>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {folders.map(f => (
            <button
              key={f.id}
              onClick={() => setSelectedFolderId(f.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-colors ${selectedFolderId === f.id ? 'bg-moe-100 border-moe-primary text-moe-text' : 'border-gray-200 text-gray-400 hover:border-moe-200'}`}
            >
              {f.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-gray-400 uppercase tracking-wide">正面 (问题)</span>
            <div className="bg-moe-50 p-1 rounded-lg flex gap-1">
              <button onClick={() => setFrontType('text')} className={`p-1.5 rounded-md transition-all ${frontType === 'text' ? 'bg-white shadow-sm text-moe-primary' : 'text-gray-400'}`}><Type size={16} /></button>
              <button onClick={() => setFrontType('image')} className={`p-1.5 rounded-md transition-all ${frontType === 'image' ? 'bg-white shadow-sm text-moe-primary' : 'text-gray-400'}`}><ImageIcon size={16} /></button>
            </div>
          </div>
          <div className="min-h-[150px]">
            {frontType === 'text' ? (
              <textarea value={frontContent} onChange={(e) => setFrontContent(e.target.value)} placeholder="请输入问题..." className="w-full h-40 bg-moe-50 rounded-3xl p-6 border-none outline-none focus:ring-2 focus:ring-moe-200 resize-none text-lg text-center flex flex-col justify-center placeholder-gray-300" />
            ) : (
              <DrawingCanvas key={`front-${canvasVersion}`} onSave={setFrontContent} />
            )}
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-gray-400 uppercase tracking-wide">背面 (答案)</span>
            <div className="bg-moe-50 p-1 rounded-lg flex gap-1">
              <button onClick={() => setBackType('text')} className={`p-1.5 rounded-md transition-all ${backType === 'text' ? 'bg-white shadow-sm text-moe-primary' : 'text-gray-400'}`}><Type size={16} /></button>
              <button onClick={() => setBackType('image')} className={`p-1.5 rounded-md transition-all ${backType === 'image' ? 'bg-white shadow-sm text-moe-primary' : 'text-gray-400'}`}><ImageIcon size={16} /></button>
            </div>
          </div>
          <div className="min-h-[150px]">
             {backType === 'text' ? (
              <textarea value={backContent} onChange={(e) => setBackContent(e.target.value)} placeholder="请输入答案..." className="w-full h-40 bg-moe-50 rounded-3xl p-6 border-none outline-none focus:ring-2 focus:ring-moe-200 resize-none text-lg text-center placeholder-gray-300" />
            ) : (
              <DrawingCanvas key={`back-${canvasVersion}`} onSave={setBackContent} />
            )}
          </div>
        </div>
      </div>

      <div className="p-6 border-t border-gray-100">
        <button 
          onClick={handleSave}
          disabled={!frontContent || !backContent}
          className="w-full bg-moe-text text-white font-bold py-4 rounded-3xl hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          <Save size={20} />
          保存 & 下一张
        </button>
      </div>
    </div>
  );
};

const ImportScreen: React.FC<{ 
  apiKey: string,
  folders: Folder[],
  initialFolderId: string,
  onBack: () => void, 
  onSaveBatch: (cards: Omit<Card, 'id' | 'createdAt' | 'nextReviewTime' | 'interval' | 'repetition' | 'easeFactor'>[]) => void 
}> = ({ apiKey, folders, initialFolderId, onBack, onSaveBatch }) => {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [previewCards, setPreviewCards] = useState<any[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState(initialFolderId);

  const handleAIProcess = async () => {
    if (!inputText.trim()) return;
    setIsLoading(true);
    const words = inputText.split(/[\n,]+/).map(w => w.trim()).filter(w => w.length > 0);
    try {
      const results = await generateFlashcardsFromList(apiKey, words);
      setPreviewCards(results);
    } catch (error) {
      alert("AI 出错了: " + error);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmImport = () => {
    const cards = previewCards.map(p => ({
      frontType: 'text' as const,
      frontContent: p.front,
      backType: 'text' as const,
      // We will render backContent as HTML in review mode
      backContent: `${p.back}\n\n例句: ${p.example}\n(${p.exampleTranslation})`,
      phonetic: p.phonetic,
      folderId: selectedFolderId,
      tags: ['imported']
    }));
    onSaveBatch(cards);
    onBack();
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 flex items-center gap-4 border-b border-gray-100">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft size={24} className="text-moe-text" />
        </button>
        <h2 className="text-xl font-bold text-moe-text">AI 批量导入</h2>
      </div>

      <div className="px-6 pt-4">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1 block">保存到文件夹</label>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {folders.map(f => (
            <button key={f.id} onClick={() => setSelectedFolderId(f.id)} className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${selectedFolderId === f.id ? 'bg-moe-100 border-moe-primary text-moe-text' : 'border-gray-200 text-gray-400'}`}>{f.name}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {!previewCards.length ? (
          <>
            <p className="text-gray-500 mb-4 text-sm leading-relaxed bg-moe-50 p-4 rounded-2xl">
              🐱 <span className="font-bold text-moe-primary">小贴士：</span> 输入你想学习的单词列表（用逗号或换行分隔）。
              AI 助手会自动翻译并生成可爱的例句！🌸
            </p>
            <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="例如：Apple, Sky, Happiness" className="w-full h-64 bg-white border border-moe-200 rounded-3xl p-6 outline-none focus:ring-2 focus:ring-moe-200 resize-none text-lg shadow-sm" />
          </>
        ) : (
          <div className="space-y-4">
            <h3 className="font-bold text-moe-text">预览 ({previewCards.length})</h3>
            {previewCards.map((card, idx) => (
              <div key={idx} className="bg-moe-50 p-4 rounded-2xl border border-white shadow-sm">
                <div className="flex justify-between">
                    <div className="font-bold text-moe-primary text-lg">{card.front}</div>
                    <div className="text-gray-400 font-mono text-sm bg-white px-2 py-1 rounded">{card.phonetic}</div>
                </div>
                <div className="text-gray-600 mt-1">{card.back}</div>
                <div className="text-xs text-gray-400 mt-2 italic" dangerouslySetInnerHTML={{ __html: cleanHTML(card.example) }} />
                <div className="text-xs text-gray-400">{card.exampleTranslation}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-6 border-t border-gray-100">
        {!previewCards.length ? (
          <button onClick={handleAIProcess} disabled={isLoading || !inputText} className="w-full bg-moe-primary text-white font-bold py-4 rounded-3xl hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2 active:scale-95">
            {isLoading ? <span className="animate-pulse">思考中...</span> : <><Sparkles size={20} /> 施展魔法</>}
          </button>
        ) : (
           <div className="flex gap-4">
             <button onClick={() => setPreviewCards([])} className="flex-1 bg-gray-100 text-gray-500 font-bold py-4 rounded-3xl hover:bg-gray-200">重置</button>
             <button onClick={confirmImport} className="flex-2 w-full bg-moe-text text-white font-bold py-4 rounded-3xl hover:shadow-lg transition-all active:scale-95">全部添加</button>
           </div>
        )}
      </div>
    </div>
  );
};

const ReviewScreen: React.FC<{ 
    cards: Card[], 
    onBack: () => void,
    onReviewResult: (cardId: string, rating: 'again' | 'hard' | 'good' | 'easy' | 'delete') => void
}> = ({ cards, onBack, onReviewResult }) => {
  // Use a local queue to maintain stability while the parent state updates
  // Initialize ONLY once with the props passed in.
  const [reviewQueue, setReviewQueue] = useState<Card[]>(cards);
  
  const [isFlipped, setIsFlipped] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  
  const isFinished = reviewQueue.length === 0;
  const currentCard = reviewQueue[0];

  // Auto-play audio when card appears
  useEffect(() => {
    if (currentCard && currentCard.frontType === 'text' && !isFinished) {
        // Add a small delay to ensure the page turn animation doesn't glitch with audio start
        const timer = setTimeout(() => {
            speakText(currentCard.frontContent);
        }, 500);
        return () => clearTimeout(timer);
    }
  }, [currentCard, isFinished]);

  if (cards.length === 0 && reviewQueue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center animate-in fade-in">
        <div className="text-6xl mb-4">✨</div>
        <h2 className="text-xl font-bold text-moe-text mb-2">全部完成!</h2>
        <p className="text-gray-400 mb-6">现在没有需要复习的卡片了。</p>
        <button onClick={onBack} className="px-6 py-3 bg-moe-200 text-white rounded-2xl font-bold">返回主页</button>
      </div>
    );
  }

  if (isFinished) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center animate-in fade-in zoom-in bg-moe-50">
          <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center text-6xl mb-6 shadow-sm border-4 border-moe-200">
             🎉
          </div>
          <h2 className="text-2xl font-bold text-moe-text mb-2">本次复习完成!</h2>
          <p className="text-gray-400 mb-8">你真棒！休息一下吧。</p>
          <button 
            onClick={onBack} 
            className="w-full max-w-xs py-4 bg-moe-text text-white rounded-3xl font-bold shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
              <LogOut size={20} />
              返回主页
          </button>
        </div>
      );
  }

  if (!currentCard) return null;

  const handleRate = (rating: 'again' | 'hard' | 'good' | 'easy' | 'delete') => {
    if (rating === 'again' || rating === 'delete') setSwipeDirection('left');
    else setSwipeDirection('right');

    setTimeout(() => {
        // 1. Notify Parent to update global storage
        onReviewResult(currentCard.id, rating);
        
        // 2. Remove from LOCAL queue immediately so we see the next card
        setReviewQueue(prev => prev.slice(1));

        // 3. Reset visual state
        setIsFlipped(false);
        setSwipeDirection(null);
    }, 300);
  };

  const getTimeLabel = (rating: 'again' | 'hard' | 'good' | 'easy') => {
      if (currentCard.repetition === 0) {
          if (rating === 'again') return '10分';
          if (rating === 'hard') return '15分';
          if (rating === 'good') return '1天';
          return '2天';
      } else {
          const current = currentCard.interval;
          if (rating === 'again') return '10分';
          if (rating === 'hard') return Math.round(current * 1.2 / 1440 * 10)/10 + '天'; 
          if (rating === 'good') return Math.round(current * 2.5 / 1440 * 10)/10 + '天';
          return Math.round(current * 4 / 1440 * 10)/10 + '天';
      }
  };

  return (
    <div className="flex flex-col h-full bg-moe-50 relative overflow-hidden">
       {/* Background decorative elements */}
       <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-white to-transparent opacity-50 z-0"></div>

       <div className="p-4 flex items-center justify-between z-10 relative">
        <button onClick={onBack} className="p-2 rounded-full bg-white/50 hover:bg-white backdrop-blur-sm">
          <ArrowLeft size={24} className="text-moe-text" />
        </button>
        <div className="flex items-center gap-2 bg-white/60 backdrop-blur-md px-4 py-2 rounded-full shadow-sm">
             <span className="text-xl">🐱</span>
             <span className="text-xs text-moe-text font-bold">加油！还有 {reviewQueue.length} 张</span>
        </div>
        <button 
           onClick={() => handleRate('delete')}
           className="p-2 rounded-full bg-white text-gray-400 hover:text-red-400 shadow-sm"
        >
            <Trash2 size={20} />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 perspective-1000 z-10">
        <div 
          onClick={() => !swipeDirection && setIsFlipped(!isFlipped)}
          className={`w-full max-w-sm aspect-[3/4] relative cursor-pointer group card-transition transform-style-3d ${isFlipped ? 'rotate-y-180' : ''} ${swipeDirection === 'left' ? 'swipe-left' : swipeDirection === 'right' ? 'swipe-right' : ''}`}
        >
          {/* Front */}
          <div className="absolute inset-0 bg-white rounded-4xl shadow-2xl shadow-moe-200/40 flex flex-col items-center justify-center p-8 backface-hidden border-4 border-white">
            <span className="absolute top-8 left-8 text-xs font-bold text-moe-200 uppercase tracking-widest bg-moe-50 px-2 py-1 rounded">Question</span>
            {currentCard.frontType === 'text' ? (
                <>
                    {/* Increased Font Size here */}
                    <div className="text-4xl md:text-6xl text-center font-bold text-moe-text mb-4 leading-tight break-words">{currentCard.frontContent}</div>
                    {currentCard.phonetic && (
                        <div className="text-lg text-gray-400 font-mono mb-4 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">[{currentCard.phonetic}]</div>
                    )}
                    <button 
                        onClick={(e) => { e.stopPropagation(); speakText(currentCard.frontContent); }}
                        className="p-3 bg-moe-50 text-moe-primary rounded-full hover:bg-moe-100 transition-colors shadow-sm"
                    >
                        <Volume2 size={24} />
                    </button>
                </>
            ) : (
                <img src={currentCard.frontContent} alt="Front" className="max-w-full max-h-full object-contain pointer-events-none select-none rounded-2xl" />
            )}
            <div className="absolute bottom-6 text-gray-300 text-sm animate-pulse">点击翻转</div>
          </div>

          {/* Back */}
          <div 
            className="absolute inset-0 bg-white rounded-4xl shadow-2xl shadow-moe-200/40 flex flex-col items-center justify-center p-8 backface-hidden rotate-y-180 border-[6px] border-moe-100"
          >
             <span className="absolute top-8 left-8 text-xs font-bold text-moe-300 uppercase tracking-widest bg-moe-50 px-2 py-1 rounded">Answer</span>
             {currentCard.backType === 'text' ? (
                 <div className="w-full h-full flex items-center justify-center overflow-y-auto no-scrollbar">
                     {/* Safe render of HTML for the highlighted examples */}
                     <div 
                        className="text-xl text-center font-medium text-moe-text whitespace-pre-wrap leading-relaxed"
                        dangerouslySetInnerHTML={{ 
                            __html: cleanHTML(currentCard.backContent)
                        }}
                     />
                 </div>
            ) : (
                <img src={currentCard.backContent} alt="Back" className="max-w-full max-h-full object-contain pointer-events-none select-none rounded-2xl" />
            )}
          </div>
        </div>
      </div>

      {/* Grading Buttons */}
      <div className={`p-6 pb-10 transition-opacity duration-300 ${isFlipped ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="grid grid-cols-4 gap-3 max-w-sm mx-auto">
             <button onClick={(e) => { e.stopPropagation(); handleRate('again'); }} className="flex flex-col items-center gap-1 bg-white p-3 rounded-2xl shadow-sm hover:bg-red-50 border-b-4 border-red-100 active:border-b-0 active:translate-y-1 transition-all">
                 <span className="text-xs font-bold text-red-400">不认识</span>
                 <span className="text-[10px] text-gray-400">{getTimeLabel('again')}</span>
             </button>
             <button onClick={(e) => { e.stopPropagation(); handleRate('hard'); }} className="flex flex-col items-center gap-1 bg-white p-3 rounded-2xl shadow-sm hover:bg-orange-50 border-b-4 border-orange-100 active:border-b-0 active:translate-y-1 transition-all">
                 <span className="text-xs font-bold text-orange-400">困难</span>
                 <span className="text-[10px] text-gray-400">{getTimeLabel('hard')}</span>
             </button>
             <button onClick={(e) => { e.stopPropagation(); handleRate('good'); }} className="flex flex-col items-center gap-1 bg-white p-3 rounded-2xl shadow-sm hover:bg-blue-50 border-b-4 border-blue-100 active:border-b-0 active:translate-y-1 transition-all">
                 <span className="text-xs font-bold text-blue-400">良好</span>
                 <span className="text-[10px] text-gray-400">{getTimeLabel('good')}</span>
             </button>
             <button onClick={(e) => { e.stopPropagation(); handleRate('easy'); }} className="flex flex-col items-center gap-1 bg-white p-3 rounded-2xl shadow-sm hover:bg-green-50 border-b-4 border-green-100 active:border-b-0 active:translate-y-1 transition-all">
                 <span className="text-xs font-bold text-green-400">简单</span>
                 <span className="text-[10px] text-gray-400">{getTimeLabel('easy')}</span>
             </button>
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---

const App: React.FC = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [view, setView] = useState<string>(ViewState.WELCOME);
  const [cards, setCards] = useState<Card[]>([]);
  const [folders, setFolders] = useState<Folder[]>([
      { id: 'default', name: '默认文件夹', createdAt: Date.now() }
  ]);
  const [currentFolderId, setCurrentFolderId] = useState<string>('default');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const savedSettings = localStorage.getItem('moe_settings');
    const savedCards = localStorage.getItem('moe_cards');
    const savedFolders = localStorage.getItem('moe_folders');
    
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
        setView(ViewState.HOME);
      } catch (e) {
        console.error("Failed to parse settings", e);
        localStorage.removeItem('moe_settings');
      }
    }
    
    if (savedFolders) {
        try {
          setFolders(JSON.parse(savedFolders));
        } catch (e) {
          console.error("Failed to parse folders", e);
        }
    }

    if (savedCards) {
      try {
        let parsedCards: Card[] = JSON.parse(savedCards);
        if (Array.isArray(parsedCards)) {
          const migratedCards = parsedCards.map(c => ({
              ...c,
              folderId: c.folderId || 'default',
              // Default SRS values for old cards
              nextReviewTime: c.nextReviewTime || 0,
              interval: c.interval || 0,
              repetition: c.repetition || 0,
              easeFactor: c.easeFactor || 2.5
          }));
          setCards(migratedCards);
        }
      } catch (e) {
        console.error("Failed to parse cards", e);
      }
    }
  }, []);

  useEffect(() => {
    if (cards.length > 0) {
        localStorage.setItem('moe_cards', JSON.stringify(cards));
    }
  }, [cards]);

  useEffect(() => {
      localStorage.setItem('moe_folders', JSON.stringify(folders));
  }, [folders]);

  const handleWelcomeComplete = (newSettings: Settings) => {
    setSettings(newSettings);
    localStorage.setItem('moe_settings', JSON.stringify(newSettings));
    setView(ViewState.HOME);
  };

  const handleUpdateSettings = (newSettings: Settings) => {
    setSettings(newSettings);
    localStorage.setItem('moe_settings', JSON.stringify(newSettings));
  };

  const handleCreateFolder = (name: string) => {
      const newFolder: Folder = {
          id: Date.now().toString(),
          name,
          createdAt: Date.now()
      };
      setFolders([...folders, newFolder]);
      setCurrentFolderId(newFolder.id);
  };

  const addCard = (cardData: Omit<Card, 'id' | 'createdAt' | 'nextReviewTime' | 'interval' | 'repetition' | 'easeFactor'>) => {
    const newCard: Card = {
      ...cardData,
      id: Date.now().toString(),
      createdAt: Date.now(),
      nextReviewTime: 0, // Due immediately
      interval: 0,
      repetition: 0,
      easeFactor: 2.5
    };
    setCards(prev => [newCard, ...prev]);
  };

  const addBatchCards = (batch: Omit<Card, 'id' | 'createdAt' | 'nextReviewTime' | 'interval' | 'repetition' | 'easeFactor'>[]) => {
    const newCards = batch.map(c => ({
      ...c,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: Date.now(),
      nextReviewTime: 0,
      interval: 0,
      repetition: 0,
      easeFactor: 2.5
    }));
    setCards(prev => [...newCards, ...prev]);
    alert(`添加了 ${batch.length} 张卡片! 🎉`);
  };

  const handleReviewResult = (cardId: string, rating: 'again' | 'hard' | 'good' | 'easy' | 'delete') => {
      if (rating === 'delete') {
          setCards(prev => prev.filter(c => c.id !== cardId));
          return;
      }

      setCards(prev => prev.map(card => {
          if (card.id !== cardId) return card;

          // Ebbinghaus / SM-2 Inspired Logic
          let newInterval = 0;
          let newRepetition = card.repetition;
          let newEaseFactor = card.easeFactor;

          if (rating === 'again') {
              newInterval = REVIEW_INTERVALS.AGAIN;
              newRepetition = 0; // Reset
          } else if (card.repetition === 0) {
              // First Review Logic
              if (rating === 'hard') newInterval = REVIEW_INTERVALS.HARD;
              else if (rating === 'good') newInterval = REVIEW_INTERVALS.GOOD;
              else if (rating === 'easy') newInterval = REVIEW_INTERVALS.EASY;
              newRepetition = 1;
          } else {
              // Subsequent Reviews
              if (rating === 'hard') {
                  newInterval = card.interval * 1.2;
                  newEaseFactor = Math.max(1.3, newEaseFactor - 0.15);
              } else if (rating === 'good') {
                  newInterval = card.interval * 2.5; // Simplified Multiplier for Good
              } else if (rating === 'easy') {
                  newInterval = card.interval * 1.3 * newEaseFactor; // Bonus
                  newEaseFactor += 0.15;
              }
              newRepetition += 1;
          }
          
          return {
              ...card,
              interval: newInterval,
              repetition: newRepetition,
              easeFactor: newEaseFactor,
              nextReviewTime: Date.now() + (newInterval * 60 * 1000)
          };
      }));
  };

  const handleDeleteCard = (id: string) => {
      setCards(prev => prev.filter(c => c.id !== id));
  };

  const handleMoveCard = (id: string, folderId: string) => {
      setCards(prev => prev.map(c => c.id === id ? { ...c, folderId } : c));
  };

  if (!settings || view === ViewState.WELCOME) {
    return <WelcomeScreen onComplete={handleWelcomeComplete} />;
  }

  const isCreateMode = view === ViewState.CREATE || view === ViewState.CREATE + '_DRAW';
  const createInitialMode = view === ViewState.CREATE + '_DRAW' ? 'image' : 'text';

  // Filter cards: Total in folder vs Due in folder
  const folderCards = cards.filter(c => c.folderId === currentFolderId);
  const dueCards = folderCards.filter(c => c.nextReviewTime <= Date.now()).sort((a,b) => a.nextReviewTime - b.nextReviewTime);

  const currentFolder = folders.find(f => f.id === currentFolderId);

  return (
    <div className="w-full h-[100dvh] bg-moe-50 overflow-hidden relative font-sans text-moe-text">
      {view === ViewState.HOME && (
        <HomeScreen 
          user={settings.userName} 
          totalCards={folderCards.length}
          dueCount={dueCards.length}
          folders={folders}
          currentFolderId={currentFolderId}
          onSwitchFolder={setCurrentFolderId}
          onCreateFolder={handleCreateFolder}
          onNavigate={setView} 
          onOpenSettings={() => setShowSettings(true)}
        />
      )}
      
      {isCreateMode && (
        <CreateCardScreen 
          initialMode={createInitialMode}
          folders={folders}
          initialFolderId={currentFolderId}
          onBack={() => setView(ViewState.HOME)} 
          onSave={addCard}
        />
      )}

      {view === ViewState.IMPORT && (
        <ImportScreen 
          apiKey={settings.apiKey}
          folders={folders}
          initialFolderId={currentFolderId}
          onBack={() => setView(ViewState.HOME)}
          onSaveBatch={addBatchCards}
        />
      )}

      {view === ViewState.REVIEW && (
        <ReviewScreen 
          cards={dueCards} // Only show due cards
          onBack={() => setView(ViewState.HOME)}
          onReviewResult={handleReviewResult}
        />
      )}

      {view === ViewState.FOLDER_DETAIL && currentFolder && (
          <FolderDetailScreen
            folder={currentFolder}
            allFolders={folders}
            cards={folderCards}
            onBack={() => setView(ViewState.HOME)}
            onDeleteCard={handleDeleteCard}
            onMoveCard={handleMoveCard}
          />
      )}
      
      {/* Settings Modal Overlay */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center pointer-events-none">
           {/* Backdrop */}
           <div className="absolute inset-0 bg-black/20 backdrop-blur-sm pointer-events-auto transition-opacity" onClick={() => setShowSettings(false)} />
           
           {/* Modal Content */}
           <div className="bg-white w-full h-[90vh] md:h-auto md:max-w-2xl md:max-h-[85vh] md:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden relative pointer-events-auto flex flex-col animate-in slide-in-from-bottom-10 fade-in duration-300">
              <SettingsScreen
                settings={settings}
                stats={{
                  total: cards.length,
                  learned: cards.filter(c => c.repetition > 0).length,
                  due: cards.filter(c => c.nextReviewTime <= Date.now()).length
                }}
                onUpdateSettings={handleUpdateSettings}
                onBack={() => setShowSettings(false)}
              />
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
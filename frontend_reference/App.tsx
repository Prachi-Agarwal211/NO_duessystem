import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileCheck, Search, X, ChevronRight, GraduationCap, Sun, Moon } from 'lucide-react';
import { Background } from './components/Background';
import { CustomCursor } from './components/CustomCursor';

// --- Types ---
type Theme = 'dark' | 'light';

// --- Components ---

const ThemeToggle: React.FC<{ theme: Theme; toggle: () => void }> = ({ theme, toggle }) => {
  return (
    <button
      onClick={toggle}
      className={`interactive fixed top-8 right-8 z-50 p-3 rounded-full transition-all duration-700 ease-smooth group backdrop-blur-md
        ${theme === 'dark' 
          ? 'bg-white/5 text-white hover:bg-white/10 border border-white/10' 
          : 'bg-black/5 text-black hover:bg-black/10 border border-black/5'
        }`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={theme}
          initial={{ y: -20, opacity: 0, rotate: -90 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: 20, opacity: 0, rotate: 90 }}
          transition={{ duration: 0.2 }}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </motion.div>
      </AnimatePresence>
    </button>
  );
};

interface ActionCardProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onClick: () => void;
  index: number;
  theme: Theme;
}

const ActionCard: React.FC<ActionCardProps> = ({ title, subtitle, icon, onClick, index, theme }) => {
  const isDark = theme === 'dark';
  
  return (
    <motion.button
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.2 + index * 0.15, ease: "easeOut" }}
      whileHover={{ y: -5 }}
      onClick={onClick}
      className={`interactive group relative w-full md:w-[340px] h-[280px] overflow-hidden text-left p-8 flex flex-col justify-between transition-all duration-700 ease-smooth
        ${isDark 
          ? 'bg-white/[0.02] hover:bg-white/[0.05] border-white/10 shadow-2xl shadow-black/50' 
          : 'bg-white hover:bg-gray-50 border-black/5 shadow-[0_15px_40px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(196,30,58,0.1)]'
        } border backdrop-blur-md rounded-xl`}
    >
      {/* Hover Accent Gradient */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none bg-gradient-to-br from-transparent via-transparent to-jecrc-red/5" />
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-jecrc-red/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Content */}
      <div className="relative z-10">
        <div className={`w-14 h-14 mb-6 flex items-center justify-center rounded-2xl transition-all duration-700 ease-smooth
          ${isDark 
            ? 'bg-white/5 text-white group-hover:bg-jecrc-red group-hover:text-white group-hover:scale-110' 
            : 'bg-black/5 text-black group-hover:bg-jecrc-red group-hover:text-white group-hover:scale-110'
          }`}>
          {React.cloneElement(icon as React.ReactElement, { size: 24, strokeWidth: 1.5 })}
        </div>
        
        <h2 className={`font-serif text-3xl mb-3 transition-colors duration-700 ease-smooth ${isDark ? 'text-white' : 'text-ink-black'}`}>
          {title}
        </h2>
        <p className={`font-sans text-sm font-medium leading-relaxed transition-colors duration-700 ease-smooth ${isDark ? 'text-gray-400 group-hover:text-gray-300' : 'text-gray-500 group-hover:text-gray-600'}`}>
          {subtitle}
        </p>
      </div>

      <div className={`relative z-10 flex items-center gap-3 text-xs font-bold tracking-[0.25em] uppercase transition-colors duration-700 ease-smooth
        ${isDark 
          ? 'text-gray-600 group-hover:text-white' 
          : 'text-gray-400 group-hover:text-jecrc-red'
        }`}>
        <span>Proceed</span>
        <ChevronRight size={14} className="transform group-hover:translate-x-1.5 transition-transform duration-300" />
      </div>
    </motion.button>
  );
};

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  theme: Theme;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, theme }) => {
  const isDark = theme === 'dark';

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className={`fixed inset-0 z-40 backdrop-blur-md transition-colors duration-700 ease-smooth ${isDark ? 'bg-black/60' : 'bg-white/60'}`}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-lg 
              border shadow-[0_0_50px_rgba(0,0,0,0.3)] rounded-lg overflow-hidden
              ${isDark 
                ? 'bg-[#0a0a0a] border-white/10 text-white' 
                : 'bg-white border-black/5 text-ink-black'
              }`}
          >
            {/* Header */}
            <div className={`p-8 border-b transition-colors duration-700 ease-smooth ${isDark ? 'border-white/5' : 'border-black/5'} flex justify-between items-start`}>
              <div>
                <h2 className="font-serif text-2xl mb-1">{title}</h2>
                <p className="font-sans text-jecrc-red text-[10px] font-bold tracking-[0.2em] uppercase">Secure Gateway</p>
              </div>
              <button 
                onClick={onClose} 
                className={`interactive p-2 rounded-full transition-colors duration-300
                  ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-black/5 text-gray-500'}`}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-8 font-sans text-sm leading-relaxed">
              <p className={`transition-colors duration-700 ease-smooth ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                This is a secure checkpoint for the <strong className={isDark ? 'text-white' : 'text-black'}>JECRC University ERP</strong>. 
                To proceed with the {title.toLowerCase()} process, please confirm your identity.
              </p>
              <div className={`mt-6 p-5 rounded-md border-l-2 border-jecrc-red transition-colors duration-700 ease-smooth ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                <p className={`text-xs transition-colors duration-700 ease-smooth ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                   Clearance is subject to departmental approval. Ensure all library books and lab equipment are returned before proceeding.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className={`p-6 flex justify-end gap-4 border-t transition-colors duration-700 ease-smooth ${isDark ? 'border-white/5' : 'border-black/5'} bg-opacity-50`}>
              <button onClick={onClose} className={`interactive px-6 py-3 text-xs font-bold tracking-widest transition-colors rounded
                ${isDark ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-black'}`}>
                CANCEL
              </button>
              <button onClick={onClose} className="interactive px-8 py-3 bg-jecrc-red text-white hover:bg-red-700 text-xs font-bold tracking-widest transition-all duration-300 shadow-lg shadow-red-900/20 hover:shadow-red-900/40 rounded">
                AUTHENTICATE
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const App: React.FC = () => {
  const [theme, setTheme] = useState<Theme>('dark');
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const isDark = theme === 'dark';

  return (
    <div className={`relative min-h-screen w-full transition-colors duration-700 ease-smooth flex flex-col items-center justify-center overflow-hidden
      ${isDark ? 'bg-deep-black text-white' : 'bg-white text-ink-black'}`}>
      
      <CustomCursor theme={theme} />
      <Background theme={theme} />
      <ThemeToggle theme={theme} toggle={toggleTheme} />

      {/* Centered Header / Branding */}
      <header className="relative z-10 flex flex-col items-center mb-16 text-center px-4 mt-10">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`flex items-center justify-center gap-4 mb-8 px-6 py-2 border rounded-full backdrop-blur-md transition-colors duration-700 ease-smooth
            ${isDark ? 'bg-white/5 border-white/10' : 'bg-white/80 border-black/5 shadow-sm'}`}
        >
          <GraduationCap size={20} className="text-jecrc-red" />
          <div className="flex items-baseline gap-2">
            <span className={`font-serif text-lg tracking-wide transition-colors duration-700 ease-smooth ${isDark ? 'text-white' : 'text-black'}`}>JECRC</span>
            <span className="font-sans text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase">University</span>
          </div>
        </motion.div>

        {/* Refined Title */}
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center gap-3"
        >
            <span className="font-sans text-[11px] md:text-xs text-jecrc-red font-bold tracking-[0.6em] uppercase opacity-80">
                Student Services
            </span>
            <h1 className={`font-serif text-5xl md:text-6xl lg:text-7xl tracking-tight transition-colors duration-700 ease-smooth ${isDark ? 'text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70' : 'text-ink-black'}`}>
                NO DUES
            </h1>
            
            {/* Decorative Line */}
            <div className="relative h-[1px] w-24 mt-6 overflow-hidden">
                 <div className={`absolute inset-0 transition-colors duration-700 ease-smooth ${isDark ? 'bg-white/20' : 'bg-black/10'}`}></div>
                 <motion.div 
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-jecrc-red to-transparent"
                 />
            </div>
        </motion.div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 w-full max-w-5xl px-6 md:px-12 pb-12">
        <div className="flex flex-col md:flex-row items-center justify-center gap-8">
          <ActionCard 
            index={0}
            title="Check Status"
            subtitle="Check the status of your no dues form."
            icon={<Search />}
            onClick={() => setActiveModal('Status Verification')}
            theme={theme}
          />
          <ActionCard 
            index={1}
            title="Submit No Dues Form"
            subtitle="Submit a new no-dues application for semester end or degree completion."
            icon={<FileCheck />}
            onClick={() => setActiveModal('Submit No Dues Form')}
            theme={theme}
          />
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="relative z-10 mt-auto mb-8 flex flex-col items-center gap-5 opacity-60 hover:opacity-100 transition-opacity duration-500">
        <div className={`font-sans text-[9px] tracking-[0.3em] uppercase transition-colors duration-700 ease-smooth ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
          Jaipur Engineering College and Research Centre
        </div>
      </footer>

      <Modal 
        isOpen={activeModal !== null} 
        onClose={() => setActiveModal(null)} 
        title={activeModal || ''} 
        theme={theme}
      />
    </div>
  );
};

export default App;
export const Toast = ({ message, type = 'success', onClose }: { message: string, type?: string, onClose: () => void }) => {
    return (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-500">
            <div className={`
        meal-card !py-3 !px-6 flex items-center gap-3 border-l-4 shadow-brand-elevated
        ${type === 'success' ? 'border-l-sage' : type === 'warning' ? 'border-l-amber-500' : 'border-l-primary'}
      `}>
                <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${type === 'success' ? 'bg-sage' : type === 'warning' ? 'bg-amber-500' : 'bg-primary'}`} />
                <span className="text-sm font-bold tracking-tight text-foreground">
          {message}
        </span>
                <button onClick={onClose} className="ml-3 opacity-40 hover:opacity-100 transition-opacity text-xs">✕</button>
            </div>
        </div>
    );
};

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useUI } from '../infrastructure/ui/UIContext';
import SmartConsumptionPanel from './SmartConsumptionPanel';

const ConsumptionModal: React.FC = () => {
    const { isConsumptionOpen, closeConsumption } = useUI();

    // Modal açıkken arkadaki sayfanın kaymasını engelle
    useEffect(() => {
        if (isConsumptionOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
    }, [isConsumptionOpen]);

    if (!isConsumptionOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            {/* Arka Plan Karartma (Overlay) */}
            <div
                className="absolute inset-0 bg-espresso-midnight/60 backdrop-blur-md animate-in fade-in duration-300"
                onClick={closeConsumption}
            />

            {/* Merkezi Modal Kutusu */}
            <div
                className="relative w-full max-w-4xl max-h-[90vh] bg-alabaster dark:bg-espresso-midnight rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col"
            >
                {/* Modal Header / Kapatma Butonu */}
                <div className="absolute top-6 right-6 z-[110]">
                    <button
                        onClick={closeConsumption}
                        className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 hover:bg-terracotta hover:text-white transition-all duration-300 group"
                    >
                        <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </div>

                {/* Panel İçeriği - Kaydırılabilir Alan */}
                <div className="flex-1 overflow-y-auto p-8 md:p-12 scrollbar-thin scrollbar-thumb-terracotta/20">
                    <div className="max-w-3xl mx-auto">
                        {/* 666 Satırlık Dev Buraya Geliyor */}
                        <SmartConsumptionPanel />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConsumptionModal;

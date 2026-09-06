'use client';

import { BookOpen, Wind, HeartPulse, Phone, CheckCircle2 } from 'lucide-react';

export default function PreparednessHub() {
  return (
    <section className="mt-6">
        <div className="px-6 flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold tracking-tight text-slate-900 flex items-center gap-2">
                <BookOpen size={16} />
                Preparedness Hub
            </h3>
            <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Available Offline</span>
        </div>
        
        {/* Horizontal Scroll for Cards */}
        <div className="overflow-x-auto no-scrollbar px-6 pb-4">
            <div className="flex gap-4 min-w-max">
                
                {/* Guide Card 1 */}
                <div className="w-40 p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col gap-3 hover:bg-white hover:shadow-sm transition-all cursor-pointer">
                    <div className="w-10 h-10 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center text-blue-600">
                        <Wind size={20} />
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-slate-900 leading-tight">Storm Guide</h4>
                        <span className="text-[10px] text-slate-500 mt-1 block">PDF • 2.4 MB</span>
                    </div>
                    <div className="mt-auto flex items-center gap-1.5 text-emerald-600">
                        <CheckCircle2 size={12} />
                        <span className="text-[10px] font-medium">Ready</span>
                    </div>
                </div>

                {/* Guide Card 2 */}
                <div className="w-40 p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col gap-3 hover:bg-white hover:shadow-sm transition-all cursor-pointer">
                    <div className="w-10 h-10 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center text-rose-500">
                        <HeartPulse size={20} />
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-slate-900 leading-tight">First Aid</h4>
                        <span className="text-[10px] text-slate-500 mt-1 block">Template</span>
                    </div>
                    <div className="mt-auto flex items-center gap-1.5 text-emerald-600">
                        <CheckCircle2 size={12} />
                        <span className="text-[10px] font-medium">Ready</span>
                    </div>
                </div>

                 {/* Guide Card 3 */}
                 <div className="w-40 p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col gap-3 hover:bg-white hover:shadow-sm transition-all cursor-pointer">
                    <div className="w-10 h-10 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-600">
                        <Phone size={20} />
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-slate-900 leading-tight">Contact List</h4>
                        <span className="text-[10px] text-slate-500 mt-1 block">Emergency #s</span>
                    </div>
                    <div className="mt-auto flex items-center gap-1.5 text-emerald-600">
                         <CheckCircle2 size={12} />
                        <span className="text-[10px] font-medium">Saved</span>
                    </div>
                </div>

            </div>
        </div>
    </section>
  );
}

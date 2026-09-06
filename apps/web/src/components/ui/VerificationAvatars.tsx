import { useLanguage } from '@/components/providers/LanguageProvider';

interface FeedbackUser {
    id: string;
    incident_id: string;
    user_id: string;
    type: 'confirm' | 'reject';
    created_at: string;
    users?: {
        name: string | null;
        avatar_url: string | null;
    } | null;
}

interface VerificationAvatarsProps {
    feedback: FeedbackUser[];
    count: number;
}

export default function VerificationAvatars({ feedback, count }: VerificationAvatarsProps) {
    const { t } = useLanguage();
    const confirmers = feedback.filter(f => f.type === 'confirm').slice(0, 3);

    if (count === 0) return null;

    return (
        <>
            <div className="mt-6"></div>
            <div className="flex items-center gap-2">
                <div className="flex -space-x-1.5">
                    {confirmers.map((fb, i) => {
                        const user = fb.users;
                        const initials = user?.name 
                            ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() 
                            : 'UI';
                        
                        return (
                            <div key={i} className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold overflow-hidden bg-slate-100 text-slate-600`}>
                                {user?.avatar_url ? (
                                    <img src={user.avatar_url} alt={user.name || 'User'} className="w-full h-full object-cover" />
                                ) : (
                                    <span>{initials}</span>
                                )}
                            </div>
                        );
                    })}
                </div>
                <span className="text-slate-400 text-xs">
                    {t('incidentFeed.verifiedBy')} {count} {t('incidentFeed.people')}
                </span>
            </div>
        </>
    );
}

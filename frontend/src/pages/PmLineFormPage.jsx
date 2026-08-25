// src/pages/PmLineFormPage.jsx
// Reskin (checklist §3 item 6 "PM pages", batch 3/N): inline style +
// `.mono` lama dilepas, diganti Tailwind. Cuma wrapper - Banner &
// PmLineHistoryForm udah direskin masing-masing di file-nya sendiri.
// Data/logic (navigate on success) TIDAK berubah.
//
// Phase 8 (domain/pm-line/ extraction): import path diupdate mengikuti
// PmLineHistoryForm.jsx pindah ke components/pm-line/. Tidak ada
// perubahan lain di file ini.
import { useNavigate } from 'react-router-dom';
import { usePageHeader } from '../contexts/PageHeaderContext';
import PmLineHistoryForm from '../components/pm-line/PmLineHistoryForm';
import Banner from '../components/Banner';

function PmLineFormPage() {
    const navigate = useNavigate();

    usePageHeader({ title: 'Form/Input PM Monthly and Weekly' });

    return (
        <div className="flex flex-col gap-4">
            <Banner>
                Input PM Monthly di sini menambah poin & bisa reset countdown Weekly, tergantung setting{' '}
                <code className="font-[var(--font-mono)]">auto_reset_weekly_on_monthly</code>.
            </Banner>

            <PmLineHistoryForm
                onSuccess={() => {
                    navigate('/pm-line/history');
                }}
            />
        </div>
    );
}

export default PmLineFormPage;

// src/pages/PmPartFormPage.jsx
// Reskin (checklist §3 item 5 "PM Part & PM Monthly/Weekly", batch susulan -
// menyusul PmLineFormPage.jsx yang jadi pattern acuan): inline style lama
// dilepas total, diganti Tailwind + shadcn ui (Button). Notice box pakai
// warna warning (accent-dim/accent) yang sama persis kayak sebelumnya, cuma
// dipetakan ke token yang beneran ada di tokens.css (bukan var(--warning)
// yang gak pernah didefinisikan). Data/logic (handleSuccess, kondisi stock
// gak kepotong) TIDAK berubah sama sekali.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageHeader } from '../contexts/PageHeaderContext';
import PmPartHistoryForm from '../components/pm-part/PmPartHistoryForm';
import Banner from '../components/Banner';
import { Button } from '../components/ui/button';

function PmPartFormPage() {
    const navigate = useNavigate();
    // Dipakai buat nahan navigasi sebentar kalau stock TIDAK berkurang
    // otomatis (part belum di-link ke Inventory Item) - operator perlu tau
    // ini SEBELUM pindah halaman, bukan cuma toast yang lewat cepat.
    const [notice, setNotice] = useState(null);

    usePageHeader({ title: 'Form/Input PM Part' });

    function handleSuccess(result) {
        if (result?.stock && !result.stock.deducted) {
            setNotice(
                'Riwayat penggantian tersimpan, tapi stock TIDAK berkurang otomatis karena part ini belum di-link ke Inventory Item. Kalau perlu, kurangi stock manual lewat halaman Inventory.'
            );
            return;
        }
        navigate('/pm-part/history');
    }

    return (
        <div className="flex flex-col gap-4">
            <Banner>
                Input penggantian part di sini akan otomatis mereset counter shot dan tercatat di History PM Part.
            </Banner>

            {notice ? (
                <div className="flex flex-col gap-3">
                    <div className="rounded-lg border border-primary bg-[var(--accent-dim)] px-3.5 py-2.5 text-[13px] text-foreground">
                        {notice}
                    </div>
                    <Button type="button" className="self-start" onClick={() => navigate('/pm-part/history')}>
                        Lanjut ke History
                    </Button>
                </div>
            ) : (
                <PmPartHistoryForm onSuccess={handleSuccess} />
            )}
        </div>
    );
}

export default PmPartFormPage;
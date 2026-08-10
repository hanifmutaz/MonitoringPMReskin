// src/pages/PmPartFormPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageHeader } from '../contexts/PageHeaderContext';
import PmPartHistoryForm from '../components/PmPartHistoryForm';
import Banner from '../components/Banner';

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Banner>
                Input penggantian part di sini akan otomatis mereset counter shot dan tercatat di History PM Part.
            </Banner>

            {notice ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div
                        style={{
                            padding: '10px 14px',
                            borderRadius: 8,
                            background: 'var(--warning-dim, var(--accent-dim))',
                            border: '1px solid var(--warning, var(--accent))',
                            fontSize: 13,
                        }}
                    >
                        {notice}
                    </div>
                    <button type="button" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={() => navigate('/pm-part/history')}>
                        Lanjut ke History
                    </button>
                </div>
            ) : (
                <PmPartHistoryForm onSuccess={handleSuccess} />
            )}
        </div>
    );
}

export default PmPartFormPage;
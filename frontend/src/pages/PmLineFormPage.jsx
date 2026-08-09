// src/pages/PmLineFormPage.jsx
import { useNavigate } from 'react-router-dom';
import { usePageHeader } from '../contexts/PageHeaderContext';
import PmLineHistoryForm from '../components/PmLineHistoryForm';
import Banner from '../components/Banner';

function PmLineFormPage() {
    const navigate = useNavigate();

    usePageHeader({ title: 'Form/Input PM Monthly and Weekly' });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Banner>
                Input PM Monthly di sini menambah poin & bisa reset countdown Weekly, tergantung setting{' '}
                <code className="mono">auto_reset_weekly_on_monthly</code>.
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
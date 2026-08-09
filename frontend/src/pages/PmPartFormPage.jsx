// src/pages/PmPartFormPage.jsx
import { useNavigate } from 'react-router-dom';
import { usePageHeader } from '../contexts/PageHeaderContext';
import PmPartHistoryForm from '../components/PmPartHistoryForm';
import Banner from '../components/Banner';

function PmPartFormPage() {
    const navigate = useNavigate();

    usePageHeader({ title: 'Form/Input PM Part' });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Banner>
                Input penggantian part di sini akan otomatis mereset counter shot dan tercatat di History PM Part.
            </Banner>

            <PmPartHistoryForm
                onSuccess={() => {
                    navigate('/pm-part/history');
                }}
            />
        </div>
    );
}

export default PmPartFormPage;
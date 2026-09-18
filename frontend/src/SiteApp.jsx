import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SchoolSite from '@/pages/SchoolSite';

/**
 * Public school website ka alag chhota app - visitor ko admin ERP ka poora
 * code download nahi karna padta.
 */
export default function SiteApp() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/site/:slug" element={<SchoolSite />} />
            </Routes>
        </BrowserRouter>
    );
}

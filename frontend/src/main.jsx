import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

const root = createRoot(document.getElementById('root'));

// /site/... = public website; baaki sab admin ERP. Dono alag chunk me load hote hain.
const isSite = window.location.pathname.startsWith('/site/');
const load = isSite ? import('./SiteApp') : import('./App');

load.then(({ default: Root }) => {
    root.render(
        <StrictMode>
            <Root />
        </StrictMode>
    );
});

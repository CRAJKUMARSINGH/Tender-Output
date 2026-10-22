import { createRoot } from 'react-dom/client';

import App from './App';

import './index.css';
import './lib/api-auth';

createRoot(document.getElementById('root')!).render(<App />);

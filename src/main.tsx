import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { FeedbackProvider } from './components/Feedback'
import { requestPersistentStorage } from './db/db'
import './index.css'

// Pede ao navegador para guardar os dados com mais segurança (não apagar sozinho).
void requestPersistentStorage()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <FeedbackProvider>
        <App />
      </FeedbackProvider>
    </HashRouter>
  </StrictMode>,
)

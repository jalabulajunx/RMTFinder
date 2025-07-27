import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import HomePage from './pages/HomePage'
import SearchPage from './pages/SearchPage'
import RMTProfilePage from './pages/RMTProfilePage'
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary'

function App() {
  return (
    <ErrorBoundary>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/rmt/:id" element={<RMTProfilePage />} />
        </Routes>
      </Layout>
    </ErrorBoundary>
  )
}

export default App
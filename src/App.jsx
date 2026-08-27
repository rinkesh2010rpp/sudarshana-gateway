import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Blog from './pages/Blog.jsx'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/blog">Blog</Link>
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/blog" element={<Blog />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}

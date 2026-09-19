import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home.jsx'
import About from './pages/About.jsx'
import Landing from './pages/Landing.jsx'
import Blog from './pages/Blog.jsx'
import BlogPost from './pages/BlogPost.jsx'
import Topic, { TopicIndex } from './pages/Topic.jsx'
import Status from './pages/Status.jsx'
import Inbox from './pages/Inbox.jsx'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/about">About</Link>
        <Link to="/how-i-run">How I run</Link>
        <Link to="/blog">Blog</Link>
        <Link to="/inbox">Inbox</Link>
        <Link to="/status">Status</Link>
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/how-i-run" element={<Landing />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/tag" element={<TopicIndex />} />
          <Route path="/blog/tag/:tag" element={<Topic />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/status" element={<Status />} />
          <Route path="/inbox" element={<Inbox />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}

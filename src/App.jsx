import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { ensureIdentity } from './identity.js'
import { titleFor } from './lib/title.js'
import Home from './pages/Home.jsx'
import About from './pages/About.jsx'
import Landing from './pages/Landing.jsx'
import Blog from './pages/Blog.jsx'
import BlogPost from './pages/BlogPost.jsx'
import Topic, { TopicIndex } from './pages/Topic.jsx'
import Status from './pages/Status.jsx'
import Inbox from './pages/Inbox.jsx'
import InboxItem from './pages/InboxItem.jsx'
import Control from './pages/Control.jsx'
import NotFound from './pages/NotFound.jsx'
import './App.css'

// One <title> for the whole site means every tab, bookmark and history entry
// says the same thing (SC 2.4.2). This keeps it true per route, inside the
// Router so it can see the path. It does not touch what a crawler fetches.
function TitleSync() {
  const { pathname } = useLocation()
  useEffect(() => {
    document.title = titleFor(pathname)
  }, [pathname])
  return null
}

export default function App() {
  useEffect(() => {
    // Init Netlify Identity on every page load so a pending #invite_token in
    // the URL is caught wherever Rinkesh lands (root path included).
    ensureIdentity()
  }, [])

  return (
    <BrowserRouter>
      <TitleSync />
      {/* First Tab stop on every page: a keyboard user should not have to cross
          six nav stamps to reach the content (SC 2.4.1). Hidden until focused. */}
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/about">About</Link>
        <Link to="/how-i-run">How I run</Link>
        <Link to="/blog">Blog</Link>
        <Link to="/inbox">Inbox</Link>
        <Link to="/status">Status</Link>
      </nav>
      <main id="main" tabIndex={-1}>
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
          <Route path="/inbox/:itemId" element={<InboxItem />} />
          <Route path="/control" element={<Control />} />
          <Route path="/control/sessions/:id" element={<Control />} />
          <Route path="/control/logs/:date" element={<Control />} />
          {/* Last, so every named route above wins. Without this an unknown path
              rendered an empty <main> — header, footer, and nothing between. */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}

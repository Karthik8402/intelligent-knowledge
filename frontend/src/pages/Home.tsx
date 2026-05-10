import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Database, Search, Shield, Zap, ArrowRight } from 'lucide-react';

export default function HomePage() {
  const { user } = useAuth();
  const profileName = user?.user_metadata?.full_name || user?.email || 'Your Workspace';
  const profileEmail = user?.email || 'sign-in required';
  const profileTimezone = user?.user_metadata?.timezone || 'Local timezone';

  return (
    <div className="min-h-screen bg-[#0b0f14] text-zinc-100 overflow-x-hidden selection:bg-indigo-500/30">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800/40 bg-[#0b0f14]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-[0_0_18px_rgba(129,140,248,0.4)]">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight font-['Space_Grotesk']">Quick Knowledge</span>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <Link to="/documents">
                <Button variant="secondary" size="sm">Dashboard</Button>
              </Link>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login" className="text-sm font-medium text-zinc-300 hover:text-white transition-colors">
                  Sign In
                </Link>
                <Link to="/register">
                  <Button size="sm">Get Started</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-28 pb-16 sm:pt-36 sm:pb-24 lg:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative">
        {/* Glow effects */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-indigo-600/20 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[300px] bg-purple-600/20 rounded-full blur-[130px] pointer-events-none" />
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-7"
          >
            <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium text-indigo-300 bg-indigo-500/10 ring-1 ring-inset ring-indigo-500/20 mb-8">
              v3.0 Production Ready
            </span>
          </motion.div>
          
          <motion.h1 
            className="lg:col-span-7 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 font-['Space_Grotesk']"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Intelligent Knowledge Base <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-sky-300">
              Designed for fast, grounded answers
            </span>
          </motion.h1>
          
          <motion.p 
            className="lg:col-span-7 max-w-2xl text-base sm:text-lg text-zinc-400 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Upload documents, index them in your vector store, and chat with a multi-agent RAG workflow that stays grounded and fast.
          </motion.p>
          
          <motion.div 
            className="lg:col-span-7 flex flex-col sm:flex-row items-center justify-start gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {user ? (
              <Link to="/documents">
                <Button size="lg" className="w-full sm:w-auto group">
                  Go to Dashboard
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/register">
                  <Button size="lg" className="w-full sm:w-auto">Start for free</Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">Sign in</Button>
                </Link>
              </>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="lg:col-span-5"
          >
            <div className="bg-[#121720]/70 border border-zinc-800/70 rounded-3xl p-6 backdrop-blur-xl shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)]">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-indigo-300" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-zinc-400">Workspace</p>
                  <h3 className="text-lg font-semibold text-zinc-100">{profileName}</h3>
                </div>
              </div>
              <div className="space-y-3 text-sm text-zinc-400">
                <div className="flex items-center justify-between">
                  <span>Signed in as</span>
                  <span className="text-zinc-200 truncate max-w-[60%] text-right">{profileEmail}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Timezone</span>
                  <span className="text-zinc-200">{profileTimezone}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Security</span>
                  <span className="text-emerald-300">Protected</span>
                </div>
              </div>
              <div className="mt-6 flex flex-col gap-3">
                {user ? (
                  <Link to="/documents">
                    <Button size="lg" className="w-full">Open Dashboard</Button>
                  </Link>
                ) : (
                  <Link to="/register">
                    <Button size="lg" className="w-full">Create your workspace</Button>
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Features Grid */}
      <section className="py-20 bg-[#0a0e14]/70 border-t border-zinc-800/50 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4 font-['Space_Grotesk']">Enterprise-grade architecture</h2>
            <p className="text-zinc-400 max-w-xl mx-auto">Built on a modern stack that keeps responses fast, grounded, and secure.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div 
              whileHover={{ y: -5 }}
              className="p-6 rounded-2xl bg-[#0f141c] border border-zinc-800/80 shadow-lg"
            >
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6 ring-1 ring-blue-500/20">
                <Database className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Supabase + pgvector</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Securely store documents in Supabase Storage and embeddings in Postgres with pgvector. Fully isolated via Row Level Security (RLS).
              </p>
            </motion.div>

            <motion.div 
              whileHover={{ y: -5 }}
              className="p-6 rounded-2xl bg-[#0f141c] border border-zinc-800/80 shadow-lg"
            >
              <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-6 ring-1 ring-purple-500/20">
                <Search className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">LangGraph Agents</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Multi-agent architecture that retrieves, grades relevance, and generates answers. Includes self-correction to avoid hallucinations.
              </p>
            </motion.div>

            <motion.div 
              whileHover={{ y: -5 }}
              className="p-6 rounded-2xl bg-[#0f141c] border border-zinc-800/80 shadow-lg"
            >
              <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mb-6 ring-1 ring-green-500/20">
                <Shield className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Secure by Design</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                JWT-based authentication, prompt injection guardrails, strict Pydantic schemas, and robust API rate limiting via FastAPI.
              </p>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="border-t border-zinc-800/50 py-8 bg-[#0b0f14]">
        <div className="max-w-7xl mx-auto px-4 text-center text-zinc-500 text-sm">
          &copy; {new Date().getFullYear()} Quick Knowledge. Built by Karthi.
        </div>
      </footer>
    </div>
  );
}

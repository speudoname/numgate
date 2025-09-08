import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs'
import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600">
      <nav className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-white">NumGate</h1>
            <div className="flex items-center gap-4">
              <SignedOut>
                <Link href="/sign-in" className="text-white hover:text-white/80">
                  Sign In
                </Link>
                <Link href="/sign-up" className="bg-white text-purple-600 px-4 py-2 rounded-md hover:bg-white/90">
                  Sign Up
                </Link>
              </SignedOut>
              <SignedIn>
                <Link href="/dashboard" className="text-white hover:text-white/80">
                  Dashboard
                </Link>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center">
          <h2 className="text-5xl font-bold text-white mb-6">
            Welcome to NumGate
          </h2>
          <p className="text-xl text-white/80 mb-8">
            Your gateway to a powerful multi-tenant platform
          </p>
          <SignedOut>
            <Link href="/sign-up" className="inline-block bg-white text-purple-600 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-white/90 transition">
              Get Started
            </Link>
          </SignedOut>
          <SignedIn>
            <Link href="/dashboard" className="inline-block bg-white text-purple-600 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-white/90 transition">
              Go to Dashboard
            </Link>
          </SignedIn>
        </div>
      </main>
    </div>
  )
}
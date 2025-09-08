import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function UsersPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4">
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-800">
            ← Back to Dashboard
          </Link>
        </div>
        
        <h1 className="text-3xl font-bold mb-6">Team Members</h1>
        
        <div className="bg-white p-8 rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-xl font-bold mb-4">Team Management Coming Soon</h2>
          <p className="text-gray-600 mb-4">
            Team member management will be available in a future update.
          </p>
          <p className="text-gray-600">
            For now, you can manage users and organizations through the{' '}
            <a 
              href="https://dashboard.clerk.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Clerk Dashboard
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
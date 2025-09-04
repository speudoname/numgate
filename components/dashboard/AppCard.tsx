interface AppCardProps {
  appName: string
  title: string
  description: string
  icon: string
  enabled: boolean
  onClick: () => void
}

export default function AppCard({ title, description, icon, enabled, onClick }: AppCardProps) {
  return (
    <div
      className={`relative bg-white p-6 rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
        !enabled ? 'opacity-60' : 'hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer'
      } transition-all`}
      onClick={() => enabled && onClick()}
    >
      <div className="text-3xl mb-3">{icon}</div>
      <h4 className="text-lg font-bold mb-1">{title}</h4>
      <p className="text-sm text-gray-600 mb-4">{description}</p>
      {enabled ? (
        <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
          Active
        </span>
      ) : (
        <span className="inline-block px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
          Coming Soon
        </span>
      )}
    </div>
  )
}
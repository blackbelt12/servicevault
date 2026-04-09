import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '@/db'

export default function Onboarding() {
  const navigate = useNavigate()
  const [businessName, setBusinessName] = useState('')
  const [yourName, setYourName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessName.trim()) {
      setError('Please enter your business name to continue.')
      return
    }
    setSaving(true)
    try {
      await db.settings.bulkPut([
        { key: 'businessName', value: businessName.trim() },
        { key: 'yourName',     value: yourName.trim() },
        { key: 'phone',        value: phone.trim() },
        { key: 'onboardingDone', value: 'true' },
      ])
      navigate('/clients', { replace: true })
    } catch (err) {
      console.error(err)
      setError('Something went wrong. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-[428px]">

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-green-600 rounded-2xl flex items-center justify-center shadow-md">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-10 h-10 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2a10 10 0 0 1 10 10" />
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10" />
              <path d="M12 8v4l3 3" />
              <path d="M2 12h4" />
              <path d="M18 12h4" />
            </svg>
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">
          Welcome to ServiceVault
        </h1>
        <p className="text-gray-500 text-center mb-8 text-base leading-relaxed">
          The field-ready app for lawn care &amp; landscaping businesses.
          Let's get you set up in seconds.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={businessName}
              onChange={e => { setBusinessName(e.target.value); setError('') }}
              placeholder="e.g. Green Thumb Landscaping"
              autoFocus
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base
                         focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Name{' '}
              <span className="text-gray-400 font-normal text-xs">(optional)</span>
            </label>
            <input
              type="text"
              value={yourName}
              onChange={e => setYourName(e.target.value)}
              placeholder="e.g. John Smith"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base
                         focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone{' '}
              <span className="text-gray-400 font-normal text-xs">(optional)</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="e.g. (555) 123-4567"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base
                         focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={!businessName.trim() || saving}
            className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800
                       text-white font-semibold py-4 rounded-xl text-base mt-2
                       transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Setting up…' : 'Get Started →'}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-6">
          Your data stays on your device — no account required.
        </p>
      </div>
    </div>
  )
}

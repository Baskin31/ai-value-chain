import React, { useState } from 'react'
import { createProfile, markProfileComplete } from '../../lib/api'
import BeliefStep from './BeliefStep'
import WhyStep from './WhyStep'
import PrinciplesStep from './PrinciplesStep'
import RolesStep from './RolesStep'

const TOTAL_STEPS = 5

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(1)
  const [profileId, setProfileId] = useState(null)
  const [profileName, setProfileName] = useState('')
  const [nameError, setNameError] = useState('')
  const [complete, setComplete] = useState(false)

  function handleNext() {
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1)
    } else {
      setComplete(true)
    }
  }

  function handleBack() {
    if (step > 2) setStep((s) => s - 1)
  }

  async function handleNameContinue() {
    const trimmed = profileName.trim().slice(0, 30)
    if (!trimmed) {
      setNameError('Please enter a name for this profile.')
      return
    }
    const profile = await createProfile(trimmed)
    setProfileId(profile.profile_id)
    setStep(2)
  }

  async function handleFinish() {
    const profile = profileId ? await markProfileComplete(profileId) : null
    onComplete(profile)
  }

  if (complete) {
    return (
      <div className="flex h-screen items-center justify-center bg-parchment-100">
        <div className="max-w-lg text-center px-8">
          <svg
            className="mx-auto mb-8 text-sage-500"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
          </svg>
          <h1 className="font-serif text-3xl text-text-primary mb-5 leading-snug">
            Your foundation is set.
          </h1>
          <p className="text-text-secondary text-base leading-relaxed mb-10">
            You've articulated what you believe, why you're here, how you operate,
            and who you serve. This is where everything else will grow from.
          </p>
          <button
            onClick={handleFinish}
            className="btn-primary px-8 py-3 text-base"
          >
            Enter Lodestar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-parchment-100 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 h-14 border-b border-border-light flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4D7C6F" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
          </svg>
          <span className="font-serif text-base text-text-primary">Lodestar</span>
        </div>
        <span className="text-sm text-text-tertiary">Step {step} of {TOTAL_STEPS}</span>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-parchment-300">
        <div
          className="h-full bg-sage-500 transition-all duration-500"
          style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
        />
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto py-16 px-8">
          {step === 1 && (
            <div>
              <h2 className="font-serif text-3xl text-text-primary mb-3 leading-snug">
                Let's start with a name.
              </h2>
              <p className="text-text-secondary text-base leading-relaxed mb-8">
                Profiles keep your values, roles, and goals separate. Give this one a name — your own name, a context like "Work", or anything that feels right.
              </p>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-secondary">
                  Profile name
                </label>
                <input
                  autoFocus
                  type="text"
                  value={profileName}
                  onChange={(e) => {
                    setProfileName(e.target.value.slice(0, 30))
                    setNameError('')
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleNameContinue() }}
                  placeholder="e.g. Alex, Work, Personal"
                  maxLength={30}
                  className="input-base w-full"
                />
                <div className="flex items-center justify-between">
                  {nameError
                    ? <p className="text-xs text-red-500">{nameError}</p>
                    : <span />
                  }
                  <span className="text-xs text-text-tertiary">{profileName.length}/30</span>
                </div>
              </div>
              <div className="mt-8">
                <button onClick={handleNameContinue} className="btn-primary px-6 py-2.5">
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <BeliefStep onNext={handleNext} />
          )}
          {step === 3 && (
            <WhyStep onNext={handleNext} onBack={handleBack} />
          )}
          {step === 4 && (
            <PrinciplesStep onNext={handleNext} onBack={handleBack} />
          )}
          {step === 5 && (
            <RolesStep onNext={handleNext} onBack={handleBack} />
          )}
        </div>
      </div>
    </div>
  )
}

import React, { useState } from 'react'
import { setAppState } from '../../lib/api'
import BeliefStep from './BeliefStep'
import WhyStep from './WhyStep'
import PrinciplesStep from './PrinciplesStep'
import RolesStep from './RolesStep'

const TOTAL_STEPS = 4

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(1)
  const [complete, setComplete] = useState(false)

  function handleNext() {
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1)
    } else {
      // After step 4 saved, show completion screen
      setComplete(true)
    }
  }

  function handleBack() {
    if (step > 1) setStep((s) => s - 1)
  }

  async function handleFinish() {
    await setAppState('onboarding_complete', 'true')
    onComplete()
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
            Enter Compass
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
          <span className="font-serif text-base text-text-primary">Compass</span>
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
            <BeliefStep onNext={handleNext} />
          )}
          {step === 2 && (
            <WhyStep onNext={handleNext} onBack={handleBack} />
          )}
          {step === 3 && (
            <PrinciplesStep onNext={handleNext} onBack={handleBack} />
          )}
          {step === 4 && (
            <RolesStep onNext={handleNext} onBack={handleBack} />
          )}
        </div>
      </div>
    </div>
  )
}

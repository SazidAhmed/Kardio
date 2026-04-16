import { ref } from 'vue'

// Global mute state shared across all instances
const isMuted = ref(false)

// Global audio context - created lazily and only resumed within user gestures
let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null

  if (!audioContext) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (AudioContextClass) {
      audioContext = new AudioContextClass()
    }
  }
  return audioContext
}

async function ensureAudioContextReady(): Promise<boolean> {
  const ctx = getAudioContext()
  if (!ctx) return false

  // Mobile browsers require audio context to be resumed within a user gesture
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume()
    } catch (e) {
      // Silently fail - audio is not critical
      return false
    }
  }
  return true
}

export function useAudioFeedback() {
  function setMuted(muted: boolean) {
    isMuted.value = muted
  }

  function getMuted() {
    return isMuted.value
  }

  async function playBeep(frequency: number = 800, duration: number = 0.15, type: OscillatorType = 'sine') {
    const ctx = getAudioContext()
    if (!ctx || isMuted.value) return

    // Ensure context is ready (critical for mobile)
    const ready = await ensureAudioContextReady()
    if (!ready) return

    try {
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.frequency.value = frequency
      oscillator.type = type

      gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + duration)
    } catch {
      // Silently fail - audio is not critical
    }
  }

  async function playCountdown() {
    // 3-2-1 pattern: higher pitch for each count
    const ctx = getAudioContext()
    if (!ctx) return

    // Ensure context is ready
    const ready = await ensureAudioContextReady()
    if (!ready) return

    // 3
    setTimeout(() => playBeep(600, 0.2), 0)
    // 2
    setTimeout(() => playBeep(800, 0.2), 1000)
    // 1
    setTimeout(() => playBeep(1000, 0.3), 2000)
  }

  async function playPhaseStart() {
    // A pleasant chime for phase start
    const ctx = getAudioContext()
    if (!ctx || isMuted.value) return

    // Ensure context is ready (critical for mobile)
    const ready = await ensureAudioContextReady()
    if (!ready) return

    try {
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.frequency.setValueAtTime(523.25, ctx.currentTime) // C5
      oscillator.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.1) // C6

      gainNode.gain.setValueAtTime(0.2, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.5)
    } catch {
      // Silently fail - audio is not critical
    }
  }

  function speak(text: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || isMuted.value) return

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.0
    utterance.pitch = 1.0
    utterance.volume = 1.0

    // Try to use a good English voice
    const voices = window.speechSynthesis.getVoices()
    const preferredVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel'))
    if (preferredVoice) {
      utterance.voice = preferredVoice
    }

    window.speechSynthesis.speak(utterance)
  }

  function vibrate(pattern: number | number[] = 200) {
    if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return
    navigator.vibrate(pattern)
  }

  function vibrateIfEnabled(pattern: number | number[] = 200) {
    if (isMuted.value) return
    vibrate(pattern)
  }

  async function playPhaseChange(phaseName: string, secondsRemaining: number = 0) {
    // Announce the new phase
    const announcements: Record<string, string> = {
      warmup: 'Warm up',
      run: 'Start running',
      walk: 'Walk now',
      cooldown: 'Cool down',
    }

    const announcement = announcements[phaseName]
    if (announcement) {
      speak(announcement)
      await playPhaseStart()
      vibrateIfEnabled([100, 50, 100])
    }

    // If it's the final phase ending
    if (phaseName === 'cooldown' && secondsRemaining === 0) {
      setTimeout(() => {
        speak('Workout complete! Great job!')
        playBeep(1200, 0.5, 'sine')
        vibrateIfEnabled([200, 100, 200, 100, 400])
      }, 1000)
    }
  }

  function playCountdownBeep(secondsLeft: number) {
    // Play beeps for last 3 seconds of any phase
    if (secondsLeft <= 3 && secondsLeft > 0) {
      playBeep(1000 - (3 - secondsLeft) * 200, 0.15)
      vibrateIfEnabled(100)
    }
  }

  return {
    playBeep,
    playCountdown,
    playPhaseStart,
    playPhaseChange,
    playCountdownBeep,
    speak,
    vibrate,
    setMuted,
    getMuted,
  }
}

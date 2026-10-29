import { useState, useEffect, useRef } from 'react'
import { extractPolygon } from './lib/geojson'
import { assess, AssessmentError } from './lib/api'
import EntryScreen from './components/EntryScreen'
import LoadingScreen from './components/LoadingScreen'
import ErrorScreen from './components/ErrorScreen'
import ResultScreen from './components/ResultScreen'
import ResultBoundary from './components/ResultBoundary'

// GeoJSON handed over by PHAST as a base64-encoded FeatureCollection, read
// once when the module loads. null when absent or undecodable. #geo= keeps
// the parcel out of server and proxy logs, since browsers never send the
// fragment; ?geo= is still read for PHAST builds that predate it.
const GEO_AT_LOAD = (() => {
  const geoParam = new URLSearchParams(window.location.hash.slice(1)).get('geo')
    || new URLSearchParams(window.location.search).get('geo')
  if (!geoParam) return null
  try {
    // Older PHAST builds don't URL-encode the base64, so URLSearchParams
    // reads its '+' as a space. Base64 never contains a space, so turning
    // them back is safe.
    const bytes = Uint8Array.from(atob(geoParam.replaceAll(' ', '+')), char => char.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch {
    return null
  }
})()

// One screen at a time: entry → loading → result or error. A run always
// clears the previous result, so a failed run never leaves another parcel's
// verdict on screen.
function App() {
  const [input, setInput] = useState(GEO_AT_LOAD ?? '')
  // A parcel from PHAST starts on the loading screen; the effect below
  // sends it.
  const [screen, setScreen] = useState(() => (
    GEO_AT_LOAD === null ? { name: 'entry' } : { name: 'loading', startedAt: Date.now() }
  ))
  const controllerRef = useRef(null)

  // Sends the request and moves to the result or error screen. The caller
  // has already shown the loading screen.
  const execute = async (text) => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    try {
      const { geometry } = extractPolygon(text)
      const result = await assess(geometry, controller.signal)
      if (controller.signal.aborted) return
      setScreen({ name: 'result', result })
    } catch (err) {
      if (controller.signal.aborted) return
      const error = err instanceof AssessmentError ? err : new AssessmentError('invalid', err.message)
      setScreen({ name: 'error', error })
    }
  }

  const runAssessment = (text) => {
    setScreen({ name: 'loading', startedAt: Date.now() })
    execute(text)
  }

  const cancel = () => {
    controllerRef.current?.abort()
    setScreen({ name: 'entry' })
  }

  // A parcel sent from PHAST runs straight away. The ref keeps StrictMode's
  // second effect pass in dev from posting it twice.
  const autoRan = useRef(false)
  useEffect(() => {
    if (GEO_AT_LOAD === null || autoRan.current) return
    autoRan.current = true
    // Drops both #geo= and ?geo=.
    window.history.replaceState({}, '', window.location.pathname)
    // A request to an external system, which is what effects are for. State
    // only changes synchronously when the decoded GeoJSON fails to parse.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    execute(GEO_AT_LOAD)
  }, [])

  switch (screen.name) {
    case 'loading':
      return <LoadingScreen startedAt={screen.startedAt} onCancel={cancel} />
    case 'error':
      return (
        <ErrorScreen
          error={screen.error}
          onEdit={() => setScreen({ name: 'entry' })}
          onRetry={() => runAssessment(input)}
        />
      )
    case 'result':
      return (
        <ResultBoundary onNewAssessment={() => setScreen({ name: 'entry' })}>
          <ResultScreen result={screen.result} onNewAssessment={() => setScreen({ name: 'entry' })} />
        </ResultBoundary>
      )
    default:
      return <EntryScreen input={input} onInputChange={setInput} onRun={() => runAssessment(input)} />
  }
}

export default App

import { useState } from 'react'
import EILViz from './components/EILViz'
import './App.css'

function App() {
  const [geoJsonInput, setGeoJsonInput] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleRunAssessment = async () => {
    try {
      setLoading(true)
      setError(null)

      let parsedGeoJson;
      try {
        parsedGeoJson = JSON.parse(geoJsonInput)
      } catch (e) {
        throw new Error("Invalid JSON format")
      }

      // If it's a Feature, extract geometry, otherwise assume it's already a Geometry
      const geometry = parsedGeoJson.type === "Feature" ? parsedGeoJson.geometry : parsedGeoJson;

      const response = await fetch("http://127.0.0.1:8000/api/v1/assess", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          project_id: "web-ui-assessment",
          geometry: geometry,
          config: { mode: "compliance" }
        })
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || "Assessment failed")
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-layout">
      <div className="sidebar">
        <h2>EIL-Calc</h2>
        <div className="input-group">
          <label>GeoJSON Polygon:</label>
          <textarea
            value={geoJsonInput}
            onChange={(e) => setGeoJsonInput(e.target.value)}
            placeholder='{"type": "Polygon", "coordinates": [...] }'
            rows={15}
          />
        </div>
        <button
          onClick={handleRunAssessment}
          disabled={loading || !geoJsonInput.trim()}
        >
          {loading ? "Computing..." : "Run Assessment"}
        </button>
        {error && <div className="error-message">{error}</div>}
      </div>

      <div className="main-content">
        {data ? (
          <div className="viz-container">
            <EILViz data={data} />
          </div>
        ) : (
          <div className="empty-state">
            <p>Paste a GeoJSON polygon and click "Run Assessment" to view the EIL hazard map.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App

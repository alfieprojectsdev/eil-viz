import EILViz from './components/EILViz'
import sampleData from './data/sample_payload.json'
import './App.css'

function App() {
  return (
    <div className="app-container">
      <EILViz data={sampleData} />
    </div>
  )
}

export default App

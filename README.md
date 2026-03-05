# EIL-Viz: Earthquake-Induced Landslide Visualization

`eil-viz` is a React-based frontend web application designed to visually render the geospatial topological assessments produced by the `eil-calc` Python engine. It provides an intuitive interface for assessing a land parcel's susceptibility to Earthquake-Induced Landslides (EIL).

This project is built using [Vite](https://vitejs.dev/) and React.

## Features

- **Dynamic GeoJSON Input:** Accepts raw GeoJSON polygon payloads via a sidebar input.
- **Topological Heatmaps:** Renders high-resolution 2D matrices of geomorphological Slope Units (`_viz_grid`).
- **Elevation Profiles:** Visualizes steepest-descent elevation and runout routing paths for depositional hazard assessment (`_viz_transect`).
- **Live HTTP Integration:** Communicates directly with the `eil-calc` FastAPI backend to compute and display hazard assessments in real-time.

## Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- The local `eil-calc` backend must be running to process the geometry (see backend instructions).

## Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone git@github.com:alfieprojectsdev/eil-viz.git
   cd eil-viz
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5173`.

## Usage

1. **Start the Backend:** Ensure the `eil-calc` FastAPI server is running. Typically, you do this from the backend repository:
   ```bash
   uv run uvicorn api:app --port 8000
   ```
2. **Access the Frontend:** Open the `eil-viz` React application in your browser (usually `http://localhost:5173`).
3. **Assess a Parcel:** 
   - Paste a valid GeoJSON Polygon representation into the sidebar textbox.
   - Click **Run Assessment**.
   - The frontend will `POST` your GeoJSON to the local backend, retrieve the processed terrain grids, and instantly render the visual hazard map.

## Project Structure

```text
eil-viz/
├── public/                 
├── src/
│   ├── components/
│   │   └── EILViz.jsx          # Core React Canvas visualization component
│   ├── data/
│   │   └── sample_payload.json # Fallback mock data for offline UI testing
│   ├── App.jsx                 # App layout, GeoJSON input, API fetch logic
│   ├── App.css                 # Sidebar and full-viewport specific styling
│   ├── index.css               # Global theme resets
│   └── main.jsx                # React mount point
├── index.html              
└── vite.config.js          
```

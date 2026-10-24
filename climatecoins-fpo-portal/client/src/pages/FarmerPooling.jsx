
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Circle,
  Popup,
  useMap,
  useMapEvents
} from "react-leaflet";

import {
  Activity,
  AlertCircle,
  Check,
  ChevronRight,
  CircleHelp,
  Filter,
  Layers,
  Leaf,
  LocateFixed,
  MapPin,
  RefreshCw,
  Save,
  Search,
  Satellite,
  SlidersHorizontal,
  Sprout,
  Users,
  X
} from "lucide-react";

import { api } from "../api";
import "leaflet/dist/leaflet.css";

const INTERVENTIONS = [
  { value: "all", label: "All interventions" },
  { value: "agroforestry", label: "Agroforestry" },
  { value: "water_management", label: "Water management" },
  {
    value: "improved_land_management",
    label: "Improved land management"
  },
  { value: "other", label: "Other" },
  { value: "unspecified", label: "Needs classification" }
];

const pretty = value =>
  String(value || "unspecified")
    .replaceAll("_", " ")
    .replace(/\b\w/g, letter => letter.toUpperCase());

const acres = value =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 1
  }).format(Number(value || 0));

const coordOk = farmer =>
  farmer.latitude !== null &&
  farmer.latitude !== undefined &&
  farmer.longitude !== null &&
  farmer.longitude !== undefined &&
  Number.isFinite(Number(farmer.latitude)) &&
  Number.isFinite(Number(farmer.longitude)) &&
  Number(farmer.latitude) >= -90 &&
  Number(farmer.latitude) <= 90 &&
  Number(farmer.longitude) >= -180 &&
  Number(farmer.longitude) <= 180;


/* Capture a farm location when the administrator clicks the map. */
function MapClickCapture({ enabled, onCapture }) {
  useMapEvents({
    click(event) {
      if (enabled) {
        onCapture({
          latitude: Number(event.latlng.lat.toFixed(6)),
          longitude: Number(event.latlng.lng.toFixed(6))
        });
      }
    }
  });

  return null;
}


/* Zoom to the selected farmer or fit the map to all farm points. */
function FitMap({ selected, farmers, candidates, fitVersion }) {
  const map = useMap();

  useEffect(() => {
    if (selected && coordOk(selected)) {
      map.flyTo(
        [
          Number(selected.latitude),
          Number(selected.longitude)
        ],
        Math.max(map.getZoom(), 11),
        { duration: 0.6 }
      );
    }
  }, [selected?.id, map]);

  useEffect(() => {
    if (fitVersion === 0) return;

    const points = [];

    farmers.filter(coordOk).forEach(farmer => {
      points.push([
        Number(farmer.latitude),
        Number(farmer.longitude)
      ]);
    });

    candidates.forEach(candidate => {
      if (candidate.centroid) {
        points.push([
          candidate.centroid.latitude,
          candidate.centroid.longitude
        ]);
      }
    });

    if (points.length > 1) {
      map.fitBounds(points, {
        padding: [28, 28],
        maxZoom: 12
      });
    } else if (points.length === 1) {
      map.setView(points[0], 11);
    }
  }, [fitVersion, map]);

  return null;
}


function Metric({ icon: Icon, label, value, note, tone = "" }) {
  return (
    <div className="pool-metric">
      <div className={`pool-metric-icon ${tone}`}>
        <Icon size={17} />
      </div>

      <span>{label}</span>
      <strong>{value}</strong>

      {note && <small>{note}</small>}
    </div>
  );
}


export default function FarmerPooling() {
  const [farmers, setFarmers] = useState([]);
  const [savedPools, setSavedPools] = useState([]);
  const [run, setRun] = useState(null);

  const [selectedFarmerId, setSelectedFarmerId] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [selectedSavedPool, setSelectedSavedPool] = useState(null);

  const [query, setQuery] = useState("");
  const [intervention, setIntervention] = useState("all");

  const [radiusKm, setRadiusKm] = useState(5);
  const [minPoints, setMinPoints] = useState(3);
  const [minFarmers, setMinFarmers] = useState(5);
  const [minAcres, setMinAcres] = useState(0);

  const [showSatellite, setShowSatellite] = useState(false);
  const [captureMode, setCaptureMode] = useState(false);
  const [capturedPoint, setCapturedPoint] = useState(null);
  const [editIntervention, setEditIntervention] =
    useState("agroforestry");

  const [savingLocation, setSavingLocation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [fitVersion, setFitVersion] = useState(0);
  const [poolName, setPoolName] = useState("");
  const [poolDetail, setPoolDetail] = useState(null);


  /* Load farmers and saved pools from the authenticated API. */
  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [farmerData, poolData] = await Promise.all([
        api("/pools/farmers"),
        api("/pools")
      ]);

      setFarmers(farmerData.farmers || []);
      setSavedPools(poolData.pools || []);
    } catch (e) {
      setError(e.message || "Could not load farmer data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);


  const selectedFarmer =
    farmers.find(farmer => farmer.id === selectedFarmerId) || null;

  const geoFarmers = useMemo(
    () => farmers.filter(coordOk),
    [farmers]
  );

  const filteredFarmers = useMemo(() => {
    return farmers.filter(farmer => {
      const searchable = [
        farmer.full_name,
        farmer.farmer_code,
        farmer.village,
        farmer.district
      ].join(" ").toLowerCase();

      const matchesQuery = searchable.includes(query.toLowerCase());

      const matchesIntervention =
        intervention === "all" ||
        String(farmer.intervention_type || "unspecified").toLowerCase()
          === intervention;

      return matchesQuery && matchesIntervention;
    });
  }, [farmers, query, intervention]);


  const candidates = run?.candidates || [];

  const visibleCandidate =
    candidates.find(
      candidate => candidate.candidateKey === selectedCandidate
    ) || null;

  const selectedMemberIds = new Set(
    visibleCandidate?.farmerIds ||
    poolDetail?.farmers?.map(farmer => farmer.id) ||
    []
  );

  const totalCandidateAcres = candidates.reduce(
    (sum, candidate) => sum + Number(candidate.totalAcres || 0),
    0
  );


  /* Run intervention-aware geodesic DBSCAN on the backend. */
  async function runClustering() {
    setBusy(true);
    setError("");
    setNotice("");
    setSelectedSavedPool(null);
    setPoolDetail(null);

    try {
      const result = await api("/pools/cluster", {
        method: "POST",
        body: JSON.stringify({
          interventionType: intervention,
          radiusKm: Number(radiusKm),
          minPoints: Number(minPoints),
          minFarmers: Number(minFarmers),
          minTotalAcres: Number(minAcres)
        })
      });

      setRun(result);

      setSelectedCandidate(
        result.candidates?.[0]?.candidateKey || null
      );

      setFitVersion(version => version + 1);

      setNotice(
        `Analysis complete: ${
          result.summary.clustersFound
        } candidate pool(s), ${
          result.summary.unassignedFarmers
        } unassigned farmer(s).`
      );
    } catch (e) {
      setError(e.message || "Clustering failed.");
    } finally {
      setBusy(false);
    }
  }


  /* Save one candidate returned by a particular clustering run. */
  async function savePool(candidate) {
    if (!run?.runId || !candidate) return;

    setBusy(true);
    setError("");

    try {
      const response = await api("/pools", {
        method: "POST",
        body: JSON.stringify({
          runId: run.runId,
          candidateKey: candidate.candidateKey,
          name:
            poolName.trim() ||
            `${pretty(candidate.interventionType)} · ${
              candidate.candidateKey
            }`
        })
      });

      setNotice(
        `${response.pool.name} saved as ${
          response.pool.status.replaceAll("_", " ")
        }.`
      );

      setPoolName("");
      setSelectedCandidate(candidate.candidateKey);

      await refresh();
    } catch (e) {
      setError(e.message || "Could not save the pool.");
    } finally {
      setBusy(false);
    }
  }


  /* Retrieve the members and metrics of a saved pool. */
  async function openSavedPool(pool) {
    setError("");
    setSelectedSavedPool(pool);
    setSelectedCandidate(null);
    setPoolDetail(null);

    try {
      const data = await api(`/pools/${pool.id}`);

      setPoolDetail(data);
      setFitVersion(version => version + 1);
    } catch (e) {
      setError(e.message || "Could not load pool details.");
    }
  }


  async function updatePoolStatus(status) {
    if (!selectedSavedPool) return;

    setBusy(true);
    setError("");

    try {
      const data = await api(`/pools/${selectedSavedPool.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });

      setSelectedSavedPool(data.pool);

      setNotice(
        `Pool status updated to ${status.replaceAll("_", " ")}.`
      );

      await refresh();
    } catch (e) {
      setError(e.message || "Could not update pool status.");
    } finally {
      setBusy(false);
    }
  }


  /* Save coordinates selected by clicking the map. */
  async function saveCoordinates() {
    if (!selectedFarmer || !capturedPoint) return;

    setSavingLocation(true);
    setError("");

    try {
      await api(
        `/pools/farmers/${selectedFarmer.id}/location`,
        {
          method: "PATCH",
          body: JSON.stringify({
            latitude: capturedPoint.latitude,
            longitude: capturedPoint.longitude,
            interventionType: editIntervention,
            locationSource: "map_pin",
            plotAreaAcres:
              selectedFarmer.plot_area_acres == null
                ? null
                : Number(selectedFarmer.plot_area_acres)
          })
        }
      );

      setNotice(
        `Location saved for ${selectedFarmer.full_name}.`
      );

      setCaptureMode(false);
      setCapturedPoint(null);

      await refresh();
    } catch (e) {
      setError(e.message || "Could not save farm coordinates.");
    } finally {
      setSavingLocation(false);
    }
  }


  const mapCenter = geoFarmers.length
    ? [
        Number(geoFarmers[0].latitude),
        Number(geoFarmers[0].longitude)
      ]
    : [12.9716, 77.5946];


  function markerColor(farmer) {
    if (selectedMemberIds.has(farmer.id)) return "#e2b64b";

    if (run?.unassigned?.some(item => item.id === farmer.id)) {
      return "#d18d5e";
    }

    if (farmer.synthetic_demo || farmer.location_source === "demo") {
      return "#79a98a";
    }

    return "#376b4b";
  }


  return (
    <div className="pooling-page">

      {/* Page heading */}
      <div className="page-heading pooling-heading">
        <div>
          <div className="eyebrow">GEOSPATIAL INTELLIGENCE</div>
          <h1>Farmer pooling</h1>
          <p>
            Build compact, methodology-compatible farmer groups
            for carbon projects.
          </p>
        </div>

        <div className="pool-heading-actions">
          <span className="pool-live">
            <i /> {geoFarmers.length} geolocated
          </span>

          <button
            className="btn secondary"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>


      {error && (
        <div className="alert error">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {notice && (
        <div className="pool-notice">
          <Check size={16} />
          <span>{notice}</span>

          <button
            onClick={() => setNotice("")}
            aria-label="Dismiss notice"
          >
            <X size={14} />
          </button>
        </div>
      )}


      {/* Dashboard metrics */}
      <div className="pool-metrics-grid">
        <Metric
          icon={Users}
          label="Farmers in FPO"
          value={farmers.length}
          note={`${geoFarmers.length} with coordinates`}
        />

        <Metric
          icon={Layers}
          label="Candidate pools"
          value={candidates.length}
          note="From latest run"
          tone="sage"
        />

        <Metric
          icon={Sprout}
          label="Land in candidates"
          value={`${acres(totalCandidateAcres)} ac`}
          note="Not a carbon-credit estimate"
          tone="gold"
        />

        <Metric
          icon={MapPin}
          label="Saved pools"
          value={savedPools.length}
          note={`${
            savedPools.filter(
              pool => pool.status === "ready_for_verification"
            ).length
          } ready for review`}
          tone="blue"
        />
      </div>


      <div className="pooling-workspace">

        {/* LEFT COLUMN */}
        <aside className="pool-left-column">

          {/* Clustering controls */}
          <section className="panel pool-control-panel">
            <div className="pool-section-title">
              <div>
                <span className="eyebrow">CLUSTER ENGINE</span>
                <h3>Configure pooling</h3>
              </div>

              <SlidersHorizontal size={18} />
            </div>

            <label className="pool-field">
              Carbon intervention

              <select
                value={intervention}
                onChange={event => setIntervention(event.target.value)}
              >
                {INTERVENTIONS.map(item => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="pool-field">
              <div className="pool-label-row">
                <label htmlFor="pool-radius">
                  Neighbourhood radius
                </label>
                <b>{radiusKm} km</b>
              </div>

              <input
                id="pool-radius"
                type="range"
                min="0.5"
                max="25"
                step="0.5"
                value={radiusKm}
                onChange={event =>
                  setRadiusKm(Number(event.target.value))
                }
              />

              <div className="range-caption">
                <span>Dense/local</span>
                <span>Wider region</span>
              </div>
            </div>

            <div className="pool-control-grid">
              <label className="pool-field">
                Minimum points

                <input
                  type="number"
                  min="2"
                  max="100"
                  value={minPoints}
                  onChange={event =>
                    setMinPoints(
                      Math.max(
                        2,
                        Math.min(100, Number(event.target.value) || 2)
                      )
                    )
                  }
                />
              </label>

              <label className="pool-field">
                Minimum pool size

                <input
                  type="number"
                  min="2"
                  max="500"
                  value={minFarmers}
                  onChange={event =>
                    setMinFarmers(
                      Math.max(
                        2,
                        Math.min(500, Number(event.target.value) || 2)
                      )
                    )
                  }
                />
              </label>
            </div>

            <label className="pool-field">
              Minimum total land (acres)

              <input
                type="number"
                min="0"
                step="0.5"
                value={minAcres}
                onChange={event =>
                  setMinAcres(
                    Math.max(0, Number(event.target.value) || 0)
                  )
                }
              />

              <small>
                Set 0 to rank without a land-area threshold.
              </small>
            </label>

            <button
              className="btn primary full pool-run-btn"
              onClick={runClustering}
              disabled={busy || loading}
            >
              <Activity size={16} />

              {busy
                ? "Processing…"
                : "Run geospatial clustering"}
            </button>

            <div className="pool-method-note">
              <AlertCircle size={15} />
              <p>
                Farmers are partitioned by intervention before
                Haversine-distance DBSCAN. Candidate ranking is a
                screening aid, not carbon-credit certification.
              </p>
            </div>
          </section>


          {/* Farmer directory */}
          <section className="panel pool-farmer-panel">
            <div className="pool-section-title">
              <div>
                <h3>Registered farmers</h3>
                <p>{filteredFarmers.length} matching records</p>
              </div>

              <Users size={18} />
            </div>

            <div className="pool-search">
              <Search size={15} />

              <input
                placeholder="Search farmer or village…"
                value={query}
                onChange={event => setQuery(event.target.value)}
              />

              <Filter size={14} />
            </div>

            <div className="pool-farmer-list">
              {loading ? (
                <div className="pool-empty">Loading farmers…</div>
              ) : (
                filteredFarmers.map(farmer => (
                  <button
                    key={farmer.id}
                    className={`pool-farmer-row ${
                      selectedFarmerId === farmer.id ? "selected" : ""
                    }`}
                    onClick={() => {
                      setSelectedFarmerId(farmer.id);

                      setEditIntervention(
                        farmer.intervention_type &&
                        farmer.intervention_type !== "unspecified"
                          ? farmer.intervention_type
                          : "agroforestry"
                      );

                      setCapturedPoint(
                        coordOk(farmer)
                          ? {
                              latitude: Number(farmer.latitude),
                              longitude: Number(farmer.longitude)
                            }
                          : null
                      );

                      setSelectedSavedPool(null);
                    }}
                  >
                    <span
                      className={`pool-farmer-avatar ${
                        farmer.synthetic_demo ? "demo" : ""
                      }`}
                    >
                      {(farmer.full_name || "F")
                        .split(" ")
                        .map(part => part[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </span>

                    <span className="pool-farmer-info">
                      <b>{farmer.full_name}</b>

                      <small>
                        {farmer.village}, {farmer.district}
                      </small>

                      <span className="pool-farmer-tags">
                        <em>{pretty(farmer.intervention_type)}</em>

                        {!coordOk(farmer) && (
                          <em className="warning-tag">
                            No coordinates
                          </em>
                        )}

                        {farmer.synthetic_demo && (
                          <em className="demo-tag">Demo point</em>
                        )}
                      </span>
                    </span>

                    <span className="pool-farmer-acres">
                      {acres(farmer.acres)} ac
                      <ChevronRight size={14} />
                    </span>
                  </button>
                ))
              )}

              {!loading && !filteredFarmers.length && (
                <div className="pool-empty">
                  No farmers match these filters.
                </div>
              )}
            </div>


            {/* Coordinate editor */}
            {selectedFarmer && (
              <div className="pool-location-editor">
                <div className="pool-location-title">
                  <div>
                    <b>Farm location</b>

                    <small>
                      {selectedFarmer.farmer_code} ·{" "}
                      {coordOk(selectedFarmer)
                        ? "Coordinates recorded"
                        : "Coordinates missing"}
                    </small>
                  </div>

                  <button
                    className="icon-btn"
                    onClick={() => {
                      setSelectedFarmerId(null);
                      setCapturedPoint(null);
                      setCaptureMode(false);
                    }}
                  >
                    <X size={15} />
                  </button>
                </div>

                <p>
                  {captureMode
                    ? "Click the map to place a location pin, then save it."
                    : "To add or correct a farm point, enable pin placement and click the map."}
                </p>

                <label className="pool-field">
                  Intervention type

                  <select
                    value={editIntervention}
                    onChange={event =>
                      setEditIntervention(event.target.value)
                    }
                  >
                    {INTERVENTIONS.filter(
                      item => item.value !== "all"
                    ).map(item => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

                {capturedPoint && (
                  <div className="captured-coords">
                    {capturedPoint.latitude.toFixed(5)},{" "}
                    {capturedPoint.longitude.toFixed(5)}
                  </div>
                )}

                <div className="pool-editor-actions">
                  <button
                    className="btn secondary"
                    onClick={() => {
                      setCaptureMode(value => !value);
                      setCapturedPoint(null);
                    }}
                  >
                    <LocateFixed size={14} />

                    {captureMode ? "Cancel pin" : "Place map pin"}
                  </button>

                  <button
                    className="btn primary"
                    onClick={saveCoordinates}
                    disabled={!capturedPoint || savingLocation}
                  >
                    <Save size={14} />

                    {savingLocation ? "Saving…" : "Save location"}
                  </button>
                </div>
              </div>
            )}
          </section>


          {/* Saved pools */}
          <section className="panel pool-saved-panel">
            <div className="pool-section-title">
              <div>
                <h3>Saved pools</h3>
                <p>Drafts and review status</p>
              </div>

              <Layers size={18} />
            </div>

            {savedPools.length ? (
              savedPools.map(pool => (
                <button
                  key={pool.id}
                  className={`saved-pool-row ${
                    selectedSavedPool?.id === pool.id ? "selected" : ""
                  }`}
                  onClick={() => openSavedPool(pool)}
                >
                  <span className="saved-pool-icon">
                    <Sprout size={16} />
                  </span>

                  <span className="saved-pool-info">
                    <b>{pool.name}</b>

                    <small>
                      {pool.member_count ?? pool.farmer_count ?? 0} farmers
                      {" · "}
                      {acres(pool.total_acres)} acres
                    </small>
                  </span>

                  <span className={`pool-status ${pool.status}`}>
                    {pool.status.replaceAll("_", " ")}
                  </span>
                </button>
              ))
            ) : (
              <div className="pool-empty small-empty">
                Saved candidate pools will appear here.
              </div>
            )}
          </section>
        </aside>


        {/* RIGHT COLUMN: INTERACTIVE MAP AND RESULTS */}
        <section className="pool-map-column">

          <div className="panel pool-map-panel">
            <div className="pool-map-toolbar">
              <div>
                <span className="eyebrow">FPO NETWORK</span>
                <h3>Farm geography</h3>
                <p>
                  Inspect farmer locations and discover dense,
                  intervention-compatible groups.
                </p>
              </div>

              <div className="map-toolbar-actions">
                <button
                  className={`btn ${
                    showSatellite ? "primary" : "secondary"
                  }`}
                  onClick={() => setShowSatellite(value => !value)}
                >
                  <Satellite size={15} />

                  {showSatellite ? "Satellite" : "Street map"}
                </button>

                <button
                  className="icon-btn"
                  title="Fit all farmers"
                  onClick={() => setFitVersion(value => value + 1)}
                >
                  <LocateFixed size={17} />
                </button>
              </div>
            </div>

            <div className={`pool-map ${
              captureMode ? "capture-active" : ""
            }`}>
              <MapContainer
                center={mapCenter}
                zoom={geoFarmers.length ? 7 : 5}
                scrollWheelZoom
                className="pool-leaflet-map"
              >
                {showSatellite ? (
                  <TileLayer
                    attribution="Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics"
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  />
                ) : (
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                )}

                <MapClickCapture
                  enabled={captureMode}
                  onCapture={setCapturedPoint}
                />

                <FitMap
                  selected={selectedFarmer}
                  farmers={geoFarmers}
                  candidates={candidates}
                  fitVersion={fitVersion}
                />


                {/* Candidate geographic footprints */}
                {candidates.map(candidate =>
                  candidate.centroid ? (
                    <Circle
                      key={`radius-${candidate.candidateKey}`}
                      center={[
                        candidate.centroid.latitude,
                        candidate.centroid.longitude
                      ]}
                      radius={Math.max(
                        300,
                        Number(candidate.maxRadiusKm || 0) * 1000
                      )}
                      pathOptions={{
                        color: "#d3a63c",
                        weight: 2,
                        fillColor: "#e9cf81",
                        fillOpacity: 0.13,
                        dashArray: "5 5"
                      }}
                    />
                  ) : null
                )}


                {/* Individual farmer markers */}
                {filteredFarmers.filter(coordOk).map(farmer => (
                  <CircleMarker
                    key={farmer.id}
                    center={[
                      Number(farmer.latitude),
                      Number(farmer.longitude)
                    ]}
                    radius={
                      selectedFarmerId === farmer.id
                        ? 9
                        : selectedMemberIds.has(farmer.id)
                          ? 7
                          : 5.5
                    }
                    pathOptions={{
                      color:
                        selectedFarmerId === farmer.id
                          ? "#173d2c"
                          : "#fff",
                      weight: selectedFarmerId === farmer.id ? 3 : 1.5,
                      fillColor: markerColor(farmer),
                      fillOpacity: 0.95
                    }}
                    eventHandlers={{
                      click: () => {
                        setSelectedFarmerId(farmer.id);

                        setEditIntervention(
                          farmer.intervention_type &&
                          farmer.intervention_type !== "unspecified"
                            ? farmer.intervention_type
                            : "agroforestry"
                        );

                        setCapturedPoint({
                          latitude: Number(farmer.latitude),
                          longitude: Number(farmer.longitude)
                        });
                      }
                    }}
                  >
                    <Popup>
                      <div className="pool-popup">
                        <b>{farmer.full_name}</b>
                        <span>
                          {farmer.village}, {farmer.district}
                        </span>
                        <span>
                          {acres(farmer.acres)} acres ·{" "}
                          {pretty(farmer.intervention_type)}
                        </span>

                        {farmer.synthetic_demo && (
                          <em>Simulated demo coordinates</em>
                        )}
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}


                {/* Unsaved map pin */}
                {capturedPoint && (
                  <CircleMarker
                    center={[
                      capturedPoint.latitude,
                      capturedPoint.longitude
                    ]}
                    radius={10}
                    pathOptions={{
                      color: "#fff",
                      weight: 3,
                      fillColor: "#d3a63c",
                      fillOpacity: 1
                    }}
                  >
                    <Popup>Selected farm pin (not saved yet)</Popup>
                  </CircleMarker>
                )}


                {/* Selected candidate centroid */}
                {visibleCandidate?.centroid && (
                  <CircleMarker
                    center={[
                      visibleCandidate.centroid.latitude,
                      visibleCandidate.centroid.longitude
                    ]}
                    radius={13}
                    pathOptions={{
                      color: "#fff",
                      weight: 3,
                      fillColor: "#c59a2f",
                      fillOpacity: 0.9
                    }}
                  >
                    <Popup>
                      <b>{visibleCandidate.candidateKey}</b>
                      <br />
                      {visibleCandidate.farmerCount} farmers ·{" "}
                      {acres(visibleCandidate.totalAcres)} acres
                    </Popup>
                  </CircleMarker>
                )}
              </MapContainer>


              {captureMode && (
                <div className="map-capture-banner">
                  <LocateFixed size={15} />
                  Click the map to place the selected farmer's location
                </div>
              )}

              <div className="pool-map-legend">
                <span>
                  <i className="legend-dot forest" /> Farmers
                </span>
                <span>
                  <i className="legend-dot gold" /> Selected pool
                </span>
                <span>
                  <i className="legend-dot terracotta" /> Unassigned
                </span>
              </div>

              <div className="pool-map-zoom-note">
                <MapPin size={13} /> {geoFarmers.length} farm points
              </div>
            </div>

            <div className="pool-map-footer">
              <div>
                <span className="pool-map-footer-icon">
                  <Layers size={16} />
                </span>

                <div>
                  <b>
                    {showSatellite ? "Satellite imagery" : "Standard map"}
                  </b>

                  <small>
                    {showSatellite
                      ? "Imagery is a visual reference; it does not delineate farm boundaries."
                      : "Map markers represent recorded farm points, not parcel boundaries."}
                  </small>
                </div>
              </div>

              <span className="map-source">
                {showSatellite ? "ESRI IMAGERY" : "OPENSTREETMAP"}
              </span>
            </div>
          </div>


          {/* Selected farmer details */}
          {selectedFarmer && (
            <section className="panel selected-farmer-card">
              <div className="pool-detail-header">
                <div className="pool-detail-avatar">
                  <Sprout size={20} />
                </div>

                <div>
                  <span className="eyebrow">FARMER DETAIL</span>
                  <h3>{selectedFarmer.full_name}</h3>
                  <p>
                    {selectedFarmer.farmer_code} ·{" "}
                    {selectedFarmer.village}, {selectedFarmer.district}
                  </p>
                </div>

                <button
                  className="icon-btn"
                  onClick={() => setSelectedFarmerId(null)}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="pool-detail-grid">
                <div>
                  <span>Farm area</span>
                  <b>{acres(selectedFarmer.acres)} acres</b>
                </div>

                <div>
                  <span>Intervention</span>
                  <b>{pretty(selectedFarmer.intervention_type)}</b>
                </div>

                <div>
                  <span>Coordinates</span>
                  <b>
                    {coordOk(selectedFarmer)
                      ? `${Number(selectedFarmer.latitude).toFixed(4)}, ${
                          Number(selectedFarmer.longitude).toFixed(4)
                        }`
                      : "Not recorded"}
                  </b>
                </div>

                <div>
                  <span>Initial screening</span>
                  <b>{selectedFarmer.eligibility_status}</b>
                </div>
              </div>

              {selectedFarmer.synthetic_demo && (
                <div className="pool-inline-warning">
                  <AlertCircle size={14} />
                  Demo coordinates only. Replace with a verified farm
                  location before real project use.
                </div>
              )}
            </section>
          )}


          {/* Clustering results */}
          {run && (
            <section className="panel pool-results-panel">
              <div className="pool-results-heading">
                <div>
                  <span className="eyebrow">
                    LATEST ANALYSIS · RUN #{run.runId}
                  </span>
                  <h3>Pool candidates</h3>
                  <p>
                    Ranked by scale, compactness, intervention
                    consistency and estimated MRV efficiency.
                  </p>
                </div>

                <span className="pool-run-pill">
                  <Activity size={14} /> DBSCAN complete
                </span>
              </div>

              <div className="pool-results-stats">
                <div>
                  <b>{run.summary.clustersFound}</b>
                  <span>Clusters found</span>
                </div>

                <div>
                  <b>{run.summary.unassignedFarmers}</b>
                  <span>Unassigned</span>
                </div>

                <div>
                  <b>{run.summary.geolocatedFarmers}</b>
                  <span>Geolocated</span>
                </div>

                <div>
                  <b>{acres(run.summary.totalCandidateAcres)}</b>
                  <span>Candidate acres</span>
                </div>
              </div>


              {candidates.length ? (
                <div className="pool-candidate-list">
                  {candidates.map((candidate, index) => (
                    <article
                      key={candidate.candidateKey}
                      className={`pool-candidate ${
                        selectedCandidate === candidate.candidateKey
                          ? "active"
                          : ""
                      }`}
                    >
                      <button
                        className="pool-candidate-main"
                        onClick={() => {
                          setSelectedCandidate(candidate.candidateKey);
                          setSelectedSavedPool(null);
                          setPoolDetail(null);
                          setSelectedFarmerId(null);
                        }}
                      >
                        <span className="candidate-rank">
                          {String(index + 1).padStart(2, "0")}
                        </span>

                        <span className="candidate-content">
                          <span className="candidate-title-row">
                            <b>{candidate.candidateKey}</b>

                            <span
                              className={`pool-status ${
                                candidate.hardConstraints?.length
                                  ? "needs_review"
                                  : "draft"
                              }`}
                            >
                              {candidate.hardConstraints?.length
                                ? "Needs review"
                                : "Candidate"}
                            </span>
                          </span>

                          <small>
                            {pretty(candidate.interventionType)} ·{" "}
                            {candidate.farmerCount} farmers ·{" "}
                            {acres(candidate.totalAcres)} acres
                          </small>

                          <span className="candidate-progress">
                            <i
                              style={{
                                width: `${
                                  Math.max(
                                    0,
                                    Math.min(
                                      100,
                                      candidate.optimizationScore || 0
                                    )
                                  )
                                }%`
                              }}
                            />
                          </span>

                          <span className="candidate-micro">
                            Optimization score{" "}
                            <b>{candidate.optimizationScore}/100</b>
                            {" · "}Max spread {candidate.maxRadiusKm} km
                          </span>
                        </span>

                        <ChevronRight size={17} />
                      </button>


                      {selectedCandidate === candidate.candidateKey && (
                        <div className="candidate-expanded">
                          <div className="candidate-score-grid">
                            <div>
                              <span>Compactness</span>
                              <b>{candidate.compactnessScore}/100</b>
                            </div>

                            <div>
                              <span>MRV proxy</span>
                              <b>{candidate.mrvEfficiencyScore}/100</b>
                            </div>

                            <div>
                              <span>Eligible + consent</span>
                              <b>
                                {candidate.eligibleShare ?? "Not calculated"}
                                {candidate.eligibleShare != null ? "%" : ""}
                              </b>
                            </div>
                          </div>

                          {[
                            ...(candidate.hardConstraints || []),
                            ...(candidate.reviewReasons || [])
                          ].length > 0 && (
                            <div className="candidate-reasons">
                              <b>Review notes</b>

                              {[
                                ...(candidate.hardConstraints || []),
                                ...(candidate.reviewReasons || [])
                              ].map((reason, reasonIndex) => (
                                <span key={reasonIndex}>
                                  <AlertCircle size={13} />
                                  {reason}
                                </span>
                              ))}
                            </div>
                          )}

                          <label className="pool-field">
                            Pool name

                            <input
                              value={poolName}
                              onChange={event =>
                                setPoolName(event.target.value)
                              }
                              placeholder={`${pretty(
                                candidate.interventionType
                              )} · ${candidate.candidateKey}`}
                            />
                          </label>

                          <button
                            className="btn primary full"
                            onClick={() => savePool(candidate)}
                            disabled={busy}
                          >
                            <Save size={15} />
                            Save candidate pool
                          </button>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="pool-empty pool-large-empty">
                  <CircleHelp size={24} />
                  <b>No clusters discovered</b>
                  <span>
                    Try increasing the radius, lowering minimum points,
                    or adding valid farmer coordinates.
                  </span>
                </div>
              )}


              {/* Farmers not assigned to any candidate */}
              {run.unassigned?.length > 0 && (
                <div className="unassigned-block">
                  <div className="unassigned-heading">
                    <div>
                      <h4>Unassigned farmers</h4>
                      <p>These farmers were not forced into a pool.</p>
                    </div>

                    <span>{run.unassigned.length}</span>
                  </div>

                  {run.unassigned.slice(0, 8).map(farmer => (
                    <div
                      className="unassigned-row"
                      key={`${farmer.id}-${farmer.unassignedReason}`}
                    >
                      <span>
                        <b>{farmer.full_name}</b>
                        <small>
                          {farmer.farmer_code} · {farmer.village}
                        </small>
                      </span>

                      <em>{farmer.unassignedReason}</em>
                    </div>
                  ))}

                  {run.unassigned.length > 8 && (
                    <small className="muted">
                      And {run.unassigned.length - 8} more…
                    </small>
                  )}
                </div>
              )}
            </section>
          )}


          {/* Saved pool detail and review actions */}
          {selectedSavedPool && poolDetail && (
            <section className="panel pool-results-panel">
              <div className="pool-results-heading">
                <div>
                  <span className="eyebrow">
                    SAVED POOL · {selectedSavedPool.pool_code}
                  </span>

                  <h3>{selectedSavedPool.name}</h3>

                  <p>
                    {pretty(selectedSavedPool.intervention_type)} ·{" "}
                    {poolDetail.farmers.length} members ·{" "}
                    {acres(selectedSavedPool.total_acres)} acres
                  </p>
                </div>

                <button
                  className="icon-btn"
                  onClick={() => {
                    setSelectedSavedPool(null);
                    setPoolDetail(null);
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="pool-detail-grid">
                <div>
                  <span>Optimization score</span>
                  <b>{selectedSavedPool.optimization_score}/100</b>
                </div>

                <div>
                  <span>Compactness</span>
                  <b>{selectedSavedPool.compactness_score}/100</b>
                </div>

                <div>
                  <span>MRV efficiency proxy</span>
                  <b>{selectedSavedPool.mrv_efficiency_score}/100</b>
                </div>

                <div>
                  <span>Status</span>
                  <b>
                    {selectedSavedPool.status.replaceAll("_", " ")}
                  </b>
                </div>
              </div>

              {selectedSavedPool.review_notes && (
                <div className="pool-inline-warning">
                  <AlertCircle size={14} />
                  {selectedSavedPool.review_notes}
                </div>
              )}

              <div className="saved-pool-actions">
                <button
                  className="btn secondary"
                  onClick={() => updatePoolStatus("draft")}
                  disabled={busy}
                >
                  Keep as draft
                </button>

                <button
                  className="btn primary"
                  onClick={() =>
                    updatePoolStatus("ready_for_verification")
                  }
                  disabled={busy}
                >
                  Mark ready for review
                  <ChevronRight size={15} />
                </button>
              </div>

              <div className="pool-member-list">
                <h4>Pool members</h4>

                {poolDetail.farmers.map(farmer => (
                  <button
                    key={farmer.id}
                    onClick={() => {
                      setSelectedFarmerId(farmer.id);

                      setCapturedPoint(
                        coordOk(farmer)
                          ? {
                              latitude: Number(farmer.latitude),
                              longitude: Number(farmer.longitude)
                            }
                          : null
                      );
                    }}
                  >
                    <span>
                      {farmer.full_name}
                      <small>
                        {farmer.village}, {farmer.district}
                      </small>
                    </span>

                    <b>{acres(farmer.acres)} ac</b>
                  </button>
                ))}
              </div>

              <p className="pool-disclaimer">
                “Ready for review” is an internal workflow status only.
                It does not mean a project has been independently verified
                or carbon credits issued.
              </p>
            </section>
          )}
        </section>
      </div>


      <div className="pooling-footnote">
        <Leaf size={15} />
        <span>
          Methodology-aware pooling · geodesic distance · explainable
          candidate ranking
        </span>

        <span className="footnote-separator">•</span>

        <span>Farm markers are not verified field boundaries</span>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";

const LIFTS = ["Squat", "Bench Press", "Deadlift"];

const CYCLES = [
  { week: 1, sets: [{pct: 0.65, reps: 5}, {pct: 0.75, reps: 5}, {pct: 0.85, reps: "5+"}] },
  { week: 2, sets: [{pct: 0.70, reps: 3}, {pct: 0.80, reps: 3}, {pct: 0.90, reps: "3+"}] },
  { week: 3, sets: [{pct: 0.75, reps: 5}, {pct: 0.85, reps: 3}, {pct: 0.95, reps: "1+"}] },
  { week: 4, sets: [{pct: 0.40, reps: 5}, {pct: 0.50, reps: 5}, {pct: 0.60, reps: 5}] },
];

const round = (n, base = 5) => Math.round(n / base) * base;

const DEFAULT_STATE = {
  trueMaxes: { Squat: 0, "Bench Press": 0, Deadlift: 0 },
  week: 1,
  activeLift: "Squat",
  completed: {},
  cycleCount: 1,
};

// Per-cycle max increases applied cumulatively
const INCREMENTS = { Squat: 10, Deadlift: 10, "Bench Press": 5 };

function getCycleTrueMax(base, cycleCount) {
  // cycle 1 = base, cycle 2 = base + increment, etc.
  return base + INCREMENTS[base] * (cycleCount - 1);
}

// Compute effective true max for a lift given base true max and current cycle
function effectiveMax(baseTM, lift, cycleCount) {
  return (baseTM || 0) + INCREMENTS[lift] * (cycleCount - 1);
}

export default function App() {
  const [tab, setTab] = useState("setup");
  const [inputs, setInputs] = useState({ Squat: "", "Bench Press": "", Deadlift: "" });
  const [state, setState] = useState(DEFAULT_STATE);
  const [saveStatus, setSaveStatus] = useState("");
  const [loaded, setLoaded] = useState(false);

  const { trueMaxes, week, activeLift, completed, cycleCount } = state;
  const set = (patch) => setState(s => ({ ...s, ...patch }));

  useEffect(() => {
    async function load() {
      try {
        const result = await window.storage.get("wendler531_state");
        if (result && result.value) {
          const saved = JSON.parse(result.value);
          setState(s => ({ ...s, ...saved }));
          setTab("workout");
        }
      } catch (_) {}
      setLoaded(true);
    }
    load();
  }, []);

  async function save(newState) {
    setSaveStatus("saving");
    try {
      await window.storage.set("wendler531_state", JSON.stringify({ ...state, ...newState }));
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(""), 2000);
    } catch (_) {
      setSaveStatus("error");
    }
  }

  async function handleSetupSubmit() {
    const tms = {};
    for (const l of LIFTS) tms[l] = round(parseFloat(inputs[l]));
    const newState = { trueMaxes: tms, week: 1, completed: {}, cycleCount: 1, activeLift: "Squat" };
    set(newState);
    await save(newState);
    setTab("workout");
  }

  async function advanceCycle() {
    let newState;
    if (week < 4) {
      newState = { week: week + 1, completed: {} };
    } else {
      // Bump base true maxes for next cycle
      const newTMs = { ...trueMaxes };
      for (const l of LIFTS) newTMs[l] = (newTMs[l] || 0) + INCREMENTS[l];
      newState = { trueMaxes: newTMs, week: 1, cycleCount: cycleCount + 1, completed: {} };
    }
    set(newState);
    await save({ ...state, ...newState });
  }

  async function markComplete(lift) {
    const newCompleted = { ...completed, [`${week}-${lift}`]: true };
    const idx = LIFTS.indexOf(lift);
    const newLift = idx < LIFTS.length - 1 ? LIFTS[idx + 1] : lift;
    const patch = { completed: newCompleted, activeLift: newLift };
    set(patch);
    await save({ ...state, ...patch });
  }

  async function resetAll() {
    setState(DEFAULT_STATE);
    setInputs({ Squat: "", "Bench Press": "", Deadlift: "" });
    try { await window.storage.delete("wendler531_state"); } catch (_) {}
    setTab("setup");
  }

  const setupDone = LIFTS.every(l => trueMaxes[l] > 0);
  const weekData = CYCLES[week - 1];
  const tm = trueMaxes[activeLift] || 0;
  const weekLabel = week === 4 ? "Deload Week" : `Week ${week}`;
  const allLiftsThisWeek = LIFTS.every(l => completed[`${week}-${l}`]);

  if (!loaded) return (
    <div style={{ fontFamily: "system-ui", background: "#111", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa" }}>
      Loading...
    </div>
  );

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 600, margin: "0 auto", padding: 16, background: "#111", minHeight: "100vh", color: "#eee" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 24, color: "#f97316" }}>Wendler 5/3/1</h1>
        <p style={{ margin: "4px 0 0", color: "#888", fontSize: 13 }}>Big But Boring Accessory</p>
        {saveStatus === "saving" && <span style={{ fontSize: 12, color: "#888" }}>💾 Saving...</span>}
        {saveStatus === "saved" && <span style={{ fontSize: 12, color: "#22c55e" }}>✓ Saved</span>}
        {saveStatus === "error" && <span style={{ fontSize: 12, color: "#ef4444" }}>Save failed</span>}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["setup", "workout", "program"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer",
            background: tab === t ? "#f97316" : "#222", color: tab === t ? "#fff" : "#aaa",
            fontWeight: tab === t ? 700 : 400, fontSize: 14, textTransform: "capitalize"
          }}>{t}</button>
        ))}
      </div>

      {/* SETUP TAB */}
      {tab === "setup" && (
        <div>
          <h2 style={{ color: "#f97316", fontSize: 18, marginBottom: 8 }}>Enter Your True 1-Rep Maxes</h2>
          <p style={{ color: "#888", fontSize: 13, marginBottom: 16 }}>
            Percentages are applied directly to your true max. Weights rounded to nearest 5 lbs.
          </p>
          {LIFTS.map(l => (
            <div key={l} style={{ marginBottom: 14 }}>
              <label style={{ display: "block", marginBottom: 4, color: "#ccc", fontSize: 14 }}>{l}</label>
              <input
                type="number"
                placeholder="True 1RM (lbs)"
                value={inputs[l]}
                onChange={e => setInputs(i => ({ ...i, [l]: e.target.value }))}
                style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 8, border: "1px solid #333", background: "#1a1a1a", color: "#eee", fontSize: 16 }}
              />
            </div>
          ))}
          <button onClick={handleSetupSubmit} disabled={!LIFTS.every(l => inputs[l])} style={{
            width: "100%", padding: 14, borderRadius: 10, border: "none", cursor: "pointer",
            background: LIFTS.every(l => inputs[l]) ? "#f97316" : "#333",
            color: "#fff", fontWeight: 700, fontSize: 16, marginTop: 8
          }}>Generate & Save Program</button>

          {setupDone && (
            <>
              <div style={{ marginTop: 16, padding: 12, background: "#1a1a1a", borderRadius: 10, border: "1px solid #333" }}>
                <p style={{ margin: "0 0 8px", color: "#888", fontSize: 13 }}>Current True Maxes (Cycle {cycleCount}):</p>
                {LIFTS.map(l => (
                  <div key={l} style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                    <span style={{ color: "#ccc", fontSize: 14 }}>{l}</span>
                    <span style={{ color: "#f97316", fontSize: 14, fontWeight: 700 }}>{trueMaxes[l]} lbs</span>
                  </div>
                ))}
              </div>
              <button onClick={resetAll} style={{
                width: "100%", marginTop: 12, padding: 10, borderRadius: 8, border: "1px solid #ef4444",
                background: "transparent", color: "#ef4444", cursor: "pointer", fontSize: 13
              }}>Reset All Progress</button>
            </>
          )}
        </div>
      )}

      {/* WORKOUT TAB */}
      {tab === "workout" && (
        <div>
          {!setupDone ? (
            <div style={{ textAlign: "center", padding: 40, color: "#888" }}>
              <p>Please complete setup first.</p>
              <button onClick={() => setTab("setup")} style={{ marginTop: 8, padding: "10px 20px", borderRadius: 8, border: "none", background: "#f97316", color: "#fff", cursor: "pointer" }}>Go to Setup</button>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <span style={{ background: "#f97316", color: "#fff", borderRadius: 6, padding: "2px 10px", fontSize: 13, fontWeight: 700 }}>Cycle {cycleCount}</span>
                  <span style={{ background: "#222", color: "#aaa", borderRadius: 6, padding: "2px 10px", fontSize: 13, marginLeft: 8 }}>{weekLabel}</span>
                </div>
                {allLiftsThisWeek && (
                  <button onClick={advanceCycle} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#22c55e", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                    {week < 4 ? "Next Week →" : "New Cycle →"}
                  </button>
                )}
              </div>

              {/* Lift selector */}
              <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
                {LIFTS.map(l => {
                  const done = completed[`${week}-${l}`];
                  return (
                    <button key={l} onClick={() => set({ activeLift: l })} style={{
                      padding: "7px 12px", borderRadius: 8, border: `2px solid ${activeLift === l ? "#f97316" : done ? "#22c55e" : "#333"}`,
                      background: activeLift === l ? "#f97316" : done ? "#14532d" : "#1a1a1a",
                      color: "#fff", fontSize: 13, cursor: "pointer", fontWeight: activeLift === l ? 700 : 400
                    }}>
                      {done ? "✓ " : ""}{l}
                    </button>
                  );
                })}
              </div>

              {/* Warm Up Sets */}
              <div style={{ background: "#1a1a1a", borderRadius: 12, padding: 16, marginBottom: 14 }}>
                <h3 style={{ margin: "0 0 4px", color: "#facc15", fontSize: 16 }}>Warm Up — {activeLift}</h3>
                <p style={{ margin: "0 0 12px", color: "#666", fontSize: 12 }}>3 sets @ 40% / 50% / 60% of true max</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, textAlign: "center", marginBottom: 8 }}>
                  <span style={{ color: "#666", fontSize: 12 }}>Set</span>
                  <span style={{ color: "#666", fontSize: 12 }}>Weight</span>
                  <span style={{ color: "#666", fontSize: 12 }}>Reps</span>
                </div>
                {[{pct: 0.40, reps: 5}, {pct: 0.50, reps: 5}, {pct: 0.60, reps: 3}].map((s, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, textAlign: "center", padding: "10px 0", borderTop: "1px solid #2a2a2a" }}>
                    <span style={{ color: "#aaa", fontSize: 15 }}>Warm {i + 1}</span>
                    <span style={{ color: "#facc15", fontSize: 15, fontWeight: 700 }}>{round(tm * s.pct)} lbs</span>
                    <span style={{ color: "#aaa", fontSize: 15 }}>{s.reps}</span>
                  </div>
                ))}
              </div>

              {/* Main Work Sets */}
              <div style={{ background: "#1a1a1a", borderRadius: 12, padding: 16, marginBottom: 14 }}>
                <h3 style={{ margin: "0 0 12px", color: "#f97316", fontSize: 16 }}>Main Work — {activeLift}</h3>
                <p style={{ margin: "0 0 12px", color: "#666", fontSize: 12 }}>True Max: {tm} lbs</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, textAlign: "center", marginBottom: 8 }}>
                  <span style={{ color: "#666", fontSize: 12 }}>Set</span>
                  <span style={{ color: "#666", fontSize: 12 }}>Weight</span>
                  <span style={{ color: "#666", fontSize: 12 }}>Reps</span>
                </div>
                {weekData.sets.map((s, i) => {
                  const w = round(tm * s.pct);
                  return (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, textAlign: "center", padding: "10px 0", borderTop: "1px solid #2a2a2a" }}>
                      <span style={{ color: "#aaa", fontSize: 15 }}>Set {i + 1}</span>
                      <span style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>{w} lbs</span>
                      <span style={{ color: i === 2 && week !== 4 ? "#f97316" : "#fff", fontSize: 15, fontWeight: i === 2 ? 700 : 400 }}>
                        {s.reps}{typeof s.reps === "string" ? " (AMRAP)" : ""}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* BBB Accessory */}
              {week !== 4 && (
                <div style={{ background: "#1a1a1a", borderRadius: 12, padding: 16, marginBottom: 14 }}>
                  <h3 style={{ margin: "0 0 4px", color: "#3b82f6", fontSize: 16 }}>Big But Boring — {activeLift}</h3>
                  <p style={{ margin: "0 0 12px", color: "#666", fontSize: 12 }}>5 sets × 10 reps @ 50% true max</p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderTop: "1px solid #2a2a2a" }}>
                    <span style={{ color: "#aaa" }}>5 × 10</span>
                    <span style={{ color: "#3b82f6", fontWeight: 700, fontSize: 18 }}>{round(tm * 0.5)} lbs</span>
                  </div>
                </div>
              )}

              {/* Assistance Work */}
              <div style={{ background: "#1a1a1a", borderRadius: 12, padding: 16, marginBottom: 14 }}>
                <h3 style={{ margin: "0 0 12px", color: "#a855f7", fontSize: 16 }}>Assistance Work</h3>
                {(activeLift === "Squat" || activeLift === "Deadlift") ? (
                  <>
                    <AssistanceItem name="Leg Press / Hack Squat" scheme="3–5 × 10–15" />
                    <AssistanceItem name="Leg Curl" scheme="3–5 × 10–15" />
                    <AssistanceItem name="Ab Work" scheme="3–5 × 10–20" />
                  </>
                ) : (
                  <>
                    <AssistanceItem name="Dumbbell Row" scheme="3–5 × 10–15" />
                    <AssistanceItem name="Chin-ups / Lat Pulldown" scheme="3–5 × 10–15" />
                    <AssistanceItem name="Face Pulls / Rear Delt" scheme="3–5 × 15–20" />
                  </>
                )}
              </div>

              <button
                onClick={() => markComplete(activeLift)}
                disabled={!!completed[`${week}-${activeLift}`]}
                style={{
                  width: "100%", padding: 14, borderRadius: 10, border: "none",
                  background: completed[`${week}-${activeLift}`] ? "#14532d" : "#f97316",
                  color: "#fff", fontWeight: 700, fontSize: 16, cursor: completed[`${week}-${activeLift}`] ? "default" : "pointer"
                }}>
                {completed[`${week}-${activeLift}`] ? "✓ Workout Complete" : "Mark as Complete"}
              </button>
            </>
          )}
        </div>
      )}

      {/* PROGRAM TAB */}
      {tab === "program" && (
        <div>
          <h2 style={{ color: "#f97316", fontSize: 18, marginBottom: 4 }}>Full Program Overview</h2>
          <p style={{ color: "#888", fontSize: 13, marginBottom: 16 }}>Cycle {cycleCount} — current true maxes</p>
          {!setupDone ? (
            <div style={{ textAlign: "center", color: "#888", padding: 40 }}>Complete setup to see your program.</div>
          ) : LIFTS.map(lift => (
            <div key={lift} style={{ marginBottom: 20, background: "#1a1a1a", borderRadius: 12, padding: 14 }}>
              <h3 style={{ margin: "0 0 4px", color: "#f97316" }}>{lift}</h3>
              <p style={{ margin: "0 0 10px", color: "#666", fontSize: 12 }}>True Max: {trueMaxes[lift]} lbs</p>
              {[1,2,3].map(wk => {
                const wd = CYCLES[wk-1];
                return (
                  <div key={wk} style={{ marginBottom: 10 }}>
                    <p style={{ margin: "0 0 4px", color: "#aaa", fontSize: 13 }}>Week {wk}</p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {wd.sets.map((s, i) => (
                        <div key={i} style={{ background: i === 2 ? "#7c2d12" : "#111", borderRadius: 8, padding: "6px 12px", textAlign: "center" }}>
                          <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{round(trueMaxes[lift] * s.pct)}</div>
                          <div style={{ color: "#aaa", fontSize: 12 }}>{s.reps} reps</div>
                          <div style={{ color: "#666", fontSize: 11 }}>{Math.round(s.pct * 100)}%</div>
                        </div>
                      ))}
                    </div>
                    <p style={{ margin: "6px 0 0", color: "#3b82f6", fontSize: 12 }}>
                      BBB: 5×10 @ {round(trueMaxes[lift] * 0.5)} lbs
                    </p>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AssistanceItem({ name, scheme }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid #2a2a2a" }}>
      <span style={{ color: "#ccc", fontSize: 14 }}>{name}</span>
      <span style={{ color: "#a855f7", fontSize: 13 }}>{scheme}</span>
    </div>
  );
}

"use client";
import { useState } from "react";
import { X, Upload, Plus, Trash2, Calendar, Clock, MapPin, Music, Ticket, Link, AlertCircle, CheckCircle2 } from "lucide-react";
import type { Genre } from "@/lib/types";
import { GENRE_META } from "@/lib/mock-data";
import GenreIcon from "@/components/GenreIcon";
import Map, { Marker } from "react-map-gl";

const GENRES: Genre[] = ["techno", "house", "tech-house", "trance", "drum-and-bass", "dubstep", "disco", "funk", "hiphop", "other"];

interface FormData {
  title: string;
  venue_name: string;
  venue_address: string;
  description: string;
  genre: Genre;
  starts_date: string;
  starts_time: string;
  ends_time: string;
  artists: string[];
  ticket_url: string;
  price: string;
  currency: string;
  lat: number;
  lng: number;
  ends_next_day: boolean;
  contact_email: string;
  submitter_name: string;
}

const EMPTY_FORM: FormData = {
  title: "",
  venue_name: "",
  venue_address: "",
  description: "",
  genre: "techno",
  starts_date: "",
  starts_time: "23:00",
  ends_time: "05:00",
  artists: [""],
  ticket_url: "",
  price: "",
  currency: "JPY",
  lat: 0,
  lng: 0,
  ends_next_day: true,
  contact_email: "",
  submitter_name: "",
};

interface Props {
  onClose: () => void;
}

export default function SubmitEventModal({ onClose }: Props) {
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  
  // Geocoding state
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  
  const [viewState, setViewState] = useState({
    longitude: 139.7016,
    latitude: 35.6580,
    zoom: 12
  });

  const set = (key: keyof FormData, val: any) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const setArtist = (i: number, val: string) => {
    const next = [...form.artists];
    next[i] = val;
    set("artists", next);
  };

  const addArtist = () => set("artists", [...form.artists, ""]);
  const removeArtist = (i: number) => set("artists", form.artists.filter((_, idx) => idx !== i));

  const handleAddressSearch = async (query: string) => {
    set("venue_address", query);
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsGeocoding(true);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSuggestions(data.features || []);
      setShowSuggestions(true);
    } catch (err) {
      console.error("Geocoding error:", err);
    } finally {
      setIsGeocoding(false);
    }
  };

  const selectSuggestion = (feature: any) => {
    setForm(f => ({
      ...f,
      venue_address: feature.place_name,
      lat: feature.center[1],
      lng: feature.center[0]
    }));
    setViewState(v => ({ ...v, longitude: feature.center[0], latitude: feature.center[1], zoom: 15 }));
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const validateStep1 = () => {
    const e: Partial<FormData> = {};
    if (!form.title.trim()) e.title = "Required";
    if (!form.venue_name.trim()) e.venue_name = "Required";
    if (!form.venue_address.trim()) e.venue_address = "Required";
    if (!form.starts_date) e.starts_date = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: Partial<FormData> = {};
    if (!form.description.trim()) e.description = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep3 = () => {
    const e: Partial<FormData> = {};
    if (!form.contact_email.trim() || !form.contact_email.includes("@")) e.contact_email = "Valid email required";
    if (!form.submitter_name.trim()) e.submitter_name = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
    else if (step === 3 && validateStep3()) handleSubmit();
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/events/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        alert("Submission failed. Please try again.");
      }
    } catch (err) {
      console.error(err);
      alert("Submission error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const meta = GENRE_META[form.genre];

  const today = new Date().toISOString().split("T")[0];

  if (submitted) {
    return (
      <div className="overlay animate-fadein" style={{ zIndex: 200 }}>
        <div className="modal animate-slideup" style={{ padding: 40, textAlign: "center", maxWidth: 480, background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 20 }}>
          <div
            style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "rgba(16,185,129,0.1)",
              border: "1px solid rgba(16,185,129,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px",
            }}
          >
            <CheckCircle2 size={28} color="var(--green)" />
          </div>
          <h2 style={{ fontSize: 22, marginBottom: 10 }}>Submission received!</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
            Thanks for submitting <strong style={{ color: "var(--text-primary)" }}>{form.title}</strong>.<br />
            Our team will review and publish it within 24 hours.
          </p>
          <button className="btn btn-primary btn-full" onClick={onClose} style={{ padding: "13px", borderRadius: 12 }}>
            Back to Map
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="overlay animate-fadein" style={{ zIndex: 200 }}>
      <div
        className="modal animate-slideup"
        style={{ padding: 0, maxWidth: 520, display: "flex", flexDirection: "column" }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 20px 14px",
            borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div>
            <h2 style={{ fontSize: 17, marginBottom: 2 }}>Submit an Event</h2>
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>For venue owners, promoters & artists</p>
          </div>
          <button
            id="submit-event-close"
            onClick={onClose}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text-muted)", padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Progress steps */}
        <div
          style={{
            padding: "12px 20px",
            borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", gap: 8,
            flexShrink: 0,
          }}
        >
          {[
            { n: 1, label: "Event Info" },
            { n: 2, label: "Details" },
            { n: 3, label: "Contact" },
          ].map((s, i, arr) => (
            <div key={s.n} style={{ display: "flex", alignItems: "center", gap: 8, flex: i < arr.length - 1 ? 1 : undefined }}>
              <div
                style={{
                  width: 26, height: 26, borderRadius: "50%",
                  background: step >= s.n ? "var(--primary)" : "var(--bg-elevated)",
                  border: `1px solid ${step >= s.n ? "var(--primary)" : "var(--border)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700,
                  color: step >= s.n ? "#fff" : "var(--text-muted)",
                  flexShrink: 0, transition: "all 0.2s",
                }}
              >
                {s.n}
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: step >= s.n ? "var(--text-primary)" : "var(--text-muted)", whiteSpace: "nowrap" }}>
                {s.label}
              </span>
              {i < arr.length - 1 && (
                <div style={{ flex: 1, height: 1, background: step > s.n ? "var(--primary)" : "var(--border)", transition: "background 0.3s" }} />
              )}
            </div>
          ))}
        </div>

        {/* Form content */}
        <div className="scroll-y" style={{ flex: 1, padding: "20px", maxHeight: "60vh" }}>
          {/* ── STEP 1: Basic info ── */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label className="label">Event Title *</label>
                <input
                  id="submit-title"
                  className="input"
                  placeholder="e.g. WOMB Night: Techno Underground"
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  style={{ borderColor: errors.title ? "var(--primary)" : undefined }}
                />
                {errors.title && <p style={{ color: "var(--primary)", fontSize: 11, marginTop: 4 }}>{errors.title}</p>}
              </div>

              <div>
                <label className="label">Genre *</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {GENRES.map((g) => {
                    const m = GENRE_META[g];
                    return (
                      <button
                        key={g}
                        id={`genre-btn-${g}`}
                        onClick={() => set("genre", g)}
                        style={{
                          padding: "6px 12px", borderRadius: 999,
                          border: `1px solid ${form.genre === g ? m.color : "var(--border)"}`,
                          background: form.genre === g ? m.bg : "transparent",
                          color: form.genre === g ? m.color : "var(--text-secondary)",
                          fontSize: 12, fontWeight: 600, cursor: "pointer",
                          transition: "all 0.15s",
                          fontFamily: "'Inter', sans-serif",
                          display: "flex", alignItems: "center", gap: 5
                        }}
                      >
                        <GenreIcon name={m.icon} size={14} /> {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label className="label">Venue Name *</label>
                  <input
                    id="submit-venue"
                    className="input"
                    placeholder="e.g. WOMB"
                    value={form.venue_name}
                    onChange={(e) => set("venue_name", e.target.value)}
                    style={{ borderColor: errors.venue_name ? "var(--primary)" : undefined }}
                  />
                  {errors.venue_name && <p style={{ color: "var(--primary)", fontSize: 11, marginTop: 4 }}>{errors.venue_name}</p>}
                </div>
                <div>
                  <label className="label">Date *</label>
                  <input
                    id="submit-date"
                    className="input"
                    type="date"
                    min={today}
                    value={form.starts_date}
                    onChange={(e) => set("starts_date", e.target.value)}
                    style={{
                      borderColor: errors.starts_date ? "var(--primary)" : undefined,
                    }}
                  />
                  {errors.starts_date && <p style={{ color: "var(--primary)", fontSize: 11, marginTop: 4 }}>{errors.starts_date}</p>}
                </div>
              </div>

              <div style={{ position: "relative" }}>
                <label className="label">Venue Address *</label>
                <div style={{ position: "relative" }}>
                  <input
                    id="submit-address"
                    className="input"
                    placeholder="Search for an address..."
                    value={form.venue_address}
                    onChange={(e) => handleAddressSearch(e.target.value)}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    style={{ 
                      borderColor: errors.venue_address ? "var(--primary)" : undefined,
                      paddingRight: isGeocoding ? 30 : 10
                    }}
                  />
                  {isGeocoding && (
                    <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}>
                      <div className="spinner-small" style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
                    </div>
                  )}
                </div>
                
                {showSuggestions && suggestions.length > 0 && (
                  <div 
                    style={{ 
                      position: "absolute", top: "100%", left: 0, right: 0, 
                      background: "var(--bg-elevated)", border: "1px solid var(--border)",
                      borderRadius: 12, marginTop: 4, zIndex: 50, boxShadow: "var(--shadow-lg)",
                      overflow: "hidden"
                    }}
                  >
                    {suggestions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => selectSuggestion(s)}
                        style={{ 
                          width: "100%", padding: "10px 12px", textAlign: "left", 
                          background: "none", border: "none", borderBottom: "1px solid var(--border)",
                          cursor: "pointer", color: "var(--text-primary)", fontSize: 13,
                          display: "flex", flexDirection: "column", gap: 2
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                      >
                        <span style={{ fontWeight: 600 }}>{s.text}</span>
                        <span style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {s.place_name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                </div>

                <div style={{ width: "100%", height: 200, borderRadius: 12, overflow: "hidden", position: "relative", marginTop: 10, border: "1px solid var(--border)" }}>
                  <Map
                    mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
                    {...viewState}
                    onMove={evt => setViewState(evt.viewState)}
                    mapStyle="mapbox://styles/mapbox/dark-v11"
                    onClick={(e) => {
                      setForm(f => ({ ...f, lat: e.lngLat.lat, lng: e.lngLat.lng }));
                      setViewState(v => ({ ...v, longitude: e.lngLat.lng, latitude: e.lngLat.lat }));
                    }}
                  >
                    {form.lat !== 0 && (
                      <Marker longitude={form.lng} latitude={form.lat} anchor="bottom">
                        <MapPin size={28} color="var(--primary)" fill="var(--bg-secondary)" />
                      </Marker>
                    )}
                  </Map>
                  <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(0,0,0,0.6)", padding: "4px 8px", borderRadius: 4, fontSize: 10, color: "#fff", pointerEvents: "none", backdropFilter: "blur(4px)" }}>
                    Click map to place pin accurately
                  </div>
                </div>

                {errors.venue_address && <p style={{ color: "var(--primary)", fontSize: 11, marginTop: 4 }}>{errors.venue_address}</p>}
                
                {form.lat !== 0 && (
                  <p style={{ fontSize: 10, color: "var(--green)", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                    <CheckCircle2 size={10} /> Location verified: {form.lat.toFixed(4)}, {form.lng.toFixed(4)}
                  </p>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label className="label">Start Time</label>
                  <input className="input" type="time" value={form.starts_time} onChange={(e) => set("starts_time", e.target.value)} />
                </div>
                <div>
                  <label className="label">End Time</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input className="input" type="time" value={form.ends_time} onChange={(e) => set("ends_time", e.target.value)} />
                    <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 11, whiteSpace: "nowrap" }}>
                      <input 
                        type="checkbox" 
                        checked={form.ends_next_day} 
                        onChange={(e) => set("ends_next_day", e.target.checked)}
                        style={{ accentColor: "var(--primary)" }}
                      />
                      Ends next morning
                    </label>
                  </div>
                </div>
              </div>

              {/* Price & Ticket URL */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="input-group">
                  <label className="label">Door/Advance Price</label>
                  <div style={{ display: "flex", gap: 4 }}>
                    <select 
                      className="input" 
                      style={{ width: 65, padding: "11px 4px", textAlign: "center", flexShrink: 0 }}
                      value={form.currency}
                      onChange={(e) => set("currency", e.target.value)}
                    >
                      <option value="JPY">¥</option>
                      <option value="GBP">£</option>
                      <option value="EUR">€</option>
                      <option value="RSD">RSD</option>
                    </select>
                    <input
                      className="input"
                      type="text"
                      placeholder="e.g. 3000"
                      value={form.price}
                      onChange={(e) => set("price", e.target.value)}
                    />
                  </div>
                </div>
                <div className="input-group">
                  <label className="label">Ticket / Event URL</label>
                  <div className="input-with-icon">
                    <Link size={14} />
                    <input
                      className="input"
                      type="url"
                      placeholder="https://..."
                      value={form.ticket_url}
                      onChange={(e) => set("ticket_url", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Details ── */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label className="label">Description *</label>
                <textarea
                  id="submit-description"
                  className="input"
                  placeholder="Describe the event — vibe, music style, what to expect…"
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={4}
                  style={{ borderColor: errors.description ? "var(--primary)" : undefined }}
                />
                {errors.description && <p style={{ color: "var(--primary)", fontSize: 11, marginTop: 4 }}>{errors.description}</p>}
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <label className="label" style={{ marginBottom: 0 }}>Artists / Lineup</label>
                  <button
                    onClick={addArtist}
                    style={{
                      display: "flex", alignItems: "center", gap: 4,
                      background: "none", border: "none", cursor: "pointer",
                      color: "var(--primary)", fontSize: 12, fontWeight: 600,
                    }}
                  >
                    <Plus size={14} /> Add artist
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {form.artists.map((artist, i) => (
                    <div key={i} style={{ display: "flex", gap: 8 }}>
                      <input
                        id={`artist-input-${i}`}
                        className="input"
                        placeholder={`Artist ${i + 1} name`}
                        value={artist}
                        onChange={(e) => setArtist(i, e.target.value)}
                        style={{ flex: 1 }}
                      />
                      {form.artists.length > 1 && (
                        <button
                          onClick={() => removeArtist(i)}
                          style={{
                            background: "none", border: "1px solid var(--border)",
                            borderRadius: "var(--radius-sm)", padding: "0 10px",
                            cursor: "pointer", color: "var(--text-muted)",
                            flexShrink: 0, transition: "all 0.15s",
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Ticket / Info URL</label>
                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                      color: "var(--text-muted)", pointerEvents: "none",
                    }}
                  >
                    <Link size={14} />
                  </div>
                  <input
                    id="submit-ticket-url"
                    className="input"
                    placeholder="https://ra.co/events/..."
                    value={form.ticket_url}
                    onChange={(e) => set("ticket_url", e.target.value)}
                    style={{ paddingLeft: 36 }}
                  />
                </div>
              </div>

              {/* Preview */}
              <div
                style={{
                  padding: "12px 14px",
                  background: meta.bg,
                  border: `1px solid ${meta.color}33`,
                  borderRadius: 12,
                }}
              >
                <p style={{ fontSize: 10, fontWeight: 700, color: meta.color, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
                  Preview
                </p>
                <p style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 14, marginBottom: 2 }}>
                  {form.title || "Event Title"}
                </p>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 5 }}>
                  <GenreIcon name={meta.icon} size={12} color={meta.color} /> {meta.label} · {form.venue_name || "Venue"} · {form.starts_date || "Date TBD"}
                </p>
              </div>
            </div>
          )}

          {/* ── STEP 3: Contact ── */}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div
                style={{
                  padding: "12px 14px",
                  background: "rgba(245,158,11,0.08)",
                  border: "1px solid rgba(245,158,11,0.2)",
                  borderRadius: 10,
                  display: "flex", gap: 10, alignItems: "flex-start",
                }}
              >
                <AlertCircle size={16} color="var(--amber)" style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  Submissions are manually reviewed. We'll notify you once your event is published (usually within 24h).
                </p>
              </div>

              <div>
                <label className="label">Your Name / Organization *</label>
                <input
                  id="submit-name"
                  className="input"
                  placeholder="e.g. WOMB Tokyo, DJ Kenji"
                  value={form.submitter_name}
                  onChange={(e) => set("submitter_name", e.target.value)}
                  style={{ borderColor: errors.submitter_name ? "var(--primary)" : undefined }}
                />
                {errors.submitter_name && <p style={{ color: "var(--primary)", fontSize: 11, marginTop: 4 }}>{errors.submitter_name}</p>}
              </div>

              <div>
                <label className="label">Contact Email *</label>
                <input
                  id="submit-email"
                  className="input"
                  type="email"
                  placeholder="booking@yourclub.com"
                  value={form.contact_email}
                  onChange={(e) => set("contact_email", e.target.value)}
                  style={{ borderColor: errors.contact_email ? "var(--primary)" : undefined }}
                />
                {errors.contact_email && <p style={{ color: "var(--primary)", fontSize: 11, marginTop: 4 }}>{errors.contact_email}</p>}
              </div>

              {/* Final event summary */}
              <div
                style={{
                  padding: "14px",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  display: "flex", flexDirection: "column", gap: 8,
                }}
              >
                <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  Summary
                </p>
                <p style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 15 }}>{form.title}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {[
                    { key: "venue", icon: "📍", val: `${form.venue_name} · ${form.venue_address}` },
                    { key: "time", icon: "📅", val: `${form.starts_date} · ${form.starts_time} – ${form.ends_time}${form.ends_next_day ? " (+1)" : ""}` },
                    { key: "genre", icon: <GenreIcon name={meta.icon} size={14} color={meta.color} />, val: `${meta.label} · ${form.price ? `${form.currency} ${form.price}` : "Price TBD"}` },
                    { key: "artists", icon: "🎤", val: form.artists.filter(Boolean).join(", ") || "No lineup listed" },
                    ...(form.ticket_url ? [{ key: "url", icon: "🔗", val: form.ticket_url }] : []),
                  ].map((row) => (
                    <div key={row.key} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <span style={{ fontSize: 12, flexShrink: 0 }}>{row.icon}</span>
                      <span style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 }}>{row.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid var(--border)",
            display: "flex", gap: 10,
            flexShrink: 0,
          }}
        >
          {step > 1 ? (
            <button className="btn btn-secondary" onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)} style={{ flex: 1, padding: "12px" }}>
              Back
            </button>
          ) : (
            <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1, padding: "12px" }}>
              Cancel
            </button>
          )}
          <button
            id={step === 3 ? "submit-event-btn" : `step-${step}-next`}
            className="btn btn-primary"
            onClick={next}
            style={{ flex: 2, padding: "12px", borderRadius: 12 }}
          >
            {step === 3 ? "Submit Event" : "Continue →"}
          </button>
        </div>
      </div>
    </div>
  );
}

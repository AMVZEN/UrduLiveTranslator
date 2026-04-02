import React, { useState, useEffect } from 'react';

function App() {
  const [extractedText, setExtractedText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState({ api_key: "", model_name: "gemini-3-flash-preview" });
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/config')
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(err => console.error("Could not fetch config", err));
  }, []);

  const handleScreenshot = async () => {
    if (!config.api_key) {
      setShowConfig(true);
      return;
    }

    setLoading(true);
    setError(null);
    setExtractedText("");
    setTranslatedText("");

    try {
      const response = await fetch('http://127.0.0.1:8000/process', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || "Error processing image");
      }
      
      setExtractedText(data.extracted_text);
      setTranslatedText(data.translated_text);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    try {
      await fetch('http://127.0.0.1:8000/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      setShowConfig(false);
    } catch (err) {
      console.error("Failed to save config", err);
    }
  };

  return (
    <>
      <div className="title-bar">Visual Urdu Translator</div>
      <div className="app-container">
        <header className="header">
          <h1>Translations</h1>
          <div style={{display: 'flex', gap: '10px'}}>
            <button className="btn" onClick={handleScreenshot} disabled={loading}>
              {loading ? <span className="loader"></span> : null}
              {loading ? "Processing..." : "Take Screenshot"}
            </button>
            <button className="btn settings-btn" onClick={() => setShowConfig(true)}>
              Settings
            </button>
          </div>
        </header>

        {error && (
          <div style={{background: 'var(--danger)', color: '#fff', padding: '10px', borderRadius: '8px', marginBottom: '20px'}}>
            {error}
          </div>
        )}

        <div className="content-grid">
          <div className="box">
            <h2>Raw Text (EasyOCR)</h2>
            <div className="text-area urdu">
              {extractedText || "Take a screenshot to translate Urdu text..."}
            </div>
          </div>
          <div className="box">
            <h2>Translated Text (Gemini)</h2>
            <div className="text-area">
              {translatedText || "Translation will appear here..."}
            </div>
          </div>
        </div>

        {showConfig && (
          <div className="modal-overlay">
            <div className="modal">
              <h2>Settings</h2>
              <div className="input-group">
                <label>Gemini API Key</label>
                <input 
                  type="password" 
                  value={config.api_key} 
                  onChange={(e) => setConfig({...config, api_key: e.target.value})} 
                  placeholder="AIzaSy..."
                />
              </div>
              <div className="input-group">
                <label>Model Tag</label>
                <input 
                  type="text" 
                  value={config.model_name} 
                  onChange={(e) => setConfig({...config, model_name: e.target.value})}
                  placeholder="gemini-3-flash-preview"
                />
              </div>
              <div className="modal-actions">
                <button className="btn settings-btn" onClick={() => setShowConfig(false)}>Cancel</button>
                <button className="btn" onClick={handleSaveConfig}>Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default App;

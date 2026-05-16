import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { translations } from './Data';
import { campusFAQ } from './faq';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [lang, setLang] = useState('en');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [query, setQuery] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  // AUTH STATES
  const [rollNumber, setRollNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [isForgotPassMode, setIsForgotPassMode] = useState(false);
  const [otpRequested, setOtpRequested] = useState(false);
  const [otp, setOtp] = useState('');

  // Stats (mock for UI)
  const [registeredUsers, setRegisteredUsers] = useState(() => parseInt(localStorage.getItem('reg_users') || '1'));

  useEffect(() => {
    localStorage.setItem('reg_users', registeredUsers.toString());
  }, [registeredUsers]);

  const t = translations[lang];
  const chatEndRef = useRef(null);

  useEffect(() => {
    // Scroll to bottom of chat
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleMistralSearch = async (forcedQuery = query) => {
    if (!forcedQuery) return;

    const newHistory = [...chatHistory, { role: 'user', content: forcedQuery }];
    setChatHistory(newHistory);
    setQuery('');
    setLoading(true);

    const MISTRAL_API_KEY = "HT3I3k8zRo8wox9vRAe1mfo4ONtct0C3";

    try {
      const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${MISTRAL_API_KEY}`
        },
        body: JSON.stringify({
          model: "mistral-small-latest",
          messages: [
            {
              role: "system",
              content: `
You are a helpful AI Campus Buddy for students.
Answer ONLY based on the university information below.

========================
UNIVERSITY FAQ
========================
${campusFAQ}

You MUST respond strictly in ${lang === 'hi' ? 'Hindi' : lang === 'te' ? 'Telugu' : 'English'}. Translate your entire response into this language.

If the answer is not available in the FAQ data, say:
"Sorry, I do not have information about that yet."
`
            },
            {
              role: "user",
              content: forcedQuery
            }
          ],
          temperature: 0.3,
          max_tokens: 300
        })
      });

      const data = await res.json();

      let botResponse = "No response received from AI.";
      if (data.choices && data.choices.length > 0) {
        botResponse = data.choices[0].message.content;
      }

      setChatHistory([...newHistory, { role: 'bot', content: botResponse }]);

    } catch (error) {
      console.error(error);
      setChatHistory([...newHistory, { role: 'bot', content: "Sorry, I'm having trouble connecting right now." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    
    if (isSignUpMode || (isForgotPassMode && otpRequested)) {
      if (!isPasswordValid) {
        alert("Please ensure your password meets all criteria before continuing.");
        return;
      }
    }

    // Automatically append domain if missing
    const domain = '@wilp.bits-pilani.ac.in';
    let formattedUsername = rollNumber.trim();
    if (formattedUsername && !formattedUsername.includes('@')) {
      formattedUsername += domain;
    } else if (formattedUsername && !formattedUsername.endsWith(domain)) {
      alert(`Only ${domain} email addresses are allowed.`);
      return;
    }

    if (isForgotPassMode && !otpRequested) {
      // Step 1: Request OTP
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/request-otp/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: formattedUsername }),
        });
        const data = await res.json();
        if (res.ok) {
          setOtpRequested(true);
          alert("OTP has been sent to your email!");
        } else {
          alert(data.error || "Failed to send OTP.");
        }
      } catch (error) {
        alert("Backend is offline.");
      }
      return;
    }

    let endpoint = isSignUpMode ? 'signup/' : 'login/';
    if (isForgotPassMode) endpoint = 'forgot-password/';

    const payload = {
      username: formattedUsername,
      password: password
    };

    if (isForgotPassMode && otpRequested) {
      payload.otp = otp;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setRollNumber('');
        setPassword('');
        setOtp('');

        if (isForgotPassMode) {
          alert("Password reset successfully! You can now log in.");
          setIsForgotPassMode(false);
          setOtpRequested(false);
        } else if (isSignUpMode) {
          alert("Account created! Now please Sign In.");
          setIsSignUpMode(false);
          setRegisteredUsers(prev => prev + 1);
        } else {
          localStorage.setItem('token', data.access);
          setIsLoggedIn(true);
          setChatHistory([{ role: 'bot', isGreeting: true, content: '' }]);
        }
      } else {
        alert(data.error || "Check your credentials");
      }
    } catch (error) {
      alert("Backend is offline. Run python manage.py runserver");
    }
  };

  const passwordRules = [
    { label: "At least 8 characters", valid: password.length >= 8 },
    { label: "One uppercase letter", valid: /[A-Z]/.test(password) },
    { label: "One lowercase letter", valid: /[a-z]/.test(password) },
    { label: "One number", valid: /[0-9]/.test(password) },
    { label: "One special character", valid: /[^A-Za-z0-9]/.test(password) }
  ];
  const isPasswordValid = passwordRules.every(rule => rule.valid);

  return (
    <div className={`app-container ${darkMode ? 'dark-theme' : 'light-theme'}`}>
      <nav className="navbar">
        <div className="logo">
          <div className="logo-icon">{darkMode ? '🌹' : '🌻'}</div>
          {t.title}
        </div>
        <div className="nav-controls">
          <select
            className="theme-select"
            onChange={(e) => setLang(e.target.value)}
            value={lang}
          >
            <option value="en">English</option>
            <option value="hi">हिन्दी</option>
            <option value="te">తెలుగు</option>
          </select>
          <button className="theme-toggle" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? '☀️' : '🌙'}
          </button>
          {isLoggedIn && (
            <>
              <button className="icon-btn" onClick={() => setChatHistory([{ role: 'bot', isGreeting: true, content: '' }])} title="Clear Chat">
                🗑️
              </button>
              <button className="icon-btn" onClick={() => { setIsLoggedIn(false); }} title={t.logout}>
                🚪
              </button>
            </>
          )}
        </div>
      </nav>

      <main className="content">
        {!isLoggedIn ? (
          <div style={{ display: 'flex', gap: '40px', maxWidth: '1100px', margin: '0 auto', width: '100%', alignItems: 'center', flexWrap: 'wrap', marginTop: '2rem' }}>
            <div style={{ flex: '1', minWidth: '300px' }} className="fade-in">
              <div className="hero-section">
                <div className="pill">{t.guide}</div>
                <h1 className="huge-title">{t.title}</h1>
                <p className="hero-subtitle">{t.signInTitle}</p>
              </div>

                <div className="stat-card" style={{margin: '0 auto'}}>
                  <div className="stat-icon">👥</div>
                  <div className="stat-info">
                    <h3>{registeredUsers}</h3>
                    <p>{t.regStudents}</p>
                  </div>
                </div>
              </div>

            <div className="auth-wrapper" style={{ flex: '0.8', minWidth: '350px', marginTop: 0 }}>
              <div className="student-login-card">
                <h2 className="auth-title">
                  {isForgotPassMode ? t.resetPassTitle : isSignUpMode ? t.createAcc : t.welcomeBack}
                </h2>
                <p className="auth-subtitle">
                  {isForgotPassMode ? t.enterEmailPass : isSignUpMode ? t.registerToStart : t.signInTitle}
                </p>

                <form onSubmit={handleAuth} className="auth-form">
                  <div className="input-group">
                    <label className="input-label">{t.emailRoll}</label>
                    <div className="boxy-input-wrapper">
                      <span className="input-icon">✉️</span>
                      <div style={{ display: 'flex', flex: 1, alignItems: 'center', background: 'var(--card-bg)', borderRadius: '8px' }}>
                        <input
                          type="text"
                          placeholder="202317b3195"
                          className="boxy-input"
                          style={{ flex: 1, minWidth: 0, paddingRight: '0' }}
                          value={rollNumber}
                          onChange={(e) => {
                             const val = e.target.value;
                             // Just allow user to type, validation handles the domain suffix
                             setRollNumber(val);
                          }}
                          disabled={otpRequested}
                          required
                        />
                        {!rollNumber.includes('@') && (
                          <span style={{ color: '#888', paddingRight: '12px', whiteSpace: 'nowrap', pointerEvents: 'none', fontSize: '0.95rem' }}>
                            @wilp.bits-pilani.ac.in
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {(otpRequested) && (
                    <div className="input-group">
                      <label className="input-label">Enter OTP</label>
                      <div className="boxy-input-wrapper">
                        <span className="input-icon">🔑</span>
                        <input
                          type="text"
                          placeholder="6-digit OTP"
                          className="boxy-input"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  )}

                  {(!isForgotPassMode || otpRequested) && (
                    <div className="input-group">
                      <label className="input-label">{isForgotPassMode ? t.newPass : t.pass}</label>
                      <div className="boxy-input-wrapper">
                        <span className="input-icon">🔒</span>
                        <input
                          type="password"
                          placeholder="••••••••"
                          className="boxy-input"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                      </div>
                      {(isSignUpMode || (isForgotPassMode && otpRequested)) && (
                        <div style={{ marginTop: '10px', fontSize: '0.85rem', color: '#666', background: 'rgba(0,0,0,0.03)', padding: '10px', borderRadius: '8px' }}>
                          <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>Password Requirements:</div>
                          {passwordRules.map((rule, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: rule.valid ? '#10b981' : 'inherit' }}>
                              <span style={{ fontSize: '1.2em' }}>{rule.valid ? '✓' : '○'}</span>
                              <span>{rule.label}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <button type="submit" className="login-submit-btn">
                    {isForgotPassMode ? (otpRequested ? t.resetBtn : "Send OTP") : isSignUpMode ? t.registerBtn : t.login}
                  </button>
                </form>

                <div className="auth-footer">
                  <span
                    className="toggle-link"
                    onClick={() => {
                      if (isForgotPassMode) {
                        setIsForgotPassMode(false);
                        setOtpRequested(false);
                      } else {
                        setIsSignUpMode(!isSignUpMode);
                      }
                      setRollNumber('');
                      setPassword('');
                      setOtp('');
                    }}
                  >
                    {isForgotPassMode ? t.backToLogin : isSignUpMode ? t.alreadyHave : t.newStudent}
                  </span>
                  {!isSignUpMode && !isForgotPassMode && (
                    <span className="forgot-pass" onClick={() => {
                      setIsForgotPassMode(true);
                      setRollNumber('');
                      setPassword('');
                      setOtp('');
                      setOtpRequested(false);
                    }}>{t.forgotPass}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="buddy-container fade-in">
            <div className="chat-history">
              {chatHistory.map((msg, index) => (
                <div key={index} className={`chat-bubble ${msg.role}`}>
                  {msg.isGreeting ? t.greeting : msg.content}
                </div>
              ))}

              {chatHistory.length === 1 && (
                <div className="suggestions-container fade-in">
                  <div className="suggestions-title">
                    {t.tryAsking}
                  </div>
                  <div className="suggestions-grid">
                    <div className="suggestion-pill" onClick={() => handleMistralSearch(t.sug1)}>
                      {t.sug1}
                    </div>
                    <div className="suggestion-pill" onClick={() => handleMistralSearch(t.sug2)}>
                      {t.sug2}
                    </div>
                    <div className="suggestion-pill" onClick={() => handleMistralSearch(t.sug3)}>
                      {t.sug3}
                    </div>
                    <div className="suggestion-pill" onClick={() => handleMistralSearch(t.sug4)}>
                      {t.sug4}
                    </div>
                  </div>
                </div>
              )}

              {loading && (
                <div className="chat-bubble bot" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div className="spinner" style={{ width: '15px', height: '15px', borderWidth: '2px', borderTopColor: 'var(--accent-color)' }}></div>
                  Thinking...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="search-fixed-bottom">
              <input
                type="text"
                className="main-search-input"
                placeholder={t.searchPlaceholder || "Ask anything about admissions, library, IT, classes..."}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleMistralSearch();
                }}
              />
              <button
                className="ask-btn-circle"
                onClick={() => handleMistralSearch()}
                disabled={loading || !query.trim()}
              >
                {lang === 'hi' ? '➤' : lang === 'te' ? '➤' : '➤'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
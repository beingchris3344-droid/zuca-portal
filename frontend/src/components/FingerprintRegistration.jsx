// components/FingerprintRegistration.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BASE_URL from '../api';
import { FaFingerprint } from 'react-icons/fa';

const FingerprintRegistration = ({ onRegistered }) => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const checkSupport = async () => {
      try {
        if (window.PublicKeyCredential) {
          const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setIsSupported(available);
          
          if (available) {
            // Check current status
            const token = localStorage.getItem('token');
            if (token) {
              const res = await fetch(`${BASE_URL}/api/biometric/status`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              const data = await res.json();
              setIsRegistered(data.registered);
            }
          }
        }
      } catch (err) {
        console.error('Biometric support check failed:', err);
        setIsSupported(false);
      }
    };
    checkSupport();
  }, []);

  const registerFingerprint = async () => {
    if (!isSupported) {
      setError('Fingerprint not supported on this device');
      return;
    }

    setIsRegistering(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      
      // 1. Get registration challenge
      const challengeRes = await fetch(`${BASE_URL}/api/biometric/register-challenge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      const challengeData = await challengeRes.json();
      
      if (!challengeData.success) {
        throw new Error(challengeData.error || 'Failed to get challenge');
      }

      // 2. Convert challenge from base64url to ArrayBuffer
      const challengeBuffer = Uint8Array.from(
        atob(challengeData.challenge.replace(/-/g, '+').replace(/_/g, '/')), 
        c => c.charCodeAt(0)
      );

      // 3. Convert user ID to ArrayBuffer (handle string or array)
      let userIdBuffer;
      if (typeof challengeData.userId === 'string') {
        userIdBuffer = Uint8Array.from(challengeData.userId, c => c.charCodeAt(0));
      } else if (Array.isArray(challengeData.userId)) {
        userIdBuffer = Uint8Array.from(challengeData.userId);
      } else {
        userIdBuffer = new Uint8Array([1, 2, 3, 4, 5]); // fallback
      }

      // 4. Create credential with fingerprint
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: challengeBuffer,
          rp: {
            name: challengeData.rpName || 'ZUCA Portal',
            id: challengeData.rpId || window.location.hostname
          },
          user: {
            id: userIdBuffer,
            name: challengeData.userName || 'user@zuca.com',
            displayName: challengeData.userDisplayName || 'ZUCA Member'
          },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 },  // ES256
            { type: 'public-key', alg: -257 } // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            residentKey: 'required'
          },
          timeout: 60000,
          attestation: 'none'
        }
      });

      if (!credential) {
        throw new Error('Fingerprint registration cancelled');
      }

      // 5. Extract credential data properly - FIXED: credential.id is already a string
      const credentialId = credential.id;
      
      // Get public key - handle different response types
      let publicKey = '';
      try {
        const pubKeyBuffer = credential.response.getPublicKey();
        publicKey = btoa(String.fromCharCode(...new Uint8Array(pubKeyBuffer)));
      } catch (err) {
        console.warn('Could not extract public key:', err);
        publicKey = '';
      }
      
      // Get attestation object
      const attestationObject = btoa(
        String.fromCharCode(...new Uint8Array(credential.response.attestationObject))
      );
      
      // Get client data JSON
      const clientDataJSON = btoa(
        String.fromCharCode(...new Uint8Array(credential.response.clientDataJSON))
      );

      // 6. Send to server with proper credential ID
      const registerRes = await fetch(`${BASE_URL}/api/biometric/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          credentialId,  // This is the base64url string from credential.id
          publicKey,
          attestationObject,
          clientDataJSON,
          transports: JSON.stringify(['internal', 'hybrid'])
        })
      });

      const registerData = await registerRes.json();

      if (registerRes.ok) {
        setIsRegistered(true);
        setSuccess(' Fingerprint registered successfully!');
        if (onRegistered) onRegistered();
      } else {
        throw new Error(registerData.error || 'Registration failed');
      }

    } catch (err) {
      console.error('Registration error:', err);
      if (err.name === 'NotAllowedError') {
        setError('Registration was cancelled. Please try again.');
      } else if (err.name === 'NotSupportedError') {
        setError('Fingerprint not supported on this device.');
      } else if (err.name === 'ConstraintError') {
        setError('Fingerprint already registered or device issue.');
      } else {
        setError(err.message || 'Failed to register fingerprint');
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const removeFingerprint = async () => {
    if (!window.confirm('Are you sure you want to remove your fingerprint?')) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BASE_URL}/api/biometric/remove`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        setIsRegistered(false);
        setSuccess('🗑️ Fingerprint removed successfully');
        if (onRegistered) onRegistered();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to remove fingerprint');
      }
    } catch (err) {
      setError(err.message || 'Failed to remove fingerprint');
    }
  };

  if (!isSupported) {
    return (
      <div style={styles.container}>
        <div style={styles.icon}>🔒</div>
        <p style={styles.message}>Fingerprint not supported on this device</p>
        <p style={styles.subMessage}>Your device does not have a fingerprint sensor</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.icon}><FaFingerprint color="white" /></span>
        <h3 style={styles.title}>Fingerprint Login</h3>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={styles.errorBox}
          >
            ❌ {error}
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={styles.successBox}
          >
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      <div style={styles.statusContainer}>
        <div style={styles.statusRow}>
          <span style={styles.statusLabel}>Status:</span>
          <span style={{
            ...styles.statusValue,
            color: isRegistered ? '#10b981' : '#f53a0b'
          }}>
            {isRegistered ? ' Registered' : ' Not Registered'}
          </span>
        </div>
      </div>

      <div style={styles.buttonContainer}>
        {!isRegistered ? (
          <motion.button
            onClick={registerFingerprint}
            disabled={isRegistering}
            style={{
              ...styles.registerButton,
              opacity: isRegistering ? 0.7 : 1
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isRegistering ? (
              <span style={styles.loadingText}>
                <span style={styles.spinner}>⟳</span> Registering...
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <FaFingerprint size={16} /> Register Fingerprint
              </span>
            )}
          </motion.button>
        ) : (
          <motion.button
            onClick={removeFingerprint}
            style={styles.removeButton}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            🗑️ Remove Fingerprint
          </motion.button>
        )}
      </div>

      <p style={styles.helpText}>
        {isRegistered 
          ? ' Your fingerprint is registered. You can use it to login!'
          : ' Register your fingerprint for faster login next time.'
        }
      </p>
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid rgba(255,255,255,0.1)',
    maxWidth: '400px',
    width: '100%',
    margin: '0 auto'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px'
  },
  icon: {
    fontSize: '28px'
  },
  title: {
    color: '#f1f5f9',
    fontSize: '18px',
    margin: 0,
    fontWeight: 600
  },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#ef4444',
    fontSize: '13px',
    marginBottom: '16px'
  },
  successBox: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    border: '1px solid rgba(16,185,129,0.3)',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#10b981',
    fontSize: '13px',
    marginBottom: '16px'
  },
  statusContainer: {
    backgroundColor: 'rgba(30,41,59,0.5)',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '20px'
  },
  statusRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  statusLabel: {
    color: '#94a3b8',
    fontSize: '14px'
  },
  statusValue: {
    fontSize: '14px',
    fontWeight: 600
  },
  buttonContainer: {
    marginBottom: '16px'
  },
  registerButton: {
    width: '100%',
    padding: '12px',
    borderRadius: '40px',
    border: 'none',
    background: 'linear-gradient(135deg, #ffffff, #fcfdff)',
    color: 'black',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  removeButton: {
    width: '100%',
    padding: '12px',
    borderRadius: '40px',
    border: '1px solid rgba(239,68,68,0.5)',
    background: 'rgba(239,68,68,0.1)',
    color: '#ef4444',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  loadingText: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  spinner: {
    display: 'inline-block',
    animation: 'spin 1s linear infinite'
  },
  helpText: {
    color: '#94a3b8',
    fontSize: '12px',
    textAlign: 'center',
    margin: 0
  }
};

// Add spin animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default FingerprintRegistration;
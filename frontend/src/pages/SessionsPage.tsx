import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getSessions } from '../api';

type SessionEntry = {
  id: string;
  device: string;
  deviceIcon: string;
  browser: string;
  location: string;
  timestamp: string;
  isCurrent: boolean;
};

export default function SessionsPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);

  const currentUA = navigator.userAgent;
  const currentBrowser = /Chrome/.test(currentUA)
    ? 'Chrome'
    : /Firefox/.test(currentUA)
    ? 'Firefox'
    : /Safari/.test(currentUA)
    ? 'Safari'
    : 'Unknown Browser';

  const currentDevice = /Mobile/.test(currentUA) ? 'Mobile' : 'Desktop';
  const currentDeviceIcon = /Mobile/.test(currentUA) ? 'phone_android' : 'computer';

  useEffect(() => {
    if (!user) return;
    
    getSessions()
      .then(data => {
        const mapped = data.sessions.map((s) => {
          let formattedTime = 'Current session';
          if (s.last_activity) {
            formattedTime = new Date(s.last_activity).toLocaleString();
          } else if (s.first_seen) {
            formattedTime = new Date(s.first_seen).toLocaleString();
          } else if (user?.last_sign_in_at) {
            formattedTime = new Date(user.last_sign_in_at).toLocaleString();
          }

          return {
            id: s.session_id,
            device: s.is_anonymous ? 'Anonymous Session' : currentDevice,
            deviceIcon: s.is_anonymous ? 'no_accounts' : currentDeviceIcon,
            browser: s.is_anonymous ? 'Public Access' : currentBrowser,
            location: 'Current location',
            timestamp: formattedTime,
            isCurrent: s.is_current,
          };
        });
        setSessions(mapped);
        setNote(data.note);
      })
      .catch(err => {
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user, currentDevice, currentDeviceIcon, currentBrowser]);

  if (!user) {
    return (
      <div className="flex flex-col gap-6 animate-fade-in-up">
        <div>
          <h3 className="font-headline text-2xl sm:text-3xl font-bold tracking-tight">Sessions</h3>
        </div>
        <div className="bg-surface-container/40 border border-outline-variant/15 p-8 rounded-2xl text-center">
          <span className="material-symbols-outlined text-4xl text-outline/30 mb-3 block">lock</span>
          <p className="text-sm text-on-surface-variant">Sign in to view your active sessions.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Find current active session or fall back to first
  const currentSession = sessions.find(s => s.isCurrent) || sessions[0];

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      {/* Header */}
      <div>
        <p className="text-[10px] uppercase tracking-[0.35em] text-outline font-black">Security</p>
        <h3 className="font-headline text-2xl sm:text-3xl font-bold tracking-tight">Sessions</h3>
        <p className="text-on-surface-variant text-sm mt-1">Manage your active sessions and sign-in history.</p>
      </div>

      {/* Current Session */}
      {currentSession && (
        <div className="bg-surface-container/40 border border-primary/20 p-5 sm:p-6 rounded-2xl backdrop-blur-xl animate-scale-in" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-headline font-bold text-lg flex items-center gap-2">
              <span className="material-symbols-outlined text-primary/60">shield</span>
              Current Session
            </h4>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-400/10 text-green-400">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Active
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <InfoBlock icon="computer" label="Device" value={`${currentSession.device} — ${currentSession.browser}`} />
            <InfoBlock icon="schedule" label="Last Sign In" value={currentSession.timestamp} />
            <InfoBlock icon="person" label="Account" value={user.email || 'Unknown'} />
            <InfoBlock icon="language" label="Location" value={currentSession.location} />
          </div>
        </div>
      )}

      {/* Session History */}
      <div className="bg-surface-container/40 border border-outline-variant/15 p-5 sm:p-6 rounded-2xl backdrop-blur-xl animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
        <h4 className="font-headline font-bold text-lg mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary/60">history</span>
          Session History
        </h4>
        <div className="space-y-3">
          {sessions.map((session, i) => (
            <div
              key={session.id}
              className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                session.isCurrent
                  ? 'bg-primary/5 border-primary/20'
                  : 'bg-surface-container-highest/30 border-outline-variant/10 hover:bg-surface-container-highest/50'
              }`}
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-on-surface-variant">{session.deviceIcon}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-on-surface flex items-center gap-2">
                    {session.device} — {session.browser}
                    {session.isCurrent && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">THIS DEVICE</span>
                    )}
                  </p>
                  <p className="text-[11px] text-on-surface-variant">{session.location} · {session.timestamp}</p>
                </div>
              </div>
              {!session.isCurrent && (
                <button className="text-xs text-error hover:text-error/80 font-medium px-3 py-1.5 rounded-lg hover:bg-error/10 transition-colors flex-shrink-0">
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="bg-surface-container-low border border-outline-variant/10 p-4 sm:p-6 rounded-xl sm:rounded-2xl animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-primary/60 text-lg mt-0.5 flex-shrink-0">info</span>
          <div className="text-xs text-on-surface-variant leading-relaxed space-y-1">
            <p><strong className="text-on-surface">Session Info:</strong> {note || 'Session management is handled by Supabase Auth.'}</p>
            <p>Revoking sessions will be available in a future update.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-outline font-bold mb-1 flex items-center gap-1.5">
        <span className="material-symbols-outlined text-xs text-primary/50">{icon}</span>
        {label}
      </p>
      <p className="text-sm text-on-surface font-medium truncate">{value}</p>
    </div>
  );
}

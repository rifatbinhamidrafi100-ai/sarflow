import { useEffect, useState } from 'react';
import { Download, Smartphone, Globe2, CheckCircle2 } from 'lucide-react';
type InstallPrompt = Event & { prompt: () => Promise<{ outcome: 'accepted' | 'dismissed' }> };

export default function Install() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [status, setStatus] = useState('');
  useEffect(() => {
    const capture = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const installed = () => {
      setPrompt(null);
      setStatus('SARFlow has been installed.');
    };
    window.addEventListener('beforeinstallprompt', capture);
    window.addEventListener('appinstalled', installed);
    if (matchMedia('(display-mode: standalone)').matches)
      setStatus('You are using SARFlow as an installed app.');
    return () => {
      window.removeEventListener('beforeinstallprompt', capture);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);
  return (
    <section className="page install-page">
      <div className="install-intro">
        <Smartphone size={38} aria-hidden="true" />
        <h1>
          Your window to Earth.
          <br />
          Now on your phone.
        </h1>
        <p>
          Explore satellite observations, understand radar, and inspect the evidence wherever you
          are.
        </p>
      </div>
      <div className="install-options">
        <article>
          <Globe2 aria-hidden="true" />
          <h2>Install from your browser</h2>
          <p>
            Keep SARFlow on your home screen. This is the recommended option for Android and iPhone.
          </p>
          {prompt && (
            <button
              className="primary"
              onClick={async () => {
                try {
                  const choice = await prompt.prompt();
                  setStatus(
                    choice.outcome === 'accepted'
                      ? 'Installation requested. Follow your browser’s confirmation.'
                      : 'Installation dismissed. You can continue in the browser.',
                  );
                  setPrompt(null);
                } catch {
                  setStatus(
                    'Installation is unavailable. Use the browser menu instructions below.',
                  );
                  setPrompt(null);
                }
              }}
            >
              Install SARFlow
            </button>
          )}
          <p>
            <strong>Android:</strong> open the published website in Chrome, then choose Install app
            or Add to Home screen from the menu.
          </p>
          <p>
            <strong>iPhone:</strong> open in Safari, tap Share, then Add to Home Screen.
          </p>
          <p role="status">{status}</p>
        </article>
        <article>
          <Download aria-hidden="true" />
          <h2>Android preview APK</h2>
          <p>
            Version 0.2 adds a phone home screen, four topic guides and clear bottom navigation.
            Open the hosted satellite tools when you are ready to explore.
          </p>
          <a className="button" href="/downloads/sarflow-preview.apk" download>
            Download Android APK
          </a>
          <p className="tiny">
            Android 8 or newer. Development-signed preview, not a Play Store release.
            Physical-device testing is still pending. Install only if you trust this source.
          </p>
          <p className="tiny">
            Updating an earlier preview? Install over the existing app. Sign-in and evidence-file
            exports open in your browser. The home screen works offline; satellite tools need
            internet.
          </p>
        </article>
      </div>
      <div className="install-note">
        <CheckCircle2 aria-hidden="true" />
        <div>
          <strong>Know what travels with you</strong>
          <p>
            Satellite searches, imagery and server analysis require internet. The app does not
            provide emergency alerts or verified risk warnings. Use the browser version for
            evidence-file exports in this preview.
          </p>
        </div>
      </div>
    </section>
  );
}

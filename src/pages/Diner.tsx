import React from 'react';
import Portal from '../components/Portal';
import Orb from '../components/Orb';
import BroadcastTicker from '../components/BroadcastTicker';
import NovaAssistant from '../components/NovaAssistant';

const Diner: React.FC = () => {
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';

    // Push notification subscription
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then(async (registration) => {
        try {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            // Use a valid dummy base64 string for the public key
            const dummyVapidKey = 'BEl62iCYSrjUuoI1tqCcLRjclot987GrWbcXm93m6woS4vF6zR-S1q6Z_0pZ7L3C-Gv9e9pM6z-p_8vG7vG7vA';
            const subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(dummyVapidKey) as any
            });
            await fetch('https://koola10.fly.dev/push/subscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(subscription)
            });
          }
        } catch (err) {
          console.error("Push subscription failed:", err);
        }
      });
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  return (
    <div className="relative w-full h-screen overflow-hidden diner-breathe-effect flex flex-col items-center justify-center p-4">
      <div className="neon-grid"></div>

      {/* Orb Judges */}
      <Orb id="orb-1" personality="Encourager" color="#FBBF24" />
      <Orb id="orb-2" personality="Cynic" color="#A855F7" />
      <Orb id="orb-3" personality="Watcher" color="#FFFFFF" />

      {/* Portals Container - Responsive stacking */}
      <div className="z-10 flex flex-col md:flex-row gap-8 md:gap-24 items-center justify-center w-full max-w-6xl pb-20 mt-[-5vh]">
        <Portal
          id="booth-3"
          type="stable"
          label="Booth 3"
          color="#00F0FF"
        />

        <div className="hidden md:block">
          <h1 className="text-4xl lg:text-6xl font-bold text-koola-cyan drop-shadow-[0_0_15px_rgba(0,240,255,0.8)] tracking-tighter">
            KOOLA10
          </h1>
          <p className="text-xs text-koola-cyan/60 tracking-[0.5em] text-center mt-2">DINER NEXUS</p>
        </div>

        <Portal
          id="booth-7"
          type="glitched"
          label="Booth 7"
          color="#A855F7"
        />
      </div>

      <BroadcastTicker />
      <NovaAssistant />

      <audio id="ambient-audio" loop className="hidden">
        <source src="" type="audio/mpeg" />
      </audio>
    </div>
  );
};

export default Diner;

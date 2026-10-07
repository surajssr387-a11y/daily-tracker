import Tracker from "./tracker";
import { chatGPTSignInPath, getChatGPTUser } from "./chatgpt-auth";
import { LockKeyhole } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();
  if (user) return <Tracker />;

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="/" aria-label="Winter Arc home"><span className="brand-mark">W</span><span>WINTER ARC<span className="brand-year"> / 2026</span></span></a>
      <span className="privacy"><LockKeyhole size={14} /> Private space</span>
    </header>
    <main className="auth-workspace">
      <section className="auth-panel panel" aria-labelledby="sign-in-heading">
        <span className="auth-icon"><LockKeyhole size={27} /></span>
        <p className="eyebrow">YOUR PRIVATE CHALLENGE</p>
        <h1 id="sign-in-heading">Sign in to your Winter Arc.</h1>
        <p>Your goals and check-offs are saved to your account. Continue with the ChatGPT account that owns this tracker.</p>
        <a className="button primary" href={chatGPTSignInPath("/")} target="_top">Sign in with ChatGPT</a>
        <div className="auth-alternative"><p>Already signed in? Open your tracker in a new tab to load your progress.</p><a className="button secondary" href="/" target="_blank" rel="noopener noreferrer">Open tracker in a new tab</a></div>
      </section>
    </main>
  </div>;
}

import { useEffect, useRef } from 'react'
import {
  SendHorizonal, ArrowRight, Sparkles, Zap, BookOpen, BarChart3,
  ShieldCheck, Moon, Bot, GitBranch, Globe, Mail, MessageSquare, Plug,
} from 'lucide-react'

/**
 * Premium animated landing page shown before the operator enters the dashboard.
 * Self-contained (dark themed), dependency-free — CSS 3D + SVG + light JS for
 * mouse parallax and reveal-on-scroll.
 */
export function Landing({ onEnter }: { onEnter: () => void }) {
  const heroRef = useRef<HTMLDivElement>(null)

  // Reveal-on-scroll
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('in') }),
      { threshold: 0.15 }
    )
    document.querySelectorAll('.lp-reveal').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  // Hero mouse parallax → CSS vars
  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = heroRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    el.style.setProperty('--px', String(px))
    el.style.setProperty('--py', String(py))
  }
  function onLeave() {
    const el = heroRef.current
    if (!el) return
    el.style.setProperty('--px', '0')
    el.style.setProperty('--py', '0')
  }

  const channels = [
    { icon: <Globe size={20} />, label: 'Web form', c: '#38bdf8' },
    { icon: <Mail size={20} />, label: 'Email', c: '#f472b6' },
    { icon: <MessageSquare size={20} />, label: 'Slack', c: '#a78bfa' },
    { icon: <Plug size={20} />, label: 'API', c: '#34d399' },
  ]

  const stages = [
    { icon: <Bot size={22} />, name: 'Triage', desc: 'Classifies category, priority & sentiment the instant a ticket lands.' },
    { icon: <BookOpen size={22} />, name: 'Draft', desc: 'Searches your knowledge base and writes a grounded reply + confidence score.' },
    { icon: <ShieldCheck size={22} />, name: 'Escalate', desc: 'Auto-clears the safe replies; routes urgent, billing & low-confidence to a human.' },
  ]

  const features = [
    { icon: <MessageSquare size={20} />, title: 'Omnichannel intake', desc: 'Web, email, Slack & API — every source becomes one ticket, one queue.' },
    { icon: <Zap size={20} />, title: 'Autonomous pipeline', desc: 'Event-driven agents triage, draft and route with zero manual trigger.' },
    { icon: <BookOpen size={20} />, title: 'KB-grounded answers', desc: 'Replies cite your real docs — no hallucinated policies or prices.' },
    { icon: <SendHorizonal size={20} />, title: 'Human-approved send', desc: 'AI drafts; a person clicks Approve & Send. Nothing goes out on its own.' },
    { icon: <BarChart3 size={20} />, title: 'Daily analytics', desc: 'A morning digest of volume, auto-resolution rate and knowledge gaps.' },
    { icon: <Moon size={20} />, title: 'Premium UI', desc: 'A fast, delightful operator console — light or dark, built to live in.' },
  ]

  return (
    <div className="lp">
      {/* animated background */}
      <div className="lp-bg">
        <span className="lp-orb lp-orb-1" />
        <span className="lp-orb lp-orb-2" />
        <span className="lp-orb lp-orb-3" />
        <span className="lp-grid" />
      </div>

      {/* nav */}
      <nav className="lp-nav">
        <div className="lp-brand">
          <span className="lp-brand-mark"><SendHorizonal size={18} /></span>
          <span>SupportPilot</span>
        </div>
        <button className="lp-btn lp-btn-ghost" onClick={onEnter}>Enter dashboard <ArrowRight size={15} /></button>
      </nav>

      {/* hero */}
      <header className="lp-hero" ref={heroRef} onMouseMove={onMove} onMouseLeave={onLeave}>
        <div className="lp-hero-copy">
          <div className="lp-eyebrow"><Sparkles size={13} /> Autonomous AI Support Desk · Built on Lemma</div>
          <h1 className="lp-title">
            Every channel in.<br /><span className="lp-grad">One calm queue</span> out.
          </h1>
          <p className="lp-sub">
            SupportPilot turns email, Slack, web and API tickets into a single autonomous
            pipeline — triaged, drafted from your knowledge base, and resolved with a human
            in the loop for the calls that matter.
          </p>
          <div className="lp-cta">
            <button className="lp-btn lp-btn-primary" onClick={onEnter}>
              Launch the dashboard <ArrowRight size={16} />
            </button>
            <a className="lp-btn lp-btn-outline" href="#how">See how it works</a>
          </div>
          <div className="lp-trust">
            <span><b>4</b> channels</span><i /><span><b>5</b> AI agents</span><i /><span><b>100%</b> human-approved sends</span>
          </div>
        </div>

        {/* 3D mockup */}
        <div className="lp-hero-visual">
          <div className="lp-mock">
            <div className="lp-mock-top"><span /><span /><span /></div>
            <div className="lp-mock-body">
              <div className="lp-mock-metrics">
                {['Open', 'Pending', 'Auto', 'Conf'].map((m, i) => (
                  <div className="lp-mock-tile" key={m}>
                    <div className="lp-mock-tile-l">{m}</div>
                    <div className="lp-mock-tile-v" style={{ ['--d' as string]: `${i * 0.15}s` }}>{[18, 3, 12, '94%'][i]}</div>
                  </div>
                ))}
              </div>
              {[
                { s: 'Slack', b: 'triaged', c: '#a78bfa' },
                { s: 'Email', b: 'pending', c: '#f472b6' },
                { s: 'Web', b: 'sent', c: '#34d399' },
              ].map((r) => (
                <div className="lp-mock-row" key={r.s}>
                  <span className="lp-mock-dot" style={{ background: r.c }} />
                  <span className="lp-mock-subj" />
                  <span className="lp-mock-badge" style={{ color: r.c, borderColor: r.c }}>{r.b}</span>
                </div>
              ))}
            </div>
          </div>
          <span className="lp-chip lp-chip-1">✉️ Email</span>
          <span className="lp-chip lp-chip-2">💬 Slack</span>
          <span className="lp-chip lp-chip-3">🌐 Web</span>
          <span className="lp-chip lp-chip-4">🔌 API</span>
        </div>
      </header>

      {/* channels → core */}
      <section className="lp-section lp-reveal">
        <div className="lp-kicker">Omnichannel intake</div>
        <h2 className="lp-h2">Meet customers where they already are</h2>
        <div className="lp-flow">
          {channels.map((ch, i) => (
            <div className="lp-flow-node" key={ch.label} style={{ ['--c' as string]: ch.c, ['--i' as string]: i }}>
              <span className="lp-flow-icon" style={{ color: ch.c }}>{ch.icon}</span>
              {ch.label}
            </div>
          ))}
          <div className="lp-flow-core"><span className="lp-flow-pulse" />Tickets</div>
        </div>
        <p className="lp-note">Every source drops one ticket into one table — then the pipeline takes over.</p>
      </section>

      {/* pipeline */}
      <section className="lp-section lp-reveal" id="how">
        <div className="lp-kicker">Then it runs itself</div>
        <h2 className="lp-h2">An autonomous, event-driven pipeline</h2>
        <div className="lp-pipe">
          {stages.map((st, i) => (
            <div className="lp-stage-wrap" key={st.name}>
              <div className="lp-stage" style={{ ['--i' as string]: i }}>
                <div className="lp-stage-icon">{st.icon}</div>
                <div className="lp-stage-name">{st.name}</div>
                <p className="lp-stage-desc">{st.desc}</p>
              </div>
              {i < stages.length - 1 && <div className="lp-stage-arrow"><ArrowRight size={20} /></div>}
            </div>
          ))}
        </div>
        <div className="lp-principle"><GitBranch size={15} /> Agents <b>judge</b> (read-only) · deterministic functions <b>write</b> — reliable & secure by design.</div>
      </section>

      {/* features */}
      <section className="lp-section lp-reveal">
        <div className="lp-kicker">Everything included</div>
        <h2 className="lp-h2">Built to actually run support</h2>
        <div className="lp-features">
          {features.map((f) => (
            <div className="lp-feat" key={f.title}>
              <span className="lp-feat-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* stats strip */}
      <section className="lp-stats lp-reveal">
        {[['4', 'Data tables'], ['5', 'AI agents'], ['5', 'Functions'], ['4', 'Live channels'], ['1', 'Lemma pod']].map(([n, l]) => (
          <div className="lp-stat" key={l}><div className="lp-stat-n">{n}</div><div className="lp-stat-l">{l}</div></div>
        ))}
      </section>

      {/* final CTA */}
      <section className="lp-final lp-reveal">
        <h2 className="lp-final-title">Turn four noisy channels<br />into one calm queue.</h2>
        <button className="lp-btn lp-btn-primary lp-btn-lg" onClick={onEnter}>
          Enter the dashboard <ArrowRight size={18} />
        </button>
        <div className="lp-foot">SupportPilot AI · Built on Lemma · Gappy AI Hackathon</div>
      </section>
    </div>
  )
}

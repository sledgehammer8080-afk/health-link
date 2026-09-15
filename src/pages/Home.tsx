import { Link } from 'react-router-dom'

const quickStats = [
  { value: '3x', label: 'faster care coordination' },
  { value: '24/7', label: 'family visibility' },
  { value: '1 hub', label: 'for appointments and tasks' }
]

const featureHighlights = [
  {
    title: 'Care dashboard',
    description: 'See upcoming visits, medication reminders, and health trends in one place.',
    tag: 'Overview'
  },
  {
    title: 'Family-ready tracking',
    description: 'Keep notes, vitals, and tasks organized for every member of the household.',
    tag: 'Shared'
  },
  {
    title: 'Smart reminders',
    description: 'Reduce missed follow-ups with timely health updates and action reminders.',
    tag: 'Alerts'
  },
  {
    title: 'Connected records',
    description: 'Bring medication history, labs, and health data together without the paperwork.',
    tag: 'Records'
  }
]

const workflowSteps = [
  'Create your family care profile',
  'Connect appointments, meds, and vitals',
  'Stay ahead with reminders and check-ins'
]

export default function Home() {
  return (
    <div className="page home-page">
      <header className="home-header">
        <span className="eyebrow">Family-first care coordination</span>
        <h1>Health Link</h1>
        <p>
          Manage appointments, tasks, and wellness notes from one clear, calm dashboard built for everyday care.
        </p>
      </header>

      <section className="home-hero">
        <div className="home-hero-copy">
          <span className="eyebrow eyebrow-soft">Built for everyday care</span>
          <h2>One connected place for your family’s health.</h2>
          <p>
            Health Link brings together prescriptions, appointments, check-ins, and wellness updates so you can move from “I should remember” to “I already know.”
          </p>

          <div className="button-row home-cta-row">
            <Link className="button" to="/signup">
              Get started
            </Link>
            <Link className="button button-secondary" to="/login">
              Login
            </Link>
          </div>

          <div className="home-trust-row">
            <div>
              <strong>24/7</strong>
              <span>Care visibility</span>
            </div>
            <div>
              <strong>1Hub</strong>
              <span>Health updates</span>
            </div>
            <div>
              <strong>Zero</strong>
              <span>Paper chase</span>
            </div>
          </div>
        </div>

        <div className="home-hero-panel" aria-label="Health dashboard preview">
          <div className="mini-panel-header">
            <span className="dot dot-purple" />
            <span className="dot dot-blue" />
            <span className="dot dot-green" />
          </div>

          <div className="mini-card mini-card-primary">
            <span>Today’s care plan</span>
            <strong>3 priorities</strong>
            <small>Medication check • Lab follow-up • Check-in call</small>
          </div>

          <div className="mini-chart">
            <span style={{ height: '38%' }} />
            <span style={{ height: '58%' }} />
            <span style={{ height: '72%' }} />
            <span style={{ height: '82%' }} />
            <span style={{ height: '96%' }} />
          </div>

          <div className="mini-legend">
            <div><span className="legend-swatch purple" /> Weekly check-ins</div>
            <div><span className="legend-swatch teal" /> Wellness trend</div>
          </div>
        </div>
      </section>

      <section className="home-stats" aria-label="Key health statistics">
        {quickStats.map((stat) => (
          <div className="stat-card" key={stat.label}>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </section>

      <section className="home-section">
        <div className="section-heading">
          <span className="eyebrow">Why families choose HL</span>
          <h3>Everything your care routine needs in one view.</h3>
        </div>

        <div className="feature-grid">
          {featureHighlights.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <span className="feature-tag">{feature.tag}</span>
              <h4>{feature.title}</h4>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section home-flow">
        <div className="section-heading">
          <span className="eyebrow">How it works</span>
          <h3>Simple steps to stay on top of health.</h3>
        </div>

        <div className="steps-grid">
          {workflowSteps.map((step, index) => (
            <div className="step-card" key={step}>
              <span className="step-number">0{index + 1}</span>
              <p>{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="home-cta">
        <div>
          <span className="eyebrow">Ready when you are</span>
          <h3>Build a calmer, clearer care routine for the people you love.</h3>
        </div>
        <div className="button-row home-cta-row">
          <Link className="button" to="/signup">
            Start free
          </Link>
          <Link className="button button-secondary" to="/login">
            View dashboard
          </Link>
        </div>
      </section>
    </div>
  )
}

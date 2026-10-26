import { Link } from 'react-router-dom';
import { Card, PageHeader, SectionTitle } from '../components/ui.jsx';
import { DISCLAIMER } from '../engine/unit.js';
import { VEHICLES, UNIT_BY_ID, SHOW_SAMPLE } from '../data/index.js';

export default function About() {
  return (
    <div className="space-y-6">
      <PageHeader title="About Rebuild Bench" back={{ to: '/more', label: 'Progress and settings' }} />

      <div role="note" className="rounded-xl border-2 border-warn-line bg-warn-soft p-4">
        <p className="text-base font-semibold text-warn-text">Study aid, not a service manual</p>
        <p className="mt-1 text-base leading-relaxed text-ink">{DISCLAIMER}</p>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">
          Specs shown here come from cited sources, but sources disagree, revisions change values, and a typo is
          always possible. Fastener torque often depends on bolt reuse, thread condition and lubrication. The factory
          service manual for your exact VIN wins every time.
        </p>
      </div>

      <section>
        <SectionTitle>What it is</SectionTitle>
        <p className="text-base leading-relaxed text-ink-2">
          A study game for memorizing a full rebuild, 100 or more steps per unit, until you can run the whole sequence
          from memory. Walk through it, drill short stretches, guess what comes next, flip spec cards, then rebuild the
          whole unit against the clock. Along the way, learn the shop terms and the mistakes that wreck a unit.
          Anything you miss comes back for review.
        </p>
      </section>

      <section>
        <SectionTitle>The units</SectionTitle>
        <Card as="ul" className="divide-y divide-line-2">
          {VEHICLES.flatMap((v) => v.units.map((u) => (
            <li key={u.id} className="px-4 py-3">
              <p className="text-base font-medium text-ink">
                {UNIT_BY_ID[u.id] ? <Link to={`/unit/${u.id}`} className="underline decoration-line underline-offset-2">{u.name}</Link> : u.name}
              </p>
              <p className="text-sm text-ink-3">{u.fullName}. {v.name}, {v.years}.</p>
            </li>
          )))}
        </Card>
        {SHOW_SAMPLE && (
          <p className="mt-2 text-sm text-ink-3">
            A practice unit with made-up names also shows up in development builds.
          </p>
        )}
      </section>

      <section>
        <SectionTitle>Content</SectionTitle>
        <p className="text-base leading-relaxed text-ink-2">
          Every step is written in our own words from public sources, which are listed on each unit page. No factory
          manual text is reproduced. Where a value couldn’t be sourced, it’s left out rather than guessed.
        </p>
      </section>

      <section>
        <SectionTitle>Pictures</SectionTitle>
        <p className="text-base leading-relaxed text-ink-2">
          Part drawings and unit diagrams are original work made for this project. Part photos are shared by
          their authors under Creative Commons or public domain licenses and are credited wherever they appear.{' '}
          <Link to="/credits" className="font-medium text-brand-text underline">See every photo credit</Link>.
        </p>
      </section>

      <section>
        <SectionTitle>Your data</SectionTitle>
        <p className="text-base leading-relaxed text-ink-2">
          There is no account and no server. Progress is stored only in this browser. Use{' '}
          <Link to="/more" className="font-medium text-brand-text underline">Progress and settings</Link> to export a
          backup or move it to another device.
        </p>
      </section>

      <p className="text-sm leading-relaxed text-ink-3">
        Not affiliated with or endorsed by Subaru, Jaguar Land Rover or ZF. Product names are used only to identify the
        units studied.
      </p>
    </div>
  );
}

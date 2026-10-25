import { Link } from 'react-router-dom';
import { Card, PageHeader, SectionTitle } from '../components/ui.jsx';
import { PartThumb, PhotoCredit } from '../components/parts.jsx';
import { ALL_PHOTOS, PART_BY_ID } from '../data/parts.js';

export default function Credits() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Picture credits"
        back={{ to: '/about', label: 'About' }}
        sub="Who made the part photos, and the license each one is shared under."
      />

      <section>
        <SectionTitle>Drawings</SectionTitle>
        <p className="text-base leading-relaxed text-ink-2">
          The part drawings and unit diagrams are original work made for Rebuild Bench. They are simplified to show what
          a part looks like and roughly where it sits, not drawn to scale, and are not copied from any factory manual.
        </p>
      </section>

      <section>
        <SectionTitle sub={ALL_PHOTOS.length ? `${ALL_PHOTOS.length} photo${ALL_PHOTOS.length === 1 ? '' : 's'}. Tap a credit to see the original and its license.` : undefined}>
          Photos
        </SectionTitle>
        {ALL_PHOTOS.length ? (
          <Card as="ul" className="divide-y divide-line-2">
            {ALL_PHOTOS.map((p) => (
              <li key={p.key} className="flex gap-3 px-4 py-3">
                <Link to={`/part/${p.partId}`} className="w-20 flex-shrink-0" aria-label={`${PART_BY_ID[p.partId].name} part page`}>
                  <PartThumb partId={p.partId} photoKey={p.key} hideAlt />
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-medium text-ink">{PART_BY_ID[p.partId].name}</p>
                  {p.caption && <p className="text-sm leading-snug text-ink-2">{p.caption}</p>}
                  <PhotoCredit photo={p} className="mt-0.5 text-sm" />
                </div>
              </li>
            ))}
          </Card>
        ) : (
          <p className="text-base text-ink-2">No photos yet. Parts show their drawings until photos are added.</p>
        )}
        <p className="mt-3 text-sm leading-relaxed text-ink-3">
          Photos are used under their Creative Commons or public domain licenses. Where a photo was cropped or resized for
          this app, its credit says so. Licenses that require it (such as CC BY-SA) carry over to those edited copies.
        </p>
      </section>
    </div>
  );
}

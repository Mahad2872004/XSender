/**
 * The canonical list of business types.
 *
 * Kept in TypeScript rather than a Postgres enum so adding a vertical is
 * shipping a template, not writing a migration — which is what "we serve every
 * business that still answers messages by hand" actually requires.
 *
 * `workspaces.vertical` stores the `id` as text. Unknown values degrade to the
 * generic entry rather than throwing, so an old row never breaks a page.
 */

export interface Vertical {
  id: string;
  /** URL segment for /for/[slug]; null when it has no marketing page yet. */
  slug: string;
  /** Shown in the setup wizard. */
  label: string;
  /** Plural, for nav and footer links. */
  plural: string;
  /** What their team does by hand today — the pain, in their words. */
  doingByHand: string;
  /** What a sellable item is called here. Drives the Menu screen's wording. */
  itemNoun: { singular: string; plural: string };
  /** Whether bookings matter more than orders for this business. */
  primaryJob: 'orders' | 'bookings' | 'leads' | 'answers';
  /** Ship a /for/[slug] landing page for this one. */
  marketingPage: boolean;
}

export const VERTICALS: Vertical[] = [
  {
    id: 'restaurant',
    slug: 'restaurants',
    label: 'Restaurant or cafe',
    plural: 'Restaurants & cafes',
    doingByHand: 'Typing out the menu and taking orders in chat, all evening',
    itemNoun: { singular: 'menu item', plural: 'Menu items' },
    primaryJob: 'orders',
    marketingPage: true,
  },
  {
    id: 'clinic',
    slug: 'clinics',
    label: 'Clinic or practice',
    plural: 'Clinics & practices',
    doingByHand: 'Booking and rescheduling appointments message by message',
    itemNoun: { singular: 'service', plural: 'Services' },
    primaryJob: 'bookings',
    marketingPage: true,
  },
  {
    id: 'salon',
    slug: 'salons',
    label: 'Salon or spa',
    plural: 'Salons & spas',
    doingByHand: 'Juggling appointment requests between clients',
    itemNoun: { singular: 'treatment', plural: 'Treatments' },
    primaryJob: 'bookings',
    marketingPage: true,
  },
  {
    id: 'real_estate',
    slug: 'real-estate',
    label: 'Real estate',
    plural: 'Real estate',
    doingByHand: 'Answering the same qualifying questions on every enquiry',
    itemNoun: { singular: 'listing', plural: 'Listings' },
    primaryJob: 'leads',
    marketingPage: true,
  },
  {
    id: 'ecommerce',
    slug: 'online-stores',
    label: 'Online store',
    plural: 'Online stores',
    doingByHand: '“Is this in stock?” and “where is my order?”, all day',
    itemNoun: { singular: 'product', plural: 'Products' },
    primaryJob: 'orders',
    marketingPage: true,
  },
  {
    id: 'home_services',
    slug: 'home-services',
    label: 'Home services or repairs',
    plural: 'Home services',
    doingByHand: 'Taking job requests on the phone while on another job',
    itemNoun: { singular: 'service', plural: 'Services' },
    primaryJob: 'bookings',
    marketingPage: true,
  },
  {
    id: 'gym',
    slug: 'gyms-and-studios',
    label: 'Gym or studio',
    plural: 'Gyms & studios',
    doingByHand: 'Class bookings and membership questions in DMs',
    itemNoun: { singular: 'class', plural: 'Classes' },
    primaryJob: 'bookings',
    marketingPage: false,
  },
  {
    id: 'education',
    slug: 'tutors-and-academies',
    label: 'Tutor or academy',
    plural: 'Tutors & academies',
    doingByHand: 'Enrolment enquiries and timetable questions',
    itemNoun: { singular: 'course', plural: 'Courses' },
    primaryJob: 'leads',
    marketingPage: false,
  },
  {
    id: 'hotel',
    slug: 'hotels',
    label: 'Hotel or guesthouse',
    plural: 'Hotels & guesthouses',
    doingByHand: 'Availability and rate questions, at every hour',
    itemNoun: { singular: 'room', plural: 'Rooms' },
    primaryJob: 'bookings',
    marketingPage: false,
  },
  {
    id: 'automotive',
    slug: 'auto-workshops',
    label: 'Auto workshop or dealer',
    plural: 'Auto workshops',
    doingByHand: 'Service bookings and “is it ready yet?”',
    itemNoun: { singular: 'service', plural: 'Services' },
    primaryJob: 'bookings',
    marketingPage: false,
  },
  {
    id: 'other',
    slug: 'any-business',
    label: 'Something else',
    plural: 'Any business',
    doingByHand: 'Answering the same questions over and over',
    itemNoun: { singular: 'item', plural: 'Items' },
    primaryJob: 'answers',
    marketingPage: false,
  },
];

export const GENERIC_VERTICAL = VERTICALS[VERTICALS.length - 1];

export function verticalById(id: string | null | undefined): Vertical {
  return VERTICALS.find((v) => v.id === id) ?? GENERIC_VERTICAL;
}

export function verticalBySlug(slug: string): Vertical | undefined {
  return VERTICALS.find((v) => v.slug === slug);
}

/** Slugs that should have a /for/[slug] page generated. */
export function marketingVerticals(): Vertical[] {
  return VERTICALS.filter((v) => v.marketingPage);
}
